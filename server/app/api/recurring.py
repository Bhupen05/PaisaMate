from fastapi import APIRouter, Depends

from app.api.auth import get_current_user_id
from app.models.common import MessageResponse
from app.models.recurring import RecurringExpenseCreate, RecurringExpenseResponse, RecurringExpenseUpdate
from app.services import recurring_service

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.post("", response_model=RecurringExpenseResponse, status_code=201)
async def create_recurring(data: RecurringExpenseCreate, user_id: str = Depends(get_current_user_id)):
    return await recurring_service.create_recurring(user_id, data)


@router.get("", response_model=list[RecurringExpenseResponse])
async def list_recurring(user_id: str = Depends(get_current_user_id)):
    return await recurring_service.get_recurring_expenses(user_id)


@router.get("/{recurring_id}", response_model=RecurringExpenseResponse)
async def get_recurring(recurring_id: str, user_id: str = Depends(get_current_user_id)):
    return await recurring_service.get_recurring(user_id, recurring_id)


@router.put("/{recurring_id}", response_model=RecurringExpenseResponse)
async def update_recurring(
    recurring_id: str,
    data: RecurringExpenseUpdate,
    user_id: str = Depends(get_current_user_id),
):
    return await recurring_service.update_recurring(user_id, recurring_id, data)


@router.post("/{recurring_id}/pause", response_model=RecurringExpenseResponse)
async def pause_recurring(recurring_id: str, user_id: str = Depends(get_current_user_id)):
    return await recurring_service.pause_recurring(user_id, recurring_id)


@router.post("/{recurring_id}/resume", response_model=RecurringExpenseResponse)
async def resume_recurring(recurring_id: str, user_id: str = Depends(get_current_user_id)):
    return await recurring_service.resume_recurring(user_id, recurring_id)


@router.delete("/{recurring_id}", response_model=MessageResponse)
async def delete_recurring(recurring_id: str, user_id: str = Depends(get_current_user_id)):
    await recurring_service.delete_recurring(user_id, recurring_id)
    return MessageResponse(message="Recurring expense deleted.")
