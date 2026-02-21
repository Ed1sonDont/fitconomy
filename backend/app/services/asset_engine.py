"""
Asset Engine – Core gamification logic.

Every time a user logs weight or food, this engine re-calculates their
virtual asset value and writes a new AssetSnapshot to the database.

Algorithm (MVP):
  Weight trigger:
    Each 0.1 kg decrease  → asset +0.5%
    Each 0.1 kg increase  → asset −0.3%  (floor: ASSET_FLOOR)

  Food trigger:
    Each food record logged → asset +0.1%
    If calories within 80%–110% of daily target → additional +0.2%

  Streak bonus (applied once per day, with food trigger):
    3+ consecutive days → +1%
    7+ consecutive days → +3%
"""

import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.models.asset_snapshot import AssetSnapshot, TriggerType
from app.models.weight_record import WeightRecord
from app.models.food_record import FoodRecord
from app.config import settings


# ── Rate constants ─────────────────────────────────────────────────────────
WEIGHT_DOWN_RATE = 0.005   # +0.5% per 0.1 kg lost
WEIGHT_UP_RATE = 0.003     # −0.3% per 0.1 kg gained
FOOD_LOG_BONUS = 0.001     # +0.1% for logging a meal
CALORIE_RANGE_BONUS = 0.002  # +0.2% if in calorie target range
STREAK_3_BONUS = 0.01      # +1%
STREAK_7_BONUS = 0.03      # +3%


async def _get_current_asset(user_id: uuid.UUID, db: AsyncSession) -> float:
    result = await db.execute(
        select(AssetSnapshot.asset_value)
        .where(AssetSnapshot.user_id == user_id)
        .order_by(AssetSnapshot.created_at.desc())
        .limit(1)
    )
    value = result.scalar_one_or_none()
    return value if value is not None else settings.INITIAL_ASSET_VALUE


async def _get_previous_weight(user_id: uuid.UUID, current_date: date, db: AsyncSession) -> float | None:
    result = await db.execute(
        select(WeightRecord.weight_kg)
        .where(
            and_(
                WeightRecord.user_id == user_id,
                WeightRecord.recorded_date < current_date,
            )
        )
        .order_by(WeightRecord.recorded_date.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_streak(user_id: uuid.UUID, db: AsyncSession) -> int:
    """Count consecutive days with any activity (weight or food record)."""
    today = date.today()
    streak = 0
    check_date = today - timedelta(days=1)

    for _ in range(365):
        weight_res = await db.execute(
            select(WeightRecord.id)
            .where(
                and_(
                    WeightRecord.user_id == user_id,
                    WeightRecord.recorded_date == check_date,
                )
            )
            .limit(1)
        )
        food_res = await db.execute(
            select(FoodRecord.id)
            .where(
                and_(
                    FoodRecord.user_id == user_id,
                    FoodRecord.recorded_date == check_date,
                )
            )
            .limit(1)
        )
        if weight_res.scalar_one_or_none() is not None or food_res.scalar_one_or_none() is not None:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return streak


def _apply_floor(value: float) -> float:
    return max(value, settings.ASSET_FLOOR)


async def trigger_weight(
    user_id: uuid.UUID,
    new_weight: float,
    recorded_date: date,
    db: AsyncSession,
) -> AssetSnapshot:
    """Called after a weight record is saved. Adjusts asset based on weight delta."""
    current_value = await _get_current_asset(user_id, db)
    prev_weight = await _get_previous_weight(user_id, recorded_date, db)

    if prev_weight is None:
        # First weigh-in – no asset change, just record the baseline
        snapshot = AssetSnapshot(
            user_id=user_id,
            asset_value=current_value,
            delta=0.0,
            trigger_type=TriggerType.weight_initial,
            snapshot_date=recorded_date,
        )
        db.add(snapshot)
        return snapshot

    weight_diff = prev_weight - new_weight  # positive → lost weight
    units = abs(weight_diff) / 0.1  # number of 0.1 kg units

    if weight_diff > 0:
        delta_pct = units * WEIGHT_DOWN_RATE
        trigger = TriggerType.weight_down
    elif weight_diff < 0:
        delta_pct = -(units * WEIGHT_UP_RATE)
        trigger = TriggerType.weight_up
    else:
        delta_pct = 0.0
        trigger = TriggerType.weight_initial

    new_value = _apply_floor(current_value * (1 + delta_pct))
    delta = new_value - current_value

    snapshot = AssetSnapshot(
        user_id=user_id,
        asset_value=round(new_value, 4),
        delta=round(delta, 4),
        trigger_type=trigger,
        snapshot_date=recorded_date,
    )
    db.add(snapshot)
    return snapshot


async def trigger_food(
    user_id: uuid.UUID,
    recorded_date: date,
    total_calories: int,
    daily_calorie_target: int,
    db: AsyncSession,
) -> AssetSnapshot:
    """Called after a food record is saved. Applies food log + streak bonuses."""
    current_value = await _get_current_asset(user_id, db)

    # Base food log bonus
    delta_pct = FOOD_LOG_BONUS

    # Calorie target bonus (80%–110% of daily target)
    lower = daily_calorie_target * 0.8
    upper = daily_calorie_target * 1.1
    if lower <= total_calories <= upper:
        delta_pct += CALORIE_RANGE_BONUS

    # Streak bonus (only applied once – on the first food record of the day)
    existing_today = await db.execute(
        select(AssetSnapshot.id)
        .where(
            and_(
                AssetSnapshot.user_id == user_id,
                AssetSnapshot.snapshot_date == recorded_date,
                AssetSnapshot.trigger_type == TriggerType.streak_bonus,
            )
        )
        .limit(1)
    )
    if existing_today.scalar_one_or_none() is None:
        streak = await _get_streak(user_id, db)
        if streak >= 7:
            delta_pct += STREAK_7_BONUS
            # Write separate streak snapshot for transparency
            streak_value = _apply_floor(current_value * (1 + STREAK_7_BONUS))
            db.add(AssetSnapshot(
                user_id=user_id,
                asset_value=round(streak_value, 4),
                delta=round(streak_value - current_value, 4),
                trigger_type=TriggerType.streak_bonus,
                snapshot_date=recorded_date,
            ))
            current_value = streak_value
        elif streak >= 3:
            delta_pct += STREAK_3_BONUS
            streak_value = _apply_floor(current_value * (1 + STREAK_3_BONUS))
            db.add(AssetSnapshot(
                user_id=user_id,
                asset_value=round(streak_value, 4),
                delta=round(streak_value - current_value, 4),
                trigger_type=TriggerType.streak_bonus,
                snapshot_date=recorded_date,
            ))
            current_value = streak_value

    new_value = _apply_floor(current_value * (1 + FOOD_LOG_BONUS + (CALORIE_RANGE_BONUS if lower <= total_calories <= upper else 0)))
    delta = new_value - current_value

    snapshot = AssetSnapshot(
        user_id=user_id,
        asset_value=round(new_value, 4),
        delta=round(delta, 4),
        trigger_type=TriggerType.food_logged,
        snapshot_date=recorded_date,
    )
    db.add(snapshot)
    return snapshot
