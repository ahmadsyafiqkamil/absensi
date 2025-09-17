#!/bin/bash

# Complete MySQL Reset
# This script completely resets MySQL to fix all issues

set -e

echo "🔄 Complete MySQL reset..."

# Stop all services
echo "🛑 Stopping all services..."
docker-compose -f docker-compose.prod.yml down

# Remove MySQL container and volume
echo "🗑️ Removing MySQL container and volume..."
docker-compose -f docker-compose.prod.yml rm -f mysql 2>/dev/null || true
docker volume rm absensi_mysql_data 2>/dev/null || true

# Clean up any orphaned containers
echo "🧹 Cleaning up orphaned containers..."
docker system prune -f

# Remove MySQL data directory if it exists
echo "🗑️ Removing MySQL data directory..."
rm -rf mysql/data/*

# Ensure MySQL configuration is clean
echo "🔧 Ensuring MySQL configuration is clean..."
if [ -f "mysql/conf.d/mysql.cnf" ]; then
    # Remove all query cache related lines completely
    sed -i '/query.cache/d' mysql/conf.d/mysql.cnf
    sed -i '/query-cache/d' mysql/conf.d/mysql.cnf
    sed -i '/query_cache/d' mysql/conf.d/mysql.cnf

    # Add a comment to confirm it's clean
    if ! grep -q "MySQL 8.0+ clean" mysql/conf.d/mysql.cnf; then
        sed -i '18a# MySQL 8.0+ clean configuration' mysql/conf.d/mysql.cnf
    fi

    echo "✅ MySQL configuration cleaned"
fi

# Create MySQL data directory
echo "📁 Creating MySQL data directory..."
mkdir -p mysql/data

# Start only MySQL first
echo "🚀 Starting MySQL container..."
docker-compose -f docker-compose.prod.yml up -d mysql

# Wait for MySQL to initialize
echo "⏳ Waiting for MySQL to initialize (this may take a while)..."
sleep 60

# Check MySQL logs
echo "📋 Checking MySQL initialization logs..."
docker-compose -f docker-compose.prod.yml logs mysql | tail -20

# Check if MySQL is healthy
echo "🔍 Checking MySQL health..."
if docker-compose -f docker-compose.prod.yml ps mysql | grep -q "Up"; then
    echo "✅ MySQL is running!"

    # Start other services
    echo "🚀 Starting other services..."
    docker-compose -f docker-compose.prod.yml up -d backend frontend caddy

    # Wait for services to start
    echo "⏳ Waiting for services to start..."
    sleep 30

    # Check all service status
    echo "🔍 Checking all service status..."
    docker-compose -f docker-compose.prod.yml ps

else
    echo "❌ MySQL failed to start. Checking logs..."
    docker-compose -f docker-compose.prod.yml logs mysql
    exit 1
fi

echo "✅ Complete MySQL reset finished!"
echo "🔍 Run './scripts/monitor.sh' to check service health"
