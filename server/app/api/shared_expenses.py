from fastapi import APIRouter, Depends

from app.api.auth import get_current_user_id
from app.models.shared_expense import BalanceResponse, SharedExpenseCreate, SharedExpenseResponse
from app.services import shared_expense_service

router = APIRouter(prefix="/shared-expenses", tags=["shared-expenses"])


@router.post("", response_model=SharedExpenseResponse, status_code=201)
async def create_shared_expense(
    data: SharedExpenseCreate, user_id: str = Depends(get_current_user_id)
):
    return await shared_expense_service.create_shared_expense(user_id, data)


@router.get("", response_model=list[SharedExpenseResponse])
async def list_shared_expenses(user_id: str = Depends(get_current_user_id)):
    return await shared_expense_service.get_shared_expenses(user_id)


@router.get("/{shared_id}", response_model=SharedExpenseResponse)
async def get_shared_expense(shared_id: str, user_id: str = Depends(get_current_user_id)):
    return await shared_expense_service.get_shared_expense(user_id, shared_id)


balances_router = APIRouter(prefix="/balances", tags=["balances"])


@balances_router.get("", response_model=list[BalanceResponse])
async def get_balances(user_id: str = Depends(get_current_user_id)):
    return await shared_expense_service.get_balances(user_id)
