from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.common import FriendStatus, SettlementDirection
from app.models.settlement import SettlementCreate, SettlementResponse


def _doc_to_response(doc: dict, friend_name: str) -> SettlementResponse:
    return SettlementResponse(
        id=str(doc["_id"]),
        friend_id=doc["friend_id"],
        friend_name=friend_name,
        amount_minor=doc["amount_minor"],
        currency=doc["currency"],
        direction=doc["direction"],
        settlement_date=doc["settlement_date"],
        notes=doc.get("notes"),
        created_at=doc["created_at"],
    )


async def create_settlement(user_id: str, data: SettlementCreate) -> SettlementResponse:
    db = get_database()
    friend_doc = await db.friends.find_one(
        {"_id": ObjectId(data.friend_id), "owner_user_id": ObjectId(user_id)}
    )
    if not friend_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found.")

    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": ObjectId(user_id),
        "friend_id": data.friend_id,
        "amount_minor": data.amount_minor,
        "currency": data.currency,
        "direction": data.direction.value,
        "settlement_date": data.settlement_date.isoformat(),
        "notes": data.notes,
        "created_at": now,
        "mirror_settlement_id": None,
    }
    result = await db.settlements.insert_one(doc)
    doc["_id"] = result.inserted_id

    # get_balances only ever reads settlements the caller themselves
    # recorded, so without this, a settlement Alice records would be
    # invisible in Bob's own balance view — the two sides would silently
    # disagree about whether they're settled up. Mirror it into the
    # friend's own settlements collection (flipping direction, since "I
    # paid them" from Alice's side is "they paid me" from Bob's) whenever
    # they're a linked, accepted Suraty account.
    friend_real_uid = friend_doc.get("linked_user_id")
    if friend_real_uid and friend_doc.get("status") == FriendStatus.ACTIVE.value:
        reciprocal_friend = await db.friends.find_one({
            "owner_user_id": ObjectId(friend_real_uid),
            "linked_user_id": user_id,
        })
        if reciprocal_friend:
            mirrored_direction = (
                SettlementDirection.THEY_PAID.value
                if data.direction == SettlementDirection.I_PAID
                else SettlementDirection.I_PAID.value
            )
            mirror_result = await db.settlements.insert_one({
                "owner_user_id": ObjectId(friend_real_uid),
                "friend_id": str(reciprocal_friend["_id"]),
                "amount_minor": data.amount_minor,
                "currency": data.currency,
                "direction": mirrored_direction,
                "settlement_date": data.settlement_date.isoformat(),
                "notes": data.notes,
                "created_at": now,
                "mirror_settlement_id": doc["_id"],
            })
            await db.settlements.update_one(
                {"_id": doc["_id"]}, {"$set": {"mirror_settlement_id": mirror_result.inserted_id}}
            )

    return _doc_to_response(doc, friend_doc["name"])


async def get_settlements(user_id: str, friend_id: str | None = None) -> list[SettlementResponse]:
    db = get_database()
    query: dict = {"owner_user_id": ObjectId(user_id)}
    if friend_id:
        query["friend_id"] = friend_id
    cursor = db.settlements.find(query).sort("settlement_date", -1)
    docs = await cursor.to_list(length=500)

    friend_ids = [ObjectId(d["friend_id"]) for d in docs if ObjectId.is_valid(d["friend_id"])]
    friend_names: dict[str, str] = {}
    if friend_ids:
        friends_cursor = db.friends.find({"_id": {"$in": friend_ids}}, {"name": 1})
        friend_names = {str(f["_id"]): f["name"] async for f in friends_cursor}

    return [_doc_to_response(d, friend_names.get(d["friend_id"], "Unknown")) for d in docs]


async def delete_settlement(user_id: str, settlement_id: str) -> None:
    db = get_database()
    doc = await db.settlements.find_one(
        {"_id": ObjectId(settlement_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found.")
    mirror_id = doc.get("mirror_settlement_id")
    if mirror_id:
        # Deleting only this side would resurrect the same one-sided-balance
        # bug create_settlement's mirroring fixes — drop the friend's copy too.
        await db.settlements.delete_one({"_id": mirror_id})
    await db.settlements.delete_one({"_id": doc["_id"]})
