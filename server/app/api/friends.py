from fastapi import APIRouter, Depends, Query

from app.api.auth import get_current_user_id
from app.models.common import MessageResponse
from app.models.friend import (
    FriendInvite,
    FriendResponse,
    FriendUpdate,
    InviteAcceptResponse,
    InviteInfo,
)
from app.services import friend_service

router = APIRouter(prefix="/friends", tags=["friends"])


@router.post("", response_model=FriendResponse, status_code=201)
async def invite_friend(data: FriendInvite, user_id: str = Depends(get_current_user_id)):
    return await friend_service.invite_friend(user_id, data)


@router.get("", response_model=list[FriendResponse])
async def list_friends(
    include_archived: bool = Query(default=False),
    user_id: str = Depends(get_current_user_id),
):
    return await friend_service.get_friends(user_id, include_archived)


# Public — no auth. Looked up by unguessable token, not by id, so an
# unauthenticated invitee can preview and accept without logging in.
@router.get("/invite/{token}", response_model=InviteInfo)
async def get_invite(token: str):
    return await friend_service.get_invite_info(token)


@router.post("/invite/{token}/accept", response_model=InviteAcceptResponse)
async def accept_invite(token: str, user_id: str = Depends(get_current_user_id)):
    return await friend_service.accept_invite(user_id, token)


@router.get("/{friend_id}", response_model=FriendResponse)
async def get_friend(friend_id: str, user_id: str = Depends(get_current_user_id)):
    return await friend_service.get_friend(user_id, friend_id)


@router.put("/{friend_id}", response_model=FriendResponse)
async def update_friend(
    friend_id: str,
    data: FriendUpdate,
    user_id: str = Depends(get_current_user_id),
):
    return await friend_service.update_friend(user_id, friend_id, data)


@router.post("/{friend_id}/resend-invite", response_model=FriendResponse)
async def resend_invite(friend_id: str, user_id: str = Depends(get_current_user_id)):
    return await friend_service.resend_invite(user_id, friend_id)


@router.post("/{friend_id}/archive", response_model=FriendResponse)
async def archive_friend(friend_id: str, user_id: str = Depends(get_current_user_id)):
    return await friend_service.archive_friend(user_id, friend_id)


@router.delete("/{friend_id}", response_model=MessageResponse)
async def delete_friend(friend_id: str, user_id: str = Depends(get_current_user_id)):
    await friend_service.delete_friend(user_id, friend_id)
    return MessageResponse(message="Friend deleted successfully.")
