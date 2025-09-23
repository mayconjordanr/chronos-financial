#!/bin/bash

# SSL Certificate Generation Script for CHRONOS Financial
# This script generates SSL certificates for development and production

set -e

# Configuration
DOMAIN=${1:-"localhost"}
SSL_DIR="$(dirname "$0")"
DAYS=365
KEY_SIZE=2048

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[SSL-GEN]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[SSL-WARN]${NC} $1"
}

error() {
    echo -e "${RED}[SSL-ERROR]${NC} $1"
    exit 1
}

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    error "OpenSSL is not installed. Please install OpenSSL first."
fi

log "Generating SSL certificates for domain: $DOMAIN"

# Create necessary directories
mkdir -p "$SSL_DIR"
cd "$SSL_DIR"

# Generate private key
log "Generating private key..."
openssl genrsa -out private.key $KEY_SIZE

# Create certificate signing request configuration
log "Creating certificate configuration..."
cat > cert.conf <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = CHRONOS Financial
OU = IT Department
CN = $DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
DNS.3 = localhost
DNS.4 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate certificate signing request
log "Generating certificate signing request..."
openssl req -new -key private.key -out cert.csr -config cert.conf

# Generate self-signed certificate
log "Generating self-signed certificate..."
openssl x509 -req -in cert.csr -signkey private.key -out cert.pem -days $DAYS -extensions v3_req -extfile cert.conf

# Generate certificate chain (for self-signed, same as cert)
log "Creating certificate chain..."
cp cert.pem chain.pem

# Generate DH parameters for perfect forward secrecy
log "Generating DH parameters (this may take a while)..."
openssl dhparam -out dhparam.pem 2048

# Set proper permissions
chmod 600 private.key
chmod 644 cert.pem chain.pem dhparam.pem

# Verify certificate
log "Verifying certificate..."
if openssl x509 -in cert.pem -text -noout > /dev/null 2>&1; then
    log "Certificate verification successful!"
else
    error "Certificate verification failed!"
fi

# Display certificate information
log "Certificate information:"
openssl x509 -in cert.pem -text -noout | grep -A2 "Subject:"
openssl x509 -in cert.pem -text -noout | grep -A10 "Subject Alternative Name"

# Clean up temporary files
rm -f cert.csr cert.conf

log "SSL certificates generated successfully!"
log "Files created:"
log "  - private.key: Private key"
log "  - cert.pem: Certificate"
log "  - chain.pem: Certificate chain"
log "  - dhparam.pem: DH parameters"

warn "These are self-signed certificates for development/testing."
warn "For production, use Let's Encrypt or purchase certificates from a CA."

# Display Let's Encrypt instructions
cat <<EOF

=== Let's Encrypt Production Setup ===

For production, use Let's Encrypt with certbot:

1. Install certbot:
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx

2. Obtain certificate:
   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

3. Auto-renewal:
   sudo crontab -e
   Add: 0 12 * * * /usr/bin/certbot renew --quiet

4. Update nginx configuration to use Let's Encrypt certificates:
   ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

EOF