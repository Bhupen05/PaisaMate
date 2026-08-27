from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db.database import get_database
from app.models.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate, ExpenseListResponse
from app.models.common import ExpenseType


def _doc_to_response(doc: dict) -> ExpenseResponse:
    return ExpenseResponse(
        id=str(doc["_id"]),
        owner_user_id=str(doc["owner_user_id"]),
        title=doc["title"],
        amount_minor=doc["amount_minor"],
        currency=doc["currency"],
        expense_date=doc["expense_date"],
        category_id=doc.get("category_id"),
        classification=doc["classification"],
        payment_method=doc.get("payment_method"),
        expense_type=doc["expense_type"],
        note=doc.get("note"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


async def create_expense(user_id: str, data: ExpenseCreate) -> ExpenseResponse:
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "owner_user_id": ObjectId(user_id),
        "title": data.title,
        "amount_minor": data.amount_minor,
        "currency": data.currency,
        "expense_date": data.expense_date.isoformat(),
        "category_id": data.category_id,
        "classification": data.classification.value,
        "payment_method": data.payment_method,
        "expense_type": data.expense_type.value,
        "note": data.note,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.expenses.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


async def get_expenses(
    user_id: str,
    page: int = 1,
    page_size: int = 20,
    expense_type: str | None = None,
    classification: str | None = None,
    category_id: str | None = None,
    search: str | None = None,
) -> ExpenseListResponse:
    db = get_database()
    query: dict = {"owner_user_id": ObjectId(user_id)}
    if expense_type:
        query["expense_type"] = expense_type
    if classification:
        query["classification"] = classification
    if category_id:
        query["category_id"] = category_id
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    total = await db.expenses.count_documents(query)
    skip = (page - 1) * page_size
    cursor = db.expenses.find(query).sort("expense_date", -1).skip(skip).limit(page_size)
    docs = await cursor.to_list(length=page_size)
    return ExpenseListResponse(
        items=[_doc_to_response(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_expense(user_id: str, expense_id: str) -> ExpenseResponse:
    db = get_database()
    doc = await db.expenses.find_one(
        {"_id": ObjectId(expense_id), "owner_user_id": ObjectId(user_id)}
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
    return _doc_to_response(doc)


async def update_expense(user_id: str, expense_id: str, data: ExpenseUpdate) -> ExpenseResponse:
    db = get_database()
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "expense_date" in updates:
        updates["expense_date"] = updates["expense_date"].isoformat()
    if "classification" in updates:
        updates["classification"] = updates["classification"].value
    if not updates:
        return await get_expense(user_id, expense_id)
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.expenses.find_one_and_update(
        {"_id": ObjectId(expense_id), "owner_user_id": ObjectId(user_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
    return _doc_to_response(result)


async def delete_expense(user_id: str, expense_id: str) -> None:
    db = get_database()
    result = await db.expenses.delete_one(
        {"_id": ObjectId(expense_id), "owner_user_id": ObjectId(user_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
