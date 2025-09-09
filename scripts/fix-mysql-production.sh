#!/bin/bash

# Fix MySQL Production Issues
# This script fixes MySQL configuration issues on production server

set -e

echo "🔧 Fixing MySQL production issues..."

# Check if we're on the server
if [ ! -f "production.env" ]; then
    echo "❌ production.env not found. Are you on the production server?"
    exit 1
fi

# Stop MySQL container
echo "🛑 Stopping MySQL container..."
docker-compose -f docker-compose.prod.yml stop mysql

# Remove MySQL container
echo "🗑️ Removing MySQL container..."
docker-compose -f docker-compose.prod.yml rm -f mysql

# Remove MySQL volume to start fresh
echo "🧹 Removing MySQL volume..."
docker volume rm absensi_mysql_data 2>/dev/null || echo "Volume not found, continuing..."

# Fix MySQL configuration
echo "🔧 Fixing MySQL configuration..."
if [ -f "mysql/conf.d/mysql.cnf" ]; then
    # Remove query cache settings that are not supported in MySQL 8.0+
    sed -i 's/^query_cache_size=/#query_cache_size=/' mysql/conf.d/mysql.cnf
    sed -i 's/^query_cache_type=/#query_cache_type=/' mysql/conf.d/mysql.cnf
    sed -i 's/^query_cache_limit=/#query_cache_limit=/' mysql/conf.d/mysql.cnf
    sed -i 's/^query-cache-size=/#query-cache-size=/' mysql/conf.d/mysql.cnf
    echo "✅ MySQL configuration fixed"
else
    echo "❌ mysql/conf.d/mysql.cnf not found"
fi

# Start MySQL container
echo "🚀 Starting MySQL container..."
docker-compose -f docker-compose.prod.yml up -d mysql

# Wait for MySQL to start
echo "⏳ Waiting for MySQL to start..."
sleep 30

# Check MySQL status
echo "🔍 Checking MySQL status..."
docker-compose -f docker-compose.prod.yml ps mysql

# Check MySQL logs
echo "📋 MySQL logs:"
docker-compose -f docker-compose.prod.yml logs mysql | tail -20

echo "✅ MySQL fix completed!"
echo "🔍 Run './scripts/monitor.sh' to check overall service health"
