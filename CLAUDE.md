# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
CHRONOS is a multi-tenant financial SaaS platform with real-time synchronization between Web and WhatsApp interfaces. It provides comprehensive financial management including accounts, transactions, budgets, and goals with natural language processing for WhatsApp interactions.

## Architecture & Tech Stack

### Backend (Node.js + Fastify)
- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Multi-tenancy**: Row Level Security (RLS) + tenant isolation
- **Real-time**: Socket.IO WebSockets
- **Auth**: JWT with refresh tokens
- **External APIs**: Twilio (WhatsApp), OpenAI, Stripe

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router + TypeScript
- **UI**: TailwindCSS + shadcn/ui components
- **State**: Zustand + React Query
- **Real-time**: Socket.io-client

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15+
- **Cache/Sessions**: Redis
- **Monitoring**: Prometheus + Grafana

## Common Development Commands

### Development Environment
```bash
# Start full development environment
make dev  # or docker-compose up -d

# Start local development (no Docker)
make dev-local  # or npm run dev

# Stop services
make stop  # or docker-compose down
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate  # or npx prisma generate

# Run migrations
npm run db:migrate:dev  # or npx prisma migrate dev

# Reset database
npm run db:reset  # or npx prisma migrate reset --force

# Open Prisma Studio
npm run db:studio  # or npx prisma studio

# Database seeding
npm run db:seed  # or npx prisma db seed
```

### Testing & Quality
```bash
# Run all tests
npm run test  # or make test

# Backend tests only
npm run test:backend  # or cd backend && npm test

# Frontend tests only
npm run test:frontend  # or cd frontend && npm test

# Test coverage
npm run test:coverage

# Linting
npm run lint  # or make lint

# Type checking
npm run type-check
```

### Building & Deployment
```bash
# Build all services
npm run build

# Build for production
make prod-build

# Deploy to production
make deploy
```

## Critical Multi-Tenant Architecture

### Tenant Isolation Pattern
**EVERY database query MUST include tenantId for proper multi-tenant isolation:**

```typescript
// ❌ NEVER query without tenantId
const transactions = await prisma.transaction.findMany()

// ✅ ALWAYS include tenantId
async findTransactions(user: AuthUser) {
  if (!user.tenantId) throw new Error('Tenant required');
  return await prisma.transaction.findMany({
    where: { tenantId: user.tenantId }
  });
}
```

### Authentication Context
All authenticated routes require:
- Valid JWT token in Authorization header
- User object with `tenantId` property
- Tenant validation middleware

## Project Structure

### Backend (`/backend/src/`)
```
├── routes/           # API route handlers organized by feature
├── modules/          # Business logic modules (auth, accounts, transactions, etc.)
├── plugins/          # Fastify plugins (auth, tenant validation, etc.)
├── services/         # External service integrations (WhatsApp, OpenAI)
├── middleware/       # Request/response middleware
├── config/          # Configuration management
├── lib/             # Shared libraries (Prisma client, utilities)
├── types/           # TypeScript type definitions
└── server.ts        # Main server entry point
```

### Frontend (`/frontend/`)
```
├── app/             # Next.js 14 App Router pages and layouts
├── components/      # Reusable UI components (organized by feature)
├── hooks/           # Custom React hooks
├── lib/             # Frontend utilities and configurations
└── types/           # TypeScript definitions
```

### Key Files
- `prisma/schema.prisma` - Database schema with multi-tenant models
- `docker-compose.yml` - Development environment setup
- `Makefile` - Development commands and shortcuts

## Development Rules

1. **Multi-tenant Isolation**: Always validate tenantId in queries and use Row Level Security
2. **Test-Driven Development**: Write tests first, especially for business logic
3. **Transaction Safety**: Use database transactions for related operations
4. **Type Safety**: Leverage TypeScript strictly throughout the codebase
5. **Real-time Updates**: Use WebSockets for live data synchronization

## WhatsApp Integration

The platform includes natural language processing for WhatsApp interactions using:
- Twilio API for WhatsApp messaging
- OpenAI for transaction parsing
- chrono-node for date/time parsing
- compromise.js for natural language understanding

Key files:
- `backend/src/services/whatsapp/` - WhatsApp integration logic
- `backend/src/modules/whatsapp/` - WhatsApp business logic

## Database Schema

Multi-tenant schema with these core models:
- `Tenant` - Multi-tenant organization
- `User` - User accounts (linked to tenants)
- `Account` - Financial accounts (checking, savings, credit)
- `Transaction` - Financial transactions
- `Budget` - Budget planning and tracking
- `Category` - Transaction categorization
- `Card` - Credit/debit card management

All models include `tenantId` for proper isolation.
