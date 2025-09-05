#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy.sh [environment] [action]
# Environment: dev, staging, prod
# Action: deploy, rollback, backup, monitor

set -e

ENVIRONMENT=${1:-prod}
ACTION=${2:-deploy}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to backup current deployment
backup_deployment() {
    log_info "Creating deployment backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="${PROJECT_ROOT}/backups/deployment_${TIMESTAMP}"

    mkdir -p "$BACKUP_DIR"

    # Backup docker-compose files
    cp "${PROJECT_ROOT}/docker-compose.${ENVIRONMENT}.yml" "$BACKUP_DIR/" 2>/dev/null || true
    cp "${PROJECT_ROOT}/docker-compose.yml" "$BACKUP_DIR/" 2>/dev/null || true

    # Backup environment files
    cp "${PROJECT_ROOT}/${ENVIRONMENT}.env" "$BACKUP_DIR/" 2>/dev/null || true
    cp "${PROJECT_ROOT}/production.env" "$BACKUP_DIR/" 2>/dev/null || true

    # Backup configuration files
    cp "${PROJECT_ROOT}/Caddyfile"* "$BACKUP_DIR/" 2>/dev/null || true

    log_success "Backup created at: $BACKUP_DIR"
    echo "$BACKUP_DIR" > "${PROJECT_ROOT}/.last_backup"
}

# Function to deploy
deploy() {
    log_info "Starting deployment to $ENVIRONMENT environment..."

    # Backup current state
    backup_deployment

    # Validate environment
    ENV_FILE="${PROJECT_ROOT}/${ENVIRONMENT}.env"
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE="${PROJECT_ROOT}/production.env"
    fi

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    # Validate environment variables
    source "$ENV_FILE"
    if [[ "$MYSQL_ROOT_PASSWORD" == "CHANGE_THIS_STRONG_ROOT_PASSWORD_IN_PRODUCTION" ]]; then
        log_error "Please change MYSQL_ROOT_PASSWORD in $ENV_FILE"
        exit 1
    fi

    # Build and deploy
    log_info "Building and deploying services..."
    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.${ENVIRONMENT}.yml"

    if [ "$ENVIRONMENT" = "prod" ]; then
        COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
    fi

    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up --build -d

    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30

    # Health checks
    log_info "Running health checks..."
    source "$ENV_FILE"

    # Check database
    if docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost --silent; then
        log_success "Database is healthy"
    else
        log_error "Database health check failed"
        exit 1
    fi

    # Check backend
    if curl -f "http://localhost:8000/health/" > /dev/null 2>&1; then
        log_success "Backend is healthy"
    else
        log_error "Backend health check failed"
        exit 1
    fi

    # Check frontend
    if curl -f "http://localhost:3000" > /dev/null 2>&1; then
        log_success "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        exit 1
    fi

    log_success "Deployment completed successfully!"
}

# Function to rollback
rollback() {
    log_info "Starting rollback..."

    LAST_BACKUP=$(cat "${PROJECT_ROOT}/.last_backup" 2>/dev/null)
    if [ -z "$LAST_BACKUP" ] || [ ! -d "$LAST_BACKUP" ]; then
        log_error "No backup found for rollback"
        exit 1
    fi

    log_warning "Rolling back to backup: $LAST_BACKUP"

    # Restore files from backup
    cp "$LAST_BACKUP/docker-compose.${ENVIRONMENT}.yml" "${PROJECT_ROOT}/" 2>/dev/null || true
    cp "$LAST_BACKUP/docker-compose.yml" "${PROJECT_ROOT}/" 2>/dev/null || true
    cp "$LAST_BACKUP/${ENVIRONMENT}.env" "${PROJECT_ROOT}/" 2>/dev/null || true
    cp "$LAST_BACKUP/production.env" "${PROJECT_ROOT}/" 2>/dev/null || true
    cp "$LAST_BACKUP/Caddyfile"* "${PROJECT_ROOT}/" 2>/dev/null || true

    # Restart services
    ENV_FILE="${PROJECT_ROOT}/${ENVIRONMENT}.env"
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE="${PROJECT_ROOT}/production.env"
        COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
    else
        COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.${ENVIRONMENT}.yml"
    fi

    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up --build -d

    log_success "Rollback completed!"
}

# Function to create backup
create_backup() {
    log_info "Creating database backup..."

    ENV_FILE="${PROJECT_ROOT}/${ENVIRONMENT}.env"
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE="${PROJECT_ROOT}/production.env"
    fi

    source "$ENV_FILE"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${PROJECT_ROOT}/backups/manual_backup_${TIMESTAMP}.sql.gz"

    mkdir -p "${PROJECT_ROOT}/backups"

    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.${ENVIRONMENT}.yml"
    if [ "$ENVIRONMENT" = "prod" ]; then
        COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
    fi

    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" absensi_db | gzip > "$BACKUP_FILE"

    log_success "Backup created: $BACKUP_FILE"
}

# Function to monitor
monitor() {
    log_info "Monitoring services..."

    ENV_FILE="${PROJECT_ROOT}/${ENVIRONMENT}.env"
    if [ "$ENVIRONMENT" = "prod" ]; then
        ENV_FILE="${PROJECT_ROOT}/production.env"
    fi

    COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.${ENVIRONMENT}.yml"
    if [ "$ENVIRONMENT" = "prod" ]; then
        COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
    fi

    echo "=== Service Status ==="
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

    echo ""
    echo "=== Resource Usage ==="
    docker stats --no-stream $(docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q)

    echo ""
    echo "=== Health Checks ==="
    source "$ENV_FILE"

    # Database health
    if docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost --silent; then
        echo "✅ Database: Healthy"
    else
        echo "❌ Database: Unhealthy"
    fi

    # Backend health
    if curl -f "http://localhost:8000/health/" > /dev/null 2>&1; then
        echo "✅ Backend: Healthy"
    else
        echo "❌ Backend: Unhealthy"
    fi

    # Frontend health
    if curl -f "http://localhost:3000" > /dev/null 2>&1; then
        echo "✅ Frontend: Healthy"
    else
        echo "❌ Frontend: Unhealthy"
    fi
}

# Main execution
case $ACTION in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    backup)
        create_backup
        ;;
    monitor)
        monitor
        ;;
    *)
        echo "Usage: $0 [environment] [action]"
        echo "Environments: dev, staging, prod"
        echo "Actions: deploy, rollback, backup, monitor"
        exit 1
        ;;
esac
