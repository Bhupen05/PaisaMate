from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.common import PersonType


class SettlementCreate(BaseModel):
    from_person_type: PersonType
    from_person_id: str
    to_person_type: PersonType
    to_person_id: str
    amount_minor: int = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    settlement_date: date
    note: str | None = Field(default=None, max_length=500)
    reference: str | None = Field(default=None, max_length=100)


class SettlementResponse(BaseModel):
    id: str
    owner_user_id: str
    from_person_type: PersonType
    from_person_id: str
    to_person_type: PersonType
    to_person_id: str
    amount_minor: int
    currency: str
    settlement_date: date
    note: str | None
    reference: str | None
    created_at: datetime
