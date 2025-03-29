# AQI Monitor

A real-time Air Quality Index (AQI) monitoring application that allows users to check air quality in their area and subscribe to SMS alerts for air quality changes.

## Features

- Real-time air quality data using Google Air Quality API
- Color-coded AQI display with category and recommendations
- SMS alerts for air quality changes using Twilio
- Phone number verification for subscriptions
- Responsive design for desktop and mobile

## Tech Stack

- **Frontend:**
  - React + TypeScript
  - Vite for build tooling
  - Tailwind CSS for styling
  - shadcn/ui for UI components

- **Backend:**
  - Node.js + Express
  - tRPC for type-safe API
  - Prisma ORM for database access
  - PostgreSQL database (Vercel Postgres)
  - Twilio for SMS verification and alerts

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database or Vercel Postgres
- Twilio account
- Google Maps Platform API key

### Environment Variables

Create a `.env` file in the server directory with the following:

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aqi_monitor"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/aqi_monitor"

# Twilio (for SMS verification)
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_VERIFICATION_SERVICE_SID="optional_existing_service_sid"

# Google Air Quality API
GOOGLE_AIR_QUALITY_API_KEY="your_google_api_key"

# Environment
NODE_ENV="development"
```

### Installation and Local Development

```bash
# Install dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Generate Prisma client
cd server && npx prisma generate && cd ..

# Run development servers (frontend + backend)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Production Build

```bash
# Build for production
npm run build

# Start the production server
npm start
```

## Deployment

This project is set up for easy deployment to Vercel:

```bash
# Deploy to Vercel
vercel deploy
```

## API Endpoints

### tRPC Endpoints

- `fetchAirQuality` - Get air quality data for a location
- `startVerification` - Start phone verification process
- `verifyCode` - Verify SMS code
- `getSubscriptions` - Get all subscriptions

### REST Endpoints

- `GET /api/air-quality` - Alternative API for air quality data
- `GET /health` - Health check endpoint

## Project Structure

```
/
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── lib/              # Utilities and API clients
│   └── types/            # TypeScript type definitions
├── server/               # Backend source code
│   ├── src/              # Server code
│   │   ├── services/     # Service modules
│   │   └── trpc/         # tRPC routers and procedures
│   └── prisma/           # Prisma schema and migrations
└── public/               # Static assets
```

## License

MIT