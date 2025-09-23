#!/bin/bash

# CHRONOS Financial - Production Deployment Script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_ENV="${1:-production}"
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[DEPLOY]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

warn() {
    echo -e "${YELLOW}[DEPLOY-WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error() {
    echo -e "${RED}[DEPLOY-ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    exit 1
}

info() {
    echo -e "${BLUE}[DEPLOY-INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Usage information
usage() {
    cat <<EOF
Usage: $0 [ENVIRONMENT] [OPTIONS]

Deploy CHRONOS Financial application

ENVIRONMENTS:
    production    Deploy to production (default)
    staging       Deploy to staging

OPTIONS:
    -h, --help              Show this help message
    -f, --force             Force deployment without confirmation
    -b, --backup            Create backup before deployment
    -r, --rollback          Rollback to previous version
    -s, --skip-build        Skip image building
    -t, --tag TAG           Use specific image tag
    -c, --check-only        Only run pre-deployment checks

EXAMPLES:
    $0 production
    $0 staging --backup --force
    $0 production --rollback
    $0 production --tag v1.2.0

EOF
}

# Parse command line arguments
parse_args() {
    FORCE_DEPLOY=false
    CREATE_BACKUP=false
    ROLLBACK=false
    SKIP_BUILD=false
    IMAGE_TAG=""
    CHECK_ONLY=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -f|--force)
                FORCE_DEPLOY=true
                shift
                ;;
            -b|--backup)
                CREATE_BACKUP=true
                shift
                ;;
            -r|--rollback)
                ROLLBACK=true
                shift
                ;;
            -s|--skip-build)
                SKIP_BUILD=true
                shift
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -c|--check-only)
                CHECK_ONLY=true
                shift
                ;;
            production|staging)
                DEPLOYMENT_ENV="$1"
                shift
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    # Set compose file based on environment
    if [[ "$DEPLOYMENT_ENV" == "staging" ]]; then
        COMPOSE_FILE="docker-compose.staging.yml"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."

    # Check required commands
    for cmd in docker docker-compose git; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is not installed or not in PATH"
        fi
    done

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
    fi

    # Check environment file
    local env_file="$PROJECT_ROOT/.env.$DEPLOYMENT_ENV"
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi

    # Check compose file
    if [[ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
        error "Compose file not found: $COMPOSE_FILE"
    fi

    # Check Docker Compose syntax
    if ! docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" config &> /dev/null; then
        error "Invalid Docker Compose configuration"
    fi

    # Check Git repository
    cd "$PROJECT_ROOT"
    if ! git rev-parse --git-dir &> /dev/null; then
        error "Not a Git repository"
    fi

    # Check for uncommitted changes
    if [[ -n "$(git status --porcelain)" ]]; then
        warn "There are uncommitted changes in the repository"
        if [[ "$FORCE_DEPLOY" != true ]]; then
            error "Please commit or stash changes before deployment"
        fi
    fi

    log "Prerequisites check passed"
}

# Get deployment info
get_deployment_info() {
    cd "$PROJECT_ROOT"

    CURRENT_COMMIT=$(git rev-parse HEAD)
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s")
    DEPLOY_TIMESTAMP=$(date -Iseconds)

    if [[ -z "$IMAGE_TAG" ]]; then
        IMAGE_TAG="$CURRENT_COMMIT"
    fi

    info "Deployment Information:"
    info "  Environment: $DEPLOYMENT_ENV"
    info "  Branch: $CURRENT_BRANCH"
    info "  Commit: $CURRENT_COMMIT"
    info "  Tag: $IMAGE_TAG"
    info "  Message: $COMMIT_MESSAGE"
    info "  Timestamp: $DEPLOY_TIMESTAMP"
}

# Create backup
create_backup() {
    if [[ "$CREATE_BACKUP" != true ]]; then
        return 0
    fi

    log "Creating backup before deployment..."

    local backup_dir="$PROJECT_ROOT/backups/pre-deployment"
    mkdir -p "$backup_dir"

    # Database backup
    if docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "Creating database backup..."
        docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T postgres pg_dump \
            -U "\$POSTGRES_USER" \
            -h localhost \
            "\$POSTGRES_DB" > "$backup_dir/database_$(date +%Y%m%d_%H%M%S).sql"
    fi

    # Configuration backup
    log "Creating configuration backup..."
    tar -czf "$backup_dir/config_$(date +%Y%m%d_%H%M%S).tar.gz" \
        -C "$PROJECT_ROOT" \
        ".env.$DEPLOYMENT_ENV" \
        "$COMPOSE_FILE" \
        "docker/" \
        "monitoring/" \
        2>/dev/null || true

    log "Backup created successfully"
}

# Build images
build_images() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log "Skipping image build"
        return 0
    fi

    log "Building Docker images..."

    cd "$PROJECT_ROOT"

    # Set build args
    local build_args=(
        "--build-arg" "NEXT_PUBLIC_APP_VERSION=$IMAGE_TAG"
        "--build-arg" "DEPLOY_TIMESTAMP=$DEPLOY_TIMESTAMP"
        "--build-arg" "GIT_COMMIT_SHA=$CURRENT_COMMIT"
    )

    # Build images
    docker-compose -f "$COMPOSE_FILE" build "${build_args[@]}" \
        --parallel \
        --compress

    log "Image build completed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."

    cd "$PROJECT_ROOT"

    # Stop current deployment gracefully
    if docker-compose -f "$COMPOSE_FILE" ps -q | grep -q .; then
        log "Stopping current deployment..."
        docker-compose -f "$COMPOSE_FILE" down --timeout 60
    fi

    # Start new deployment
    log "Starting new deployment..."
    docker-compose -f "$COMPOSE_FILE" up -d

    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy"; then
            ((attempt++))
            sleep 10
            continue
        fi

        local running_services=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | wc -l)
        local total_services=$(docker-compose -f "$COMPOSE_FILE" ps --services | wc -l)

        if [[ $running_services -eq $total_services ]]; then
            log "All services are running and healthy"
            break
        fi

        ((attempt++))
        sleep 10
    done

    if [[ $attempt -eq $max_attempts ]]; then
        error "Deployment health check failed after $max_attempts attempts"
    fi

    log "Deployment completed successfully"
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."

    local frontend_url="http://localhost"
    local backend_url="http://localhost/api"

    # Test frontend health
    if curl -f -s "$frontend_url/api/health" > /dev/null; then
        log "Frontend health check: PASS"
    else
        error "Frontend health check: FAIL"
    fi

    # Test backend health
    if curl -f -s "$backend_url/health" > /dev/null; then
        log "Backend health check: PASS"
    else
        error "Backend health check: FAIL"
    fi

    # Test database connectivity
    if docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T postgres pg_isready -q; then
        log "Database connectivity: PASS"
    else
        error "Database connectivity: FAIL"
    fi

    log "Smoke tests completed successfully"
}

# Clean up old resources
cleanup() {
    log "Cleaning up old resources..."

    # Remove unused images
    docker image prune -f --filter "until=24h"

    # Remove old backups
    find "$PROJECT_ROOT/backups" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true

    log "Cleanup completed"
}

# Record deployment
record_deployment() {
    log "Recording deployment..."

    local deployment_log="$PROJECT_ROOT/deployment/logs/deployments.log"
    mkdir -p "$(dirname "$deployment_log")"

    cat >> "$deployment_log" <<EOF
{
  "timestamp": "$DEPLOY_TIMESTAMP",
  "environment": "$DEPLOYMENT_ENV",
  "version": "$IMAGE_TAG",
  "commit": "$CURRENT_COMMIT",
  "branch": "$CURRENT_BRANCH",
  "message": "$COMMIT_MESSAGE",
  "deployed_by": "$(whoami)",
  "status": "success"
}
EOF

    log "Deployment recorded"
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    if [[ -n "$WEBHOOK_URL" ]]; then
        log "Sending deployment notification..."

        local payload=$(cat <<EOF
{
  "deployment": {
    "status": "$status",
    "environment": "$DEPLOYMENT_ENV",
    "version": "$IMAGE_TAG",
    "commit": "$CURRENT_COMMIT",
    "message": "$message",
    "timestamp": "$DEPLOY_TIMESTAMP"
  }
}
EOF
)

        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "$payload" \
            --max-time 30 || warn "Notification failed"
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."

    cd "$PROJECT_ROOT"

    # Get previous deployment info
    local deployment_log="$PROJECT_ROOT/deployment/logs/deployments.log"
    if [[ ! -f "$deployment_log" ]]; then
        error "No deployment history found"
    fi

    local previous_commit=$(tail -2 "$deployment_log" | head -1 | jq -r '.commit' 2>/dev/null || echo "")
    if [[ -z "$previous_commit" ]]; then
        error "Cannot find previous deployment commit"
    fi

    log "Rolling back to commit: $previous_commit"

    # Checkout previous commit
    git checkout "$previous_commit"

    # Set rollback tag
    IMAGE_TAG="rollback-$(date +%Y%m%d_%H%M%S)"

    # Deploy previous version
    build_images
    deploy_application
    run_smoke_tests

    log "Rollback completed successfully"
}

# Confirm deployment
confirm_deployment() {
    if [[ "$FORCE_DEPLOY" == true ]] || [[ "$CHECK_ONLY" == true ]]; then
        return 0
    fi

    info "Deployment Summary:"
    info "  Environment: $DEPLOYMENT_ENV"
    info "  Version: $IMAGE_TAG"
    info "  Commit: $CURRENT_COMMIT"

    echo -n "Continue with deployment? (yes/no): "
    read -r response

    if [[ "$response" != "yes" ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
}

# Main deployment function
main() {
    log "Starting CHRONOS Financial deployment"

    # Parse arguments
    parse_args "$@"

    # Check prerequisites
    check_prerequisites

    # Get deployment information
    get_deployment_info

    # Check-only mode
    if [[ "$CHECK_ONLY" == true ]]; then
        log "Pre-deployment checks completed successfully"
        exit 0
    fi

    # Handle rollback
    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
        record_deployment
        send_notification "success" "Rollback completed"
        exit 0
    fi

    # Confirm deployment
    confirm_deployment

    # Create backup
    create_backup

    # Build images
    build_images

    # Deploy application
    deploy_application

    # Run smoke tests
    run_smoke_tests

    # Clean up
    cleanup

    # Record deployment
    record_deployment

    # Send notification
    send_notification "success" "Deployment completed successfully"

    log "Deployment completed successfully!"
    info "Application is available at: https://your-domain.com"
    info "Monitoring: https://your-domain.com:3001/grafana"
}

# Error handling
trap 'error "Deployment script interrupted"' INT TERM
trap 'send_notification "error" "Deployment failed"' ERR

# Change to project root
cd "$PROJECT_ROOT"

# Run main function
main "$@"