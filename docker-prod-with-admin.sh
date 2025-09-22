#!/bin/bash

# Production Docker deployment script with Django Admin and phpMyAdmin access
# This script ensures both Django admin and phpMyAdmin are accessible in production

set -e

echo "🚀 Starting Production Deployment with Admin Access..."

# Check if production.env exists
if [ ! -f "production.env" ]; then
    echo "❌ production.env file not found!"
    echo "Please copy production.env.example to production.env and update the values:"
    echo "cp production.env.example production.env"
    echo "Then edit production.env with your actual domain and credentials"
    exit 1
fi

# Load environment variables
export $(cat production.env | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("FRONTEND_DOMAIN" "API_DOMAIN" "SECRET_KEY" "MYSQL_ROOT_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set in production.env"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check MySQL
if docker exec absensi_mysql_prod mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} --silent; then
    echo "✅ MySQL is healthy"
else
    echo "❌ MySQL is not healthy"
    docker-compose -f docker-compose.prod.yml logs mysql
    exit 1
fi

# Check Backend
if curl -f http://localhost:8000/api/v2/auth/health/ > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not healthy"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is not healthy"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

# Check phpMyAdmin
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ phpMyAdmin is healthy"
else
    echo "❌ phpMyAdmin is not healthy"
    docker-compose -f docker-compose.prod.yml logs phpmyadmin
    exit 1
fi

echo ""
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📋 Access URLs:"
echo "   Frontend: https://${FRONTEND_DOMAIN}"
echo "   API: https://${API_DOMAIN}"
echo "   Django Admin: https://${API_DOMAIN}/admin/"
echo "   phpMyAdmin: https://phpmyadmin.${FRONTEND_DOMAIN}"
echo ""
echo "🔐 Admin Access:"
echo "   Django Admin: Use your Django superuser credentials"
echo "   phpMyAdmin: Use MySQL root credentials (from production.env)"
echo ""
echo "📝 Note: Make sure to add these domains to your /etc/hosts file:"
echo "   127.0.0.1 absensi.local"
echo "   127.0.0.1 api.absensi.local"
echo "   127.0.0.1 phpmyadmin.absensi.local"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps
