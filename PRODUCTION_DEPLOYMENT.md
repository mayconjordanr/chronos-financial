# CHRONOS Financial - Production Deployment Guide

This comprehensive guide will help you deploy CHRONOS Financial to production with all necessary security, monitoring, and backup configurations.

## 🚀 Quick Start

For experienced users who want to deploy quickly:

```bash
# 1. Setup production environment
./deployment/scripts/setup-production.sh your-domain.com

# 2. Configure environment
cp .env.production.template .env.production
# Edit .env.production with your settings

# 3. Deploy application
./deployment/scripts/deploy.sh production --backup

# 4. Verify deployment
./deployment/scripts/health-check.sh production
```

## 📋 Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ or CentOS 8+ (Linux recommended)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 50GB SSD
- **CPU**: 2+ cores
- **Network**: Static IP address and domain name

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Git 2.25+
- OpenSSL 1.1+
- Nginx (handled by Docker)

### Domain Setup

1. **DNS Configuration**:
   ```
   A     your-domain.com        → YOUR_SERVER_IP
   A     www.your-domain.com    → YOUR_SERVER_IP
   A     api.your-domain.com    → YOUR_SERVER_IP
   ```

2. **Firewall Ports**:
   - 80 (HTTP) - Redirects to HTTPS
   - 443 (HTTPS) - Main application
   - 22 (SSH) - Server access
   - 3001 (Optional) - Grafana monitoring

## 🔧 Detailed Setup Process

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Clone repository
git clone https://github.com/your-org/chronos-financial.git
cd chronos-financial

# Run setup script
sudo ./deployment/scripts/setup-production.sh your-domain.com
```

### Step 2: Environment Configuration

1. **Copy environment template**:
   ```bash
   cp .env.production.template .env.production
   ```

2. **Configure critical settings**:
   ```bash
   # Database
   POSTGRES_DB=chronos_production
   POSTGRES_USER=chronos_user
   POSTGRES_PASSWORD=<GENERATE_STRONG_PASSWORD>

   # Security
   JWT_SECRET=<GENERATE_256_BIT_SECRET>
   SESSION_SECRET=<GENERATE_256_BIT_SECRET>

   # Domain
   NEXT_PUBLIC_API_URL=https://your-domain.com/api
   NEXT_PUBLIC_WS_URL=wss://your-domain.com
   CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

   # Monitoring
   GRAFANA_ADMIN_PASSWORD=<STRONG_PASSWORD>

   # Backup
   S3_BACKUP_BUCKET=chronos-backups-prod
   AWS_ACCESS_KEY_ID=<YOUR_AWS_KEY>
   AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET>
   ```

3. **Secure environment file**:
   ```bash
   chmod 600 .env.production
   ```

### Step 3: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Stop any running nginx
docker-compose -f docker-compose.production.yml stop nginx 2>/dev/null || true

# Obtain certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  -d api.your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/private.key
sudo cp /etc/letsencrypt/live/your-domain.com/chain.pem docker/nginx/ssl/chain.pem

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f $(pwd)/docker-compose.production.yml restart nginx" | sudo crontab -
```

#### Option B: Self-Signed (Development/Testing)

```bash
./docker/nginx/ssl/generate-ssl.sh your-domain.com
```

### Step 4: Database Migration

```bash
# Start database only
docker-compose -f docker-compose.production.yml up -d postgres redis

# Wait for database to be ready
./deployment/scripts/health-check.sh production --wait

# Run migrations (if you have them)
# docker-compose -f docker-compose.production.yml exec backend npm run migrate
```

### Step 5: Deploy Application

```bash
# Deploy with backup
./deployment/scripts/deploy.sh production --backup --force

# Monitor deployment
docker-compose -f docker-compose.production.yml logs -f
```

### Step 6: Verify Deployment

```bash
# Run health checks
./deployment/scripts/health-check.sh production --verbose

# Test endpoints
curl -f https://your-domain.com/api/health
curl -f https://your-domain.com/api/health
```

## 🔒 Security Configuration

### Firewall Setup

```bash
# UFW (Ubuntu)
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Optional: Grafana access
sudo ufw allow 3001/tcp
```

### Fail2Ban Configuration

The setup script automatically configures fail2ban for:
- SSH protection
- Nginx HTTP auth failures
- Rate limit violations

### Security Headers

The nginx configuration includes comprehensive security headers:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

## 📊 Monitoring Setup

### Grafana Dashboard

1. **Access**: https://your-domain.com:3001
2. **Login**: admin / (password from .env.production)
3. **Import dashboards**: Pre-configured dashboards are available

### Prometheus Metrics

- Application metrics: `/api/metrics`
- System metrics: Node Exporter
- Database metrics: PostgreSQL Exporter
- Cache metrics: Redis Exporter

### Alerts

Configured alerts for:
- Service downtime
- High response times
- Database issues
- Resource exhaustion
- Security violations

## 💾 Backup Strategy

### Automated Backups

Backups run automatically via cron:
- **Schedule**: Daily at 2:00 AM
- **Retention**: 30 days local, configurable S3
- **Encryption**: AES-256-CBC
- **Destinations**: Local + S3 (optional)

### Manual Backup

```bash
# Run backup manually
docker-compose -f docker-compose.production.yml exec backup /scripts/backup.sh

# Restore from backup
docker-compose -f docker-compose.production.yml exec backup /scripts/restore.sh backup_file.sql.gz
```

### S3 Configuration

```bash
# Set in .env.production
S3_BACKUP_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## 🔄 Deployment Operations

### Rolling Updates

```bash
# Deploy new version
./deployment/scripts/deploy.sh production --tag v1.2.0

# Rollback if needed
./deployment/scripts/deploy.sh production --rollback
```

### Scaling Services

```bash
# Scale backend
docker-compose -f docker-compose.production.yml up -d --scale backend=3

# Scale with load balancer update
# (requires nginx configuration changes)
```

### Maintenance Mode

```bash
# Enable maintenance mode
echo "MAINTENANCE_MODE=true" >> .env.production
docker-compose -f docker-compose.production.yml restart

# Disable maintenance mode
sed -i '/MAINTENANCE_MODE=true/d' .env.production
docker-compose -f docker-compose.production.yml restart
```

## 🐛 Troubleshooting

### Common Issues

1. **Port 80/443 already in use**:
   ```bash
   sudo netstat -tlnp | grep :80
   sudo systemctl stop apache2  # If Apache is running
   ```

2. **Permission denied errors**:
   ```bash
   sudo chown -R $(whoami):$(whoami) .
   chmod +x deployment/scripts/*.sh
   ```

3. **Database connection issues**:
   ```bash
   docker-compose -f docker-compose.production.yml logs postgres
   docker-compose -f docker-compose.production.yml exec postgres pg_isready
   ```

4. **SSL certificate issues**:
   ```bash
   openssl x509 -in docker/nginx/ssl/cert.pem -text -noout
   ```

### Log Locations

- **Application logs**: `./logs/`
- **Container logs**: `docker-compose logs [service]`
- **Nginx logs**: `./docker/nginx/logs/`
- **System logs**: `/var/log/syslog`

### Health Check Commands

```bash
# Quick health check
./deployment/scripts/health-check.sh production

# Detailed health check
./deployment/scripts/health-check.sh production --verbose

# JSON output for monitoring
./deployment/scripts/health-check.sh production --json
```

## 🔧 Maintenance

### Regular Tasks

1. **Weekly**:
   - Review monitoring alerts
   - Check backup integrity
   - Update system packages

2. **Monthly**:
   - Rotate secrets (if needed)
   - Review security logs
   - Clean old Docker images

3. **Quarterly**:
   - Update application dependencies
   - Review and test disaster recovery
   - Security audit

### Update Procedures

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update application
git pull origin main
./deployment/scripts/deploy.sh production --backup

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## 📈 Performance Optimization

### Database Optimization

```sql
-- Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

-- Optimize connections
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

### Caching Strategy

- **Redis**: Session storage, API caching
- **Nginx**: Static file caching
- **Application**: Query result caching

### Resource Monitoring

```bash
# Monitor resource usage
docker stats

# Monitor disk usage
df -h

# Monitor logs
tail -f logs/application.log
```

## 🆘 Emergency Procedures

### Service Recovery

```bash
# Restart all services
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend

# Full system restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

### Database Recovery

```bash
# Restore from backup
./deployment/scripts/restore.sh /backups/chronos_backup_YYYYMMDD.sql.gz

# Point-in-time recovery (if WAL archiving is enabled)
# Requires PostgreSQL WAL-E or similar setup
```

### Disaster Recovery

1. **Backup verification**: Regularly test backup restoration
2. **Infrastructure as Code**: All configurations are version controlled
3. **Multi-region setup**: Consider AWS/GCP multi-region deployment
4. **Monitoring**: 24/7 uptime monitoring with alerts

## 📞 Support

### Documentation

- API Documentation: `/api/docs` (when enabled)
- Monitoring: Grafana dashboards
- Logs: Centralized logging in `./logs/`

### Health Endpoints

- Frontend: `https://your-domain.com/api/health`
- Backend: `https://your-domain.com/api/health`
- Database: Internal health checks

### Monitoring URLs

- Grafana: `https://your-domain.com:3001`
- Prometheus: `http://localhost:9090` (internal)

---

**Security Note**: This deployment includes production-grade security measures, but always review and customize security settings for your specific environment and compliance requirements.

**Performance Note**: Monitor your application performance and scale resources as needed. The default configuration is suitable for small to medium workloads.

**Backup Note**: Always verify your backups are working by periodically testing restoration procedures.