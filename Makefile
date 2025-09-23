# CHRONOS Financial SaaS Makefile
# Convenient commands for development and deployment

.PHONY: help install dev build test clean docker lint format migrate seed backup

# Default target
help: ## Show this help message
	@echo "CHRONOS Financial SaaS - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation
install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	npm install
	cd backend && npm install
	cd frontend && npm install

install-ci: ## Install dependencies for CI (no optional deps)
	@echo "📦 Installing CI dependencies..."
	npm ci
	cd backend && npm ci
	cd frontend && npm ci

# Development
dev: ## Start development environment
	@echo "🚀 Starting development environment..."
	docker-compose up -d
	@echo "✅ Development environment started!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🔧 Backend API: http://localhost:3001"
	@echo "🗄️ Database Admin: http://localhost:8080"
	@echo "📧 Mail UI: http://localhost:8025"

dev-local: ## Start development without Docker
	@echo "🚀 Starting local development..."
	npm run dev

stop: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	docker-compose down

restart: ## Restart development environment
	@echo "🔄 Restarting development environment..."
	docker-compose restart

logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

# Building
build: ## Build all services
	@echo "🏗️ Building all services..."
	npm run build

build-docker: ## Build Docker images
	@echo "🐳 Building Docker images..."
	docker-compose build

build-prod: ## Build production Docker images
	@echo "🏭 Building production Docker images..."
	docker-compose -f docker-compose.prod.yml build

# Testing
test: ## Run all tests
	@echo "🧪 Running all tests..."
	npm run test

test-backend: ## Run backend tests
	@echo "🧪 Running backend tests..."
	npm run test:backend

test-frontend: ## Run frontend tests
	@echo "🧪 Running frontend tests..."
	npm run test:frontend

test-e2e: ## Run end-to-end tests
	@echo "🧪 Running E2E tests..."
	npm run test:e2e

test-coverage: ## Generate test coverage report
	@echo "📊 Generating test coverage..."
	npm run test:coverage

# Code Quality
lint: ## Run linters
	@echo "🔍 Running linters..."
	npm run lint

lint-fix: ## Fix linting issues
	@echo "🔧 Fixing linting issues..."
	npm run lint:fix

format: ## Format code
	@echo "✨ Formatting code..."
	npm run format

format-check: ## Check code formatting
	@echo "🔍 Checking code formatting..."
	npm run format:check

type-check: ## Run TypeScript type checking
	@echo "🔍 Running type checks..."
	npm run type-check

security-audit: ## Run security audit
	@echo "🔒 Running security audit..."
	npm run security:audit

# Database
db-generate: ## Generate Prisma client
	@echo "🔧 Generating Prisma client..."
	npx prisma generate

db-migrate: ## Run database migrations
	@echo "📝 Running database migrations..."
	npx prisma migrate deploy

db-migrate-dev: ## Run database migrations (development)
	@echo "📝 Running development migrations..."
	npx prisma migrate dev

db-reset: ## Reset database
	@echo "🗑️ Resetting database..."
	npx prisma migrate reset --force

db-seed: ## Seed database with initial data
	@echo "🌱 Seeding database..."
	npx prisma db seed

db-studio: ## Open Prisma Studio
	@echo "🎨 Opening Prisma Studio..."
	npx prisma studio

db-backup: ## Create database backup
	@echo "💾 Creating database backup..."
	./scripts/backup.sh

# Setup
setup: ## Complete setup (install, migrate, seed)
	@echo "🎯 Running complete setup..."
	make install
	make db-generate
	make db-migrate
	make db-seed
	@echo "✅ Setup completed!"

setup-docker: ## Setup with Docker
	@echo "🐳 Setting up with Docker..."
	docker-compose up -d postgres redis
	sleep 10
	make db-migrate
	make db-seed
	@echo "✅ Docker setup completed!"

# Production
prod-up: ## Start production environment
	@echo "🏭 Starting production environment..."
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production environment
	@echo "🛑 Stopping production environment..."
	docker-compose -f docker-compose.prod.yml down

prod-logs: ## Show production logs
	docker-compose -f docker-compose.prod.yml logs -f

# Maintenance
clean: ## Clean build artifacts and dependencies
	@echo "🧹 Cleaning up..."
	npm run clean
	docker system prune -f
	docker volume prune -f

clean-all: ## Clean everything including Docker images
	@echo "🧹 Deep cleaning..."
	make clean
	docker-compose down -v --rmi all
	docker system prune -a -f

update: ## Update dependencies
	@echo "📦 Updating dependencies..."
	npm update
	cd backend && npm update
	cd frontend && npm update

# Health checks
health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -f http://localhost/health && echo "✅ Nginx OK" || echo "❌ Nginx Failed"
	@curl -f http://localhost:3001/health && echo "✅ Backend OK" || echo "❌ Backend Failed"
	@curl -f http://localhost:3000 && echo "✅ Frontend OK" || echo "❌ Frontend Failed"

# Utilities
shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-postgres: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U chronos_user -d chronos_dev

shell-redis: ## Open Redis shell
	docker-compose exec redis redis-cli

# Documentation
docs: ## Generate API documentation
	@echo "📚 Generating documentation..."
	cd backend && npm run docs

# Git hooks
pre-commit: ## Run pre-commit checks
	@echo "🔍 Running pre-commit checks..."
	make lint
	make type-check
	make test
	@echo "✅ Pre-commit checks passed!"

# Environment
env-check: ## Check environment variables
	@echo "🔍 Checking environment variables..."
	@echo "NODE_ENV: $${NODE_ENV:-not set}"
	@echo "DATABASE_URL: $${DATABASE_URL:-not set}"
	@echo "REDIS_URL: $${REDIS_URL:-not set}"
	@echo "JWT_SECRET: $${JWT_SECRET:-not set}"

# Quick commands
q-dev: dev ## Quick: Start development (alias for dev)
q-test: test ## Quick: Run tests (alias for test)
q-build: build ## Quick: Build (alias for build)
q-clean: clean ## Quick: Clean (alias for clean)