import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from fastapi import HTTPException

from app.models.food_record import FoodRecord
from app.models.food_item import FoodItem
from app.models.user import User
from app.schemas.food import FoodRecordCreate, FoodItemAdd
from app.services import asset_engine


async def create_food_record(
    user_id: uuid.UUID,
    data: FoodRecordCreate,
    db: AsyncSession,
) -> FoodRecord:
    total_calories = sum(item.calories for item in data.items)

    record = FoodRecord(
        user_id=user_id,
        meal_type=data.meal_type,
        recorded_date=data.recorded_date,
        total_calories=total_calories,
        note=data.note,
    )
    db.add(record)
    await db.flush()

    for item_data in data.items:
        item = FoodItem(
            food_record_id=record.id,
            name=item_data.name,
            calories=item_data.calories,
            amount_g=item_data.amount_g,
            image_url=item_data.image_url,
            pixel_icon_type=item_data.pixel_icon_type,
        )
        db.add(item)

    await db.flush()

    # Get user's calorie target for streak calculation
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()

    # Calculate total calories for the day including this record
    day_total_result = await db.execute(
        select(func.sum(FoodRecord.total_calories))
        .where(
            and_(
                FoodRecord.user_id == user_id,
                FoodRecord.recorded_date == data.recorded_date,
            )
        )
    )
    day_total = (day_total_result.scalar_one_or_none() or 0) + total_calories

    await asset_engine.trigger_food(
        user_id=user_id,
        recorded_date=data.recorded_date,
        total_calories=day_total,
        daily_calorie_target=user.daily_calorie_target,
        db=db,
    )

    await db.commit()
    await db.refresh(record)
    # Eager-load items
    await db.refresh(record, ["items"])
    return record


async def get_daily_food_records(
    user_id: uuid.UUID,
    target_date: date,
    db: AsyncSession,
) -> list[FoodRecord]:
    result = await db.execute(
        select(FoodRecord)
        .where(
            and_(
                FoodRecord.user_id == user_id,
                FoodRecord.recorded_date == target_date,
            )
        )
        .order_by(FoodRecord.created_at.asc())
    )
    records = list(result.scalars().all())
    for r in records:
        await db.refresh(r, ["items"])
    return records


async def add_food_item(
    user_id: uuid.UUID,
    data: FoodItemAdd,
    db: AsyncSession,
) -> FoodItem:
    record_result = await db.execute(
        select(FoodRecord).where(
            and_(FoodRecord.id == data.food_record_id, FoodRecord.user_id == user_id)
        )
    )
    record = record_result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Food record not found")

    item = FoodItem(
        food_record_id=record.id,
        name=data.name,
        calories=data.calories,
        amount_g=data.amount_g,
        image_url=data.image_url,
        pixel_icon_type=data.pixel_icon_type,
    )
    db.add(item)

    record.total_calories += data.calories
    await db.commit()
    await db.refresh(item)
    return item


async def delete_food_item(
    user_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    item_result = await db.execute(select(FoodItem).where(FoodItem.id == item_id))
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    record_result = await db.execute(
        select(FoodRecord).where(
            and_(FoodRecord.id == item.food_record_id, FoodRecord.user_id == user_id)
        )
    )
    record = record_result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=403, detail="Not authorized")

    record.total_calories = max(0, record.total_calories - item.calories)
    await db.delete(item)
    await db.commit()
