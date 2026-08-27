from fastapi import APIRouter, Depends

from app.api.auth import get_current_user_id
from app.models.analytics import AnalyticsSummary, DashboardSummary
from app.services import analytics_service
from app.services.auth_service import get_current_user_doc

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardSummary)
async def dashboard_summary(user_id: str = Depends(get_current_user_id)):
    user_doc = await get_current_user_doc(user_id)
    currency = user_doc.get("currency", "INR")
    return await analytics_service.get_dashboard_summary(user_id, currency)


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(user_id: str = Depends(get_current_user_id)):
    user_doc = await get_current_user_doc(user_id)
    currency = user_doc.get("currency", "INR")
    return await analytics_service.get_analytics_summary(user_id, currency)
