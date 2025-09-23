# Setup Complete Infrastructure

Execute these tasks using the infrastructure-specialist agent:

## Phase 1: Docker Setup
1. Create docker-compose.yml for development
2. Create docker-compose.prod.yml for production
3. Include: PostgreSQL, Redis, Nginx, Adminer, Mailhog

## Phase 2: Database Setup
1. Create Prisma schema with all tables
2. Include RLS policies
3. Create seed data
4. Setup migrations

## Phase 3: Environment Configuration
1. Create .env.example with all variables
2. Create .env for development
3. Document each variable

## Phase 4: CI/CD Setup
1. Create GitHub Actions workflow
2. Include tests, linting, deployment
3. Setup branch protection

Use parallel execution where possible.
Verify each step with health checks.
