from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.common import ExpenseType, SettlementStatus, SplitMethod
from app.models.shared_expense import (
    BalanceResponse,
    ParticipantResponse,
    SharedExpenseCreate,
    SharedExpenseResponse,
)
from app.services.money import calculate_equal_splits, calculate_percentage_splits


def _participant_doc_to_response(doc: dict) -> ParticipantResponse:
    return ParticipantResponse(
        id=str(doc["_id"]),
        shared_expense_id=str(doc["shared_expense_id"]),
        person_type=doc["person_type"],
        person_id=str(doc["person_id"]),
        share_amount_minor=doc["share_amount_minor"],
        share_percentage=doc.get("share_percentage"),
        paid_amount_minor=doc.get("paid_amount_minor", 0),
        settled_amount_minor=doc.get("settled_amount_minor", 0),
    )


async def _get_participants(shared_expense_id: str) -> list[ParticipantResponse]:
    db = get_database()
    cursor = db.shared_participants.find({"shared_expense_id": ObjectId(shared_expense_id)})
    docs = await cursor.to_list(length=100)
    return [_participant_doc_to_response(d) for d in docs]


def _your_share(user_id: str, participants: list[ParticipantResponse]) -> int:
    """The signed-in user's own slice of the bill (0 if they aren't a participant)."""
    return next(
        (p.share_amount_minor for p in participants if p.person_type == "USER" and p.person_id == user_id),
        0,
    )


def _shared_doc_to_response(
    doc: dict, participants: list[ParticipantResponse], user_id: str
) -> SharedExpenseResponse:
    return SharedExpenseResponse(
        id=str(doc["_id"]),
        expense_id=str(doc["expense_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        title=doc["title"],
        total_amount_minor=doc["total_amount_minor"],
        your_share_minor=_your_share(user_id, participants),
        currency=doc["currency"],
        expense_date=doc["expense_date"],
        category_id=doc.get("category_id"),
        classification=doc.get("classification", "NEED"),
        payer_type=doc["payer_type"],
        payer_id=str(doc["payer_id"]),
        split_method=doc["split_method"],
        status=doc.get("status", SettlementStatus.UNSETTLED),
        note=doc.get("note"),
        participants=participants,
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
        participant_docs.append({
            "shared_expense_id": shared_id,
            "person_type": p.person_type.value,
            "person_id": p.person_id,
            "share_amount_minor": p.share_amount_minor or 0,
            "share_percentage": p.share_percentage,
            "paid_amount_minor": paid,
            "settled_amount_minor": 0,
        })
    if participant_docs:
        await db.shared_participants.insert_many(participant_docs)

    shared_doc["_id"] = shared_id
    participants = await _get_participants(str(shared_id))
    return _shared_doc_to_response(shared_doc, participants, user_id)


async def get_shared_expenses(user_id: str, friend_id: str | None = None) -> list[SharedExpenseResponse]:
    db = get_database()
    query: dict = {"owner_user_id": ObjectId(user_id)}
    if friend_id:
        participant_cursor = db.shared_participants.find(
            {"person_type": "FRIEND", "person_id": friend_id}, {"shared_expense_id": 1}
        )
        shared_ids = [p["shared_expense_id"] async for p in participant_cursor]
        query["_id"] = {"$in": shared_ids}
    cursor = db.shared_expenses.find(query).sort("expense_date", -1)
    docs = await cursor.to_list(length=200)
    result = []
    for doc in docs:
        participants = await _get_participants(str(doc["_id"]))
        result.append(_shared_doc_to_response(doc, participants, user_id))
    return result


async def get_shared_expense(user_id: str, shared_id: str) -> SharedExpenseResponse:
    db = get_database()
    doc = await db.shared_expenses.find_one(
        {"_id": ObjectId(shared_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared expense not found.")
    participants = await _get_participants(shared_id)
    return _shared_doc_to_response(doc, participants, user_id)


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
        participant_docs.append({
            "shared_expense_id": existing["_id"],
            "person_type": p.person_type.value,
            "person_id": p.person_id,
            "share_amount_minor": p.share_amount_minor or 0,
            "share_percentage": p.share_percentage,
            "paid_amount_minor": paid,
            "settled_amount_minor": 0,
        })
    if participant_docs:
        await db.shared_participants.insert_many(participant_docs)

    updated_doc = await db.shared_expenses.find_one({"_id": existing["_id"]})
    participants = await _get_participants(str(existing["_id"]))
    return _shared_doc_to_response(updated_doc, participants, user_id)


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
    Calculate net balance per friend from all shared expenses.
    Balance is derived from immutable participant records server-side.
    """
    db = get_database()
    # Get all shared expenses owned by or involving this user
    shared_ids_cursor = db.shared_expenses.find(
        {"owner_user_id": ObjectId(user_id)}, {"_id": 1, "currency": 1}
    )
    shared_docs = await shared_ids_cursor.to_list(length=1000)

    balances: dict[str, dict] = {}  # person_id -> balance info

    for shared in shared_docs:
        shared_id = shared["_id"]
        currency = shared.get("currency", "INR")
        cursor = db.shared_participants.find({"shared_expense_id": shared_id})
        participants = await cursor.to_list(length=100)

        # Find current user's participant record
        user_participant = next(
            (p for p in participants if p["person_type"] == "USER" and p["person_id"] == user_id),
            None,
        )
        if not user_participant:
            continue

        user_paid = user_participant.get("paid_amount_minor", 0)
        user_share = user_participant.get("share_amount_minor", 0)

        for p in participants:
            if p["person_type"] == "USER" and p["person_id"] == user_id:
                continue
            friend_id = p["person_id"]
            friend_type = p["person_type"]
            friend_paid = p.get("paid_amount_minor", 0)
            friend_share = p.get("share_amount_minor", 0)

            # Net: positive means user should receive from friend
            net = (user_paid - user_share) - (friend_paid - friend_share)

            key = f"{friend_type}:{friend_id}"
            if key not in balances:
                balances[key] = {
                    "person_type": friend_type,
                    "person_id": friend_id,
                    "net_balance_minor": 0,
                    "currency": currency,
                }
            balances[key]["net_balance_minor"] += net

    # Apply recorded settlements: I_PAID reduces what the user owes (or
    # increases what the friend owes them); THEY_PAID does the reverse.
    settlements_cursor = db.settlements.find({"owner_user_id": ObjectId(user_id)})
    settlement_docs = await settlements_cursor.to_list(length=1000)
    for s in settlement_docs:
        friend_id = s["friend_id"]
        key = f"FRIEND:{friend_id}"
        delta = s["amount_minor"] if s["direction"] == "I_PAID" else -s["amount_minor"]
        if key not in balances:
            balances[key] = {
                "person_type": "FRIEND",
                "person_id": friend_id,
                "net_balance_minor": 0,
                "currency": s.get("currency", "INR"),
            }
        balances[key]["net_balance_minor"] += delta

    # Resolve friend names
    result = []
    for key, b in balances.items():
        if b["person_type"] == "FRIEND":
            friend_doc = await db.friends.find_one({"_id": ObjectId(b["person_id"])})
            name = friend_doc["name"] if friend_doc else "Unknown"
        else:
            name = "You"
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
