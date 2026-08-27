from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.common import PersonType, SettlementStatus, SplitMethod


class ParticipantCreate(BaseModel):
    person_type: PersonType
    person_id: str
    share_amount_minor: int | None = Field(default=None, ge=0)
    share_percentage: float | None = Field(default=None, ge=0, le=100)


class SharedExpenseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    total_amount_minor: int = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    expense_date: date
    category_id: str | None = None
    payer_type: PersonType
    payer_id: str
    participants: list[ParticipantCreate] = Field(..., min_length=1)
    split_method: SplitMethod
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_splits(self) -> "SharedExpenseCreate":
        if self.split_method == SplitMethod.CUSTOM_AMOUNT:
            total = sum(
                p.share_amount_minor or 0 for p in self.participants
            )
            if total != self.total_amount_minor:
                raise ValueError(
                    f"Custom split total ({total}) must equal expense total ({self.total_amount_minor})"
                )
        if self.split_method == SplitMethod.PERCENTAGE:
            total_pct = sum(p.share_percentage or 0 for p in self.participants)
            if abs(total_pct - 100.0) > 0.001:
                raise ValueError(
                    f"Percentage split must sum to 100 (got {total_pct})"
                )
        return self


class ParticipantResponse(BaseModel):
    id: str
    shared_expense_id: str
    person_type: PersonType
    person_id: str
    share_amount_minor: int
    share_percentage: float | None
    paid_amount_minor: int
    settled_amount_minor: int


class SharedExpenseResponse(BaseModel):
    id: str
    expense_id: str
    owner_user_id: str
    title: str
    total_amount_minor: int
    currency: str
    expense_date: date
    category_id: str | None
    payer_type: PersonType
    payer_id: str
    split_method: SplitMethod
    status: SettlementStatus
    note: str | None
    participants: list[ParticipantResponse]
    created_at: datetime
    updated_at: datetime


class BalanceResponse(BaseModel):
    person_type: PersonType
    person_id: str
    person_name: str
    net_balance_minor: int
    currency: str
    description: str  # "You receive" / "You owe" / "Settled"
