from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.common import SettlementDirection


class SettlementCreate(BaseModel):
    friend_id: str
    amount_minor: int = Field(..., gt=0)
    currency: str = Field(default="INR", max_length=3)
    direction: SettlementDirection
    settlement_date: date
    notes: str | None = Field(default=None, max_length=500)


class SettlementResponse(BaseModel):
    id: str
    friend_id: str
    friend_name: str
    amount_minor: int
    currency: str
    direction: SettlementDirection
    settlement_date: date
    notes: str | None
    created_at: datetime
