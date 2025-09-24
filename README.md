# 🚀 CHRONOS Financial System

A comprehensive **multi-tenant financial SaaS platform** with real-time synchronization, WhatsApp integration, and modern architecture.

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.3+-blue.svg)

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API Docs](#-api-documentation) • [Contributing](#-contributing)

</div>

## ✨ Features

### 🏢 Multi-Tenant Architecture
- **Row-Level Security (RLS)** for complete tenant isolation
- **Subdomain routing** for custom tenant branding
- **Flexible tenant limits** and feature flags
- **Tenant-scoped data** with automatic isolation

### 💰 Financial Management
- **Account Management**: Multiple account types (checking, savings, credit cards, investments)
- **Transaction Tracking**: Automatic categorization with AI-powered insights
- **Budget Planning**: Flexible budgeting with alerts and tracking
- **Goal Setting**: Financial goals with progress tracking
- **Recurring Transactions**: Automated recurring income/expenses

### 🔄 Real-Time Synchronization
- **WebSocket connections** for instant updates
- **Multi-tab synchronization**
- **Optimistic UI updates** for better UX
- **Offline-first architecture** with sync on reconnect

### 📱 WhatsApp Integration
- **Natural language processing** for transaction commands
- **Balance inquiries** via WhatsApp
- **Transaction notifications** and confirmations
- **Budget alerts** and spending insights

### 🏗️ Modern Tech Stack
- **Backend**: Node.js + Fastify + PostgreSQL + Redis + Prisma
- **Frontend**: Next.js 14 + TypeScript + TailwindCSS + shadcn/ui
- **Infrastructure**: Docker + Nginx + Prometheus + Grafana
- **Authentication**: JWT with refresh tokens and session management

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **Docker** & Docker Compose
- **PostgreSQL** 15+
- **Redis** 7+

### 1. Clone and Setup

```bash
git clone https://github.com/mayconjordanr/chronos-financial.git
cd chronos-financial

# Copy environment variables
cp .env.example .env

# Install dependencies
make install
```

### 2. Configure Environment

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/chronos_dev

# JWT Secret (generate a secure key)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters

# Optional integrations
TWILIO_ACCOUNT_SID=your-twilio-sid
STRIPE_SECRET_KEY=sk_test_your-stripe-key
```

### 3. Start Development Environment

```bash
# Start all services with Docker
make dev

# Or use the setup command for complete initialization
make setup
```

### 4. Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/docs
- **Grafana Monitoring**: http://localhost:3002 (admin/admin)
- **Prisma Studio**: `make db-studio`

## 🏛️ Architecture

### System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Dashboard<br/>Next.js 14]
        MOBILE[WhatsApp Bot<br/>Natural Language]
    end

    subgraph "API Gateway"
        NGINX[Nginx<br/>Load Balancer]
    end

    subgraph "Application Layer"
        API[Fastify API<br/>Multi-tenant]
        WS[WebSocket<br/>Real-time Sync]
        AUTH[JWT Auth<br/>Session Management]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Row-Level Security)]
        REDIS[(Redis<br/>Cache & Sessions)]
        PRISMA[Prisma ORM<br/>Type Safety]
    end

    subgraph "External Services"
        TWILIO[Twilio<br/>WhatsApp API]
        STRIPE[Stripe<br/>Payments]
        EMAIL[SMTP<br/>Notifications]
    end

    WEB --> NGINX
    MOBILE --> TWILIO
    NGINX --> API
    NGINX --> WS
    API --> AUTH
    API --> PRISMA
    WS --> REDIS
    PRISMA --> PG
    API --> REDIS
    API --> TWILIO
    API --> STRIPE
    API --> EMAIL
```

### Multi-Tenant Data Model

```typescript
// Every query MUST include tenantId for isolation
async findTransactions(user: AuthUser) {
  if (!user.tenantId) throw new Error('Tenant required');

  return await prisma.transaction.findMany({
    where: { tenantId: user.tenantId }, // ✅ Tenant isolation
    include: { account: true, category: true }
  });
}
```

## 📁 Project Structure

```
chronos-financial/
├── 📂 backend/                 # Fastify API Server
│   ├── 📂 src/
│   │   ├── 📂 routes/          # API route handlers
│   │   ├── 📂 plugins/         # Fastify plugins (auth, tenant, etc.)
│   │   ├── 📂 lib/             # Shared libraries (Prisma, etc.)
│   │   ├── 📂 config/          # Configuration management
│   │   └── 📄 server.ts        # Main server entry point
│   └── 📂 prisma/              # Database schema and migrations
│
├── 📂 frontend/                # Next.js 14 Dashboard
│   ├── 📂 app/                 # App Router (Next.js 13+)
│   ├── 📂 components/          # Reusable UI components
│   ├── 📂 hooks/               # Custom React hooks
│   ├── 📂 lib/                 # Frontend utilities
│   └── 📂 types/               # TypeScript definitions
│
├── 📂 infrastructure/          # DevOps & Infrastructure
│   ├── 📂 nginx/               # Nginx configurations
│   ├── 📂 monitoring/          # Prometheus & Grafana
│   └── 📂 scripts/             # Deployment scripts
│
├── 📂 .github/                 # GitHub Actions CI/CD
└── 📄 docker-compose.yml       # Development environment
```

## 🛠️ Development

### Available Commands

```bash
# Development
make dev                    # Start development environment
make dev-logs              # Show development logs
make stop                   # Stop all services

# Database
make db-migrate            # Run database migrations
make db-seed               # Seed with sample data
make db-studio             # Open Prisma Studio
make db-reset              # Reset database

# Testing & Quality
make test                  # Run all tests
make lint                  # Run linting
make type-check            # TypeScript checking
make format                # Format code

# Production
make prod-start            # Start production environment
make prod-build            # Build production images
make deploy                # Deploy to production

# Monitoring
make health                # Check service health
make monitor               # Open Grafana dashboard
```

### Multi-Tenant Development

#### Critical Multi-Tenant Pattern

```typescript
// ❌ NEVER query without tenantId
const transactions = await prisma.transaction.findMany()

// ✅ ALWAYS include tenantId
const transactions = await prisma.transaction.findMany({
  where: { tenantId: user.tenantId }
})

// ✅ Use tenant-scoped client
const tenantClient = prisma.forTenant(user.tenantId)
const transactions = await tenantClient.transaction.findMany()
```

#### Testing Multi-Tenancy

```bash
# Create test tenants
make tenant-create TENANT_NAME=test-company

# List all tenants
make tenant-list

# Backup tenant data
make tenant-backup TENANT_ID=uuid-here
```

## 📚 API Documentation

### Authentication

```bash
# Register new tenant and user
POST /api/auth/register
{
  "email": "admin@company.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "tenantName": "My Company",
  "tenantSlug": "my-company"
}

# Login
POST /api/auth/login
{
  "email": "admin@company.com",
  "password": "securepassword",
  "tenantSlug": "my-company"
}
```

### Transactions

```bash
# Get transactions (requires Authentication + X-Tenant-ID header)
GET /api/transactions
Headers:
  Authorization: Bearer <token>
  X-Tenant-ID: <tenant-uuid>

# Create transaction
POST /api/transactions
{
  "accountId": "uuid",
  "amount": -45.67,
  "description": "Coffee at Starbucks",
  "categoryId": "uuid",
  "date": "2024-01-15T10:30:00Z"
}
```

Full API documentation available at `/docs` when running the server.

## 🔒 Security Features

### Authentication & Authorization
- **JWT tokens** with refresh token rotation
- **Session management** with Redis storage
- **Role-based access control** (Owner, Admin, User)
- **Multi-factor authentication** support

### Multi-Tenant Security
- **Row-Level Security (RLS)** at database level
- **Tenant isolation** enforcement in all queries
- **Subdomain validation** for tenant routing
- **Resource limits** per tenant

### Infrastructure Security
- **HTTPS/TLS encryption** with automatic certificates
- **Security headers** (HSTS, CSP, X-Frame-Options)
- **Rate limiting** per endpoint and tenant
- **Input validation** and sanitization

## 📊 Monitoring & Observability

### Metrics & Monitoring
- **Prometheus** metrics collection
- **Grafana** dashboards for visualization
- **Application metrics**: Response times, error rates, throughput
- **Business metrics**: Transaction volumes, user activity
- **Infrastructure metrics**: CPU, memory, disk usage

### Health Checks
- **Liveness probes** for container orchestration
- **Readiness probes** for load balancer integration
- **Dependency health**: Database, Redis, external APIs

### Logging
- **Structured logging** with correlation IDs
- **Multi-tenant log isolation**
- **Centralized log aggregation**
- **Error tracking** and alerting

## 🌍 WhatsApp Integration

### Features
- **Natural language processing** for financial commands
- **Balance inquiries**: "What's my checking account balance?"
- **Transaction entry**: "I spent $25 on groceries at Walmart"
- **Budget alerts**: Automatic spending notifications
- **Multi-language support** (English, Spanish, Portuguese)

### Setup
1. Configure Twilio credentials in `.env`
2. Set webhook URL in Twilio console
3. Enable WhatsApp integration per tenant
4. Test with sandbox numbers

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## 🚢 Deployment

### Production Deployment

```bash
# Build production images
make prod-build

# Deploy to production
make deploy

# Monitor deployment
make prod-logs
```

### Docker Compose Production

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Kubernetes (Recommended)

See [deployment/kubernetes/README.md](./deployment/kubernetes/README.md) for Kubernetes deployment instructions.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Required |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |

### Feature Flags

```env
FEATURE_MULTI_TENANT=true
FEATURE_REAL_TIME_UPDATES=true
FEATURE_WHATSAPP_INTEGRATION=true
FEATURE_STRIPE_INTEGRATION=false
FEATURE_ANALYTICS=true
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
make test

# Run backend tests
make test-backend

# Run frontend tests
make test-frontend

# Run E2E tests
make test-e2e

# Generate coverage report
npm run test:coverage
```

### Test Structure

- **Unit tests**: Business logic and utilities
- **Integration tests**: API endpoints and database operations
- **E2E tests**: Complete user workflows
- **Load tests**: Multi-tenant performance testing

## 📈 Performance

### Benchmarks
- **API Response Time**: < 100ms (95th percentile)
- **WebSocket Latency**: < 50ms
- **Database Queries**: < 10ms average
- **Concurrent Users**: 1000+ per tenant
- **Transaction Throughput**: 10,000+ TPS

### Optimization Features
- **Database indexing** for multi-tenant queries
- **Redis caching** for frequently accessed data
- **Connection pooling** for database efficiency
- **CDN integration** for static assets
- **Lazy loading** for frontend components

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `make test`
5. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
6. Push and create a Pull Request

### Code Style
- **TypeScript** strict mode enabled
- **ESLint** + **Prettier** for code formatting
- **Conventional commits** for commit messages
- **Test coverage** required for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

### Getting Help
- 📖 **Documentation**: [docs.chronos.financial](https://docs.chronos.financial)
- 💬 **Discord Community**: [Join our Discord](https://discord.gg/chronos-financial)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/mayconjordanr/chronos-financial/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/mayconjordanr/chronos-financial/discussions)

### Managed Hosting
Looking for managed hosting? Contact us at [hosting@chronos.financial](mailto:hosting@chronos.financial)

---

<div align="center">

**Built with ❤️ by [Maycon Jordan](https://github.com/mayconjordanr)**

[⭐ Star this project](https://github.com/mayconjordanr/chronos-financial) if you find it helpful!

</div>
