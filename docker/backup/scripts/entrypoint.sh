#!/bin/bash

# CHRONOS Financial - Backup Service Entrypoint

set -e

# Default values
BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-"0 2 * * *"}
LOG_FILE="/var/log/backup/cron.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting CHRONOS Financial Backup Service"

# Validate required environment variables
required_vars=("POSTGRES_HOST" "POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        log "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

log "Environment validation passed"

# Create crontab file
CRON_FILE="/tmp/backup-cron"
echo "$BACKUP_SCHEDULE /scripts/backup.sh >> $LOG_FILE 2>&1" > "$CRON_FILE"

log "Cron schedule: $BACKUP_SCHEDULE"

# Install crontab
crontab "$CRON_FILE"
log "Crontab installed successfully"

# Run initial backup if requested
if [[ "${RUN_INITIAL_BACKUP:-false}" == "true" ]]; then
    log "Running initial backup..."
    /scripts/backup.sh
fi

# Start cron daemon
log "Starting cron daemon..."
exec crond -f -l 2