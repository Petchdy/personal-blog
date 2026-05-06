import math
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate, PostOut, PaginatedPosts
from app.services import post_service

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("", response_model=PaginatedPosts)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    posts, total = post_service.list_posts(
        db, page=page, page_size=page_size, tag=tag, published_only=True
    )
    return PaginatedPosts(
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
        items=posts,
    )


@router.get("/admin", response_model=PaginatedPosts)
def list_all_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Admin endpoint: returns all posts including drafts."""
    posts, total = post_service.list_posts(
        db, page=page, page_size=page_size, tag=tag, published_only=False
    )
    return PaginatedPosts(
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
        items=posts,
    )


@router.get("/{slug}", response_model=PostOut)
def get_post(slug: str, db: Session = Depends(get_db)):
    post = post_service.get_post_by_slug(db, slug, public_only=True)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return post_service.create_post(db, data)


@router.put("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    post = post_service.update_post(db, post_id, data)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    deleted = post_service.delete_post(db, post_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Post not found")
