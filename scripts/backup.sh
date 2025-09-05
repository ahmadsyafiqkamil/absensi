#!/bin/bash

# Production Backup Script
# Usage: ./scripts/backup.sh

set -e

BACKUP_DIR="/opt/absensi/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Creating backup: $BACKUP_NAME"

# Backup database
if [ -f "production.env" ]; then
    log_info "Backing up database..."

    # Load environment variables
    source production.env

    # Create database backup
    docker exec absensi_mysql_prod mysqldump \
        -u "$MYSQL_USER" \
        -p"$MYSQL_PASSWORD" \
        "$MYSQL_DATABASE" > "$BACKUP_DIR/db_$BACKUP_NAME.sql"

    # Compress database backup
    gzip "$BACKUP_DIR/db_$BACKUP_NAME.sql"

    log_success "Database backup created"
fi

# Backup application files
log_info "Backing up application files..."
tar -czf "$BACKUP_DIR/app_$BACKUP_NAME.tar.gz" \
    --exclude='logs/*' \
    --exclude='backups/*' \
    --exclude='node_modules' \
    --exclude='.git' \
    .

log_success "Application files backup created"

# Backup media files
log_info "Backing up media files..."
tar -czf "$BACKUP_DIR/media_$BACKUP_NAME.tar.gz" \
    drf/app/media/

log_success "Media files backup created"

# Clean old backups (keep last 10)
log_info "Cleaning old backups..."
cd "$BACKUP_DIR"
ls -t *.tar.gz *.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

log_success "Backup completed: $BACKUP_NAME"
echo "Backup location: $BACKUP_DIR"
echo "Files created:"
echo "  - Database: db_$BACKUP_NAME.sql.gz"
echo "  - Application: app_$BACKUP_NAME.tar.gz"
echo "  - Media: media_$BACKUP_NAME.tar.gz"
