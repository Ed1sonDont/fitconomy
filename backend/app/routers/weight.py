import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.weight import WeightRecordCreate, WeightRecordUpdate, WeightRecordOut
from app.services.weight_service import (
    create_weight_record,
    get_weight_history,
    update_weight_record,
    delete_weight_record,
)


router = APIRouter()


@router.post("", response_model=WeightRecordOut, status_code=201)
async def add_weight(
    data: WeightRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_weight_record(current_user.id, data, db)


@router.get("", response_model=list[WeightRecordOut])
async def list_weight(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_weight_history(current_user.id, days, db)


@router.put("/{record_id}", response_model=WeightRecordOut)
async def update_weight(
    record_id: uuid.UUID,
    data: WeightRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_weight_record(current_user.id, record_id, data, db)


@router.delete("/{record_id}", status_code=204)
async def delete_weight(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_weight_record(current_user.id, record_id, db)
