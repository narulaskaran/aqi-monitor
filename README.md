# AQI Monitor

A real-time Air Quality Index (AQI) monitoring application that allows users to check air quality in their area and subscribe to email alerts for air quality changes.

## Features

- Real-time air quality data using Google Air Quality API
- Color-coded AQI display with category and health recommendations
- Email alerts for poor air quality conditions
- ZIP code based monitoring and alerts
- Hourly air quality data storage
- Responsive design for desktop and mobile
- Admin dashboard for managing data

## Tech Stack

- **Frontend:**
  - React + TypeScript
  - Vite for build tooling
  - Tailwind CSS for styling
  - shadcn/ui for UI components

- **Backend:**
  - Node.js + Express
  - RESTful API endpoints
  - Prisma ORM for database access
  - PostgreSQL database (Vercel Postgres)
  - OpenStreetMap Nominatim API for geocoding
  - Scheduled cron jobs for data updates

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database or Vercel Postgres
- Google Maps Platform API key with Air Quality API enabled
- Email service (for alerts)

### Environment Variables

Create a `.env` file in the server directory with the following:

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aqi_monitor"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/aqi_monitor"

# Email (for verification and alerts)
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="your_resend_api_key"

# Google Air Quality API
GOOGLE_AIR_QUALITY_API_KEY="your_google_api_key"

# Admin access (for secured endpoints)
ADMIN_API_KEY="your_admin_api_key"
CRON_SECRET="your_cron_job_secret"

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

### REST Endpoints

- `GET /api/air-quality?zipCode=12345` - Get air quality data for a ZIP code
- `POST /api/verify` - Start email verification process
- `POST /api/verify-code` - Verify email code
- `GET /api/cron/update-air-quality` - Trigger air quality data update (secured)
- `GET /health` - Health check endpoint

### API Usage Examples

```javascript
// Get air quality data by ZIP code
fetch("/api/air-quality?zipCode=94107")
  .then(response => response.json())
  .then(data => console.log(data));

// Start email verification
fetch("/api/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "user@example.com", zipCode: "94107" })
})
  .then(response => response.json())
  .then(data => console.log(data));

// Verify email code
fetch("/api/verify-code", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    email: "user@example.com", 
    zipCode: "94107", 
    code: "123456" 
  })
})
  .then(response => response.json())
  .then(data => console.log(data));

// Trigger the cron job manually (admin only)
fetch("/api/cron/update-air-quality", {
  headers: { 
    "Authorization": "Bearer your_cron_secret"
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

## Project Structure

```
/
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── lib/              # Utilities and API clients
│   ├── templates/        # Email templates
│   └── types/            # TypeScript type definitions
├── server/               # Backend source code
│   ├── src/              # Server code
│   │   ├── services/     # Service modules
│   │   └── db.ts         # Database connection
│   └── prisma/           # Prisma schema and migrations
├── api/                  # Serverless API endpoints for Vercel
└── public/               # Static assets
```

## Database Schema

The application uses the following database models:

- **UserSubscription**: Stores user email subscriptions by ZIP code
- **VerificationCode**: Manages verification codes for email verification
- **AirQualityRecord**: Stores historical air quality data by ZIP code
- **ZipCoordinates**: Caches ZIP code to coordinate mappings

## Development vs Production

### Development Mode
- Frontend and backend run as separate servers
- Backend provides REST API endpoints
- Environment variables for dev stored in .env file
- Mock verification code is used by default (code: 123456)

### Production Mode (Vercel)
- Frontend is served as static assets
- API endpoints run as serverless functions
- Cron jobs run on scheduled intervals
- Environment variables stored in Vercel dashboard
- Email verification through Resend API

## Geocoding System

The application uses OpenStreetMap's Nominatim API to convert ZIP codes to latitude/longitude coordinates. This feature:

- Respects OSM usage policy with proper headers
- Includes request timeouts and error handling
- Caches coordinates in the database to reduce API calls
- Coordinates are refreshed every 30 days for accuracy

## License

MIT