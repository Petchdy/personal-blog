import math
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from slugify import slugify
from app.models.post import Post, Tag
from app.schemas.post import PostCreate, PostUpdate


def _get_or_create_tags(db: Session, tag_names: List[str]) -> List[Tag]:
    tags = []
    for name in tag_names:
        name = name.strip().lower()
        if not name:
            continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags


def _unique_slug(db: Session, base_slug: str, exclude_id: Optional[int] = None) -> str:
    slug = base_slug
    counter = 1
    while True:
        q = db.query(Post).filter(Post.slug == slug)
        if exclude_id:
            q = q.filter(Post.id != exclude_id)
        if not q.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def create_post(db: Session, data: PostCreate) -> Post:
    base_slug = slugify(data.title)
    slug = _unique_slug(db, base_slug)
    tags = _get_or_create_tags(db, data.tags or [])

    post = Post(
        title=data.title,
        slug=slug,
        content=data.content,
        cover_image_url=data.cover_image_url,
        published=data.published,
        tags=tags,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def get_post_by_slug(db: Session, slug: str, public_only: bool = True) -> Optional[Post]:
    q = db.query(Post).options(joinedload(Post.tags)).filter(Post.slug == slug)
    if public_only:
        q = q.filter(Post.published == True)
    return q.first()


def get_post_by_id(db: Session, post_id: int) -> Optional[Post]:
    return db.query(Post).options(joinedload(Post.tags)).filter(Post.id == post_id).first()


def list_posts(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    tag: Optional[str] = None,
    published_only: bool = True,
) -> Tuple[List[Post], int]:
    q = db.query(Post).options(joinedload(Post.tags))

    if published_only:
        q = q.filter(Post.published == True)

    if tag:
        q = q.join(Post.tags).filter(Tag.name == tag.lower())

    total = q.count()
    posts = (
        q.order_by(Post.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return posts, total


def update_post(db: Session, post_id: int, data: PostUpdate) -> Optional[Post]:
    post = get_post_by_id(db, post_id)
    if not post:
        return None

    if data.title is not None:
        post.title = data.title
        base_slug = slugify(data.title)
        post.slug = _unique_slug(db, base_slug, exclude_id=post_id)

    if data.content is not None:
        post.content = data.content

    if data.cover_image_url is not None:
        post.cover_image_url = data.cover_image_url

    if data.published is not None:
        post.published = data.published

    if data.tags is not None:
        post.tags = _get_or_create_tags(db, data.tags)

    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post_id: int) -> bool:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return False
    db.delete(post)
    db.commit()
    return True
