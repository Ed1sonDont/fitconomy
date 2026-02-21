import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException

from app.models.weight_record import WeightRecord
from app.schemas.weight import WeightRecordCreate, WeightRecordUpdate
from app.services import asset_engine


async def create_weight_record(
    user_id: uuid.UUID,
    data: WeightRecordCreate,
    db: AsyncSession,
) -> WeightRecord:
    record = WeightRecord(
        user_id=user_id,
        weight_kg=data.weight_kg,
        recorded_date=data.recorded_date,
        note=data.note,
    )
    db.add(record)
    await db.flush()

    await asset_engine.trigger_weight(
        user_id=user_id,
        new_weight=data.weight_kg,
        recorded_date=data.recorded_date,
        db=db,
    )
    await db.commit()
    await db.refresh(record)
    return record


async def get_weight_history(
    user_id: uuid.UUID,
    days: int,
    db: AsyncSession,
) -> list[WeightRecord]:
    from datetime import timedelta
    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(WeightRecord)
        .where(
            and_(
                WeightRecord.user_id == user_id,
                WeightRecord.recorded_date >= cutoff,
            )
        )
        .order_by(WeightRecord.recorded_date.asc())
    )
    return list(result.scalars().all())


async def update_weight_record(
    user_id: uuid.UUID,
    record_id: uuid.UUID,
    data: WeightRecordUpdate,
    db: AsyncSession,
) -> WeightRecord:
    result = await db.execute(
        select(WeightRecord).where(
            and_(WeightRecord.id == record_id, WeightRecord.user_id == user_id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Weight record not found")

    if data.weight_kg is not None:
        record.weight_kg = data.weight_kg
    if data.note is not None:
        record.note = data.note

    await db.commit()
    await db.refresh(record)
    return record


async def delete_weight_record(
    user_id: uuid.UUID,
    record_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    result = await db.execute(
        select(WeightRecord).where(
            and_(WeightRecord.id == record_id, WeightRecord.user_id == user_id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Weight record not found")
    await db.delete(record)
    await db.commit()
