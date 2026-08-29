from fastapi import APIRouter, Depends

from app.api.auth import get_current_user_id
from app.models.common import MessageResponse
from app.models.settlement import SettlementCreate, SettlementResponse
from app.services import settlement_service

router = APIRouter(prefix="/settlements", tags=["settlements"])


@router.post("", response_model=SettlementResponse, status_code=201)
async def create_settlement(data: SettlementCreate, user_id: str = Depends(get_current_user_id)):
    return await settlement_service.create_settlement(user_id, data)


@router.get("", response_model=list[SettlementResponse])
async def list_settlements(friend_id: str | None = None, user_id: str = Depends(get_current_user_id)):
    return await settlement_service.get_settlements(user_id, friend_id)


@router.delete("/{settlement_id}", response_model=MessageResponse)
async def delete_settlement(settlement_id: str, user_id: str = Depends(get_current_user_id)):
    await settlement_service.delete_settlement(user_id, settlement_id)
    return MessageResponse(message="Settlement deleted successfully.")
