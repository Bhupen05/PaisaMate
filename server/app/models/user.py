from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field

from app.models.common import PyObjectId


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    currency: str = Field(default="INR", max_length=3)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(BaseModel):
    id: PyObjectId | None = Field(default=None, alias="_id")
    name: str
    email: str
    password_hash: str
    currency: str = "INR"
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    currency: str
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    currency: str | None = Field(default=None, max_length=3)

