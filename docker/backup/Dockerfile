# CHRONOS Financial - Backup Service Dockerfile

FROM alpine:3.18

# Install required packages
RUN apk add --no-cache \
    postgresql-client \
    aws-cli \
    curl \
    bash \
    gzip \
    openssl \
    coreutils \
    findutils \
    dcron \
    && rm -rf /var/cache/apk/*

# Create backup user
RUN addgroup -g 1001 backup \
    && adduser -D -s /bin/bash -u 1001 -G backup backup

# Create directories
RUN mkdir -p /backups /scripts /var/log/backup \
    && chown -R backup:backup /backups /scripts /var/log/backup

# Copy backup scripts
COPY scripts/ /scripts/
RUN chmod +x /scripts/*.sh \
    && chown -R backup:backup /scripts

# Switch to backup user
USER backup

# Set working directory
WORKDIR /backups

# Health check
HEALTHCHECK --interval=5m --timeout=30s --start-period=1m --retries=3 \
    CMD /scripts/health-check.sh

# Start cron daemon
CMD ["/scripts/entrypoint.sh"]