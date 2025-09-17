#!/bin/bash

# Quick MySQL Fix
# Fast fix for MySQL configuration issues

set -e

echo "🔧 Quick MySQL fix..."

# Stop MySQL
docker-compose -f docker-compose.prod.yml stop mysql

# Clean MySQL configuration
sed -i '/query.cache/d' mysql/conf.d/mysql.cnf
sed -i '/query-cache/d' mysql/conf.d/mysql.cnf
sed -i '/query_cache/d' mysql/conf.d/mysql.cnf

# Remove MySQL container and volume
docker-compose -f docker-compose.prod.yml rm -f mysql
docker volume rm absensi_mysql_data 2>/dev/null || true

# Start MySQL
docker-compose -f docker-compose.prod.yml up -d mysql

echo "✅ Quick MySQL fix applied!"
echo "⏳ Waiting 30 seconds for MySQL to start..."
sleep 30

# Check status
docker-compose -f docker-compose.prod.yml ps mysql
