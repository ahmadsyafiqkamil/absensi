#!/bin/bash

# Complete MySQL Fix - Nuclear Option
# This script completely wipes and recreates MySQL

set -e

echo "🔥 COMPLETE MYSQL RESET - Nuclear Option"
echo "⚠️  This will completely wipe your MySQL data!"

# Ask for confirmation
read -p "Are you sure you want to completely reset MySQL? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

echo "🛑 Stopping all services..."
docker-compose -f docker-compose.prod.yml down

echo "🧹 Cleaning up all Docker resources..."
docker system prune -f
docker volume prune -f

echo "🗑️ Removing MySQL volume and data..."
docker volume rm absensi_mysql_data 2>/dev/null || true
rm -rf mysql/data/*
rm -rf mysql/logs/*

echo "🔧 Creating fresh MySQL configuration..."
# Create a completely clean MySQL config
cat > mysql/conf.d/mysql.cnf << 'EOF'
[mysqld]
# Basic settings
bind-address = 0.0.0.0
port = 3306

# Performance settings
innodb_buffer_pool_size = 512M
innodb_log_file_size = 128M
innodb_flush_method = O_DIRECT
innodb_thread_concurrency = 8

# Connection settings
max_connections = 100
max_connect_errors = 100000
wait_timeout = 28800
interactive_timeout = 28800

# Logging
general_log = 0
slow_query_log = 1
slow_query_log_file = /var/lib/mysql/mysql-slow.log
long_query_time = 2

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Security
skip-name-resolve
skip-host-cache

[mysql]
default-character-set = utf8mb4

[client]
default-character-set = utf8mb4

# MySQL 8.0+ clean configuration - No query cache
EOF

echo "📁 Creating MySQL data directory..."
mkdir -p mysql/data
mkdir -p mysql/logs

echo "🔧 Creating fresh production.env..."
cat > production.env << 'EOF'
# Database Configuration
MYSQL_ROOT_PASSWORD=kjri_dubai_root
MYSQL_USER=absensi_user
MYSQL_PASSWORD=kjri_dubai_db_password

# Django Backend Configuration
SECRET_KEY=dubai_kjri_asd131qasddasd14341
DJANGO_ALLOWED_HOSTS=192.168.141.7,localhost,127.0.0.1,backend
PASSWORD_SALT=kjri_dubai_salt_2024
BACKEND_CORS_ORIGINS=http://192.168.141.7:3000,http://192.168.141.7

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://192.168.141.7:8000
NEXT_PUBLIC_BACKEND_URL=http://192.168.141.7:8000

# Domain Configuration for Caddy
FRONTEND_DOMAIN=192.168.141.7
API_DOMAIN=192.168.141.7

# Production Settings
DJANGO_DEBUG=0
NODE_ENV=production

# Additional required variables
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EOF

echo "🚀 Starting MySQL with fresh setup..."
docker-compose -f docker-compose.prod.yml up -d mysql

echo "⏳ Waiting for MySQL to initialize (this may take 2-3 minutes)..."
sleep 30

# Check if MySQL is starting properly
echo "🔍 Checking MySQL initialization..."
for i in {1..20}; do
    if docker-compose -f docker-compose.prod.yml ps mysql | grep -q "Up"; then
        echo "✅ MySQL container is running!"
        break
    fi

    if [ $i -eq 20 ]; then
        echo "❌ MySQL failed to start after 10 minutes"
        echo "📋 Checking logs:"
        docker-compose -f docker-compose.prod.yml logs mysql | tail -30
        exit 1
    fi

    echo "⏳ Still waiting... ($i/20)"
    sleep 30
done

echo "⏳ Waiting additional time for MySQL initialization..."
sleep 90

# Check MySQL logs for successful initialization
echo "📋 Checking MySQL logs for initialization status..."
docker-compose -f docker-compose.prod.yml logs mysql | tail -20

# Try to start other services
echo "🚀 Starting other services..."
docker-compose -f docker-compose.prod.yml up -d backend frontend caddy

echo "⏳ Waiting for all services to start..."
sleep 60

echo "🔍 Final service status:"
docker-compose -f docker-compose.prod.yml ps

echo "✅ Complete MySQL reset finished!"
echo "🔍 Run './scripts/monitor.sh' to check service health"
echo ""
echo "⚠️  WARNING: All MySQL data has been wiped!"
echo "🔄 You may need to restore your database from backup"
