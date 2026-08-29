from fastapi import APIRouter, Depends, Query

from app.api.auth import get_current_user_id
from app.models.common import MessageResponse
from app.models.expense import ExpenseCreate, ExpenseListResponse, ExpenseResponse, ExpenseUpdate
from app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    user_id: str = Depends(get_current_user_id),
):
    return await expense_service.create_expense(user_id, data)


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    expense_type: str | None = None,
    classification: str | None = None,
    category_id: str | None = None,
    search: str | None = None,
    user_id: str = Depends(get_current_user_id),
):
    return await expense_service.get_expenses(
        user_id, page, page_size, expense_type, classification, category_id, search
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: str, user_id: str = Depends(get_current_user_id)):
    return await expense_service.get_expense(user_id, expense_id)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    user_id: str = Depends(get_current_user_id),
):
    return await expense_service.update_expense(user_id, expense_id, data)


@router.delete("/{expense_id}", response_model=MessageResponse)
async def delete_expense(expense_id: str, user_id: str = Depends(get_current_user_id)):
    await expense_service.delete_expense(user_id, expense_id)
    return MessageResponse(message="Expense deleted successfully.")
