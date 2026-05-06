# 📝 Personal Blog API

A minimal, fast, single-user blog backend built with **FastAPI**, **PostgreSQL**, and **Cloudinary**.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2 + Alembic |
| Auth | JWT (python-jose + bcrypt) |
| Images | Cloudinary |
| Deployment | Docker + Docker Compose |

---

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your real values (DB, Cloudinary, secrets)
```

### 2. Run with Docker

```bash
docker-compose up --build
```

The API will be available at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

### 3. Run locally (without Docker)

```bash
# Create virtualenv
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start a local PostgreSQL (or use a hosted one), then:
uvicorn app.main:app --reload
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `SECRET_KEY` | JWT signing key (change in prod!) | required |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `1440` (24h) |
| `ADMIN_USERNAME` | Initial admin username | `admin` |
| `ADMIN_PASSWORD` | Initial admin password | `changeme123` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | required |
| `CLOUDINARY_API_KEY` | Cloudinary API key | required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | required |
| `CORS_ORIGINS` | JSON array of allowed origins | `["http://localhost:3000"]` |

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | ❌ | Login, receive JWT token |
| GET | `/auth/me` | ✅ | Get current admin info |

**Login example:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -d "username=admin&password=changeme123" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

---

### Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/posts` | ❌ | List published posts (paginated) |
| GET | `/posts/admin` | ✅ | List all posts including drafts |
| GET | `/posts/{slug}` | ❌ | Get single published post by slug |
| POST | `/posts` | ✅ | Create new post |
| PUT | `/posts/{id}` | ✅ | Update post |
| DELETE | `/posts/{id}` | ✅ | Delete post |

**Query params for listing:**
- `page` (default: 1)
- `page_size` (default: 10, max: 100)
- `tag` (filter by tag name)

**Create post example:**
```bash
curl -X POST http://localhost:8000/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "# Hello World\n\nThis is markdown content.",
    "tags": ["python", "fastapi"],
    "published": true
  }'
```

---

### Images

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/upload/image` | ✅ | Upload image to Cloudinary |

**Upload example:**
```bash
curl -X POST http://localhost:8000/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Response:**
```json
{
  "url": "https://res.cloudinary.com/...",
  "public_id": "blog/abc123",
  "format": "jpg",
  "width": 1200,
  "height": 630
}
```

---

## Project Structure

```
blog/
├── app/
│   ├── core/
│   │   ├── config.py        # Pydantic settings
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   └── security.py      # JWT, password hashing
│   ├── models/
│   │   ├── user.py          # User ORM model
│   │   └── post.py          # Post, Tag, post_tags ORM models
│   ├── schemas/
│   │   ├── auth.py          # Login/token Pydantic schemas
│   │   ├── post.py          # Post CRUD schemas
│   │   └── image.py         # Image upload response schema
│   ├── routers/
│   │   ├── auth.py          # /auth endpoints
│   │   ├── posts.py         # /posts endpoints
│   │   └── upload.py        # /upload endpoints
│   ├── services/
│   │   ├── post_service.py  # Post business logic
│   │   └── cloudinary_service.py  # Image upload logic
│   └── main.py              # FastAPI app, lifespan, middleware
├── alembic/                 # Database migrations
├── tests/                   # Pytest tests
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Database Migrations

```bash
# Create a new migration after model changes
alembic revision --autogenerate -m "add new column"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

> **Note:** On startup, the app auto-creates tables via `Base.metadata.create_all()`.  
> Use Alembic for production migrations.

---

## Running Tests

```bash
pytest tests/ -v
```

---

## Security Checklist

- [x] Passwords hashed with bcrypt
- [x] JWT tokens with configurable expiry
- [x] Admin-only routes protected by `Depends(get_current_user)`
- [x] Cloudinary credentials stored in environment variables
- [x] CORS origins configurable per environment
- [ ] Rate limiting (add `slowapi` for production)
- [ ] HTTPS (handled by reverse proxy / hosting provider)

---

## Deploying to Production

1. Use a managed PostgreSQL (Supabase, Railway, RDS)
2. Set a strong `SECRET_KEY` in your environment
3. Set `APP_ENV=production`
4. Run behind **Nginx** or use a platform like **Railway**, **Render**, or **Fly.io**
5. Use `alembic upgrade head` as part of your deploy step

---

## Future Enhancements (from PRD)

- [ ] Draft → Published workflow with scheduled publishing
- [ ] Full-text search (PostgreSQL `tsvector`)
- [ ] RSS feed endpoint
- [ ] Analytics dashboard
- [ ] Markdown preview endpoint
- [ ] Rate limiting middleware
