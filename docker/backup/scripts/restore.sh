#!/bin/bash

# CHRONOS Financial - Database Restore Script

set -e

# Configuration
BACKUP_DIR="/backups"
LOG_FILE="/var/log/backup/restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}[RESTORE]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}[RESTORE-WARN]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}[RESTORE-ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Usage information
usage() {
    cat <<EOF
Usage: $0 [OPTIONS] BACKUP_FILE

Restore CHRONOS Financial database from backup

OPTIONS:
    -h, --help          Show this help message
    -f, --force         Force restore without confirmation
    -d, --download      Download backup from S3 before restore
    -t, --target-db     Target database name (default: from env)
    -c, --clean         Clean target database before restore

EXAMPLES:
    $0 chronos_backup_20240101_120000.sql.gz
    $0 --download --force s3://bucket/backups/backup.sql.gz
    $0 --target-db chronos_test --clean backup.sql

EOF
}

# Parse command line arguments
parse_args() {
    BACKUP_FILE=""
    FORCE_RESTORE=false
    DOWNLOAD_FROM_S3=false
    TARGET_DB="${POSTGRES_DB}"
    CLEAN_DB=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -f|--force)
                FORCE_RESTORE=true
                shift
                ;;
            -d|--download)
                DOWNLOAD_FROM_S3=true
                shift
                ;;
            -t|--target-db)
                TARGET_DB="$2"
                shift 2
                ;;
            -c|--clean)
                CLEAN_DB=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                ;;
            *)
                if [[ -z "$BACKUP_FILE" ]]; then
                    BACKUP_FILE="$1"
                else
                    error "Multiple backup files specified"
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$BACKUP_FILE" ]]; then
        error "Backup file not specified"
    fi
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."

    for cmd in pg_restore psql; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is not available"
        fi
    done

    if [[ "$DOWNLOAD_FROM_S3" == true ]] && ! command -v aws &> /dev/null; then
        error "AWS CLI is required for S3 downloads"
    fi

    log "Dependencies check passed"
}

# Download backup from S3
download_from_s3() {
    local s3_path="$1"
    local local_file="${BACKUP_DIR}/$(basename "$s3_path")"

    log "Downloading backup from S3: $s3_path"

    aws s3 cp "$s3_path" "$local_file" \
        --region "${AWS_REGION:-us-east-1}" || error "S3 download failed"

    log "Backup downloaded: $local_file"
    echo "$local_file"
}

# Decompress backup file
decompress_backup() {
    local compressed_file="$1"
    local decompressed_file="${compressed_file%.gz}"

    if [[ "$compressed_file" == *.gz ]]; then
        log "Decompressing backup file..."
        gunzip -k "$compressed_file" || error "Decompression failed"
        echo "$decompressed_file"
    else
        echo "$compressed_file"
    fi
}

# Decrypt backup file
decrypt_backup() {
    local encrypted_file="$1"
    local decrypted_file="${encrypted_file%.enc}"

    if [[ "$encrypted_file" == *.enc ]]; then
        log "Decrypting backup file..."

        if [[ -z "$BACKUP_ENCRYPTION_KEY" ]]; then
            error "Encryption key is required for encrypted backups"
        fi

        openssl enc -aes-256-cbc -d -in "$encrypted_file" -out "$decrypted_file" -k "$BACKUP_ENCRYPTION_KEY" || error "Decryption failed"

        log "Backup decrypted successfully"
        echo "$decrypted_file"
    else
        echo "$encrypted_file"
    fi
}

# Verify backup file
verify_backup() {
    local backup_file="$1"

    log "Verifying backup file: $backup_file"

    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi

    # Check if it's a valid PostgreSQL backup
    if ! pg_restore --list "$backup_file" &>/dev/null; then
        error "Invalid PostgreSQL backup file"
    fi

    local file_size=$(du -h "$backup_file" | cut -f1)
    log "Backup file verified successfully ($file_size)"
}

# Confirm restore operation
confirm_restore() {
    if [[ "$FORCE_RESTORE" == true ]]; then
        return 0
    fi

    log "WARNING: This will restore the database '$TARGET_DB'"

    if [[ "$CLEAN_DB" == true ]]; then
        warn "The existing database will be COMPLETELY REPLACED!"
    fi

    echo -n "Are you sure you want to continue? (yes/no): "
    read -r response

    if [[ "$response" != "yes" ]]; then
        log "Restore operation cancelled by user"
        exit 0
    fi
}

# Create target database if it doesn't exist
create_target_database() {
    log "Checking target database: $TARGET_DB"

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Check if database exists
    if psql -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$TARGET_DB"; then
        log "Target database exists: $TARGET_DB"
    else
        log "Creating target database: $TARGET_DB"

        createdb -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" "$TARGET_DB" || error "Failed to create database"

        log "Target database created successfully"
    fi
}

# Clean target database
clean_database() {
    if [[ "$CLEAN_DB" != true ]]; then
        return 0
    fi

    log "Cleaning target database: $TARGET_DB"

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Drop and recreate database
    dropdb -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" "$TARGET_DB" --if-exists || error "Failed to drop database"

    createdb -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" "$TARGET_DB" || error "Failed to recreate database"

    log "Database cleaned successfully"
}

# Restore database
restore_database() {
    local backup_file="$1"

    log "Starting database restore..."
    log "Source: $backup_file"
    log "Target: $TARGET_DB on $POSTGRES_HOST"

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Restore database
    pg_restore \
        --host="$POSTGRES_HOST" \
        --port="${POSTGRES_PORT:-5432}" \
        --username="$POSTGRES_USER" \
        --dbname="$TARGET_DB" \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$backup_file" || error "Database restore failed"

    log "Database restore completed successfully"
}

# Verify restored data
verify_restore() {
    log "Verifying restored data..."

    export PGPASSWORD="$POSTGRES_PASSWORD"

    # Count tables
    local table_count=$(psql -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -d "$TARGET_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    log "Tables restored: $table_count"

    if [[ "$table_count" -eq 0 ]]; then
        warn "No tables found in restored database"
    fi

    # Additional verification queries can be added here
    # For example, check specific tables or data integrity

    log "Data verification completed"
}

# Generate restore report
generate_restore_report() {
    local backup_file="$1"
    local start_time="$2"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local timestamp=$(date +"%Y%m%d_%H%M%S")

    local report_file="${BACKUP_DIR}/restore_report_${timestamp}.json"

    cat > "$report_file" <<EOF
{
    "restore_id": "restore_${timestamp}",
    "timestamp": "${timestamp}",
    "source_file": "$(basename "$backup_file")",
    "target_database": "${TARGET_DB}",
    "target_host": "${POSTGRES_HOST}",
    "clean_restore": ${CLEAN_DB},
    "duration_seconds": ${duration},
    "status": "success",
    "completed_at": "$(date -Iseconds)"
}
EOF

    log "Restore report generated: $report_file"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    if [[ -n "$WEBHOOK_URL" ]]; then
        log "Sending webhook notification..."

        local payload=$(cat <<EOF
{
    "operation": "restore",
    "status": "$status",
    "message": "$message",
    "timestamp": "$(date -Iseconds)",
    "target_database": "${TARGET_DB}"
}
EOF
)

        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            --max-time 30 || warn "Webhook notification failed"
    fi
}

# Main restore function
main() {
    local start_time=$(date +%s)

    log "Starting CHRONOS Financial database restore"

    # Parse command line arguments
    parse_args "$@"

    # Check dependencies
    check_dependencies

    # Process backup file
    local processed_file="$BACKUP_FILE"

    # Download from S3 if needed
    if [[ "$DOWNLOAD_FROM_S3" == true ]]; then
        processed_file=$(download_from_s3 "$BACKUP_FILE")
    elif [[ "$BACKUP_FILE" == s3://* ]]; then
        processed_file=$(download_from_s3 "$BACKUP_FILE")
    elif [[ ! -f "$BACKUP_FILE" ]] && [[ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]]; then
        processed_file="${BACKUP_DIR}/${BACKUP_FILE}"
    fi

    # Decompress if needed
    processed_file=$(decompress_backup "$processed_file")

    # Decrypt if needed
    processed_file=$(decrypt_backup "$processed_file")

    # Verify backup file
    verify_backup "$processed_file"

    # Confirm restore operation
    confirm_restore

    # Create target database if needed
    create_target_database

    # Clean database if requested
    clean_database

    # Restore database
    restore_database "$processed_file"

    # Verify restored data
    verify_restore

    # Generate report
    generate_restore_report "$processed_file" "$start_time"

    # Send success notification
    send_notification "success" "Database restore completed successfully"

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log "Restore completed successfully in ${duration} seconds"
}

# Error handling
trap 'error "Restore script interrupted"' INT TERM
trap 'send_notification "error" "Restore failed with error"' ERR

# Run main function
main "$@"