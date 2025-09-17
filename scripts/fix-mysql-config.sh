#!/bin/bash

# Fix MySQL Configuration Script
# This script fixes MySQL configuration issues

set -e

echo "🔧 Fixing MySQL Configuration..."
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if MySQL config directory exists
if [ ! -d "mysql/conf.d" ]; then
    print_warning "Creating MySQL config directory..."
    mkdir -p mysql/conf.d
fi

# Create or fix MySQL configuration
print_status "Creating/fixing MySQL configuration..."

cat > mysql/conf.d/mysql.cnf << 'EOF'
[mysqld]
# Basic settings
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
default-time-zone='+00:00'

# Connection settings
max_connections=200
max_connect_errors=1000

# Memory settings
innodb_buffer_pool_size=256M
innodb_log_file_size=64M
innodb_log_buffer_size=16M

# Performance settings
innodb_flush_log_at_trx_commit=1
innodb_flush_method=O_DIRECT

# Security settings
local-infile=0

# Logging
general_log=0
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2

# Remove problematic settings that cause errors
# query_cache_size=256M  # This causes errors in MySQL 8.0+
# query_cache_type=1     # This causes errors in MySQL 8.0+
EOF

print_status "MySQL configuration created/updated"

# Show the configuration
echo ""
echo "=== MySQL Configuration ==="
cat mysql/conf.d/mysql.cnf

print_status "MySQL configuration fix completed!"
echo ""
echo "Next steps:"
echo "1. Stop MySQL: docker-compose -f docker-compose.prod.yml stop mysql"
echo "2. Remove MySQL volume: docker volume rm absensi_mysql_data_prod"
echo "3. Start MySQL: docker-compose -f docker-compose.prod.yml up -d mysql"
echo "4. Check logs: docker-compose -f docker-compose.prod.yml logs mysql"
