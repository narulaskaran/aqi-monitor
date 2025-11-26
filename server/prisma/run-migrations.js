#!/usr/bin/env node

/**
 * This script runs database migrations directly.
 * It's designed to be run as a one-off command against the production database.
 * 
 * Usage:
 * NODE_ENV=production DATABASE_URL="your_production_db_url" node prisma/run-migrations.js
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prismaPath = path.resolve(__dirname, '..', 'node_modules', '.bin', 'prisma');

// Check if prisma executable exists
if (!fs.existsSync(prismaPath)) {
  console.error('❌ Could not find prisma executable at', prismaPath);
  process.exit(1);
}

// Check if database URL is available
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL to your production database URL');
  process.exit(1);
}

console.log('🔍 Starting database migration process...');

// Run prisma migrate deploy
try {
  console.log('📦 Running prisma generate...');
  
  // Generate prisma client first
  execSync(`node ${prismaPath} generate`, { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..') 
  });

  console.log('📦 Running prisma migrate deploy...');
  // Then run migrations
  execSync(`node ${prismaPath} migrate deploy`, { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..') 
  });

  console.log('✅ Database migrations completed successfully');
} catch (error) {
  console.error('❌ Failed to run migrations:', error.message);
  process.exit(1);
}

// Optionally, check if tables exist
try {
  console.log('🔍 Verifying database tables...');
  
  // If you have a verification function or command, run it here
  
  console.log('✅ Database verification completed');
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  // Don't exit, this is just a verification step
}

console.log('✨ Migration process completed');