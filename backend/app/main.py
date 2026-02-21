from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import engine, Base
from app.routers import auth, weight, food, asset, upload, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create upload directory if using local storage
    if settings.STORAGE_BACKEND == "local":
        os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)

    # Auto-create tables in development (use Alembic in production)
    if settings.DEBUG:
        async with engine.begin() as conn:
            # Import all models so they are registered with Base
            import app.models  # noqa: F401
            await conn.run_sync(Base.metadata.create_all)

    yield

    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Gamified weight-loss management API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for local storage uploads
if settings.STORAGE_BACKEND == "local":
    os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.LOCAL_STORAGE_PATH), name="uploads")

# Register routers
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Authentication"])
app.include_router(weight.router, prefix=f"{API_PREFIX}/weight", tags=["Weight"])
app.include_router(food.router, prefix=f"{API_PREFIX}/food", tags=["Food"])
app.include_router(asset.router, prefix=f"{API_PREFIX}/asset", tags=["Asset"])
app.include_router(upload.router, prefix=f"{API_PREFIX}/upload", tags=["Upload"])
app.include_router(dashboard.router, prefix=f"{API_PREFIX}/dashboard", tags=["Dashboard"])


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
