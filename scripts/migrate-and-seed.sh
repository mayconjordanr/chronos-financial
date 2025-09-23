#!/bin/bash

# CHRONOS Database Migration and Seed Script
# This script runs database migrations and seeds the database with initial data

set -e  # Exit on any error

echo "🚀 Starting CHRONOS database setup..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Database URL: ${DATABASE_URL}"

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p') -p $(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p') -U $(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p'); do
    echo "⏳ Database is unavailable - sleeping..."
    sleep 2
done

echo "✅ Database is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "📝 Running database migrations..."
npx prisma migrate deploy

# Check if we should seed the database
if [ "$SEED_DATABASE" = "true" ] || [ "$NODE_ENV" = "development" ]; then
    echo "🌱 Seeding database with initial data..."
    npx prisma db seed
else
    echo "⏭️ Skipping database seeding (SEED_DATABASE=${SEED_DATABASE:-false})"
fi

# Verify database setup
echo "✅ Verifying database setup..."
npx prisma db pull --print > /dev/null

echo "🎉 Database setup completed successfully!"

# Show connection info (without password)
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

echo "📋 Database connection info:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

echo "🔍 Available tables:"
psql $DATABASE_URL -c "\dt" 2>/dev/null || echo "   (Unable to list tables - check permissions)"

echo "✅ Migration and seed script completed!"