#!/bin/bash

# Production Environment Startup Script
# This script ensures proper configuration and startup of production environment

set -e

echo "🚀 Starting Production Environment Setup..."

# Check if production.env exists
if [ ! -f "production.env" ]; then
    echo "❌ Error: production.env file not found!"
    echo "Please copy production.env.example to production.env and configure it."
    exit 1
fi

# Check if domain is configured in /etc/hosts
echo "🔍 Checking domain configuration..."
if ! grep -q "siaki.kjri-dubai.local" /etc/hosts; then
    echo "⚠️  Warning: siaki.kjri-dubai.local not found in /etc/hosts"
    echo "Please add the following to /etc/hosts:"
    echo "127.0.0.1 siaki.kjri-dubai.local"
    echo "127.0.0.1 api.siaki.kjri-dubai.local"
    echo "127.0.0.1 phpmyadmin.siaki.kjri-dubai.local"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml --env-file production.env down

# Remove any orphaned containers
echo "🧹 Cleaning up orphaned containers..."
docker-compose -f docker-compose.prod.yml --env-file production.env down --remove-orphans

# Build and start services
echo "🔨 Building and starting production services..."
docker-compose -f docker-compose.prod.yml --env-file production.env up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.prod.yml --env-file production.env ps

# Test connectivity
echo "🔗 Testing connectivity..."
echo "Frontend: https://siaki.kjri-dubai.local"
echo "API: https://api.siaki.kjri-dubai.local"
echo "phpMyAdmin: https://phpmyadmin.siaki.kjri-dubai.local"

# Show logs for debugging
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml --env-file production.env logs --tail=20

echo "✅ Production environment setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: https://siaki.kjri-dubai.local"
echo "   API: https://api.siaki.kjri-dubai.local"
echo "   phpMyAdmin: https://phpmyadmin.siaki.kjri-dubai.local"
echo ""
echo "📝 To view logs: docker-compose -f docker-compose.prod.yml --env-file production.env logs -f"
echo "🛑 To stop: docker-compose -f docker-compose.prod.yml --env-file production.env down"
