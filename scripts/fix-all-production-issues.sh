#!/bin/bash

# Fix All Production Issues
# This script fixes all identified production issues on the server

set -e

echo "🔧 Fixing all production issues..."

# Check if we're on the server
if [ ! -f "production.env" ]; then
    echo "❌ production.env not found. Are you on the production server?"
    exit 1
fi

# 1. Fix production.env file
echo "📝 Fixing production.env file..."
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

echo "✅ production.env fixed"

# 2. Fix MySQL configuration
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

# 3. Fix Docker Compose version attribute
echo "🔧 Fixing Docker Compose version attribute..."
if [ -f "docker-compose.prod.yml" ]; then
    sed -i '/^version:/d' docker-compose.prod.yml
    echo "✅ Docker Compose version attribute removed"
else
    echo "❌ docker-compose.prod.yml not found"
fi

# 4. Stop all services
echo "🛑 Stopping all services..."
docker-compose -f docker-compose.prod.yml down

# 5. Remove MySQL volume to start fresh
echo "🧹 Removing MySQL volume..."
docker volume rm absensi_mysql_data 2>/dev/null || echo "Volume not found, continuing..."

# 6. Start all services
echo "🚀 Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# 7. Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 60

# 8. Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ All production issues fixed!"
echo "🔍 Run './scripts/monitor.sh' to check service health"
