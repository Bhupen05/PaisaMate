from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.settlement import SettlementCreate, SettlementResponse


def _doc_to_response(doc: dict) -> SettlementResponse:
    return SettlementResponse(
        id=str(doc["_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        from_person_type=doc["from_person_type"],
        from_person_id=str(doc["from_person_id"]),
        to_person_type=doc["to_person_type"],
        to_person_id=str(doc["to_person_id"]),
        amount_minor=doc["amount_minor"],
        currency=doc["currency"],
        settlement_date=doc["settlement_date"],
        note=doc.get("note"),
        reference=doc.get("reference"),
        created_at=doc["created_at"],
    )


async def create_settlement(user_id: str, data: SettlementCreate) -> SettlementResponse:
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": ObjectId(user_id),
        "from_person_type": data.from_person_type.value,
        "from_person_id": data.from_person_id,
        "to_person_type": data.to_person_type.value,
        "to_person_id": data.to_person_id,
        "amount_minor": data.amount_minor,
        "currency": data.currency,
        "settlement_date": data.settlement_date.isoformat(),
        "note": data.note,
        "reference": data.reference,
        "created_at": now,
    }
    result = await db.settlements.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_settlements(user_id: str) -> list[SettlementResponse]:
    db = get_database()
    cursor = db.settlements.find({"owner_user_id": ObjectId(user_id)}).sort("settlement_date", -1)
    docs = await cursor.to_list(length=500)
    return [_doc_to_response(d) for d in docs]
