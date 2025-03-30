# Database Migration Guide

## Issue: Missing Database Tables in Production

If you encounter errors like:

```
Invalid `prisma.verificationCode.create()` invocation: The table `public.VerificationCode` does not exist in the current database.
```

This means that database migrations have not been applied to the production database.

## Solution

### Method 1: Direct Production Migration (Recommended for Immediate Fix)

We've created a robust migration script specifically for this purpose:

```bash
# Option 1: Run from local machine with production DATABASE_URL
export DATABASE_URL="your_production_database_url"
npm run db:migrate:prod

# Option 2: Execute directly on Vercel
vercel env pull
npm run db:migrate:prod
```

### Method 2: Vercel Database Helper (Alternative Approach)

You can also use Vercel's CLI to run a one-off command:

```bash
vercel --prod --env DATABASE_URL="your_production_database_url" -- node server/prisma/run-migrations.js
```

### Method 3: Automatic Migration with Deployment

For future deployments, migrations will run automatically during the build process:

1. We've enhanced our build scripts with robust migration handling:
   ```json
   "vercel-build": "node prisma/run-migrations.js && npm run build"
   ```

2. The migration script (prisma/run-migrations.js) handles errors and provides detailed output.

## Troubleshooting

If migrations still fail, check the following:

1. **Vercel Environment**:
   - Ensure both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` variables exist
   - Verify database connection strings are correctly formatted
   - Confirm credentials have proper permissions

2. **Neon Database Specific**:
   - If using Neon, ensure the `DATABASE_URL_UNPOOLED` points to a direct connection (not pooled)
   - Pooled connections don't support schema migrations

3. **Manual Inspection**:
   - Connect to your database directly with a SQL client 
   - Check if tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
   - Look for error details in deployment logs

## Reset Database (Development Only)

If you need to reset the database during development:

```bash
cd server && npx prisma migrate reset
```

⚠️ **Warning**: This will delete all data in the development database.