from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class TagBase(BaseModel):
    name: str


class TagOut(TagBase):
    id: int

    class Config:
        from_attributes = True


# ── Post Schemas ────────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str
    content: str = ""
    cover_image_url: Optional[str] = None
    published: bool = False
    tags: Optional[List[str]] = []  # list of tag names

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    cover_image_url: Optional[str] = None
    published: Optional[bool] = None
    tags: Optional[List[str]] = None


class PostOut(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    cover_image_url: Optional[str]
    published: bool
    created_at: datetime
    updated_at: datetime
    tags: List[TagOut] = []

    class Config:
        from_attributes = True


class PostListItem(BaseModel):
    """Lightweight schema for listing posts (no full content)."""
    id: int
    title: str
    slug: str
    content: str
    cover_image_url: Optional[str]
    published: bool
    created_at: datetime
    updated_at: datetime
    tags: List[TagOut] = []

    class Config:
        from_attributes = True


class PaginatedPosts(BaseModel):
    total: int
    page: int
    page_size: int
    pages: int
    items: List[PostListItem]
