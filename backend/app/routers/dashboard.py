from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.asset_snapshot import AssetSnapshot
from app.models.weight_record import WeightRecord
from app.models.food_record import FoodRecord
from app.schemas.asset import DashboardOut, AssetHistoryPoint


router = APIRouter()


@router.get("/today", response_model=DashboardOut)
async def get_today_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    cutoff_30 = today - timedelta(days=30)

    # ── Asset ────────────────────────────────────────────────────────────────
    asset_result = await db.execute(
        select(AssetSnapshot)
        .where(AssetSnapshot.user_id == current_user.id)
        .order_by(AssetSnapshot.created_at.desc())
        .limit(2)
    )
    recent_assets = list(asset_result.scalars().all())
    current_asset = recent_assets[0].asset_value if recent_assets else 1000.0
    prev_asset = recent_assets[1].asset_value if len(recent_assets) > 1 else current_asset
    asset_change_pct = ((current_asset - prev_asset) / prev_asset * 100) if prev_asset else 0.0

    history_result = await db.execute(
        select(AssetSnapshot)
        .where(
            and_(
                AssetSnapshot.user_id == current_user.id,
                AssetSnapshot.snapshot_date >= cutoff_30,
            )
        )
        .order_by(AssetSnapshot.snapshot_date.asc(), AssetSnapshot.created_at.asc())
    )
    asset_history = [
        AssetHistoryPoint(
            date=s.snapshot_date,
            value=s.asset_value,
            delta=s.delta,
            trigger_type=s.trigger_type,
        )
        for s in history_result.scalars().all()
    ]

    # ── Weight ───────────────────────────────────────────────────────────────
    weight_result = await db.execute(
        select(WeightRecord)
        .where(
            and_(
                WeightRecord.user_id == current_user.id,
                WeightRecord.recorded_date >= cutoff_30,
            )
        )
        .order_by(WeightRecord.recorded_date.asc())
    )
    weight_records = list(weight_result.scalars().all())
    weight_history = [
        {"date": str(r.recorded_date), "weight_kg": r.weight_kg} for r in weight_records
    ]
    weight_current = weight_records[-1].weight_kg if weight_records else None

    # ── Food / Calories ──────────────────────────────────────────────────────
    calorie_result = await db.execute(
        select(func.sum(FoodRecord.total_calories))
        .where(
            and_(
                FoodRecord.user_id == current_user.id,
                FoodRecord.recorded_date == today,
            )
        )
    )
    today_calories = calorie_result.scalar_one_or_none() or 0
    calorie_target = current_user.daily_calorie_target
    calorie_pct = min((today_calories / calorie_target * 100) if calorie_target else 0, 200)

    # ── Streak ───────────────────────────────────────────────────────────────
    streak = 0
    check_date = today - timedelta(days=1)
    for _ in range(365):
        w = await db.execute(
            select(WeightRecord.id).where(
                and_(WeightRecord.user_id == current_user.id, WeightRecord.recorded_date == check_date)
            ).limit(1)
        )
        f = await db.execute(
            select(FoodRecord.id).where(
                and_(FoodRecord.user_id == current_user.id, FoodRecord.recorded_date == check_date)
            ).limit(1)
        )
        if w.scalar_one_or_none() or f.scalar_one_or_none():
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return DashboardOut(
        asset_current=current_asset,
        asset_change_pct=round(asset_change_pct, 2),
        asset_history=asset_history,
        weight_current=weight_current,
        weight_goal=current_user.goal_weight,
        weight_history=weight_history,
        today_calories=today_calories,
        calorie_target=calorie_target,
        calorie_pct=round(calorie_pct, 1),
        streak_days=streak,
    )
