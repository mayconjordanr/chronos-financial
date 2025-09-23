#!/bin/bash

# CHRONOS Financial - Production Setup Script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOMAIN="${1:-your-domain.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[SETUP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

warn() {
    echo -e "${YELLOW}[SETUP-WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error() {
    echo -e "${RED}[SETUP-ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    exit 1
}

info() {
    echo -e "${BLUE}[SETUP-INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Usage information
usage() {
    cat <<EOF
Usage: $0 [DOMAIN] [OPTIONS]

Set up CHRONOS Financial for production deployment

ARGUMENTS:
    DOMAIN          Your domain name (default: your-domain.com)

OPTIONS:
    -h, --help          Show this help message
    -s, --ssl-only      Only setup SSL certificates
    -e, --env-only      Only setup environment files
    -d, --deps-only     Only install dependencies

EXAMPLES:
    $0 chronos.example.com
    $0 chronos.example.com --ssl-only
    $0 --env-only

EOF
}

# Parse command line arguments
parse_args() {
    SSL_ONLY=false
    ENV_ONLY=false
    DEPS_ONLY=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -s|--ssl-only)
                SSL_ONLY=true
                shift
                ;;
            -e|--env-only)
                ENV_ONLY=true
                shift
                ;;
            -d|--deps-only)
                DEPS_ONLY=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                ;;
            *)
                DOMAIN="$1"
                shift
                ;;
        esac
    done
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."

    # Check OS
    if [[ "$(uname)" != "Linux" ]]; then
        warn "This script is designed for Linux systems"
    fi

    # Check if running as root for system-level changes
    if [[ $EUID -ne 0 ]] && [[ "$DEPS_ONLY" == true ]]; then
        error "Root privileges required for dependency installation"
    fi

    # Check required commands
    local required_commands=("curl" "git" "openssl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is not installed"
        fi
    done

    log "System requirements check passed"
}

# Install dependencies
install_dependencies() {
    if [[ "$DEPS_ONLY" != true ]] && [[ "$SSL_ONLY" != true ]] && [[ "$ENV_ONLY" != true ]]; then
        return 0
    fi

    log "Installing system dependencies..."

    # Detect OS and install dependencies
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        apt-get update
        apt-get install -y \
            curl \
            wget \
            git \
            openssl \
            ca-certificates \
            gnupg \
            lsb-release \
            ufw \
            fail2ban \
            htop \
            jq

        # Install Docker
        if ! command -v docker &> /dev/null; then
            log "Installing Docker..."
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            systemctl enable docker
            systemctl start docker
        fi

        # Install Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            log "Installing Docker Compose..."
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi

    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        yum update -y
        yum install -y \
            curl \
            wget \
            git \
            openssl \
            ca-certificates \
            firewalld \
            fail2ban \
            htop \
            jq

        # Install Docker
        if ! command -v docker &> /dev/null; then
            log "Installing Docker..."
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            systemctl enable docker
            systemctl start docker
        fi
    else
        warn "Unsupported package manager. Please install dependencies manually."
    fi

    log "Dependencies installation completed"
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall..."

    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian - UFW
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing

        # Allow SSH
        ufw allow 22/tcp

        # Allow HTTP/HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp

        # Allow custom ports if needed
        # ufw allow 3001/tcp  # Grafana

        ufw --force enable

    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL - firewalld
        systemctl enable firewalld
        systemctl start firewalld

        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https

        # Add custom ports if needed
        # firewall-cmd --permanent --add-port=3001/tcp

        firewall-cmd --reload
    fi

    log "Firewall setup completed"
}

# Setup fail2ban
setup_fail2ban() {
    log "Setting up fail2ban..."

    if command -v fail2ban-server &> /dev/null; then
        # Create custom jail configuration
        cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

        systemctl enable fail2ban
        systemctl restart fail2ban
    fi

    log "Fail2ban setup completed"
}

# Setup environment files
setup_environment() {
    log "Setting up environment files..."

    cd "$PROJECT_ROOT"

    # Copy production environment template
    if [[ ! -f ".env.production" ]]; then
        if [[ -f ".env.production.template" ]]; then
            cp ".env.production.template" ".env.production"
            log "Created .env.production from template"
        else
            error "Production environment template not found"
        fi
    else
        warn ".env.production already exists, skipping"
    fi

    # Update domain in environment file
    if [[ "$DOMAIN" != "your-domain.com" ]]; then
        log "Updating domain configuration..."
        sed -i "s/your-domain.com/$DOMAIN/g" ".env.production"
        sed -i "s/your-domain.com/$DOMAIN/g" "docker/nginx/conf.d/production.conf"
    fi

    # Generate secure secrets
    log "Generating secure secrets..."

    local jwt_secret=$(openssl rand -hex 32)
    local session_secret=$(openssl rand -hex 32)
    local encryption_key=$(openssl rand -hex 32)
    local postgres_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local redis_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    local grafana_password=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)

    # Update secrets in environment file
    sed -i "s/<RANDOM_256_BIT_SECRET>/$jwt_secret/g" ".env.production"
    sed -i "s/<STRONG_DATABASE_PASSWORD>/$postgres_password/g" ".env.production"
    sed -i "s/<STRONG_REDIS_PASSWORD>/$redis_password/g" ".env.production"
    sed -i "s/<STRONG_GRAFANA_PASSWORD>/$grafana_password/g" ".env.production"
    sed -i "s/<BACKUP_ENCRYPTION_KEY>/$encryption_key/g" ".env.production"

    # Create logs directory
    mkdir -p logs

    log "Environment setup completed"
    warn "Please review and update .env.production with your specific configuration"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."

    cd "$PROJECT_ROOT"

    # Generate self-signed certificates for initial setup
    if [[ -f "docker/nginx/ssl/generate-ssl.sh" ]]; then
        chmod +x "docker/nginx/ssl/generate-ssl.sh"
        "docker/nginx/ssl/generate-ssl.sh" "$DOMAIN"
    else
        error "SSL generation script not found"
    fi

    log "SSL certificates generated"
    warn "For production, replace with proper certificates from Let's Encrypt or a CA"

    # Provide Let's Encrypt instructions
    cat <<EOF

=== Let's Encrypt Setup (Recommended for Production) ===

1. Install certbot:
   sudo apt-get install certbot python3-certbot-nginx

2. Stop nginx temporarily:
   docker-compose -f docker-compose.production.yml stop nginx

3. Obtain certificate:
   sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN

4. Copy certificates to project:
   sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem docker/nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem docker/nginx/ssl/private.key
   sudo cp /etc/letsencrypt/live/$DOMAIN/chain.pem docker/nginx/ssl/chain.pem

5. Set up auto-renewal:
   echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f $PROJECT_ROOT/docker-compose.production.yml restart nginx" | sudo crontab -

6. Restart nginx:
   docker-compose -f docker-compose.production.yml start nginx

EOF
}

# Setup directories and permissions
setup_directories() {
    log "Setting up directories and permissions..."

    cd "$PROJECT_ROOT"

    # Create necessary directories
    mkdir -p {logs,backups,monitoring/data,deployment/logs}

    # Set proper permissions
    chmod 755 deployment/scripts/*.sh
    chmod 600 .env.production 2>/dev/null || true

    # Create backup directories
    mkdir -p backups/{database,config,logs}

    log "Directories and permissions setup completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring configuration..."

    cd "$PROJECT_ROOT"

    # Create Grafana data directory
    mkdir -p monitoring/grafana/data

    # Set proper permissions for Grafana
    chmod 777 monitoring/grafana/data

    # Create Prometheus data directory
    mkdir -p monitoring/prometheus/data
    chmod 777 monitoring/prometheus/data

    log "Monitoring setup completed"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."

    # Create logrotate configuration
    cat > /etc/logrotate.d/chronos-financial <<EOF
$PROJECT_ROOT/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f $PROJECT_ROOT/docker-compose.production.yml restart nginx || true
    endscript
}

$PROJECT_ROOT/docker/nginx/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    sharedscripts
    postrotate
        docker-compose -f $PROJECT_ROOT/docker-compose.production.yml exec nginx nginx -s reload || true
    endscript
}
EOF

    log "Log rotation setup completed"
}

# Setup systemd service
setup_systemd_service() {
    log "Setting up systemd service..."

    cat > /etc/systemd/system/chronos-financial.service <<EOF
[Unit]
Description=CHRONOS Financial Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable chronos-financial.service

    log "Systemd service setup completed"
}

# Verify setup
verify_setup() {
    log "Verifying setup..."

    local issues=()

    # Check environment file
    if [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
        issues+=("Environment file missing")
    fi

    # Check SSL certificates
    if [[ ! -f "$PROJECT_ROOT/docker/nginx/ssl/cert.pem" ]]; then
        issues+=("SSL certificates missing")
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        issues+=("Docker not installed")
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        issues+=("Docker Compose not installed")
    fi

    # Check compose file syntax
    if ! docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" config &> /dev/null; then
        issues+=("Invalid Docker Compose configuration")
    fi

    if [[ ${#issues[@]} -eq 0 ]]; then
        log "Setup verification passed"
    else
        warn "Setup verification found issues:"
        for issue in "${issues[@]}"; do
            warn "  - $issue"
        done
    fi
}

# Main setup function
main() {
    log "Starting CHRONOS Financial production setup"

    # Parse arguments
    parse_args "$@"

    # Check requirements
    check_requirements

    # Run requested setup tasks
    if [[ "$DEPS_ONLY" == true ]]; then
        install_dependencies
        setup_firewall
        setup_fail2ban
        setup_log_rotation
        setup_systemd_service
    elif [[ "$ENV_ONLY" == true ]]; then
        setup_environment
        setup_directories
    elif [[ "$SSL_ONLY" == true ]]; then
        setup_ssl
    else
        # Full setup
        install_dependencies
        setup_firewall
        setup_fail2ban
        setup_environment
        setup_ssl
        setup_directories
        setup_monitoring
        setup_log_rotation
        setup_systemd_service
    fi

    # Verify setup
    verify_setup

    log "Production setup completed successfully!"
    info "Domain: $DOMAIN"
    info "Next steps:"
    info "  1. Review and update .env.production"
    info "  2. Setup proper SSL certificates (Let's Encrypt recommended)"
    info "  3. Run: ./deployment/scripts/deploy.sh production"
    info "  4. Verify deployment: ./deployment/scripts/health-check.sh production"
}

# Error handling
trap 'error "Setup script interrupted"' INT TERM

# Run main function
main "$@"