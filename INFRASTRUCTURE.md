# CHRONOS Infrastructure Documentation

## Overview

This document provides comprehensive information about the CHRONOS multi-tenant financial SaaS infrastructure setup. The infrastructure is designed for scalability, security, and maintainability with full multi-tenant isolation.

## Architecture Components

### 🐳 Docker Environment

#### Development (docker-compose.yml)
- **PostgreSQL 15**: Multi-tenant database with RLS policies
- **Redis 7**: Caching and session management
- **Nginx**: Reverse proxy and load balancer
- **Backend API**: Node.js application server
- **Frontend**: React/Vite development server
- **Adminer**: Database administration tool
- **Mailhog**: Email testing service

#### Production (docker-compose.prod.yml)
- Optimized builds with multi-stage Dockerfiles
- Security hardening with non-root users
- Resource limits and health checks
- SSL/TLS termination
- Log aggregation with Fluentd
- Automated backup service

### 🗄️ Database Design

#### Multi-Tenant Architecture
- **Row Level Security (RLS)**: Automatic tenant isolation
- **Tenant Context**: Session-based tenant identification
- **Audit Logging**: Complete activity tracking
- **Performance Optimization**: Strategic indexing

#### Key Tables
- `tenants`: Tenant configuration and settings
- `users`: User management with tenant isolation
- `accounts`: Financial accounts (checking, savings, etc.)
- `transactions`: Financial transactions with categorization
- `budgets`: Budget management and tracking
- `categories`: Transaction categorization
- `whatsapp_chats` & `whatsapp_messages`: WhatsApp integration
- `audit_logs`: Security and compliance logging

### 🔒 Security Features

#### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Session management with Redis
- Multi-tenant isolation at database level

#### Security Headers
- Content Security Policy (CSP)
- XSS Protection
- CSRF Protection
- Secure cookies
- HSTS headers

#### Rate Limiting
- API endpoint rate limiting
- Authentication endpoint protection
- WhatsApp webhook rate limiting
- Per-IP connection limits

### 🚀 CI/CD Pipeline

#### GitHub Actions Workflow
1. **Quality Checks**: Linting, formatting, type checking
2. **Security Scanning**: Dependency audit, vulnerability scan
3. **Testing**: Unit tests, integration tests, E2E tests
4. **Database Validation**: Schema validation, migration tests
5. **Docker Builds**: Multi-arch image building
6. **Security Scanning**: Container vulnerability scanning
7. **Deployment**: Automated staging and production deployment

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Git

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd chronos-financial
   make install
   ```

2. **Start Development Environment**
   ```bash
   make dev
   ```

3. **Setup Database**
   ```bash
   make setup-docker
   ```

4. **Access Services**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database Admin: http://localhost:8080
   - Email UI: http://localhost:8025

### Production Deployment

1. **Configure Environment**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Build and Deploy**
   ```bash
   make build-prod
   make prod-up
   ```

## Environment Configuration

### Required Variables

#### Database
```env
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_DB=chronos_production
POSTGRES_USER=chronos_user
POSTGRES_PASSWORD=secure_password
```

#### Redis
```env
REDIS_URL=redis://host:port
REDIS_PASSWORD=secure_password
```

#### Application Security
```env
JWT_SECRET=your-super-secure-jwt-secret-min-32-characters
BCRYPT_ROUNDS=12
SESSION_SECRET=your-super-secure-session-secret
```

#### WhatsApp Integration
```env
WHATSAPP_API_TOKEN=your_whatsapp_business_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret
```

### Optional Integrations

#### Email Service
```env
EMAIL_HOST=smtp.provider.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASSWORD=your_password
```

#### Monitoring
```env
SENTRY_DSN=your_sentry_dsn
SLACK_WEBHOOK_URL=your_slack_webhook
```

## Database Operations

### Migrations
```bash
# Run migrations
make db-migrate

# Development migrations
make db-migrate-dev

# Reset database
make db-reset
```

### Seeding
```bash
# Seed with demo data
make db-seed
```

### Backups
```bash
# Manual backup
make db-backup

# Automated backups run via cron in production
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check all service health
make health

# View logs
make logs
make logs-backend
make logs-frontend
```

### Database Administration
```bash
# Open Prisma Studio
make db-studio

# PostgreSQL shell
make shell-postgres

# Redis shell
make shell-redis
```

### Container Management
```bash
# Restart services
make restart

# Stop services
make stop

# Clean up
make clean
make clean-all
```

## Security Considerations

### Multi-Tenant Isolation
- All database tables include `tenant_id` column
- Row Level Security (RLS) policies enforce tenant boundaries
- Application-level tenant context validation
- Session-based tenant identification

### Data Protection
- Password hashing with bcrypt
- JWT token expiration and refresh
- Secure session management
- Input validation and sanitization

### Network Security
- Internal Docker network isolation
- Nginx reverse proxy protection
- Rate limiting and DDoS protection
- SSL/TLS encryption in production

## Performance Optimization

### Database
- Strategic indexing on frequently queried columns
- Connection pooling for efficient resource usage
- Query optimization with Prisma
- Regular vacuum and analyze operations

### Caching
- Redis caching for session data
- Application-level caching for frequent queries
- Static asset caching with Nginx
- CDN integration for production

### Scaling
- Horizontal scaling with Docker Swarm/Kubernetes
- Load balancing with Nginx
- Database read replicas
- Microservices architecture ready

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test connection
make shell-postgres
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose ps redis

# Test Redis connection
make shell-redis
```

#### Application Errors
```bash
# View application logs
make logs-backend

# Check environment variables
make env-check
```

### Development Tools

#### Code Quality
```bash
# Lint code
make lint

# Format code
make format

# Type checking
make type-check

# Security audit
make security-audit
```

#### Testing
```bash
# Run all tests
make test

# Run specific test suites
make test-backend
make test-frontend
make test-e2e

# Generate coverage
make test-coverage
```

## Support

For technical support and questions:
- Check the troubleshooting section above
- Review application logs
- Consult the API documentation at `/docs`
- Contact the development team

## License

This infrastructure is part of the CHRONOS Financial SaaS platform. All rights reserved.