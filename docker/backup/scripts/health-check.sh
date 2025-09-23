#!/bin/bash

# CHRONOS Financial - Backup Service Health Check

set -e

# Configuration
LOG_FILE="/var/log/backup/health.log"
MAX_LOG_AGE_HOURS=25  # Allow 1 hour grace period beyond daily backup

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEALTH] $1" >> "$LOG_FILE"
}

# Check if backup service is healthy
check_backup_health() {
    local status=0
    local issues=()

    # Check if cron is running
    if ! pgrep crond > /dev/null; then
        issues+=("Cron daemon is not running")
        status=1
    fi

    # Check for recent backup logs
    if [[ -f "/var/log/backup/backup.log" ]]; then
        local last_backup=$(stat -c %Y "/var/log/backup/backup.log" 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        local hours_since_backup=$(( (current_time - last_backup) / 3600 ))

        if [[ $hours_since_backup -gt $MAX_LOG_AGE_HOURS ]]; then
            issues+=("No backup activity for ${hours_since_backup} hours")
            status=1
        fi
    else
        issues+=("No backup log file found")
        status=1
    fi

    # Check backup directory accessibility
    if [[ ! -d "/backups" ]] || [[ ! -w "/backups" ]]; then
        issues+=("Backup directory is not accessible")
        status=1
    fi

    # Check disk space
    local disk_usage=$(df /backups | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        issues+=("Disk usage is high: ${disk_usage}%")
        status=1
    fi

    # Check database connectivity
    if [[ -n "$POSTGRES_HOST" ]]; then
        export PGPASSWORD="$POSTGRES_PASSWORD"
        if ! pg_isready -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -q; then
            issues+=("Cannot connect to database")
            status=1
        fi
    fi

    # Output results
    if [[ $status -eq 0 ]]; then
        log "Health check passed"
        echo "OK: Backup service is healthy"
    else
        log "Health check failed: ${issues[*]}"
        echo "FAIL: ${issues[*]}"
    fi

    return $status
}

# Run health check
check_backup_health