# Fitco Backend

Fitco backend is an Express + TypeScript API connected to MongoDB.

## Production Deployment

This backend is intended to run as its own service in production.

Production layout:

- backend container on port `5000`
- MongoDB managed separately
- reverse proxy in front such as Nginx

### 1. Configure environment

Create the backend environment file:

```bash
cp .env.example .env
```

Minimum required values:

```env
PORT=5000
MONGO_URI=mongodb://<mongo-host>:27017/fitco
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-admin-password>
ADMIN_NAME=Super Admin
```

Optional production values:

- `STRIPE_*`
- `OPENAI_API_KEY`
- `SMTP_*`

### 2. Build and run with Docker

From the repository root:

```bash
docker compose -f docker-compose.backend.yml up -d --build
```

### 3. Verify the container

View logs:

```bash
docker compose -f docker-compose.backend.yml logs -f
```

Health check:

`http://127.0.0.1:5000/api/v1/health`

### 4. Expose it through a reverse proxy

Typical production mapping:

- `api.yourdomain.com` -> `127.0.0.1:5000`

Use:

- [deploy/nginx/default.conf](/home/ubuntu/fitco/deploy/nginx/default.conf)

## Daily Deploy Commands

Rebuild after backend changes:

```bash
docker compose -f docker-compose.backend.yml up -d --build
```

Stop backend:

```bash
docker compose -f docker-compose.backend.yml down
```

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

Local URL:

`http://localhost:5000`

Health check:

`http://localhost:5000/api/v1/health`

## Scripts

```bash
npm run dev
npm run build
npm start
```

Other scripts:

```bash
npm run import:food-csv
npm run report:food-csv
```

## Important Notes

- MongoDB must already be running and reachable by `MONGO_URI`
- The app seeds the default admin on startup if it does not already exist
- If SMTP is not configured, password reset OTPs are logged to the console
- If Stripe or OpenAI keys are missing, related features will be limited
