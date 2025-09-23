#!/bin/bash

# CHRONOS Financial - Database Backup Script

set -e

# Configuration
BACKUP_DIR="/backups"
LOG_FILE="/var/log/backup/backup.log"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="chronos_backup_${TIMESTAMP}"
ENCRYPT_BACKUP=${BACKUP_ENCRYPT:-true}
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-""}

# AWS S3 Configuration
S3_BUCKET=${S3_BUCKET:-""}
AWS_REGION=${AWS_REGION:-"us-east-1"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}[BACKUP]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}[BACKUP-WARN]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}[BACKUP-ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."

    for cmd in pg_dump gzip; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is not available"
        fi
    done

    if [[ "$ENCRYPT_BACKUP" == "true" ]] && ! command -v openssl &> /dev/null; then
        error "OpenSSL is required for backup encryption"
    fi

    if [[ -n "$S3_BUCKET" ]] && ! command -v aws &> /dev/null; then
        error "AWS CLI is required for S3 uploads"
    fi

    log "Dependencies check passed"
}

# Create backup directory
prepare_backup_dir() {
    log "Preparing backup directory..."
    mkdir -p "$BACKUP_DIR"

    if [[ ! -w "$BACKUP_DIR" ]]; then
        error "Backup directory is not writable: $BACKUP_DIR"
    fi

    log "Backup directory ready: $BACKUP_DIR"
}

# Generate database dump
create_database_backup() {
    log "Creating database backup..."

    local dump_file="${BACKUP_DIR}/${BACKUP_NAME}.sql"

    # Set PostgreSQL password
    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Create database dump with compression
    pg_dump \
        --host="$POSTGRES_HOST" \
        --port="${POSTGRES_PORT:-5432}" \
        --username="$POSTGRES_USER" \
        --dbname="$POSTGRES_DB" \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges \
        --format=custom \
        --compress=9 \
        --file="$dump_file" || error "Database dump failed"

    # Verify dump file
    if [[ ! -f "$dump_file" ]]; then
        error "Dump file was not created"
    fi

    local dump_size=$(du -h "$dump_file" | cut -f1)
    log "Database dump created successfully: $dump_file ($dump_size)"

    echo "$dump_file"
}

# Encrypt backup if enabled
encrypt_backup() {
    local input_file="$1"
    local output_file="${input_file}.enc"

    if [[ "$ENCRYPT_BACKUP" != "true" ]]; then
        echo "$input_file"
        return
    fi

    log "Encrypting backup..."

    if [[ -z "$ENCRYPTION_KEY" ]]; then
        error "Encryption key is required when encryption is enabled"
    fi

    # Encrypt using AES-256-CBC
    openssl enc -aes-256-cbc -salt -in "$input_file" -out "$output_file" -k "$ENCRYPTION_KEY" || error "Backup encryption failed"

    # Remove unencrypted file
    rm "$input_file"

    local encrypted_size=$(du -h "$output_file" | cut -f1)
    log "Backup encrypted successfully: $output_file ($encrypted_size)"

    echo "$output_file"
}

# Compress backup
compress_backup() {
    local input_file="$1"
    local output_file="${input_file}.gz"

    log "Compressing backup..."

    gzip -9 "$input_file" || error "Backup compression failed"

    local compressed_size=$(du -h "$output_file" | cut -f1)
    log "Backup compressed successfully: $output_file ($compressed_size)"

    echo "$output_file"
}

# Upload to S3 if configured
upload_to_s3() {
    local backup_file="$1"

    if [[ -z "$S3_BUCKET" ]]; then
        log "S3 upload skipped (no bucket configured)"
        return
    fi

    log "Uploading backup to S3..."

    local s3_key="backups/$(basename "$backup_file")"

    aws s3 cp "$backup_file" "s3://${S3_BUCKET}/${s3_key}" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA || error "S3 upload failed"

    log "Backup uploaded to S3: s3://${S3_BUCKET}/${s3_key}"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

    # Clean local backups
    find "$BACKUP_DIR" -name "chronos_backup_*" -type f -mtime +$RETENTION_DAYS -delete

    local remaining_count=$(find "$BACKUP_DIR" -name "chronos_backup_*" -type f | wc -l)
    log "Local cleanup completed. Remaining backups: $remaining_count"

    # Clean S3 backups if configured
    if [[ -n "$S3_BUCKET" ]]; then
        log "Cleaning up old S3 backups..."

        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)

        aws s3 ls "s3://${S3_BUCKET}/backups/" --recursive | \
        while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')

            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://${S3_BUCKET}/${file_name}" || warn "Failed to delete S3 object: $file_name"
            fi
        done

        log "S3 cleanup completed"
    fi
}

# Generate backup report
generate_report() {
    local backup_file="$1"
    local start_time="$2"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    local report_file="${BACKUP_DIR}/backup_report_${TIMESTAMP}.json"

    cat > "$report_file" <<EOF
{
    "backup_id": "${BACKUP_NAME}",
    "timestamp": "${TIMESTAMP}",
    "database": "${POSTGRES_DB}",
    "host": "${POSTGRES_HOST}",
    "backup_file": "$(basename "$backup_file")",
    "file_size": "$(du -b "$backup_file" | cut -f1)",
    "encrypted": ${ENCRYPT_BACKUP},
    "s3_upload": $([ -n "$S3_BUCKET" ] && echo "true" || echo "false"),
    "duration_seconds": ${duration},
    "status": "success",
    "created_at": "$(date -Iseconds)"
}
EOF

    log "Backup report generated: $report_file"
}

# Send notification (webhook or email)
send_notification() {
    local status="$1"
    local message="$2"

    if [[ -n "$WEBHOOK_URL" ]]; then
        log "Sending webhook notification..."

        local payload=$(cat <<EOF
{
    "backup_id": "${BACKUP_NAME}",
    "status": "$status",
    "message": "$message",
    "timestamp": "$(date -Iseconds)",
    "database": "${POSTGRES_DB}"
}
EOF
)

        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            --max-time 30 || warn "Webhook notification failed"
    fi
}

# Main backup function
main() {
    local start_time=$(date +%s)

    log "Starting CHRONOS Financial database backup"
    log "Database: $POSTGRES_DB on $POSTGRES_HOST"
    log "Backup ID: $BACKUP_NAME"

    # Check dependencies
    check_dependencies

    # Prepare backup directory
    prepare_backup_dir

    # Create database backup
    local backup_file
    backup_file=$(create_database_backup)

    # Encrypt backup if enabled
    backup_file=$(encrypt_backup "$backup_file")

    # Compress backup
    backup_file=$(compress_backup "$backup_file")

    # Upload to S3 if configured
    upload_to_s3 "$backup_file"

    # Clean old backups
    cleanup_old_backups

    # Generate report
    generate_report "$backup_file" "$start_time"

    # Send success notification
    send_notification "success" "Database backup completed successfully"

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log "Backup completed successfully in ${duration} seconds"
    log "Final backup file: $backup_file"
}

# Error handling
trap 'error "Backup script interrupted"' INT TERM
trap 'send_notification "error" "Backup failed with error"' ERR

# Run main function
main "$@"