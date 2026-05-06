from pydantic import BaseModel


class ImageUploadResponse(BaseModel):
    url: str
    public_id: str
    format: str
    width: int
    height: int
