# Deployment Guide

This project is a FastAPI app with a static frontend, PostgreSQL, and Cloudinary uploads.

## Recommended Free-ish Setup

Use Render for the web app and Neon for PostgreSQL.

- Render: free web service, Docker deploy, automatic HTTPS.
- Neon: free Postgres database with no time limit.

Render free web services can spin down when idle, so first load after inactivity may be slow. Avoid Render free Postgres for persistent data because free Render Postgres databases expire after 30 days.

## 1. Create A Neon Database

1. Create a Neon account.
2. Create a new project.
3. Copy the pooled or direct PostgreSQL connection string.
4. Make sure the connection string uses SSL. It usually ends with `sslmode=require`.

## 2. Push This Project To GitHub

Render deploys cleanly from GitHub.

Before pushing, do not commit your real `.env`.

## 3. Create Render Web Service

1. In Render, choose `New` -> `Web Service`.
2. Connect your GitHub repo.
3. Select Docker deployment. Render will use the existing `Dockerfile`.
4. Choose the Free instance type.
5. Add environment variables from the list below.

## 4. Required Environment Variables

```env
DATABASE_URL=your-neon-postgres-url
SECRET_KEY=make-this-long-random-and-private
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-initial-admin-password
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
APP_ENV=production
CORS_ORIGINS=["https://your-render-app.onrender.com"]
```

After deploy, set `CORS_ORIGINS` to the final Render URL or your custom domain.

## 5. Admin Password

`ADMIN_USERNAME` and `ADMIN_PASSWORD` create the admin account only the first time the database starts empty.

After that, change the password in:

`/admin` -> `Settings` -> `Change Password`

## 6. Smoke Test After Deploy

Open:

- `/`
- `/health`
- `/admin`

Then sign in, create a draft, publish it, and open the public post page.
