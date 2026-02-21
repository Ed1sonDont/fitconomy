import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.food import (
    FoodRecordCreate,
    FoodRecordOut,
    FoodItemAdd,
    FoodItemOut,
    DailyFoodSummary,
)
from app.services.food_service import (
    create_food_record,
    get_daily_food_records,
    add_food_item,
    delete_food_item,
)


router = APIRouter()


@router.post("/record", response_model=FoodRecordOut, status_code=201)
async def create_record(
    data: FoodRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_food_record(current_user.id, data, db)


@router.get("/records", response_model=DailyFoodSummary)
async def list_records(
    target_date: date = Query(default_factory=date.today),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    records = await get_daily_food_records(current_user.id, target_date, db)
    total = sum(r.total_calories for r in records)
    return DailyFoodSummary(date=target_date, total_calories=total, records=records)


@router.post("/item", response_model=FoodItemOut, status_code=201)
async def add_item(
    data: FoodItemAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await add_food_item(current_user.id, data, db)


@router.delete("/item/{item_id}", status_code=204)
async def remove_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_food_item(current_user.id, item_id, db)
