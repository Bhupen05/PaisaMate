from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.common import PersonType, SplitMethod


class RecurringParticipantCreate(BaseModel):
    person_type: PersonType
    person_id: str
    share_amount_minor: int | None = Field(default=None, ge=0)
    share_percentage: float | None = Field(default=None, ge=0, le=100)


class RecurringExpenseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    amount_minor: int = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    billing_day: int = Field(..., ge=1, le=28)
    payer_type: PersonType
    payer_id: str
    participants: list[RecurringParticipantCreate] = Field(..., min_length=1)
    split_method: SplitMethod
    start_date: date
    end_date: date | None = None


class RecurringExpenseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    amount_minor: int | None = Field(default=None, gt=0)
    billing_day: int | None = Field(default=None, ge=1, le=28)
    payer_type: PersonType | None = None
    payer_id: str | None = None
    participants: list[RecurringParticipantCreate] | None = None
    split_method: SplitMethod | None = None
    end_date: date | None = None
    active: bool | None = None


class RecurringParticipantResponse(BaseModel):
    id: str
    recurring_expense_id: str
    person_type: PersonType
    person_id: str
    share_amount_minor: int | None
    share_percentage: float | None


class RecurringExpenseResponse(BaseModel):
    id: str
    owner_user_id: str
    title: str
    amount_minor: int
    currency: str
    billing_day: int
    payer_type: PersonType
    payer_id: str
    split_method: SplitMethod
    start_date: date
    end_date: date | None
    active: bool
    participants: list[RecurringParticipantResponse]
    created_at: datetime
    updated_at: datetime
