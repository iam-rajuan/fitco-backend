# Fitco Backend

Fitco backend is an Express + TypeScript API connected to MongoDB.

## Quick Start

### Option 1: Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Backend runs on:

`http://localhost:5000`

Health check:

`http://localhost:5000/api/v1/health`

### Option 2: Run with Docker

From the repository root:

```bash
docker compose up -d --build backend mongo
```

## Environment Setup

Create `.env` from the example:

```bash
cp .env.example .env
```

Minimum required values:

- `PORT=5000`
- `MONGO_URI=mongodb://localhost:27017/fitco`
- `JWT_SECRET=your-secret`
- `JWT_REFRESH_SECRET=your-refresh-secret`

Optional values:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `STRIPE_*`
- `OPENAI_API_KEY`
- `SMTP_*`

## Scripts

```bash
npm run dev
npm run build
npm start
```

Other available scripts:

```bash
npm run import:food-csv
npm run report:food-csv
```

## Production Build

```bash
npm install
npm run build
npm start
```

## Default Admin Seed

On startup, the backend seeds a default admin if it does not exist.

These values can now be controlled from environment variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

Change them before production deploy.

## Important Notes

- MongoDB must be running before the backend starts
- If SMTP is not configured, password reset OTPs are logged to the console
- If Stripe/OpenAI keys are empty, related features will not work fully
