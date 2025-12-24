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
  - Vercel Serverless Functions (Node.js)
  - Prisma ORM (v7) with Neon Serverless Driver
  - PostgreSQL database (Neon / Vercel Postgres)
  - OpenStreetMap Nominatim API for geocoding
  - Scheduled cron jobs for data updates

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm
- PostgreSQL database (e.g., Neon)
- Google Maps Platform API key with Air Quality API enabled
- Resend API key (for emails)

### Environment Variables

Create a `.env` file in the root directory with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Email (for verification and alerts)
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="your_resend_api_key"

# Google Air Quality API
GOOGLE_AIR_QUALITY_API_KEY="your_google_api_key"

# Admin access
CRON_SECRET="your_cron_job_secret"
JWT_SECRET="your_jwt_secret"

# Frontend
VITE_API_URL="http://localhost:3000"
```

### Installation and Local Development

This project uses the Vercel CLI for a seamless local development experience.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Install Vercel CLI (globally or rely on npx):**
    ```bash
    npm i -g vercel
    ```

3.  **Run development server:**
    ```bash
    vercel dev
    ```
    This starts both the frontend (Vite) and the serverless API functions, mimicking the Vercel production environment. The app will be available at `http://localhost:3000`.

### Database Management

When you modify `prisma/schema.prisma`, you need to create a migration file to apply those changes to the database.

**To create a new migration:**

1.  Make your changes to `prisma/schema.prisma`.
2.  Run the helper script:
    ```bash
    npm run db:save -- <migration_name>
    ```
    *Example:* `npm run db:save -- add_new_user_field`
3.  **Commit** the generated folder in `prisma/migrations/` to Git. This is crucial for the changes to be applied during deployment.

**To apply migrations locally:**

```bash
npx prisma migrate dev
```

**To apply migrations in production:**

The project is configured to automatically apply pending migrations during the Vercel build process.


## Project Structure

```
/
├── api/                  # Vercel Serverless Functions
│   ├── _lib/             # Shared backend logic (DB, services)
│   └── ...               # API endpoints (e.g., air-quality.ts)
├── prisma/               # Prisma schema and migrations
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── lib/              # Utilities and API clients
│   └── ...
└── public/               # Static assets
```

## Deployment

This project is designed to be deployed on Vercel.

1.  Connect your repository to Vercel.
2.  Configure the environment variables in the Vercel dashboard.
3.  Vercel will automatically build and deploy the application using the configured build settings (handled by `vercel-build` script).

## License

MIT