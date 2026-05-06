from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models import post as post_models, setting as setting_models, user as user_models  # noqa: registers models
from app.routers import auth, posts, settings as settings_router, upload
from app.routers.settings import seed_site_settings

settings = get_settings()
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


def seed_admin():
    """Create the admin user if it doesn't exist."""
    from app.models.user import User

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not existing:
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
            )
            db.add(admin)
            db.commit()
            print(f"Admin user '{settings.ADMIN_USERNAME}' created.")
        else:
            print(f"Admin user '{settings.ADMIN_USERNAME}' already exists.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed admin
    Base.metadata.create_all(bind=engine)
    seed_admin()
    db = SessionLocal()
    try:
        seed_site_settings(db)
    finally:
        db.close()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="Personal Blog API",
    description="A minimal, fast, single-user blog backend built with FastAPI.",
    version="1.0.0",
    lifespan=lifespan,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=()",
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(settings_router.router)
app.include_router(upload.router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def root():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/post/{slug}", include_in_schema=False)
def frontend_post(slug: str):
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/admin", include_in_schema=False)
def frontend_admin():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
