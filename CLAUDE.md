# AQI Monitor Codebase Guidelines

## Commands
- Build: `npm run build` - builds frontend (Vite) and backend
- Dev: `npm run dev` - runs frontend and backend concurrently
- Clean: `npm run clean` - removes dist directories
- Lint: `npm run lint` - runs ESLint
- Typecheck: `npm run typecheck` - runs TypeScript type checking
- Vercel Deploy: `vercel deploy` - deploys to Vercel

## Server Commands
- Build: `cd server && npm run build` - runs Prisma generation and TS compilation
- Dev: `cd server && npm run dev` - runs backend in dev mode
- Start: `cd server && npm start` - runs the production build
- Simple: `cd server && npx tsx src/simple.ts` - runs a simple test server with email testing

## Local Development
- Frontend runs on: http://localhost:5173
- Backend runs on: http://localhost:3000
- Backend health check: http://localhost:3000/health
- API endpoints: 
  - GET `/api/air-quality` - Get air quality data
  - POST `/api/verify` - Start email verification
  - POST `/api/verify-code` - Verify email code
  - GET `/api/test-email?email=your@email.com` - Send a test email (simple server only)
  - GET `/api/cron/update-air-quality` - Daily cron job to update air quality data (runs at midnight UTC)

## Deployment
- **Preview**: `vercel deploy` - creates a preview deployment
- **Production**: `vercel --prod` - deploys to production
- **Vercel Structure**:
  - Uses serverless API handlers in `/api` directory
  - Frontend is served as static files
  - Configuration defined in `vercel.json`
  - Cron jobs configured in `vercel.json` under the `crons` section

## Troubleshooting
- **Database Connection**: Make sure the DATABASE_URL and DATABASE_URL_UNPOOLED environment variables are set correctly
- **API Keys**: Ensure GOOGLE_AIR_QUALITY_API_KEY is set to use real data (otherwise mock data is used)
- **Email Setup**: 
  - RESEND_API_KEY is required for email functionality
  - Configure DNS for your domain with Resend: https://resend.com/docs/dashboard/domains/introduction
  - Each verification code expires after 10 minutes
  - In development mode only, the code "123456" is always accepted
- **Module Resolution**: In development, some imports may need special handling for ESM compatibility
- **API Request Format**:
  ```js
  // Air quality data (now uses ZIP code instead of coordinates)
  fetch("http://localhost:3000/api/air-quality?zipCode=94107")
  
  // Verification
  fetch("http://localhost:3000/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@example.com", zipCode: "94107" })
  })
  
  // Verification code
  fetch("http://localhost:3000/api/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@example.com", zipCode: "94107", code: "123456" })
  })
  
  // Cron job (hourly air quality update)
  fetch("http://localhost:3000/api/cron/update-air-quality")
  ```

## Code Style
- **Formatting**: 2-space indentation, Tailwind CSS with shadcn/ui components
- **Imports**: React/hooks first, UI components next, utilities/types third, local components last
- **Naming**: PascalCase for components, camelCase for variables/functions, interfaces end with "Props"
- **Types**: Explicit TypeScript interfaces for props, separate files in `/src/types/`, Zod for validation
- **Error Handling**: Try/catch blocks for async operations, consistent error state management
- **Components**: Functional components with explicit prop interfaces, reusable design pattern
- **Documentation**: JSDoc comments for public functions and components

## Project Structure
- **Frontend**: React/TypeScript app with Vite in the `/src` directory
- **Backend**: Node/Express with Prisma ORM in the `/server` directory
- **API**: RESTful endpoints for communication between frontend and backend
- **Serverless**: API handlers in `/api` directory for Vercel deployment
- **Database**: PostgreSQL accessed through Prisma ORM
- **Email**: Resend for email verification and notifications

## Database Models
- **UserSubscription**: Stores subscriptions for email alerts
- **VerificationCode**: Stores email verification codes with expiration
- **AirQualityRecord**: Stores hourly air quality data for each ZIP code

## Environment Setup
For local development, you need a `.env` file in the server directory with:
- DATABASE_URL and DATABASE_URL_UNPOOLED for PostgreSQL connection
- GOOGLE_AIR_QUALITY_API_KEY for air quality data
- RESEND_API_KEY for email functionality
- CRON_SECRET (optional) for securing cron job endpoints