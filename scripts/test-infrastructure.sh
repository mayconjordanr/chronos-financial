#!/bin/bash

# CHRONOS Financial - Infrastructure Test Runner
# This script runs all infrastructure tests with proper setup and teardown

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="${PROJECT_ROOT}/tests"
DOCKER_COMPOSE_FILE="${TEST_DIR}/docker-test-compose.yml"
COVERAGE_DIR="${PROJECT_ROOT}/coverage"
REPORTS_DIR="${PROJECT_ROOT}/test-reports"

# Default values
RUN_UNIT_TESTS=true
RUN_INTEGRATION_TESTS=true
RUN_E2E_TESTS=true
RUN_SECURITY_TESTS=true
RUN_PERFORMANCE_TESTS=false
GENERATE_COVERAGE=true
CLEANUP_AFTER=true
VERBOSE=false
PARALLEL=true
DOCKER_MODE=false

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print section headers
print_section() {
    local message=$1
    echo
    print_color $BLUE "=========================================="
    print_color $BLUE "$message"
    print_color $BLUE "=========================================="
    echo
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

CHRONOS Financial Infrastructure Test Runner

OPTIONS:
    -u, --unit-only         Run only unit tests
    -i, --integration-only  Run only integration tests
    -e, --e2e-only         Run only E2E tests
    -s, --security-only    Run only security tests
    -p, --performance      Include performance tests
    --no-coverage          Skip coverage generation
    --no-cleanup           Skip cleanup after tests
    --docker               Run tests in Docker containers
    --parallel             Run tests in parallel (default)
    --sequential           Run tests sequentially
    -v, --verbose          Verbose output
    -h, --help             Show this help message

EXAMPLES:
    $0                     Run all infrastructure tests
    $0 --unit-only         Run only unit tests
    $0 --security-only -v  Run security tests with verbose output
    $0 --docker --performance  Run all tests including performance in Docker
    $0 --no-cleanup        Run tests but skip cleanup

ENVIRONMENT VARIABLES:
    TEST_DATABASE_URL      Override test database URL
    TEST_REDIS_URL         Override test Redis URL
    JEST_MAX_WORKERS       Number of Jest workers (default: 50%)
    TEST_TIMEOUT           Test timeout in milliseconds (default: 30000)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--unit-only)
            RUN_INTEGRATION_TESTS=false
            RUN_E2E_TESTS=false
            RUN_SECURITY_TESTS=false
            shift
            ;;
        -i|--integration-only)
            RUN_UNIT_TESTS=false
            RUN_E2E_TESTS=false
            RUN_SECURITY_TESTS=false
            shift
            ;;
        -e|--e2e-only)
            RUN_UNIT_TESTS=false
            RUN_INTEGRATION_TESTS=false
            RUN_SECURITY_TESTS=false
            shift
            ;;
        -s|--security-only)
            RUN_UNIT_TESTS=false
            RUN_INTEGRATION_TESTS=false
            RUN_E2E_TESTS=false
            shift
            ;;
        -p|--performance)
            RUN_PERFORMANCE_TESTS=true
            shift
            ;;
        --no-coverage)
            GENERATE_COVERAGE=false
            shift
            ;;
        --no-cleanup)
            CLEANUP_AFTER=false
            shift
            ;;
        --docker)
            DOCKER_MODE=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --sequential)
            PARALLEL=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_color $RED "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_color $RED "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="18.0.0"
    if ! printf '%s\n%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V -C; then
        print_color $RED "Node.js version $NODE_VERSION is too old. Please upgrade to version 18 or higher."
        exit 1
    fi
    print_color $GREEN "✓ Node.js version: $NODE_VERSION"

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_color $RED "npm is not installed. Please install npm."
        exit 1
    fi
    print_color $GREEN "✓ npm is available"

    # Check if Docker is installed (if Docker mode)
    if [ "$DOCKER_MODE" = true ]; then
        if ! command -v docker &> /dev/null; then
            print_color $RED "Docker is not installed but --docker flag was specified."
            exit 1
        fi

        if ! command -v docker-compose &> /dev/null; then
            print_color $RED "docker-compose is not installed but --docker flag was specified."
            exit 1
        fi
        print_color $GREEN "✓ Docker and docker-compose are available"
    fi

    # Check if PostgreSQL is running (if not Docker mode)
    if [ "$DOCKER_MODE" = false ]; then
        if ! command -v pg_isready &> /dev/null; then
            print_color $YELLOW "Warning: pg_isready not found. Cannot verify PostgreSQL status."
        else
            if ! pg_isready -h localhost -p 5433 -U chronos_test_user &> /dev/null; then
                print_color $YELLOW "Warning: Test PostgreSQL database may not be running on port 5433"
                print_color $YELLOW "Consider using --docker flag or start the test database manually"
            else
                print_color $GREEN "✓ Test PostgreSQL database is running"
            fi
        fi
    fi

    print_color $GREEN "Prerequisites check completed"
}

# Function to setup test environment
setup_test_environment() {
    print_section "Setting Up Test Environment"

    # Create necessary directories
    mkdir -p "$COVERAGE_DIR"
    mkdir -p "$REPORTS_DIR"

    # Copy test environment file
    if [ -f "${TEST_DIR}/.env.test" ]; then
        cp "${TEST_DIR}/.env.test" "${PROJECT_ROOT}/.env.test"
        print_color $GREEN "✓ Test environment file copied"
    fi

    # Install dependencies if needed
    if [ ! -d "${PROJECT_ROOT}/node_modules" ] || [ ! -d "${TEST_DIR}/node_modules" ]; then
        print_color $YELLOW "Installing dependencies..."
        cd "$PROJECT_ROOT"
        npm install
        print_color $GREEN "✓ Dependencies installed"
    fi

    # Install test-specific dependencies
    cd "$TEST_DIR"
    if [ ! -f "package.json" ]; then
        cat > package.json << EOF
{
  "name": "chronos-financial-tests",
  "version": "1.0.0",
  "description": "Test suite for CHRONOS Financial",
  "private": true,
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --watchAll=false"
  },
  "devDependencies": {
    "@types/jest": "^29.5.5",
    "@faker-js/faker": "^8.2.0",
    "jest": "^29.7.0",
    "jest-html-reporters": "^3.1.5",
    "jest-junit": "^16.0.0",
    "ts-jest": "^29.1.1"
  }
}
EOF
    fi

    if [ ! -d "node_modules" ]; then
        npm install
        print_color $GREEN "✓ Test dependencies installed"
    fi

    cd "$PROJECT_ROOT"

    print_color $GREEN "Test environment setup completed"
}

# Function to start Docker services
start_docker_services() {
    if [ "$DOCKER_MODE" = true ]; then
        print_section "Starting Docker Test Services"

        # Stop any existing services
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v &> /dev/null || true

        # Start test services
        print_color $YELLOW "Starting test database and services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres-test redis-test

        # Wait for services to be healthy
        print_color $YELLOW "Waiting for services to be ready..."
        timeout=60
        elapsed=0
        while [ $elapsed -lt $timeout ]; do
            if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "healthy"; then
                break
            fi
            sleep 2
            elapsed=$((elapsed + 2))
        done

        if [ $elapsed -ge $timeout ]; then
            print_color $RED "Timeout waiting for Docker services to be ready"
            exit 1
        fi

        # Run database migrations
        print_color $YELLOW "Running database migrations..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm db-test-migrate

        print_color $GREEN "✓ Docker services started and ready"
    fi
}

# Function to stop Docker services
stop_docker_services() {
    if [ "$DOCKER_MODE" = true ] && [ "$CLEANUP_AFTER" = true ]; then
        print_section "Stopping Docker Test Services"
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v
        print_color $GREEN "✓ Docker services stopped"
    fi
}

# Function to run database migrations
run_migrations() {
    if [ "$DOCKER_MODE" = false ]; then
        print_section "Running Database Migrations"

        cd "$PROJECT_ROOT"

        # Set test database URL
        export DATABASE_URL="${TEST_DATABASE_URL:-postgresql://chronos_test_user:chronos_test_password@localhost:5433/chronos_test}"

        # Run Prisma migrations
        npx prisma migrate deploy --schema=prisma/schema.prisma

        print_color $GREEN "✓ Database migrations completed"
    fi
}

# Function to run tests
run_test_suite() {
    local test_type=$1
    local test_path=$2
    local description=$3

    print_section "Running $description"

    cd "$TEST_DIR"

    # Prepare Jest command
    local jest_cmd="npx jest"

    if [ "$GENERATE_COVERAGE" = true ]; then
        jest_cmd="$jest_cmd --coverage"
    fi

    if [ "$VERBOSE" = true ]; then
        jest_cmd="$jest_cmd --verbose"
    fi

    if [ "$PARALLEL" = true ]; then
        jest_cmd="$jest_cmd --maxWorkers=50%"
    else
        jest_cmd="$jest_cmd --runInBand"
    fi

    # Add test path
    jest_cmd="$jest_cmd $test_path"

    # Set test environment variables
    export NODE_ENV=test
    export CI=true

    # Run the tests
    if eval "$jest_cmd"; then
        print_color $GREEN "✓ $description completed successfully"
        return 0
    else
        print_color $RED "✗ $description failed"
        return 1
    fi
}

# Function to generate test reports
generate_reports() {
    print_section "Generating Test Reports"

    # Copy coverage reports
    if [ "$GENERATE_COVERAGE" = true ] && [ -d "${TEST_DIR}/coverage" ]; then
        cp -r "${TEST_DIR}/coverage" "$COVERAGE_DIR/"
        print_color $GREEN "✓ Coverage reports copied to $COVERAGE_DIR"
    fi

    # Generate summary report
    local summary_file="${REPORTS_DIR}/test-summary.txt"
    cat > "$summary_file" << EOF
CHRONOS Financial Infrastructure Test Summary
============================================
Date: $(date)
Test Configuration:
- Unit Tests: $RUN_UNIT_TESTS
- Integration Tests: $RUN_INTEGRATION_TESTS
- E2E Tests: $RUN_E2E_TESTS
- Security Tests: $RUN_SECURITY_TESTS
- Performance Tests: $RUN_PERFORMANCE_TESTS
- Docker Mode: $DOCKER_MODE
- Coverage Generated: $GENERATE_COVERAGE
- Parallel Execution: $PARALLEL

Test Results:
EOF

    # Add individual test results (would be populated by actual test runs)
    print_color $GREEN "✓ Test summary report generated: $summary_file"
}

# Function to cleanup
cleanup() {
    if [ "$CLEANUP_AFTER" = true ]; then
        print_section "Cleaning Up"

        # Remove temporary files
        rm -f "${PROJECT_ROOT}/.env.test"

        # Stop Docker services if running
        stop_docker_services

        print_color $GREEN "✓ Cleanup completed"
    fi
}

# Main execution function
main() {
    local exit_code=0

    print_section "CHRONOS Financial Infrastructure Test Runner"
    print_color $BLUE "Starting infrastructure tests..."

    # Setup trap for cleanup on exit
    trap cleanup EXIT

    # Check prerequisites
    check_prerequisites

    # Setup test environment
    setup_test_environment

    # Start Docker services if needed
    start_docker_services

    # Run database migrations
    run_migrations

    # Run test suites
    if [ "$RUN_UNIT_TESTS" = true ]; then
        if ! run_test_suite "unit" "infrastructure/*.test.ts" "Infrastructure Unit Tests"; then
            exit_code=1
        fi
    fi

    if [ "$RUN_INTEGRATION_TESTS" = true ]; then
        if ! run_test_suite "integration" "integration/*.test.ts" "Integration Tests"; then
            exit_code=1
        fi
    fi

    if [ "$RUN_E2E_TESTS" = true ]; then
        if ! run_test_suite "e2e" "e2e/*.test.ts" "End-to-End Tests"; then
            exit_code=1
        fi
    fi

    if [ "$RUN_SECURITY_TESTS" = true ]; then
        if ! run_test_suite "security" "security/*.test.ts" "Security Tests"; then
            exit_code=1
        fi
    fi

    if [ "$RUN_PERFORMANCE_TESTS" = true ]; then
        if ! run_test_suite "performance" "e2e/performance.test.ts" "Performance Tests"; then
            exit_code=1
        fi
    fi

    # Generate reports
    generate_reports

    # Print final status
    print_section "Test Execution Complete"
    if [ $exit_code -eq 0 ]; then
        print_color $GREEN "🎉 All tests passed successfully!"
        print_color $GREEN "Coverage reports: $COVERAGE_DIR"
        print_color $GREEN "Test reports: $REPORTS_DIR"
    else
        print_color $RED "❌ Some tests failed. Check the output above for details."
        print_color $YELLOW "Coverage reports: $COVERAGE_DIR"
        print_color $YELLOW "Test reports: $REPORTS_DIR"
    fi

    exit $exit_code
}

# Run main function
main "$@"