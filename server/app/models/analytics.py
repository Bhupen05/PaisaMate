from pydantic import BaseModel


class MonthlyPoint(BaseModel):
    month: str  # "2026-08"
    total_minor: int
    personal_minor: int
    shared_minor: int


class CategoryBreakdown(BaseModel):
    category_id: str
    total_minor: int
    count: int


class ClassificationBreakdown(BaseModel):
    classification: str
    total_minor: int
    count: int


class DashboardSummary(BaseModel):
    today_total_minor: int
    month_total_minor: int
    need_total_minor: int
    want_total_minor: int
    dream_total_minor: int
    you_owe_minor: int
    owed_to_you_minor: int
    currency: str


class AnalyticsSummary(BaseModel):
    total_spending_minor: int
    average_daily_minor: int
    monthly_trend: list[MonthlyPoint]
    category_breakdown: list[CategoryBreakdown]
    classification_breakdown: list[ClassificationBreakdown]
    currency: str
