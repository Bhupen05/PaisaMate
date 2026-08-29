from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.common import FriendStatus


class FriendInvite(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    # Required — used to look up an existing Suraty account to invite.
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    avatar: str | None = None


class FriendUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = None
    avatar: str | None = None


class FriendResponse(BaseModel):
    id: str
    owner_user_id: str
    name: str
    email: str | None
    phone: str | None
    avatar: str | None
    status: FriendStatus
    is_archived: bool
    is_pending: bool
    invite_token: str | None
    invited_at: datetime | None
    accepted_at: datetime | None
    linked_user_id: str | None
    net_balance_minor: int
    currency: str
    created_at: datetime
    updated_at: datetime


class InviteInfo(BaseModel):
    """Public, pre-login view of a pending invite — shown on the accept-invite page."""
    friend_name: str
    friend_email: str
    inviter_name: str
    status: FriendStatus


class InviteAcceptResponse(BaseModel):
    friend_name: str
    inviter_name: str
    accepted_at: datetime
