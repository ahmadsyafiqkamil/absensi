#!/bin/bash

# Fix Production Issues Script
# This script fixes common production issues based on monitoring results

set -e

echo "🔧 Starting Production Issues Fix..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Found docker-compose.prod.yml"

# Step 1: Stop all services
print_status "Stopping all services..."
docker-compose -f docker-compose.prod.yml down

# Step 2: Backup and clean MySQL data
print_warning "Backing up MySQL data..."
if [ -d "mysql" ]; then
    BACKUP_DIR="mysql_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r mysql/ "$BACKUP_DIR/" 2>/dev/null || true
    print_status "MySQL data backed up to: $BACKUP_DIR"
fi

print_warning "Cleaning MySQL volume..."
docker volume rm absensi_mysql_data_prod 2>/dev/null || true

# Step 3: Fix MySQL configuration
print_status "Fixing MySQL configuration..."
if [ -f "mysql/conf.d/mysql.cnf" ]; then
    # Remove query_cache_size line
    sed -i '/query_cache_size=256M/d' mysql/conf.d/mysql.cnf
    print_status "Removed query_cache_size from MySQL config"
else
    print_warning "MySQL config file not found, creating minimal config..."
    mkdir -p mysql/conf.d
    cat > mysql/conf.d/mysql.cnf << 'EOF'
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
max_connections=200
innodb_buffer_pool_size=256M
EOF
fi

# Step 4: Fix Docker Compose version
print_status "Fixing Docker Compose version warning..."
if grep -q "^version:" docker-compose.prod.yml; then
    sed -i '/^version:/d' docker-compose.prod.yml
    print_status "Removed obsolete version attribute from docker-compose.prod.yml"
fi

# Step 5: Fix environment variables
print_status "Fixing environment variables..."
if [ -f "production.env" ]; then
    # Add TIMESTAMP if not exists
    if ! grep -q "^TIMESTAMP=" production.env; then
        echo "TIMESTAMP=\$(date +%Y%m%d_%H%M%S)" >> production.env
        print_status "Added TIMESTAMP variable to production.env"
    fi
else
    print_warning "production.env not found, creating from example..."
    if [ -f "env.production.example" ]; then
        cp env.production.example production.env
        echo "TIMESTAMP=\$(date +%Y%m%d_%H%M%S)" >> production.env
        print_status "Created production.env from example"
    else
        print_error "No environment file found. Please create production.env manually."
        exit 1
    fi
fi

# Step 6: Rebuild and start services
print_status "Rebuilding all services..."
docker-compose -f docker-compose.prod.yml build --no-cache

print_status "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Step 7: Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Step 8: Check service status
print_status "Checking service status..."
echo ""
echo "=== Service Status ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=== Health Check ==="
# Check if services are running
MYSQL_STATUS=$(docker-compose -f docker-compose.prod.yml ps mysql | grep -c "Up" || echo "0")
BACKEND_STATUS=$(docker-compose -f docker-compose.prod.yml ps backend | grep -c "Up" || echo "0")
FRONTEND_STATUS=$(docker-compose -f docker-compose.prod.yml ps frontend | grep -c "Up" || echo "0")
CADDY_STATUS=$(docker-compose -f docker-compose.prod.yml ps caddy | grep -c "Up" || echo "0")

if [ "$MYSQL_STATUS" -gt 0 ]; then
    print_status "MySQL is running"
else
    print_error "MySQL is not running"
fi

if [ "$BACKEND_STATUS" -gt 0 ]; then
    print_status "Backend is running"
else
    print_error "Backend is not running"
fi

if [ "$FRONTEND_STATUS" -gt 0 ]; then
    print_status "Frontend is running"
else
    print_error "Frontend is not running"
fi

if [ "$CADDY_STATUS" -gt 0 ]; then
    print_status "Caddy is running"
else
    print_error "Caddy is not running"
fi

echo ""
echo "🔧 Fix completed!"
echo ""
echo "Next steps:"
echo "1. Run './scripts/monitor.sh' to check detailed status"
echo "2. Check logs if any service is not running:"
echo "   docker-compose -f docker-compose.prod.yml logs [service_name]"
echo "3. Access the application at: http://192.168.141.7"
