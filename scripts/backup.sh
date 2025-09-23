#!/bin/bash

# CHRONOS Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Database connection info from environment
DB_HOST=${POSTGRES_HOST:-postgres}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-chronos_production}
DB_USER=${POSTGRES_USER:-chronos_user}

# Backup filename
BACKUP_FILE="${BACKUP_DIR}/chronos_backup_${TIMESTAMP}.sql.gz"

echo "🔄 Starting database backup..."
echo "📅 Timestamp: ${TIMESTAMP}"
echo "📊 Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "💾 Backup file: ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create the backup with compression
echo "📝 Creating backup..."
pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
    --verbose \
    --format=custom \
    --no-owner \
    --no-privileges \
    --compress=9 \
    --file=${BACKUP_FILE%.gz}

# Compress the backup
echo "🗜️ Compressing backup..."
gzip ${BACKUP_FILE%.gz}

# Verify backup integrity
echo "✅ Verifying backup integrity..."
if [ -f "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup created successfully: ${BACKUP_SIZE}"
else
    echo "❌ Backup verification failed!"
    exit 1
fi

# Clean up old backups
echo "🧹 Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find ${BACKUP_DIR} -name "chronos_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo "📋 Current backups:"
ls -lh ${BACKUP_DIR}/chronos_backup_*.sql.gz 2>/dev/null || echo "   No backups found"

# Upload to cloud storage (if configured)
if [ ! -z "$AWS_S3_BUCKET" ] && [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "☁️ Uploading backup to S3..."
    aws s3 cp "${BACKUP_FILE}" "s3://${AWS_S3_BUCKET}/backups/" \
        --storage-class STANDARD_IA \
        --metadata "database=${DB_NAME},timestamp=${TIMESTAMP}"
    echo "✅ Backup uploaded to S3"
fi

echo "🎉 Backup process completed successfully!"

# Send notification (if configured)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ CHRONOS database backup completed successfully\n📅 Timestamp: ${TIMESTAMP}\n💾 Size: ${BACKUP_SIZE}\"}" \
        $SLACK_WEBHOOK_URL
fi