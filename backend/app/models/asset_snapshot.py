import uuid
from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import Float, Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TriggerType(str, PyEnum):
    weight_down = "weight_down"
    weight_up = "weight_up"
    weight_initial = "weight_initial"
    food_logged = "food_logged"
    streak_bonus = "streak_bonus"
    initial = "initial"


class AssetSnapshot(Base):
    __tablename__ = "asset_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_value: Mapped[float] = mapped_column(Float, nullable=False)
    delta: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="asset_snapshots")  # noqa: F821
