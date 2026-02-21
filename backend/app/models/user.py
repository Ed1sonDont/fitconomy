import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str | None] = mapped_column(String(50), nullable=True)
    goal_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    daily_calorie_target: Mapped[int] = mapped_column(Integer, default=2000, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    weight_records: Mapped[list["WeightRecord"]] = relationship(  # noqa: F821
        "WeightRecord", back_populates="user", cascade="all, delete-orphan"
    )
    food_records: Mapped[list["FoodRecord"]] = relationship(  # noqa: F821
        "FoodRecord", back_populates="user", cascade="all, delete-orphan"
    )
    asset_snapshots: Mapped[list["AssetSnapshot"]] = relationship(  # noqa: F821
        "AssetSnapshot", back_populates="user", cascade="all, delete-orphan"
    )
