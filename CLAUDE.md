# CHRONOS - Multi-tenant Financial SaaS

## Project Overview
CHRONOS is a multi-tenant financial SaaS with real-time sync between Web and WhatsApp.

## Architecture
- Backend: Node.js + Fastify + PostgreSQL (Supabase)
- Frontend: Next.js 14 + TailwindCSS + shadcn/ui
- Real-time: Supabase Realtime + WebSockets
- Multi-tenant: Row Level Security (RLS)

## Development Rules
1. ALWAYS maintain tenant isolation (tenantId in every query)
2. ALWAYS write tests first (TDD)
3. ALWAYS use transactions for related operations
4. NEVER modify more than 3 files at once
5. Use Gemini CLI for analysis (free 100 requests/day)
6. Use subagents for complex tasks

## Subagent System
When tasks are complex, delegate to specialized subagents:
- Use /project:setup-infrastructure for initial setup
- Use /project:create-backend-module for new features
- Use /project:create-frontend-component for UI
- Use /project:test-and-validate for testing
- Each subagent has independent context window

## Critical Multi-tenant Pattern
```typescript
// EVERY query must have tenantId
async findAll(user: AuthUser) {
  if (!user.tenantId) throw new Error('Tenant required');
  return await prisma.model.findMany({
    where: { tenantId: user.tenantId }
  });
}
Gemini Integration
For large context analysis:
bashgemini -p "@backend/ @frontend/ Analyze current implementation"


## 🤖 ESTRUTURA DE SUBAGENTES

### Criar Agentes Especializados

#### AGENTE 1: Infrastructure Specialist
```bash
cat > .claude/agents/infrastructure-specialist.md << 'EOF'
# Infrastructure Specialist Agent

## Role
You are an infrastructure specialist responsible for setting up the project foundation.

## Responsibilities
1. Create Docker configurations
2. Setup database schema with Prisma
3. Configure environment variables
4. Setup CI/CD pipelines
5. Configure Nginx and SSL

## Core Rules
- Always create docker-compose for both dev and production
- Always include health checks in Docker configs
- Always use multi-stage builds for optimization
- Never expose sensitive ports publicly
- Always validate environment variables

## Output Format
- Docker files in /docker directory
- Environment templates in root
- CI/CD in .github/workflows
- Documentation in /docs

## Success Criteria
- All services start without errors
- Database migrations run successfully
- Health checks pass
- Environment variables documented
