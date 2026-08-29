from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.recurring import (
    RecurringExpenseCreate,
    RecurringExpenseResponse,
    RecurringExpenseUpdate,
)


def _doc_to_response(doc: dict) -> RecurringExpenseResponse:
    return RecurringExpenseResponse(
        id=str(doc["_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        title=doc["title"],
        amount_minor=doc["amount_minor"],
        currency=doc["currency"],
        category_id=doc.get("category_id"),
        classification=doc["classification"],
        billing_day=doc["billing_day"],
        is_active=doc.get("is_active", True),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def create_recurring(user_id: str, data: RecurringExpenseCreate) -> RecurringExpenseResponse:
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": ObjectId(user_id),
        "title": data.title,
        "amount_minor": data.amount_minor,
        "currency": data.currency,
        "category_id": data.category_id,
        "classification": data.classification.value,
        "billing_day": data.billing_day,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.recurring_expenses.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_recurring_expenses(user_id: str) -> list[RecurringExpenseResponse]:
    db = get_database()
    cursor = db.recurring_expenses.find({"owner_user_id": ObjectId(user_id)}).sort("title", 1)
    docs = await cursor.to_list(length=200)
    return [_doc_to_response(d) for d in docs]


async def get_recurring(user_id: str, recurring_id: str) -> RecurringExpenseResponse:
    db = get_database()
    doc = await db.recurring_expenses.find_one(
        {"_id": ObjectId(recurring_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found.")
    return _doc_to_response(doc)


async def update_recurring(
    user_id: str, recurring_id: str, data: RecurringExpenseUpdate
) -> RecurringExpenseResponse:
    db = get_database()
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "classification" in updates:
        updates["classification"] = data.classification.value
    if not updates:
        return await get_recurring(user_id, recurring_id)
    updates["updated_at"] = datetime.now(timezone.utc)

    result = await db.recurring_expenses.find_one_and_update(
        {"_id": ObjectId(recurring_id), "owner_user_id": ObjectId(user_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found.")
    return _doc_to_response(result)


async def pause_recurring(user_id: str, recurring_id: str) -> RecurringExpenseResponse:
    return await update_recurring(user_id, recurring_id, RecurringExpenseUpdate(is_active=False))


async def resume_recurring(user_id: str, recurring_id: str) -> RecurringExpenseResponse:
    return await update_recurring(user_id, recurring_id, RecurringExpenseUpdate(is_active=True))


async def delete_recurring(user_id: str, recurring_id: str) -> None:
    db = get_database()
    result = await db.recurring_expenses.delete_one(
        {"_id": ObjectId(recurring_id), "owner_user_id": ObjectId(user_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found.")


async def process_due_recurring_expenses() -> int:
    """
    Post a real personal-expense record for every active recurring template
    whose billing day has arrived and hasn't already been posted this month.
    Idempotent per (template, month) via last_generated_month, so it's safe
    to call repeatedly (e.g. from a periodic background task).
    """
    db = get_database()
    today = datetime.now(timezone.utc).date()
    current_month = today.strftime("%Y-%m")

    cursor = db.recurring_expenses.find({
        "is_active": True,
        "billing_day": {"$lte": today.day},
        "last_generated_month": {"$ne": current_month},
    })
    due = await cursor.to_list(length=1000)

    for tmpl in due:
        now = datetime.now(timezone.utc)
        await db.expenses.insert_one({
            "owner_user_id": tmpl["owner_user_id"],
            "title": tmpl["title"],
            "amount_minor": tmpl["amount_minor"],
            "currency": tmpl["currency"],
            "expense_date": today.isoformat(),
            "category_id": tmpl.get("category_id"),
            "classification": tmpl["classification"],
            "payment_method": None,
            "expense_type": "PERSONAL",
            "note": f"Auto-posted from recurring: {tmpl['title']}",
            "created_at": now,
            "updated_at": now,
        })
        await db.recurring_expenses.update_one(
            {"_id": tmpl["_id"]},
            {"$set": {"last_generated_month": current_month, "updated_at": now}},
        )

    return len(due)
