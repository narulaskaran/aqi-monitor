# CURSOR.md

## Project Overview

**AQI Monitor** is a real-time Air Quality Index (AQI) monitoring application. It allows users to check air quality by ZIP code and subscribe to email alerts for air quality changes. The system is designed for both web and serverless environments (Vercel), with distributed rate limiting for email delivery.

---

## Directory Structure

```
/
├── src/                  # Frontend source code (React + TypeScript)
│   ├── components/       # UI components (SubscriptionForm, AQICard, etc.)
│   ├── lib/              # API clients and utilities
│   ├── pages/            # Page-level React components
│   ├── types/            # TypeScript type definitions
│   ├── assets/           # Static assets (images, icons)
│   └── app/              # App-level API handlers (Next.js style)
├── server/               # Backend source code (Node.js + Express)
│   ├── src/              # Main server code
│   │   ├── services/     # Service modules (airQuality, email, subscription, twilio)
│   │   ├── handlers/     # API route handlers
│   │   ├── templates/    # Email templates
│   │   └── db.ts         # Prisma DB connection
│   └── prisma/           # Prisma schema and migrations
├── api/                  # Serverless API endpoints for Vercel
├── public/               # Static assets (favicon, etc.)
```

---

## Key Backend Services

- **airQuality.ts**: Fetches and caches AQI data using Google Air Quality API and OpenStreetMap Nominatim for geocoding. Handles ZIP-to-coordinates caching and refresh.
- **email.ts**: Sends verification and notification emails using the Resend API. Handles verification code generation, storage, and validation.
- **subscription.ts**: Manages user subscriptions, activation, and deactivation. Implements distributed rate limiting for email sending using Upstash Redis and `@upstash/ratelimit` (2 emails/sec globally).
- **twilio.ts**: (If used) Handles SMS notifications (structure similar to email service).
- **templates/email/**: Contains HTML templates for verification and air quality alert emails.

---

## Distributed Rate Limiting

- The email sending logic in `server/src/services/subscription.ts` uses Upstash Redis and the `@upstash/ratelimit` package to enforce a global rate limit of 2 emails per second, even across distributed serverless instances.
- **Required environment variables** (add to `.env`):
  ```
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=
  ```
- PQueue is no longer used for rate limiting.

---

## Database Schema

Defined in `server/prisma/schema.prisma`:

- **UserSubscription**: Stores user email subscriptions by ZIP code.
- **VerificationCode**: Manages verification codes for email verification.
- **AirQualityRecord**: Stores historical air quality data by ZIP code.
- **ZipCoordinates**: Caches ZIP code to coordinate mappings.

---

## API Endpoints

- **Serverless (api/):**
  - `GET /api/air-quality?zipCode=12345` — Get AQI data for a ZIP code.
  - `POST /api/verify` — Start email verification.
  - `POST /api/verify-code` — Verify email code.
  - `GET /api/cron/update-air-quality` — Trigger AQI data update (secured).
  - `POST /api/unsubscribe`: Unsubscribe from email alerts (protected by authentication middleware).
- **Frontend API Client (`src/lib/api.ts`):** Provides helpers for all major API actions.

---

## Frontend Flow

- **SubscriptionForm.tsx**: Handles user email input, verification code entry, and subscription logic.
- **API Client**: Communicates with backend endpoints for verification and AQI data.
- **UI Components**: Display AQI, subscription status, and admin controls.

---

## Email Templates

- **Verification Email**: Sent with a 6-digit code for user verification.
- **Air Quality Alert Email**: Sent for both good and poor air quality, with unsubscribe links.

---

## Migrations

- All database migrations are tracked in `server/prisma/migrations/`.

---

## Static Assets

- All static files (favicons, images) are in the `public/` directory.

---

## Notes

- For local development, see `.env.example` for required environment variables.
- For production, environment variables should be set in the Vercel dashboard.
- The backend uses Prisma ORM with a PostgreSQL database.

## Authentication Token & UI (WIP)

- Added `src/components/AuthWidget.tsx` for sign in/sign out UI and localStorage token management.
- Integrated `AuthWidget` into the top left of the main layout in `App.tsx` (beside ThemeToggle).
- This is part of the implementation for persistent authentication using a 2FA email code and a 30-day token, as described in Issue #25.
- Next steps: implement 2FA modal, backend token issuance, and token validation middleware.

- Implemented modal-based 2FA sign-in flow in `AuthWidget` (email input, code input, token storage in localStorage).
- Backend issues and stores a 30-day auth token in the new `Authentication` table after successful code verification (mode='signin').
- Updated `/api/verify-code` handler to support both subscription and sign-in flows.

- Updated unsubscribe flow:

  - /api/unsubscribe is now protected by authentication middleware (token in Authorization header).
  - Unsubscribe email links include both token and subscription_id as query params.
  - UnsubscribePage extracts both from the URL, sends token in header and subscription_id in body.
  - Backend sets active=false for the matching UserSubscription if the token is valid and the subscription belongs to the user.

- Added authentication middleware for both Express and serverless endpoints (validateAuthToken).
- /api/unsubscribe is now protected and requires a valid token in the Authorization header.
- Unsubscribe tokens are single-use: all tokens for the user are deleted after a successful unsubscribe.
- Added daily cleanup of expired tokens, triggered from the cron-update-air-quality endpoint (which now runs all daily jobs).

## Local Development

- Always use `vercel dev` for local development and testing. This ensures that environment variables such as `VERCEL_ENV` are set correctly, mirroring Vercel's deployment environments.
- Do not use `npm run dev` for local development, as it does not set `VERCEL_ENV` and may cause inconsistent behavior.
