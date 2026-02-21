import uuid
from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Literal


MealTypeLiteral = Literal["breakfast", "lunch", "dinner", "snack"]
PixelIconTypeLiteral = Literal["rice", "meat", "vegetable", "fruit", "dairy", "drink", "snack", "other"]


class FoodItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    calories: int = Field(ge=0)
    amount_g: float | None = Field(None, gt=0)
    image_url: str | None = None
    pixel_icon_type: PixelIconTypeLiteral = "other"


class FoodItemOut(BaseModel):
    id: uuid.UUID
    name: str
    calories: int
    amount_g: float | None
    image_url: str | None
    pixel_icon_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FoodRecordCreate(BaseModel):
    meal_type: MealTypeLiteral = "lunch"
    recorded_date: date
    note: str | None = Field(None, max_length=500)
    items: list[FoodItemCreate] = Field(default_factory=list)


class FoodRecordOut(BaseModel):
    id: uuid.UUID
    meal_type: str
    recorded_date: date
    total_calories: int
    note: str | None
    items: list[FoodItemOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class FoodItemAdd(BaseModel):
    food_record_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    calories: int = Field(ge=0)
    amount_g: float | None = Field(None, gt=0)
    image_url: str | None = None
    pixel_icon_type: PixelIconTypeLiteral = "other"


class DailyFoodSummary(BaseModel):
    date: date
    total_calories: int
    records: list[FoodRecordOut]
