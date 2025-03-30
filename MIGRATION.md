# Database Migration Guide

## Issue: Missing Database Tables in Production

If you encounter errors like:

```
Invalid `prisma.verificationCode.create()` invocation: The table `public.VerificationCode` does not exist in the current database.
```

This means that database migrations have not been applied to the production database.

## Solution

### Method 1: Manual Migration (Recommended for first-time setup)

Run the migration command locally, targeting the production database:

```bash
# Export the production database URL
export DATABASE_URL="your_production_database_url"

# Run migration
cd server && npx prisma migrate deploy
```

### Method 2: Automatic Migration with Deployment

For future deployments, we've added migration steps to the build process:

1. Modified `server/package.json` to include migrations in the Vercel build process:
   ```json
   "vercel-build": "prisma migrate deploy && npm run build"
   ```

2. Added `db:migrate` helper script in root package.json:
   ```json
   "db:migrate": "cd server && npm run db:migrate"
   ```

3. Updated Vercel configuration to use a specific Node.js runtime.

## Troubleshooting

If migrations still fail, check the following:

1. Ensure your Vercel environment has the correct `DATABASE_URL` and `DATABASE_URL_UNPOOLED` environment variables.
2. Check deployment logs for any migration errors.
3. Make sure the database user has permission to create tables.
4. If using Neon or another database service with connection pooling, ensure `DATABASE_URL_UNPOOLED` is configured correctly.

## Reset Database (Development Only)

If you need to reset the database during development:

```bash
cd server && npx prisma migrate reset
```

Warning: This will delete all data in the development database.