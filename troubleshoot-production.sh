#!/bin/bash

# Production Environment Troubleshooting Script
# This script helps diagnose issues in production environment

set -e

echo "🔍 Production Environment Troubleshooting"
echo "=========================================="

# Check if production.env exists
echo "📋 1. Checking environment file..."
if [ -f "production.env" ]; then
    echo "✅ production.env found"
    echo "   Domain configuration:"
    grep -E "(FRONTEND_DOMAIN|API_DOMAIN)" production.env
else
    echo "❌ production.env not found!"
    exit 1
fi

# Check /etc/hosts configuration
echo ""
echo "🌐 2. Checking /etc/hosts configuration..."
if grep -q "siaki.kjri-dubai.local" /etc/hosts; then
    echo "✅ Domain entries found in /etc/hosts:"
    grep "siaki.kjri-dubai.local" /etc/hosts
else
    echo "❌ Domain entries missing from /etc/hosts!"
    echo "Please add:"
    echo "127.0.0.1 siaki.kjri-dubai.local"
    echo "127.0.0.1 api.siaki.kjri-dubai.local"
    echo "127.0.0.1 phpmyadmin.siaki.kjri-dubai.local"
fi

# Check Docker services status
echo ""
echo "🐳 3. Checking Docker services status..."
docker-compose -f docker-compose.prod.yml --env-file production.env ps

# Check service health
echo ""
echo "🏥 4. Checking service health..."
echo "Backend health check:"
if curl -s -k https://api.siaki.kjri-dubai.local/api/v2/auth/health/ > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

echo "Frontend health check:"
if curl -s -k https://siaki.kjri-dubai.local/login > /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
fi

# Check recent logs
echo ""
echo "📋 5. Recent logs (last 10 lines each):"
echo "Backend logs:"
docker-compose -f docker-compose.prod.yml --env-file production.env logs --tail=10 backend

echo ""
echo "Frontend logs:"
docker-compose -f docker-compose.prod.yml --env-file production.env logs --tail=10 frontend

echo ""
echo "Caddy logs:"
docker-compose -f docker-compose.prod.yml --env-file production.env logs --tail=10 caddy

# Check network connectivity
echo ""
echo "🔗 6. Network connectivity tests..."
echo "Testing localhost connectivity:"
if ping -c 1 127.0.0.1 > /dev/null 2>&1; then
    echo "✅ Localhost ping successful"
else
    echo "❌ Localhost ping failed"
fi

# Check port availability
echo ""
echo "🔌 7. Checking port availability..."
echo "Port 80 (HTTP):"
if lsof -i :80 > /dev/null 2>&1; then
    echo "✅ Port 80 is in use"
    lsof -i :80
else
    echo "❌ Port 80 is not in use"
fi

echo "Port 443 (HTTPS):"
if lsof -i :443 > /dev/null 2>&1; then
    echo "✅ Port 443 is in use"
    lsof -i :443
else
    echo "❌ Port 443 is not in use"
fi

# Check SSL certificates
echo ""
echo "🔒 8. Checking SSL certificates..."
if [ -d "caddy_data_prod" ]; then
    echo "✅ Caddy data directory exists"
    ls -la caddy_data_prod/
else
    echo "❌ Caddy data directory not found"
fi

echo ""
echo "🎯 Troubleshooting complete!"
echo ""
echo "💡 Common fixes:"
echo "   1. Restart services: docker-compose -f docker-compose.prod.yml --env-file production.env restart"
echo "   2. Rebuild services: docker-compose -f docker-compose.prod.yml --env-file production.env up -d --build"
echo "   3. Check logs: docker-compose -f docker-compose.prod.yml --env-file production.env logs -f"
echo "   4. Clean restart: docker-compose -f docker-compose.prod.yml --env-file production.env down && docker-compose -f docker-compose.prod.yml --env-file production.env up -d"
