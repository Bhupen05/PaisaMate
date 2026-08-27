from datetime import date, datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.recurring import (
    RecurringExpenseCreate,
    RecurringExpenseResponse,
    RecurringExpenseUpdate,
    RecurringParticipantResponse,
)
from app.models.common import ExpenseType, SplitMethod
from app.services.money import calculate_equal_splits, calculate_percentage_splits


def _participant_doc_to_response(doc: dict) -> RecurringParticipantResponse:
    return RecurringParticipantResponse(
        id=str(doc["_id"]),
        recurring_expense_id=str(doc["recurring_expense_id"]),
        person_type=doc["person_type"],
        person_id=str(doc["person_id"]),
        share_amount_minor=doc.get("share_amount_minor"),
        share_percentage=doc.get("share_percentage"),
    )


def _doc_to_response(doc: dict, participants: list[RecurringParticipantResponse]) -> RecurringExpenseResponse:
    return RecurringExpenseResponse(
        id=str(doc["_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        title=doc["title"],
        amount_minor=doc["amount_minor"],
        currency=doc["currency"],
        billing_day=doc["billing_day"],
        payer_type=doc["payer_type"],
        payer_id=str(doc["payer_id"]),
        split_method=doc["split_method"],
        start_date=doc["start_date"],
        end_date=doc.get("end_date"),
        active=doc.get("active", True),
        participants=participants,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def _get_participants(recurring_id: str) -> list[RecurringParticipantResponse]:
    db = get_database()
    cursor = db.recurring_participants.find({"recurring_expense_id": ObjectId(recurring_id)})
    docs = await cursor.to_list(length=100)
    return [_participant_doc_to_response(d) for d in docs]


async def create_recurring(user_id: str, data: RecurringExpenseCreate) -> RecurringExpenseResponse:
    db = get_database()
    now = datetime.now(timezone.utc)

    # Pre-calculate shares for participants
    count = len(data.participants)
    if data.split_method == SplitMethod.EQUAL:
        shares = calculate_equal_splits(data.amount_minor, count)
        for i, p in enumerate(data.participants):
            p.share_amount_minor = shares[i]
            p.share_percentage = round(100.0 / count, 4)
    elif data.split_method == SplitMethod.PERCENTAGE:
        percentages = [p.share_percentage or 0.0 for p in data.participants]
        shares = calculate_percentage_splits(data.amount_minor, percentages)
        for i, p in enumerate(data.participants):
            p.share_amount_minor = shares[i]

    doc = {
        "owner_user_id": ObjectId(user_id),
        "title": data.title,
        "amount_minor": data.amount_minor,
        "currency": data.currency,
        "billing_day": data.billing_day,
        "payer_type": data.payer_type.value,
        "payer_id": data.payer_id,
        "split_method": data.split_method.value,
        "start_date": data.start_date.isoformat(),
        "end_date": data.end_date.isoformat() if data.end_date else None,
        "active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.recurring_expenses.insert_one(doc)
    recurring_id = result.inserted_id

    participant_docs = [
        {
            "recurring_expense_id": recurring_id,
            "person_type": p.person_type.value,
            "person_id": p.person_id,
            "share_amount_minor": p.share_amount_minor,
            "share_percentage": p.share_percentage,
        }
        for p in data.participants
    ]
    if participant_docs:
        await db.recurring_participants.insert_many(participant_docs)

    doc["_id"] = recurring_id
    participants = await _get_participants(str(recurring_id))
    return _doc_to_response(doc, participants)


async def get_recurring_expenses(user_id: str) -> list[RecurringExpenseResponse]:
    db = get_database()
    cursor = db.recurring_expenses.find({"owner_user_id": ObjectId(user_id)}).sort("title", 1)
    docs = await cursor.to_list(length=200)
    result = []
    for doc in docs:
        participants = await _get_participants(str(doc["_id"]))
        result.append(_doc_to_response(doc, participants))
    return result


async def get_recurring(user_id: str, recurring_id: str) -> RecurringExpenseResponse:
    db = get_database()
    doc = await db.recurring_expenses.find_one(
        {"_id": ObjectId(recurring_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found.")
    participants = await _get_participants(recurring_id)
    return _doc_to_response(doc, participants)


async def update_recurring(
    user_id: str, recurring_id: str, data: RecurringExpenseUpdate
) -> RecurringExpenseResponse:
    """Update template — does NOT modify historical generated expenses."""
    db = get_database()
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "end_date" in updates and updates["end_date"]:
        updates["end_date"] = updates["end_date"].isoformat()
    updates["updated_at"] = datetime.now(timezone.utc)

    result = await db.recurring_expenses.find_one_and_update(
        {"_id": ObjectId(recurring_id), "owner_user_id": ObjectId(user_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found.")
    participants = await _get_participants(recurring_id)
    return _doc_to_response(result, participants)


async def pause_recurring(user_id: str, recurring_id: str) -> RecurringExpenseResponse:
    return await update_recurring(user_id, recurring_id, RecurringExpenseUpdate(active=False))


async def resume_recurring(user_id: str, recurring_id: str) -> RecurringExpenseResponse:
    return await update_recurring(user_id, recurring_id, RecurringExpenseUpdate(active=True))


async def delete_recurring(user_id: str, recurring_id: str) -> None:
    db = get_database()
    result = await db.recurring_expenses.delete_one(
        {"_id": ObjectId(recurring_id), "owner_user_id": ObjectId(user_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found.")
    await db.recurring_participants.delete_many({"recurring_expense_id": ObjectId(recurring_id)})
