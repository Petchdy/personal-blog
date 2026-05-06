from pydantic import BaseModel, field_validator
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value):
        if len(value) < 12:
            raise ValueError("New password must be at least 12 characters long")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("New password must be 72 bytes or fewer")
        if value.strip() != value:
            raise ValueError("New password cannot start or end with whitespace")
        return value


class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True
