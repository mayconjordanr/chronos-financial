#!/bin/bash

# CHRONOS Financial - Health Check Script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-production}"
COMPOSE_FILE="docker-compose.production.yml"

# Health check URLs
FRONTEND_URL="http://localhost"
BACKEND_URL="http://localhost/api"
GRAFANA_URL="http://localhost:3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[HEALTH]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

warn() {
    echo -e "${YELLOW}[HEALTH-WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error() {
    echo -e "${RED}[HEALTH-ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

info() {
    echo -e "${BLUE}[HEALTH-INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Usage information
usage() {
    cat <<EOF
Usage: $0 [ENVIRONMENT] [OPTIONS]

Check CHRONOS Financial application health

ENVIRONMENTS:
    production    Check production environment (default)
    staging       Check staging environment

OPTIONS:
    -h, --help      Show this help message
    -v, --verbose   Show detailed output
    -j, --json      Output results in JSON format
    -w, --wait      Wait for services to be healthy

EXAMPLES:
    $0 production
    $0 staging --verbose
    $0 production --json

EOF
}

# Parse command line arguments
parse_args() {
    VERBOSE=false
    JSON_OUTPUT=false
    WAIT_FOR_HEALTHY=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -j|--json)
                JSON_OUTPUT=true
                shift
                ;;
            -w|--wait)
                WAIT_FOR_HEALTHY=true
                shift
                ;;
            production|staging)
                ENVIRONMENT="$1"
                shift
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done

    # Set compose file based on environment
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        COMPOSE_FILE="docker-compose.staging.yml"
        FRONTEND_URL="http://localhost:3000"
        BACKEND_URL="http://localhost:3001"
    fi
}

# Check Docker containers
check_containers() {
    local status="healthy"
    local details=()

    cd "$PROJECT_ROOT"

    log "Checking Docker containers..."

    local services=(
        "postgres"
        "redis"
        "backend"
        "frontend"
        "nginx"
    )

    for service in "${services[@]}"; do
        local container_status=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null || echo "not_found")
        local health_status=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")

        if [[ "$container_status" == "running" ]]; then
            if [[ "$health_status" == "healthy" || "$health_status" == "none" ]]; then
                details+=("$service: running")
                [[ "$VERBOSE" == true ]] && log "$service container is running and healthy"
            else
                details+=("$service: unhealthy")
                status="unhealthy"
                warn "$service container is running but unhealthy"
            fi
        else
            details+=("$service: $container_status")
            status="unhealthy"
            error "$service container is $container_status"
        fi
    done

    echo "$status|$(IFS=,; echo "${details[*]}")"
}

# Check application endpoints
check_endpoints() {
    local status="healthy"
    local details=()

    log "Checking application endpoints..."

    # Frontend health check
    if curl -f -s -m 10 "$FRONTEND_URL/api/health" > /dev/null 2>&1; then
        details+=("frontend: accessible")
        [[ "$VERBOSE" == true ]] && log "Frontend is accessible"
    else
        details+=("frontend: inaccessible")
        status="unhealthy"
        error "Frontend is not accessible"
    fi

    # Backend health check
    if curl -f -s -m 10 "$BACKEND_URL/health" > /dev/null 2>&1; then
        details+=("backend: accessible")
        [[ "$VERBOSE" == true ]] && log "Backend is accessible"
    else
        details+=("backend: inaccessible")
        status="unhealthy"
        error "Backend is not accessible"
    fi

    # Check API response
    local api_response=$(curl -s -m 10 "$BACKEND_URL/health" 2>/dev/null || echo "failed")
    if echo "$api_response" | jq -e '.status' > /dev/null 2>&1; then
        local api_status=$(echo "$api_response" | jq -r '.status')
        details+=("api: $api_status")
        [[ "$VERBOSE" == true ]] && log "API status: $api_status"
    else
        details+=("api: invalid_response")
        status="unhealthy"
        error "API returned invalid response"
    fi

    echo "$status|$(IFS=,; echo "${details[*]}")"
}

# Check database connectivity
check_database() {
    local status="healthy"
    local details=()

    log "Checking database connectivity..."

    cd "$PROJECT_ROOT"

    # Check PostgreSQL
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -q 2>/dev/null; then
        details+=("postgres: ready")
        [[ "$VERBOSE" == true ]] && log "PostgreSQL is ready"

        # Check connection count
        local connections=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "\$POSTGRES_USER" -d "\$POSTGRES_DB" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")
        details+=("connections: $connections")
        [[ "$VERBOSE" == true ]] && log "Active connections: $connections"
    else
        details+=("postgres: not_ready")
        status="unhealthy"
        error "PostgreSQL is not ready"
    fi

    # Check Redis
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        details+=("redis: ready")
        [[ "$VERBOSE" == true ]] && log "Redis is ready"

        # Check memory usage
        local memory_used=$(docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "unknown")
        details+=("redis_memory: $memory_used")
        [[ "$VERBOSE" == true ]] && log "Redis memory usage: $memory_used"
    else
        details+=("redis: not_ready")
        status="unhealthy"
        error "Redis is not ready"
    fi

    echo "$status|$(IFS=,; echo "${details[*]}")"
}

# Check system resources
check_resources() {
    local status="healthy"
    local details=()

    log "Checking system resources..."

    # Check disk usage
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    details+=("disk_usage: ${disk_usage}%")
    if [[ $disk_usage -gt 85 ]]; then
        status="warning"
        warn "Disk usage is high: ${disk_usage}%"
    else
        [[ "$VERBOSE" == true ]] && log "Disk usage: ${disk_usage}%"
    fi

    # Check memory usage
    if command -v free &> /dev/null; then
        local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        details+=("memory_usage: ${memory_usage}%")
        if [[ $memory_usage -gt 85 ]]; then
            status="warning"
            warn "Memory usage is high: ${memory_usage}%"
        else
            [[ "$VERBOSE" == true ]] && log "Memory usage: ${memory_usage}%"
        fi
    fi

    # Check load average
    if command -v uptime &> /dev/null; then
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        details+=("load_avg: $load_avg")
        [[ "$VERBOSE" == true ]] && log "Load average: $load_avg"
    fi

    echo "$status|$(IFS=,; echo "${details[*]}")"
}

# Check SSL certificates
check_ssl() {
    local status="healthy"
    local details=()

    log "Checking SSL certificates..."

    local ssl_cert_path="$PROJECT_ROOT/docker/nginx/ssl/cert.pem"

    if [[ -f "$ssl_cert_path" ]]; then
        local expiry_date=$(openssl x509 -in "$ssl_cert_path" -noout -enddate 2>/dev/null | cut -d= -f2 || echo "unknown")
        local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

        details+=("ssl_expiry: ${days_until_expiry}_days")

        if [[ $days_until_expiry -lt 30 ]]; then
            status="warning"
            warn "SSL certificate expires in $days_until_expiry days"
        else
            [[ "$VERBOSE" == true ]] && log "SSL certificate expires in $days_until_expiry days"
        fi
    else
        details+=("ssl_cert: not_found")
        status="warning"
        warn "SSL certificate not found"
    fi

    echo "$status|$(IFS=,; echo "${details[*]}")"
}

# Wait for services to be healthy
wait_for_healthy() {
    if [[ "$WAIT_FOR_HEALTHY" != true ]]; then
        return 0
    fi

    log "Waiting for services to be healthy..."

    local max_attempts=60
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        local overall_status=$(run_health_checks | jq -r '.overall_status')

        if [[ "$overall_status" == "healthy" ]]; then
            log "All services are healthy"
            return 0
        fi

        ((attempt++))
        sleep 10
        info "Waiting... (attempt $attempt/$max_attempts)"
    done

    error "Services did not become healthy within the timeout period"
}

# Run all health checks
run_health_checks() {
    local timestamp=$(date -Iseconds)
    local overall_status="healthy"

    # Run individual checks
    local container_result=$(check_containers)
    local container_status=$(echo "$container_result" | cut -d'|' -f1)
    local container_details=$(echo "$container_result" | cut -d'|' -f2)

    local endpoint_result=$(check_endpoints)
    local endpoint_status=$(echo "$endpoint_result" | cut -d'|' -f1)
    local endpoint_details=$(echo "$endpoint_result" | cut -d'|' -f2)

    local database_result=$(check_database)
    local database_status=$(echo "$database_result" | cut -d'|' -f1)
    local database_details=$(echo "$database_result" | cut -d'|' -f2)

    local resource_result=$(check_resources)
    local resource_status=$(echo "$resource_result" | cut -d'|' -f1)
    local resource_details=$(echo "$resource_result" | cut -d'|' -f2)

    local ssl_result=$(check_ssl)
    local ssl_status=$(echo "$ssl_result" | cut -d'|' -f1)
    local ssl_details=$(echo "$ssl_result" | cut -d'|' -f2)

    # Determine overall status
    for status in "$container_status" "$endpoint_status" "$database_status" "$resource_status" "$ssl_status"; do
        if [[ "$status" == "unhealthy" ]]; then
            overall_status="unhealthy"
            break
        elif [[ "$status" == "warning" ]]; then
            overall_status="warning"
        fi
    done

    # Output results
    if [[ "$JSON_OUTPUT" == true ]]; then
        cat <<EOF
{
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "overall_status": "$overall_status",
  "checks": {
    "containers": {
      "status": "$container_status",
      "details": "$container_details"
    },
    "endpoints": {
      "status": "$endpoint_status",
      "details": "$endpoint_details"
    },
    "database": {
      "status": "$database_status",
      "details": "$database_details"
    },
    "resources": {
      "status": "$resource_status",
      "details": "$resource_details"
    },
    "ssl": {
      "status": "$ssl_status",
      "details": "$ssl_details"
    }
  }
}
EOF
    else
        log "Health check completed"
        info "Overall Status: $overall_status"
        info "Environment: $ENVIRONMENT"
        info "Timestamp: $timestamp"
    fi

    # Return appropriate exit code
    case "$overall_status" in
        "healthy")
            return 0
            ;;
        "warning")
            return 1
            ;;
        "unhealthy")
            return 2
            ;;
    esac
}

# Main function
main() {
    # Parse arguments
    parse_args "$@"

    if [[ "$JSON_OUTPUT" != true ]]; then
        log "Starting CHRONOS Financial health check"
        info "Environment: $ENVIRONMENT"
    fi

    # Wait for healthy services if requested
    wait_for_healthy

    # Run health checks
    run_health_checks
}

# Run main function
main "$@"