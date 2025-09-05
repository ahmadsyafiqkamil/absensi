#!/bin/bash

# Production Maintenance Script
# Usage: ./scripts/maintenance.sh [action]
# Actions: cleanup, backup, rotate-logs, update, security-check

set -e

ACTION=${1:-help}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup old files
cleanup() {
    log_info "Starting cleanup maintenance..."

    # Clean up old Docker images
    log_info "Cleaning up unused Docker images..."
    docker image prune -f

    # Clean up old containers
    log_info "Cleaning up stopped containers..."
    docker container prune -f

    # Clean up old volumes
    log_info "Cleaning up unused volumes..."
    docker volume prune -f

    # Clean up old backups (keep last 30 days)
    log_info "Cleaning up old backups..."
    find "${PROJECT_ROOT}/backups" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    find "${PROJECT_ROOT}/backups" -name "deployment_*" -mtime +30 -delete 2>/dev/null || true

    # Clean up old logs (keep last 30 days)
    log_info "Cleaning up old logs..."
    find "${PROJECT_ROOT}/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true

    # Clean up reports (keep last 30 days)
    log_info "Cleaning up old reports..."
    find "${PROJECT_ROOT}/reports" -name "*.txt" -mtime +30 -delete 2>/dev/null || true

    log_success "Cleanup completed!"
}

# Function to create backup
backup() {
    log_info "Creating database backup..."

    ENV_FILE="${PROJECT_ROOT}/production.env"
    source "$ENV_FILE"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${PROJECT_ROOT}/backups/maintenance_backup_${TIMESTAMP}.sql.gz"

    mkdir -p "${PROJECT_ROOT}/backups"

    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

    log_info "Creating database dump..."
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql mysqldump \
        -u root -p"$MYSQL_ROOT_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        absensi_db | gzip > "$BACKUP_FILE"

    # Verify backup
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        log_success "Backup created successfully: $BACKUP_FILE"
        ls -lh "$BACKUP_FILE"
    else
        log_error "Backup failed!"
        exit 1
    fi
}

# Function to rotate logs
rotate_logs() {
    log_info "Rotating application logs..."

    # Rotate backend logs
    if [ -d "${PROJECT_ROOT}/logs/backend" ]; then
        find "${PROJECT_ROOT}/logs/backend" -name "*.log" -exec gzip {} \; 2>/dev/null || true
        find "${PROJECT_ROOT}/logs/backend" -name "*.log.gz" -mtime +7 -delete 2>/dev/null || true
    fi

    # Rotate frontend logs
    if [ -d "${PROJECT_ROOT}/logs/frontend" ]; then
        find "${PROJECT_ROOT}/logs/frontend" -name "*.log" -exec gzip {} \; 2>/dev/null || true
        find "${PROJECT_ROOT}/logs/frontend" -name "*.log.gz" -mtime +7 -delete 2>/dev/null || true
    fi

    # Rotate Caddy logs
    if [ -d "${PROJECT_ROOT}/logs/caddy" ]; then
        find "${PROJECT_ROOT}/logs/caddy" -name "*.log" -exec gzip {} \; 2>/dev/null || true
        find "${PROJECT_ROOT}/logs/caddy" -name "*.log.gz" -mtime +7 -delete 2>/dev/null || true
    fi

    log_success "Log rotation completed!"
}

# Function to update system
update() {
    log_info "Updating system and containers..."

    # Update Docker images
    log_info "Pulling latest Docker images..."
    ENV_FILE="${PROJECT_ROOT}/production.env"
    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull

    # Create backup before update
    backup

    # Update containers
    log_info "Updating containers..."
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up --build -d

    # Wait for services
    log_info "Waiting for services to be ready..."
    sleep 30

    # Health checks
    log_info "Running health checks..."
    source "$ENV_FILE"

    if docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost --silent; then
        log_success "Database is healthy after update"
    else
        log_error "Database health check failed after update"
        exit 1
    fi

    if curl -f "http://localhost:8000/health/" > /dev/null 2>&1; then
        log_success "Backend is healthy after update"
    else
        log_error "Backend health check failed after update"
        exit 1
    fi

    if curl -f "http://localhost:3000" > /dev/null 2>&1; then
        log_success "Frontend is healthy after update"
    else
        log_error "Frontend health check failed after update"
        exit 1
    fi

    log_success "Update completed successfully!"
}

# Function to perform security check
security_check() {
    log_info "Performing security audit..."

    echo ""
    echo "=== Security Audit Results ==="

    # Check file permissions
    echo "Checking file permissions:"
    echo "Production env file permissions:"
    ls -la "${PROJECT_ROOT}/production.env" 2>/dev/null || echo "production.env not found"

    echo ""
    echo "Log directory permissions:"
    ls -ld "${PROJECT_ROOT}/logs" 2>/dev/null || echo "logs directory not found"

    echo ""
    echo "Backup directory permissions:"
    ls -ld "${PROJECT_ROOT}/backups" 2>/dev/null || echo "backups directory not found"

    # Check for exposed sensitive data
    echo ""
    echo "Checking for exposed secrets:"
    grep -r "MYSQL_ROOT_PASSWORD\|SECRET_KEY\|MYSQL_PASSWORD" "${PROJECT_ROOT}/logs/" 2>/dev/null || echo "No secrets found in logs"

    # Check Docker security
    echo ""
    echo "Docker security check:"
    ENV_FILE="${PROJECT_ROOT}/production.env"
    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"

    echo "Running containers:"
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

    echo ""
    echo "Security recommendations:"
    echo "1. Ensure production.env has restricted permissions (600)"
    echo "2. Verify no sensitive data in logs"
    echo "3. Check that database ports are not exposed publicly"
    echo "4. Ensure SSL/TLS certificates are valid and up to date"
    echo "5. Regularly update Docker images for security patches"
}

# Function to show help
show_help() {
    echo "Production Maintenance Script"
    echo ""
    echo "Usage: $0 [action]"
    echo ""
    echo "Actions:"
    echo "  cleanup       Clean up old files, images, and containers"
    echo "  backup        Create a database backup"
    echo "  rotate-logs   Compress and rotate old log files"
    echo "  update        Update Docker images and restart services"
    echo "  security      Perform security audit"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 cleanup"
    echo "  $0 backup"
    echo "  $0 update"
}

# Main execution
case $ACTION in
    cleanup)
        cleanup
        ;;
    backup)
        backup
        ;;
    rotate-logs)
        rotate_logs
        ;;
    update)
        update
        ;;
    security)
        security_check
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown action: $ACTION"
        echo ""
        show_help
        exit 1
        ;;
esac
