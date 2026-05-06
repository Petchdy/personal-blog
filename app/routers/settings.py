from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.setting import Setting
from app.models.user import User
from app.schemas.setting import SiteSettingsOut, SiteSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_SITE_SETTINGS = {
    "hero_title": "The subtle art of observation.",
    "hero_subtitle": "A quiet collection of thoughts on design, philosophy, and the digital landscape.",
    "hero_image_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuAC5Mo3Asy13yTSOrsUR4cwMgGYpg3HEXgYHPGcmcqaPtbzyF5Vm_P4cCuUrcJVcwh19GuVwuEFWpkts2ra2bVyEcX1iTljPuBekhbKh-s2yAPcuo38oQWAaLXQpiBrM6tKJWNceX6k-jRKPS8Hrrs2q0FjbWJwtjG139l47gUhY2waJ2M4F45hMZFvVhG6dtkDLq09-y_OxTqnxTzm4u89tsL7ASdOL6LHDJxlgiJxrQLdnqzbEcNvf65V-vRQT6ZexzIQJL_6z9Hk",
}


def seed_site_settings(db: Session):
    for key, value in DEFAULT_SITE_SETTINGS.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        if not existing:
            db.add(Setting(key=key, value=value))
    db.commit()


def get_site_settings(db: Session) -> SiteSettingsOut:
    rows = db.query(Setting).filter(Setting.key.in_(DEFAULT_SITE_SETTINGS.keys())).all()
    values = DEFAULT_SITE_SETTINGS.copy()
    values.update({row.key: row.value for row in rows})
    return SiteSettingsOut(**values)


@router.get("/site", response_model=SiteSettingsOut)
def read_site_settings(db: Session = Depends(get_db)):
    return get_site_settings(db)


@router.put("/site", response_model=SiteSettingsOut)
def update_site_settings(
    data: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    for key, value in data.model_dump().items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(Setting(key=key, value=value))
    db.commit()
    return get_site_settings(db)
