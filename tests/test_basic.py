"""
Basic unit tests for the blog API.
Run with: pytest tests/ -v
"""
import pytest
from unittest.mock import MagicMock
from app.services.post_service import _unique_slug, _get_or_create_tags
from app.core.security import hash_password, verify_password


# ── Security tests ────────────────────────────────────────────────

def test_password_hashing():
    password = "supersecret"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


# ── Slug tests ─────────────────────────────────────────────────────

def test_unique_slug_no_conflict():
    db = MagicMock()
    db.query().filter().first.return_value = None  # no conflict

    slug = _unique_slug(db, "hello-world")
    assert slug == "hello-world"


def test_unique_slug_with_conflict():
    db = MagicMock()
    # First call: conflict; second call: no conflict
    db.query().filter().filter().first.side_effect = [MagicMock(), None]
    db.query().filter().first.side_effect = [MagicMock(), None]

    slug = _unique_slug(db, "hello-world")
    # Should append a counter
    assert "hello-world" in slug


# ── Tag creation tests ─────────────────────────────────────────────

def test_get_or_create_tags_empty():
    db = MagicMock()
    result = _get_or_create_tags(db, [])
    assert result == []


def test_get_or_create_tags_strips_whitespace():
    from app.models.post import Tag

    db = MagicMock()
    mock_tag = MagicMock(spec=Tag)
    db.query().filter().first.return_value = mock_tag

    result = _get_or_create_tags(db, ["  Python  ", "fastapi"])
    assert len(result) == 2
