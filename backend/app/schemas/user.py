import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str = Field(min_length=2, max_length=100)
    region: str | None = None
    goal_weight: float | None = Field(None, gt=0, lt=500)
    daily_calorie_target: int = Field(2000, ge=500, le=10000)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=2, max_length=100)
    region: str | None = None
    goal_weight: float | None = Field(None, gt=0, lt=500)
    daily_calorie_target: int | None = Field(None, ge=500, le=10000)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    region: str | None
    goal_weight: float | None
    daily_calorie_target: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str
