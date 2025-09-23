#!/bin/bash

# CHRONOS Infrastructure Validation Script
# This script validates that all infrastructure components are properly configured

set -e

echo "🔍 CHRONOS Infrastructure Validation"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "ℹ️  INFO: $1"
}

# Check if file exists
check_file() {
    if [ -f "$1" ]; then
        pass "File exists: $1"
        return 0
    else
        fail "File missing: $1"
        return 1
    fi
}

# Check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        pass "Directory exists: $1"
        return 0
    else
        fail "Directory missing: $1"
        return 1
    fi
}

# Check if command exists
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        pass "Command available: $1"
        return 0
    else
        fail "Command missing: $1"
        return 1
    fi
}

# Check if port is available
check_port() {
    if ! nc -z localhost "$1" 2>/dev/null; then
        pass "Port available: $1"
        return 0
    else
        warn "Port in use: $1"
        return 1
    fi
}

# Check if service is running
check_service() {
    if docker-compose ps "$1" | grep -q "Up"; then
        pass "Service running: $1"
        return 0
    else
        fail "Service not running: $1"
        return 1
    fi
}

echo ""
echo "🔧 Checking Prerequisites..."
echo "----------------------------"

# Check required commands
check_command "docker"
check_command "docker-compose"
check_command "node"
check_command "npm"
check_command "git"

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
    pass "Node.js version: $NODE_VERSION (>= $REQUIRED_NODE)"
else
    fail "Node.js version: $NODE_VERSION (requires >= $REQUIRED_NODE)"
fi

echo ""
echo "📁 Checking File Structure..."
echo "-----------------------------"

# Check root files
check_file "docker-compose.yml"
check_file "docker-compose.prod.yml"
check_file "docker-compose.override.yml"
check_file ".env.example"
check_file ".dockerignore"
check_file "Makefile"
check_file "package.json"

# Check environment files
if check_file ".env"; then
    info "Development environment file found"
else
    warn "Consider copying .env.example to .env for development"
fi

# Check directories
check_dir "docker"
check_dir "docker/nginx"
check_dir "docker/backend"
check_dir "docker/frontend"
check_dir "docker/postgres"
check_dir "docker/redis"
check_dir "prisma"
check_dir "scripts"
check_dir ".github/workflows"

# Check Docker configurations
check_file "docker/nginx/nginx.conf"
check_file "docker/nginx/nginx.prod.conf"
check_file "docker/nginx/conf.d/default.conf"
check_file "docker/backend/Dockerfile"
check_file "docker/backend/Dockerfile.dev"
check_file "docker/frontend/Dockerfile"
check_file "docker/frontend/Dockerfile.dev"

# Check database files
check_file "prisma/schema.prisma"
check_file "prisma/seed.ts"
check_file "docker/postgres/init/01-init-tenant-rls.sql"
check_file "docker/postgres/postgresql.conf"
check_file "docker/redis/redis.conf"

# Check scripts
check_file "scripts/migrate-and-seed.sh"
check_file "scripts/backup.sh"

if [ -f "scripts/migrate-and-seed.sh" ]; then
    if [ -x "scripts/migrate-and-seed.sh" ]; then
        pass "Script executable: migrate-and-seed.sh"
    else
        warn "Script not executable: migrate-and-seed.sh"
    fi
fi

if [ -f "scripts/backup.sh" ]; then
    if [ -x "scripts/backup.sh" ]; then
        pass "Script executable: backup.sh"
    else
        warn "Script not executable: backup.sh"
    fi
fi

# Check CI/CD
check_file ".github/workflows/ci-cd.yml"

echo ""
echo "🔌 Checking Port Availability..."
echo "-------------------------------"

# Check common ports
check_port 3000  # Frontend
check_port 3001  # Backend
check_port 5432  # PostgreSQL
check_port 6379  # Redis
check_port 80    # Nginx HTTP
check_port 443   # Nginx HTTPS
check_port 8080  # Adminer
check_port 8025  # Mailhog UI
check_port 1025  # Mailhog SMTP

echo ""
echo "🐳 Checking Docker Configuration..."
echo "----------------------------------"

# Check Docker daemon
if docker info >/dev/null 2>&1; then
    pass "Docker daemon running"
else
    fail "Docker daemon not running"
fi

# Check Docker Compose version
if COMPOSE_VERSION=$(docker-compose --version 2>/dev/null); then
    pass "Docker Compose available: $COMPOSE_VERSION"
else
    fail "Docker Compose not available"
fi

# Validate docker-compose.yml
if docker-compose config >/dev/null 2>&1; then
    pass "docker-compose.yml syntax valid"
else
    fail "docker-compose.yml syntax invalid"
fi

# Validate production compose file
if docker-compose -f docker-compose.prod.yml config >/dev/null 2>&1; then
    pass "docker-compose.prod.yml syntax valid"
else
    fail "docker-compose.prod.yml syntax invalid"
fi

echo ""
echo "📦 Checking Dependencies..."
echo "-------------------------"

# Check if package.json exists and has required scripts
if [ -f "package.json" ]; then
    if npm run >/dev/null 2>&1; then
        SCRIPTS=$(npm run 2>&1 | grep -E "^\s+" | wc -l)
        pass "package.json scripts available: $SCRIPTS"
    else
        warn "Unable to read package.json scripts"
    fi
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    pass "Root dependencies installed"
else
    warn "Root dependencies not installed (run: npm install)"
fi

echo ""
echo "🗄️ Checking Database Configuration..."
echo "------------------------------------"

# Check Prisma schema syntax
if command -v npx >/dev/null 2>&1; then
    if npx prisma validate >/dev/null 2>&1; then
        pass "Prisma schema valid"
    else
        fail "Prisma schema invalid"
    fi
else
    warn "Cannot validate Prisma schema (npx not available)"
fi

# Check seed file syntax
if [ -f "prisma/seed.ts" ]; then
    if command -v npx >/dev/null 2>&1 && npx tsc --noEmit prisma/seed.ts >/dev/null 2>&1; then
        pass "Seed file TypeScript valid"
    else
        warn "Cannot validate seed file TypeScript"
    fi
fi

echo ""
echo "🔒 Checking Security Configuration..."
echo "-----------------------------------"

# Check .env.example for security variables
if [ -f ".env.example" ]; then
    if grep -q "JWT_SECRET" .env.example; then
        pass "JWT_SECRET defined in .env.example"
    else
        fail "JWT_SECRET missing in .env.example"
    fi

    if grep -q "POSTGRES_PASSWORD" .env.example; then
        pass "POSTGRES_PASSWORD defined in .env.example"
    else
        fail "POSTGRES_PASSWORD missing in .env.example"
    fi

    if grep -q "REDIS_PASSWORD" .env.example; then
        pass "REDIS_PASSWORD defined in .env.example"
    else
        fail "REDIS_PASSWORD missing in .env.example"
    fi
fi

# Check for common security issues in .env
if [ -f ".env" ]; then
    if grep -q "password" .env && grep -q "123" .env; then
        warn "Weak passwords detected in .env (development only!)"
    fi

    if grep -q "dev_.*_secret" .env; then
        warn "Development secrets detected in .env"
    fi
fi

# Check .dockerignore
if [ -f ".dockerignore" ]; then
    if grep -q ".env" .dockerignore && grep -q "node_modules" .dockerignore; then
        pass ".dockerignore properly configured"
    else
        warn ".dockerignore may be missing important exclusions"
    fi
fi

echo ""
echo "🚀 Optional Service Checks..."
echo "---------------------------"

# Check if services are running (optional)
if docker-compose ps >/dev/null 2>&1; then
    info "Checking running services..."

    # Only check if docker-compose shows any services
    if docker-compose ps | grep -q "chronos"; then
        check_service "postgres" || true
        check_service "redis" || true
        check_service "nginx" || true
        check_service "backend" || true
        check_service "frontend" || true
    else
        info "No services currently running (use 'make dev' to start)"
    fi
else
    info "Docker Compose not initialized (services not running)"
fi

echo ""
echo "📊 Validation Summary"
echo "===================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Infrastructure validation completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run 'make install' to install dependencies"
    echo "2. Run 'make dev' to start development environment"
    echo "3. Run 'make setup-docker' to initialize database"
    echo "4. Access the application at http://localhost:3000"
    exit 0
else
    echo -e "${RED}❌ Infrastructure validation failed with $FAILED errors.${NC}"
    echo ""
    echo "Please fix the failed checks before proceeding."
    exit 1
fi