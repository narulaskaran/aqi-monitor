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
  - RESTful API endpoints
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

### REST Endpoints

- `GET /api/air-quality` - Get air quality data for a location
- `POST /api/verify` - Start phone verification process
- `POST /api/verify-code` - Verify SMS code
- `GET /health` - Health check endpoint

### API Usage Examples

```javascript
// Get air quality data
fetch("/api/air-quality?latitude=37.7749&longitude=-122.4194")
  .then(response => response.json())
  .then(data => console.log(data));

// Start verification
fetch("/api/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "+11234567890", zipCode: "94107" })
})
  .then(response => response.json())
  .then(data => console.log(data));

// Verify code
fetch("/api/verify-code", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    phone: "+11234567890", 
    zipCode: "94107", 
    code: "123456" 
  })
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
│   └── types/            # TypeScript type definitions
├── server/               # Backend source code
│   ├── src/              # Server code
│   │   └── services/     # Service modules
│   └── prisma/           # Prisma schema and migrations
├── api/                  # Serverless API endpoints for Vercel
└── public/               # Static assets
```

## Development vs Production

### Development Mode
- Frontend and backend run as separate servers
- Backend provides REST API endpoints
- Mock Twilio verification is used by default (code: 123456)

### Production Mode (Vercel)
- Frontend is served as static assets
- API endpoints run as serverless functions
- Mock verification is used for demo purposes
- The application can be easily configured to use real Twilio verification

## License

MIT