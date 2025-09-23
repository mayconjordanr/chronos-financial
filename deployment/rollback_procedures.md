# CHRONOS Financial - Rollback Procedures

## Emergency Rollback Guide

### Quick Rollback Commands

```bash
# 1. Immediate rollback to previous version
cd /opt/chronos-financial
./deployment/scripts/deploy.sh production --rollback

# 2. Manual rollback with specific commit
git checkout <previous-commit-hash>
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# 3. Database rollback (if needed)
# Note: Be extremely careful with database rollbacks
docker-compose -f docker-compose.production.yml exec -T postgres pg_restore -U chronos_user -d chronos_financial /backups/pre-deployment/database_YYYYMMDD_HHMMSS.sql
```

### Rollback Scenarios

#### 1. Application Code Issues
- **Symptoms**: 5xx errors, functionality broken
- **Action**: Code rollback
- **Commands**:
  ```bash
  ./deployment/scripts/deploy.sh production --rollback
  ```

#### 2. Database Migration Issues
- **Symptoms**: Database errors, data corruption
- **Action**: Database restore + code rollback
- **Commands**:
  ```bash
  # Stop application
  docker-compose -f docker-compose.production.yml stop backend frontend

  # Restore database
  docker-compose -f docker-compose.production.yml exec -T postgres pg_restore -c -U chronos_user -d chronos_financial /backups/pre-deployment/database_latest.sql

  # Rollback code
  ./deployment/scripts/deploy.sh production --rollback
  ```

#### 3. Infrastructure Issues
- **Symptoms**: Service unavailable, container crashes
- **Action**: Service restart or infrastructure rollback
- **Commands**:
  ```bash
  # Restart specific service
  docker-compose -f docker-compose.production.yml restart <service-name>

  # Full infrastructure restart
  docker-compose -f docker-compose.production.yml down
  docker-compose -f docker-compose.production.yml up -d
  ```

### Recovery Verification

After rollback, verify:
1. All services are healthy
2. Database connectivity restored
3. Frontend/backend communication working
4. Critical functionality operational

```bash
./deployment/scripts/health-check.sh production
```