from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import Classification


class RecurringExpenseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount_minor: int = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    category_id: str | None = None
    classification: Classification = Classification.NEED
    billing_day: int = Field(..., ge=1, le=28)


class RecurringExpenseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    amount_minor: int | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, max_length=3)
    category_id: str | None = None
    classification: Classification | None = None
    billing_day: int | None = Field(default=None, ge=1, le=28)
    is_active: bool | None = None


class RecurringExpenseResponse(BaseModel):
    id: str
    owner_user_id: str
    title: str
    amount_minor: int
    currency: str
    category_id: str | None
    classification: Classification
    billing_day: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
