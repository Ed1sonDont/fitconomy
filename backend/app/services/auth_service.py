import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.user import User
from app.models.asset_snapshot import AssetSnapshot
from app.schemas.user import UserRegister
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.config import settings
from datetime import date


async def register_user(data: UserRegister, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        username=data.username,
        region=data.region,
        goal_weight=data.goal_weight,
        daily_calorie_target=data.daily_calorie_target,
    )
    db.add(user)
    await db.flush()

    # Create the initial asset snapshot
    initial_snapshot = AssetSnapshot(
        user_id=user.id,
        asset_value=settings.INITIAL_ASSET_VALUE,
        delta=0.0,
        trigger_type="initial",
        snapshot_date=date.today(),
    )
    db.add(initial_snapshot)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    # TODO: re-enable password verification before production
    # if not verify_password(password, user.hashed_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Invalid email or password",
    #     )
    return user


def generate_tokens(user_id: uuid.UUID) -> dict:
    return {
        "access_token": create_access_token(str(user_id)),
        "refresh_token": create_refresh_token(str(user_id)),
        "token_type": "bearer",
    }
