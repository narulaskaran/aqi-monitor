# AQI Monitor

A real-time Air Quality Index (AQI) monitoring application that provides air quality data for any US ZIP code. Built with React, TypeScript, and tRPC.

You can also click through the [archived implementation](https://github.com/shadcn/aqi-monitor/tree/impl_archive) written in Python.

## Features

- Look up air quality data by US ZIP code
- Display EPA Air Quality Index (AQI)
- Show dominant pollutant information
- Color-coded indicators for air quality levels
- US location validation
- Responsive design

## Project Structure

```
src/
├── components/         # React components
│   ├── AQICard.tsx    # Displays AQI information
│   ├── AQIHeader.tsx  # Application header
│   ├── AQIIcon.tsx    # Air quality icon
│   └── ui/            # Shadcn UI components
├── lib/               # Utility functions and configurations
│   └── trpc.ts       # tRPC client setup
└── App.tsx           # Main application component

server/
└── src/
    └── index.ts      # tRPC server and API endpoints
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Air Quality API key

### Environment Setup

1. Create a `.env` file in the `server` directory:

```env
GOOGLE_AIR_QUALITY_API_KEY=your_api_key_here
```

### Running the Application

1. Install dependencies:

```bash
npm install
cd server && npm install
```

2. Start the backend server:

```bash
cd server
npm run dev
```

3. Start the frontend development server:

```bash
# In the root directory
npm run dev
```

The application will be available at `http://localhost:5173`

## API Integration

This project uses:

- Google Air Quality API for AQI data
- OpenStreetMap Nominatim API for geocoding
- tRPC for type-safe API communication

## Contributing

Feel free to submit issues and enhancement requests!

## Upcoming Features

- [ ] SMS Notifications
  - [ ] User signup for AQI alerts by zip code
  - [ ] Support for multiple zip code subscriptions
  - [ ] Configurable subscription expiration dates
- [ ] Trip Planning Features
  - [ ] AQI predictions for travel dates
  - [ ] Travel AQI subscriptions (with date range support)

These features are in development. Feel free to open issues with suggestions or contribute to their implementation!
