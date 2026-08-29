from datetime import datetime, timezone, date, timedelta

from bson import ObjectId

from app.db.database import get_database
from app.models.analytics import (
    AnalyticsSummary,
    CategoryBreakdown,
    ClassificationBreakdown,
    DashboardSummary,
    MonthlyPoint,
)
from app.services.shared_expense_service import get_balances


async def get_dashboard_summary(user_id: str, currency: str = "INR") -> DashboardSummary:
    db = get_database()
    now = datetime.now(timezone.utc)
    today = now.date()
    month_start = today.replace(day=1)

    uid = ObjectId(user_id)

    # Today's spending
    today_pipeline = [
        {"$match": {"owner_user_id": uid, "expense_date": today.isoformat()}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_minor"}}},
    ]
    today_result = await db.expenses.aggregate(today_pipeline).to_list(1)
    today_total = today_result[0]["total"] if today_result else 0

    # Month spending
    month_pipeline = [
        {"$match": {
            "owner_user_id": uid,
            "expense_date": {"$gte": month_start.isoformat(), "$lte": today.isoformat()},
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount_minor"}}},
    ]
    month_result = await db.expenses.aggregate(month_pipeline).to_list(1)
    month_total = month_result[0]["total"] if month_result else 0

    # Classification breakdown (this month)
    class_pipeline = [
        {"$match": {
            "owner_user_id": uid,
            "expense_date": {"$gte": month_start.isoformat(), "$lte": today.isoformat()},
        }},
        {"$group": {"_id": "$classification", "total": {"$sum": "$amount_minor"}}},
    ]
    class_results = await db.expenses.aggregate(class_pipeline).to_list(10)
    class_map = {r["_id"]: r["total"] for r in class_results}

    balances = await get_balances(user_id)
    you_owe = sum(-b.net_balance_minor for b in balances if b.net_balance_minor < 0)
    owed_to_you = sum(b.net_balance_minor for b in balances if b.net_balance_minor > 0)

    return DashboardSummary(
        today_total_minor=today_total,
        month_total_minor=month_total,
        need_total_minor=class_map.get("NEED", 0),
        want_total_minor=class_map.get("WANT", 0),
        dream_total_minor=class_map.get("DREAM", 0),
        you_owe_minor=you_owe,
        owed_to_you_minor=owed_to_you,
        currency=currency,
    )


async def get_analytics_summary(user_id: str, currency: str = "INR") -> AnalyticsSummary:
    db = get_database()
    uid = ObjectId(user_id)
    today = datetime.now(timezone.utc).date()

    # Total spending
    total_pipeline = [
        {"$match": {"owner_user_id": uid}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_minor"}, "count": {"$sum": 1}}},
    ]
    total_result = await db.expenses.aggregate(total_pipeline).to_list(1)
    total_spending = total_result[0]["total"] if total_result else 0
    total_count = total_result[0]["count"] if total_result else 1

    # Average per transaction
    avg_per_transaction = total_spending // max(total_count, 1)

    # Monthly trend (last 6 months)
    monthly_points = []
    for i in range(5, -1, -1):
        ref = today.replace(day=1) - timedelta(days=i * 28)
        month_label = ref.strftime("%Y-%m")
        month_start = ref.replace(day=1).isoformat()
        if ref.month == 12:
            month_end = ref.replace(year=ref.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = ref.replace(month=ref.month + 1, day=1) - timedelta(days=1)

        mp = [
            {"$match": {
                "owner_user_id": uid,
                "expense_date": {"$gte": month_start, "$lte": month_end.isoformat()},
            }},
            {"$group": {
                "_id": "$expense_type",
                "total": {"$sum": "$amount_minor"},
            }},
        ]
        mp_results = await db.expenses.aggregate(mp).to_list(5)
        mp_map = {r["_id"]: r["total"] for r in mp_results}
        total_m = sum(mp_map.values())
        monthly_points.append(MonthlyPoint(
            month=month_label,
            total_minor=total_m,
            personal_minor=mp_map.get("PERSONAL", 0),
            shared_minor=mp_map.get("SHARED", 0),
        ))

    # Category breakdown
    cat_pipeline = [
        {"$match": {"owner_user_id": uid}},
        {"$group": {"_id": "$category_id", "total": {"$sum": "$amount_minor"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    cat_results = await db.expenses.aggregate(cat_pipeline).to_list(20)
    category_breakdown = [
        CategoryBreakdown(category_id=r["_id"] or "other", total_minor=r["total"], count=r["count"])
        for r in cat_results
    ]

    # Classification breakdown
    class_pipeline = [
        {"$match": {"owner_user_id": uid}},
        {"$group": {"_id": "$classification", "total": {"$sum": "$amount_minor"}, "count": {"$sum": 1}}},
    ]
    class_results = await db.expenses.aggregate(class_pipeline).to_list(5)
    classification_breakdown = [
        ClassificationBreakdown(classification=r["_id"], total_minor=r["total"], count=r["count"])
        for r in class_results
    ]

    return AnalyticsSummary(
        total_spending_minor=total_spending,
        average_per_transaction_minor=avg_per_transaction,
        monthly_trend=monthly_points,
        category_breakdown=category_breakdown,
        classification_breakdown=classification_breakdown,
        currency=currency,
    )
