import os
import uuid
from pathlib import Path
from typing import BinaryIO

import aiofiles
from fastapi import UploadFile

from app.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_MB = 10


class StorageBackend:
    async def save(self, file: UploadFile, folder: str = "food") -> str:
        raise NotImplementedError

    def get_url(self, path: str) -> str:
        raise NotImplementedError


class LocalStorage(StorageBackend):
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save(self, file: UploadFile, folder: str = "food") -> str:
        folder_path = self.base_path / folder
        folder_path.mkdir(parents=True, exist_ok=True)

        ext = Path(file.filename or "image.jpg").suffix or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        file_path = folder_path / filename

        content = await file.read()
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        return f"/uploads/{folder}/{filename}"

    def get_url(self, path: str) -> str:
        return path


class S3Storage(StorageBackend):
    def __init__(self):
        import boto3

        kwargs: dict = {
            "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
        }
        if settings.AWS_ENDPOINT_URL:
            kwargs["endpoint_url"] = settings.AWS_ENDPOINT_URL

        self.client = boto3.client("s3", **kwargs)
        self.bucket = settings.AWS_BUCKET_NAME
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            self.client.create_bucket(Bucket=self.bucket)

    async def save(self, file: UploadFile, folder: str = "food") -> str:
        ext = Path(file.filename or "image.jpg").suffix or ".jpg"
        key = f"{folder}/{uuid.uuid4().hex}{ext}"
        content = await file.read()
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type or "image/jpeg",
        )
        return key

    def get_url(self, path: str) -> str:
        base = settings.AWS_PUBLIC_BASE_URL or f"https://{self.bucket}.s3.amazonaws.com"
        return f"{base}/{path}"


def get_storage() -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        return S3Storage()
    return LocalStorage(settings.LOCAL_STORAGE_PATH)


async def validate_image(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )
