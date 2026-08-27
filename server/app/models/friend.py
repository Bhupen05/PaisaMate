from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.common import FriendStatus


class FriendCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr | None = None
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
    created_at: datetime
    updated_at: datetime
