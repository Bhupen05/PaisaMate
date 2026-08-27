from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.common import Classification, ExpenseType, PyObjectId


class ExpenseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount_minor: int = Field(..., gt=0, description="Amount in minor units (paise for INR)")
    currency: str = Field(default="INR", max_length=3)
    expense_date: date
    category_id: str | None = Field(default=None)
    classification: Classification
    payment_method: str | None = Field(default=None, max_length=50)
    expense_type: ExpenseType = ExpenseType.PERSONAL
    note: str | None = Field(default=None, max_length=500)


class ExpenseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    amount_minor: int | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, max_length=3)
    expense_date: date | None = None
    category_id: str | None = None
    classification: Classification | None = None
    payment_method: str | None = None
    note: str | None = None


class ExpenseResponse(BaseModel):
    id: str
    owner_user_id: str
    title: str
    amount_minor: int
    currency: str
    expense_date: date
    category_id: str | None
    classification: Classification
    payment_method: str | None
    expense_type: ExpenseType
    note: str | None
    created_at: datetime
    updated_at: datetime


class ExpenseListResponse(BaseModel):
    items: list[ExpenseResponse]
    total: int
    page: int
    page_size: int
