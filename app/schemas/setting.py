from pydantic import BaseModel, field_validator


class SiteSettingsOut(BaseModel):
    hero_title: str
    hero_subtitle: str
    hero_image_url: str


class SiteSettingsUpdate(BaseModel):
    hero_title: str
    hero_subtitle: str
    hero_image_url: str

    @field_validator("hero_title", "hero_subtitle", "hero_image_url")
    @classmethod
    def not_empty(cls, value):
        if not value.strip():
            raise ValueError("This field cannot be empty")
        return value.strip()
