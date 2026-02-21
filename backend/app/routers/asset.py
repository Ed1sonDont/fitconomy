from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.asset_snapshot import AssetSnapshot
from app.schemas.asset import AssetCurrentOut, AssetHistoryPoint


router = APIRouter()


@router.get("/current", response_model=AssetCurrentOut)
async def get_current_asset(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Latest snapshot
    latest_result = await db.execute(
        select(AssetSnapshot)
        .where(AssetSnapshot.user_id == current_user.id)
        .order_by(AssetSnapshot.created_at.desc())
        .limit(2)
    )
    snapshots = list(latest_result.scalars().all())

    current_value = snapshots[0].asset_value if snapshots else 1000.0
    previous_value = snapshots[1].asset_value if len(snapshots) > 1 else None

    change_24h = current_value - (previous_value or current_value)
    change_24h_pct = (change_24h / (previous_value or current_value)) * 100 if previous_value else 0.0

    # All-time high / low
    stats_result = await db.execute(
        select(
            func.max(AssetSnapshot.asset_value),
            func.min(AssetSnapshot.asset_value),
        ).where(AssetSnapshot.user_id == current_user.id)
    )
    ath, atl = stats_result.one()

    return AssetCurrentOut(
        current_value=current_value,
        previous_value=previous_value,
        change_24h=round(change_24h, 4),
        change_24h_pct=round(change_24h_pct, 2),
        all_time_high=ath or current_value,
        all_time_low=atl or current_value,
    )


@router.get("/history", response_model=list[AssetHistoryPoint])
async def get_asset_history(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(AssetSnapshot)
        .where(
            and_(
                AssetSnapshot.user_id == current_user.id,
                AssetSnapshot.snapshot_date >= cutoff,
            )
        )
        .order_by(AssetSnapshot.snapshot_date.asc(), AssetSnapshot.created_at.asc())
    )
    snapshots = list(result.scalars().all())

    return [
        AssetHistoryPoint(
            date=s.snapshot_date,
            value=s.asset_value,
            delta=s.delta,
            trigger_type=s.trigger_type,
        )
        for s in snapshots
    ]
