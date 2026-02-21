import uuid
from datetime import datetime, date
from pydantic import BaseModel, Field


class WeightRecordCreate(BaseModel):
    weight_kg: float = Field(gt=0, lt=500, description="Weight in kilograms")
    recorded_date: date
    note: str | None = Field(None, max_length=500)


class WeightRecordUpdate(BaseModel):
    weight_kg: float | None = Field(None, gt=0, lt=500)
    note: str | None = Field(None, max_length=500)


class WeightRecordOut(BaseModel):
    id: uuid.UUID
    weight_kg: float
    recorded_date: date
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WeightTrendPoint(BaseModel):
    date: date
    weight_kg: float
