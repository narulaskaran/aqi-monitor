#!/bin/bash

# Script to create a new database migration based on schema changes

# Check if a name was provided as an argument
if [ -z "$1" ]; then
  echo "Please provide a name for the migration."
  echo "Usage: npm run db:save -- <migration-name>"
  echo "Example: npm run db:save -- add_expires_at_column"
  read -p "Enter migration name (use underscores for spaces): " MIGRATION_NAME
else
  MIGRATION_NAME=$1
fi

if [ -z "$MIGRATION_NAME" ]; then
  echo "Migration name is required."
  exit 1
fi

echo "Creating migration: $MIGRATION_NAME..."
npx prisma migrate dev --name "$MIGRATION_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Migration created successfully!"
    echo "⚠️  IMPORTANT: Don't forget to commit the new folder in 'prisma/migrations/' to git!"
else
    echo "❌ Failed to create migration."
    exit 1
fi
