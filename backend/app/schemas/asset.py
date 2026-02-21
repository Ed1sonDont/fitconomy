import uuid
from datetime import datetime, date
from pydantic import BaseModel


class AssetSnapshotOut(BaseModel):
    id: uuid.UUID
    asset_value: float
    delta: float
    trigger_type: str
    snapshot_date: date
    created_at: datetime

    model_config = {"from_attributes": True}


class AssetCurrentOut(BaseModel):
    current_value: float
    previous_value: float | None
    change_24h: float
    change_24h_pct: float
    all_time_high: float
    all_time_low: float


class AssetHistoryPoint(BaseModel):
    date: date
    value: float
    delta: float
    trigger_type: str


class DashboardOut(BaseModel):
    asset_current: float
    asset_change_pct: float
    asset_history: list[AssetHistoryPoint]
    weight_current: float | None
    weight_goal: float | None
    weight_history: list[dict]
    today_calories: int
    calorie_target: int
    calorie_pct: float
    streak_days: int
