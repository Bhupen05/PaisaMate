from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.common import ExpenseType, FriendStatus, SettlementStatus, SplitMethod
from app.models.shared_expense import (
    BalanceResponse,
    ParticipantResponse,
    SharedExpenseCreate,
    SharedExpenseResponse,
)
from app.services.money import calculate_equal_splits, calculate_percentage_splits


async def _resolve_participant_linked_user_id(db, person_type: str, person_id: str) -> str | None:
    """When a FRIEND participant is an accepted Suraty account, remember
    their real user id on the participant record — this is what lets the
    other side of the split find and recognize this expense as their own."""
    if person_type != "FRIEND":
        return None
    friend = await db.friends.find_one({"_id": ObjectId(person_id)})
    if friend and friend.get("status") == FriendStatus.ACTIVE.value:
        return friend.get("linked_user_id")
    return None


async def _resolve_person_name(db, person_type: str, person_id: str, linked_user_id: str | None = None) -> str:
    if linked_user_id:
        user = await db.users.find_one({"_id": ObjectId(linked_user_id)})
        if user:
            return user["name"]
    if person_type == "USER":
        user = await db.users.find_one({"_id": ObjectId(person_id)})
        return user["name"] if user else "Unknown"
    friend = await db.friends.find_one({"_id": ObjectId(person_id)})
    return friend["name"] if friend else "Unknown"


async def _canonical_identity(db, person_type: str, person_id: str, linked_user_id: str | None = None) -> tuple[str, str]:
    """Resolve a participant to a stable identity for balance grouping: the
    real account id when the friend is linked, so the same person's balance
    merges across expenses regardless of whose friends-list they were added
    from, and falls back to the friend-doc id for unlinked contacts."""
    if linked_user_id:
        return "USER", linked_user_id
    if person_type == "FRIEND":
        friend = await db.friends.find_one({"_id": ObjectId(person_id)})
        if friend and friend.get("linked_user_id") and friend.get("status") == FriendStatus.ACTIVE.value:
            return "USER", friend["linked_user_id"]
    return person_type, person_id


def _participant_doc_to_response(doc: dict, person_name: str) -> ParticipantResponse:
    return ParticipantResponse(
        id=str(doc["_id"]),
        shared_expense_id=str(doc["shared_expense_id"]),
        person_type=doc["person_type"],
        person_id=str(doc["person_id"]),
        person_name=person_name,
        linked_user_id=doc.get("linked_user_id"),
        share_amount_minor=doc["share_amount_minor"],
        share_percentage=doc.get("share_percentage"),
        paid_amount_minor=doc.get("paid_amount_minor", 0),
        settled_amount_minor=doc.get("settled_amount_minor", 0),
    )


async def _get_participants(shared_expense_id: str) -> list[ParticipantResponse]:
    db = get_database()
    cursor = db.shared_participants.find({"shared_expense_id": ObjectId(shared_expense_id)})
    docs = await cursor.to_list(length=100)
    result = []
    for d in docs:
        name = await _resolve_person_name(db, d["person_type"], d["person_id"], d.get("linked_user_id"))
        result.append(_participant_doc_to_response(d, name))
    return result


def _your_share(user_id: str, participants: list[ParticipantResponse]) -> int:
    """The signed-in user's own slice of the bill (0 if they aren't a participant).
    Matches either a direct USER row (the owner) or a FRIEND row that's been
    resolved back to this user's own linked account (a participant added
    from someone else's friends list)."""
    return next(
        (
            p.share_amount_minor for p in participants
            if (p.person_type == "USER" and p.person_id == user_id) or p.linked_user_id == user_id
        ),
        0,
    )


async def _shared_doc_to_response(
    db, doc: dict, participants: list[ParticipantResponse], user_id: str
) -> SharedExpenseResponse:
    if doc["payer_type"] == "USER" and doc["payer_id"] == user_id:
        payer_name = "You"
    else:
        payer_name = await _resolve_person_name(db, doc["payer_type"], doc["payer_id"])
    if str(doc["owner_user_id"]) == user_id:
        owner_name = "You"
    else:
        owner_name = await _resolve_person_name(db, "USER", str(doc["owner_user_id"]))
    return SharedExpenseResponse(
        id=str(doc["_id"]),
        expense_id=str(doc["expense_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        owner_name=owner_name,
        title=doc["title"],
        total_amount_minor=doc["total_amount_minor"],
        your_share_minor=_your_share(user_id, participants),
        currency=doc["currency"],
        expense_date=doc["expense_date"],
        category_id=doc.get("category_id"),
        classification=doc.get("classification", "NEED"),
        payer_type=doc["payer_type"],
        payer_id=str(doc["payer_id"]),
        payer_name=payer_name,
        split_method=doc["split_method"],
        status=doc.get("status", SettlementStatus.UNSETTLED),
        note=doc.get("note"),
        participants=participants,
        is_owner=str(doc["owner_user_id"]) == user_id,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def _compute_shares(data: SharedExpenseCreate) -> None:
    """Fill in each participant's share_amount_minor / share_percentage in place."""
    participant_count = len(data.participants)
    if data.split_method == SplitMethod.EQUAL:
        shares = calculate_equal_splits(data.total_amount_minor, participant_count)
        for i, p in enumerate(data.participants):
            p.share_amount_minor = shares[i]
            p.share_percentage = round(100.0 / participant_count, 4)
    elif data.split_method == SplitMethod.PERCENTAGE:
        percentages = [p.share_percentage or 0.0 for p in data.participants]
        shares = calculate_percentage_splits(data.total_amount_minor, percentages)
        for i, p in enumerate(data.participants):
            p.share_amount_minor = shares[i]
    # CUSTOM_AMOUNT: already validated by pydantic model_validator


async def create_shared_expense(user_id: str, data: SharedExpenseCreate) -> SharedExpenseResponse:
    db = get_database()
    now = datetime.now(timezone.utc)

    _compute_shares(data)
    your_share = next(
        (p.share_amount_minor or 0 for p in data.participants if p.person_type == "USER" and p.person_id == user_id),
        0,
    )

    # Personal ledger entry — records only the user's own share, not the full
    # bill, so "This Month" totals aren't inflated by money fronted for others.
    expense_doc = {
        "owner_user_id": ObjectId(user_id),
        "title": data.title,
        "amount_minor": your_share,
        "currency": data.currency,
        "expense_date": data.expense_date.isoformat(),
        "category_id": data.category_id,
        "classification": data.classification.value,
        "expense_type": ExpenseType.SHARED.value,
        "note": data.note,
        "created_at": now,
        "updated_at": now,
    }
    expense_result = await db.expenses.insert_one(expense_doc)

    shared_doc = {
        "expense_id": expense_result.inserted_id,
        "owner_user_id": ObjectId(user_id),
        "title": data.title,
        "total_amount_minor": data.total_amount_minor,
        "currency": data.currency,
        "expense_date": data.expense_date.isoformat(),
        "category_id": data.category_id,
        "classification": data.classification.value,
        "payer_type": data.payer_type.value,
        "payer_id": data.payer_id,
        "split_method": data.split_method.value,
        "status": SettlementStatus.UNSETTLED.value,
        "note": data.note,
        "created_at": now,
        "updated_at": now,
    }
    shared_result = await db.shared_expenses.insert_one(shared_doc)
    shared_id = shared_result.inserted_id

    participant_docs = []
    for p in data.participants:
        paid = data.total_amount_minor if (
            p.person_type == data.payer_type and p.person_id == data.payer_id
        ) else 0
        linked_user_id = await _resolve_participant_linked_user_id(db, p.person_type.value, p.person_id)
        participant_docs.append({
            "shared_expense_id": shared_id,
            "person_type": p.person_type.value,
            "person_id": p.person_id,
            "linked_user_id": linked_user_id,
            "share_amount_minor": p.share_amount_minor or 0,
            "share_percentage": p.share_percentage,
            "paid_amount_minor": paid,
            "settled_amount_minor": 0,
        })
    if participant_docs:
        await db.shared_participants.insert_many(participant_docs)

    shared_doc["_id"] = shared_id
    participants = await _get_participants(str(shared_id))
    return await _shared_doc_to_response(db, shared_doc, participants, user_id)


async def get_shared_expenses(user_id: str, friend_id: str | None = None) -> list[SharedExpenseResponse]:
    db = get_database()
    if friend_id:
        # Filtering to a specific friend is always done from the caller's
        # own friends list, so this stays scoped to expenses they own.
        participant_cursor = db.shared_participants.find(
            {"person_type": "FRIEND", "person_id": friend_id}, {"shared_expense_id": 1}
        )
        shared_ids = [p["shared_expense_id"] async for p in participant_cursor]
        query: dict = {"owner_user_id": ObjectId(user_id), "_id": {"$in": shared_ids}}
    else:
        # Also surface expenses someone else created where I'm a linked
        # participant — otherwise only the creator ever sees a shared expense.
        participant_cursor = db.shared_participants.find(
            {"linked_user_id": user_id}, {"shared_expense_id": 1}
        )
        participant_shared_ids = [p["shared_expense_id"] async for p in participant_cursor]
        query = {"$or": [
            {"owner_user_id": ObjectId(user_id)},
            {"_id": {"$in": participant_shared_ids}},
        ]}
    cursor = db.shared_expenses.find(query).sort("expense_date", -1)
    docs = await cursor.to_list(length=200)
    result = []
    for doc in docs:
        participants = await _get_participants(str(doc["_id"]))
        result.append(await _shared_doc_to_response(db, doc, participants, user_id))
    return result


async def get_shared_expense(user_id: str, shared_id: str) -> SharedExpenseResponse:
    db = get_database()
    doc = await db.shared_expenses.find_one({"_id": ObjectId(shared_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared expense not found.")
    is_owner = str(doc["owner_user_id"]) == user_id
    if not is_owner:
        participates = await db.shared_participants.find_one(
            {"shared_expense_id": doc["_id"], "linked_user_id": user_id}
        )
        if not participates:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared expense not found.")
    participants = await _get_participants(shared_id)
    return await _shared_doc_to_response(db, doc, participants, user_id)


async def update_shared_expense(
    user_id: str, shared_id: str, data: SharedExpenseCreate
) -> SharedExpenseResponse:
    db = get_database()
    existing = await db.shared_expenses.find_one(
        {"_id": ObjectId(shared_id), "owner_user_id": ObjectId(user_id)}
    )
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared expense not found.")

    now = datetime.now(timezone.utc)
    _compute_shares(data)
    your_share = next(
        (p.share_amount_minor or 0 for p in data.participants if p.person_type == "USER" and p.person_id == user_id),
        0,
    )

    await db.expenses.update_one(
        {"_id": existing["expense_id"]},
        {"$set": {
            "title": data.title,
            "amount_minor": your_share,
            "currency": data.currency,
            "expense_date": data.expense_date.isoformat(),
            "category_id": data.category_id,
            "classification": data.classification.value,
            "note": data.note,
            "updated_at": now,
        }},
    )

    await db.shared_expenses.update_one(
        {"_id": existing["_id"]},
        {"$set": {
            "title": data.title,
            "total_amount_minor": data.total_amount_minor,
            "currency": data.currency,
            "expense_date": data.expense_date.isoformat(),
            "category_id": data.category_id,
            "classification": data.classification.value,
            "payer_type": data.payer_type.value,
            "payer_id": data.payer_id,
            "split_method": data.split_method.value,
            "note": data.note,
            "updated_at": now,
        }},
    )

    await db.shared_participants.delete_many({"shared_expense_id": existing["_id"]})
    participant_docs = []
    for p in data.participants:
        paid = data.total_amount_minor if (
            p.person_type == data.payer_type and p.person_id == data.payer_id
        ) else 0
        linked_user_id = await _resolve_participant_linked_user_id(db, p.person_type.value, p.person_id)
        participant_docs.append({
            "shared_expense_id": existing["_id"],
            "person_type": p.person_type.value,
            "person_id": p.person_id,
            "linked_user_id": linked_user_id,
            "share_amount_minor": p.share_amount_minor or 0,
            "share_percentage": p.share_percentage,
            "paid_amount_minor": paid,
            "settled_amount_minor": 0,
        })
    if participant_docs:
        await db.shared_participants.insert_many(participant_docs)

    updated_doc = await db.shared_expenses.find_one({"_id": existing["_id"]})
    participants = await _get_participants(str(existing["_id"]))
    return await _shared_doc_to_response(db, updated_doc, participants, user_id)


async def delete_shared_expense(user_id: str, shared_id: str) -> None:
    """Cascades to the linked personal expense and participant records so
    nothing is left orphaned (and silently still counted in balances)."""
    db = get_database()
    doc = await db.shared_expenses.find_one(
        {"_id": ObjectId(shared_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared expense not found.")
    await db.shared_participants.delete_many({"shared_expense_id": doc["_id"]})
    await db.expenses.delete_one({"_id": doc["expense_id"], "owner_user_id": ObjectId(user_id)})
    await db.shared_expenses.delete_one({"_id": doc["_id"]})


async def get_balances(user_id: str) -> list[BalanceResponse]:
    """
    Calculate net balance per friend from all shared expenses — both ones
    this user created, and ones a friend created where this user is a
    linked participant. Balance is derived from immutable participant
    records server-side.
    """
    db = get_database()
    owned_cursor = db.shared_expenses.find(
        {"owner_user_id": ObjectId(user_id)}, {"_id": 1, "currency": 1}
    )
    owned_docs = await owned_cursor.to_list(length=1000)

    participant_cursor = db.shared_participants.find(
        {"linked_user_id": user_id}, {"shared_expense_id": 1}
    )
    foreign_ids = [p["shared_expense_id"] async for p in participant_cursor]
    foreign_docs = []
    if foreign_ids:
        foreign_cursor = db.shared_expenses.find(
            {"_id": {"$in": foreign_ids}, "owner_user_id": {"$ne": ObjectId(user_id)}},
            {"_id": 1, "currency": 1},
        )
        foreign_docs = await foreign_cursor.to_list(length=1000)

    balances: dict[str, dict] = {}  # canonical identity -> balance info

    for shared in owned_docs + foreign_docs:
        shared_id = shared["_id"]
        currency = shared.get("currency", "INR")
        cursor = db.shared_participants.find({"shared_expense_id": shared_id})
        participants = await cursor.to_list(length=100)

        # Find this user's own participant record — either the owner's
        # direct USER row, or a FRIEND row that resolves back to them.
        me = next(
            (
                p for p in participants
                if (p["person_type"] == "USER" and p["person_id"] == user_id)
                or p.get("linked_user_id") == user_id
            ),
            None,
        )
        if not me:
            continue

        # Every expense has exactly one payer (create/update marks only that
        # participant's paid_amount_minor as nonzero) — pairwise debt only
        # ever flows to/from them, never between two non-paying participants.
        payer = next((p for p in participants if p.get("paid_amount_minor", 0) > 0), None)
        if payer is None:
            continue

        if payer is me:
            for p in participants:
                if p is me:
                    continue
                # I fronted the money, so each other participant owes me
                # exactly their own share.
                net = p.get("share_amount_minor", 0)
                person_type, person_id = await _canonical_identity(
                    db, p["person_type"], p["person_id"], p.get("linked_user_id")
                )
                key = f"{person_type}:{person_id}"
                if key not in balances:
                    balances[key] = {
                        "person_type": person_type,
                        "person_id": person_id,
                        "net_balance_minor": 0,
                        "currency": currency,
                    }
                balances[key]["net_balance_minor"] += net
        else:
            # Someone else paid — I owe them my own share.
            net = -me.get("share_amount_minor", 0)
            person_type, person_id = await _canonical_identity(
                db, payer["person_type"], payer["person_id"], payer.get("linked_user_id")
            )
            key = f"{person_type}:{person_id}"
            if key not in balances:
                balances[key] = {
                    "person_type": person_type,
                    "person_id": person_id,
                    "net_balance_minor": 0,
                    "currency": currency,
                }
            balances[key]["net_balance_minor"] += net

    # Apply recorded settlements: I_PAID reduces what the user owes (or
    # increases what the friend owes them); THEY_PAID does the reverse.
    settlements_cursor = db.settlements.find({"owner_user_id": ObjectId(user_id)})
    settlement_docs = await settlements_cursor.to_list(length=1000)
    for s in settlement_docs:
        person_type, person_id = await _canonical_identity(db, "FRIEND", s["friend_id"])
        key = f"{person_type}:{person_id}"
        delta = s["amount_minor"] if s["direction"] == "I_PAID" else -s["amount_minor"]
        if key not in balances:
            balances[key] = {
                "person_type": person_type,
                "person_id": person_id,
                "net_balance_minor": 0,
                "currency": s.get("currency", "INR"),
            }
        balances[key]["net_balance_minor"] += delta

    # Resolve display names
    result = []
    for key, b in balances.items():
        name = await _resolve_person_name(db, b["person_type"], b["person_id"])
        net = b["net_balance_minor"]
        if net > 0:
            description = "You receive"
        elif net < 0:
            description = "You owe"
        else:
            description = "Settled"
        result.append(BalanceResponse(
            person_type=b["person_type"],
            person_id=b["person_id"],
            person_name=name,
            net_balance_minor=net,
            currency=b["currency"],
            description=description,
        ))
    return result
