from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenResponse, RefreshRequest
from app.services.auth_service import register_user, authenticate_user, generate_tokens
from app.core.security import decode_token
from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = await register_user(data, db)
    tokens = generate_tokens(user.id)
    return {**tokens, "user": user}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(data.email, data.password, db)
    tokens = generate_tokens(user.id)
    return {**tokens, "user": user}


@router.post("/refresh", response_model=dict)
async def refresh_token(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = payload["sub"]
    except ValueError as exc:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    from app.core.security import create_access_token
    return {"access_token": create_access_token(user_id), "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
