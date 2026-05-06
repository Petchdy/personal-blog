from fastapi import APIRouter, UploadFile, File, Depends
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.image import ImageUploadResponse
from app.services.cloudinary_service import upload_image

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("/image", response_model=ImageUploadResponse)
async def upload_image_endpoint(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    result = await upload_image(file)
    return ImageUploadResponse(**result)
