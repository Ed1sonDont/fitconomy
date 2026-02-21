from fastapi import APIRouter, Depends, UploadFile, File
from app.core.dependencies import get_current_user
from app.core.storage import get_storage, validate_image
from app.models.user import User


router = APIRouter()


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = "food",
    current_user: User = Depends(get_current_user),
):
    await validate_image(file)
    storage = get_storage()
    url = await storage.save(file, folder=folder)
    return {"url": url, "filename": file.filename}
