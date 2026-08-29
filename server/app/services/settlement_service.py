from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
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
    }
    result = await db.settlements.insert_one(doc)
    doc["_id"] = result.inserted_id
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
    result = await db.settlements.delete_one(
        {"_id": ObjectId(settlement_id), "owner_user_id": ObjectId(user_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found.")
