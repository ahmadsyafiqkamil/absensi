#!/bin/bash

# Script to fix production environment configuration
# This script updates the production environment variables and restarts services

echo "🔧 Fixing Production Environment Configuration..."

# Check if production.env exists
if [ ! -f "production.env" ]; then
    echo "❌ production.env file not found!"
    exit 1
fi

echo "📋 Current configuration:"
echo "FRONTEND_DOMAIN: $(grep FRONTEND_DOMAIN production.env)"
echo "API_DOMAIN: $(grep API_DOMAIN production.env)"
echo "NEXT_PUBLIC_API_URL: $(grep NEXT_PUBLIC_API_URL production.env)"
echo "NEXT_PUBLIC_BACKEND_URL: $(grep NEXT_PUBLIC_BACKEND_URL production.env)"

# Verify the configuration is correct
echo ""
echo "✅ Configuration should be:"
echo "FRONTEND_DOMAIN=siaki.kjri-dubai.local"
echo "API_DOMAIN=api-siaki.kjri-dubai.local"
echo "NEXT_PUBLIC_API_URL=https://api-siaki.kjri-dubai.local"
echo "NEXT_PUBLIC_BACKEND_URL=https://api-siaki.kjri-dubai.local"

echo ""
echo "🚀 To apply these changes on the production server:"
echo "1. Copy the updated production.env to your server"
echo "2. Restart the frontend container:"
echo "   docker-compose -f docker-compose.prod.yml restart frontend"
echo ""
echo "3. Or rebuild the frontend container to ensure env vars are loaded:"
echo "   docker-compose -f docker-compose.prod.yml up -d --build frontend"
echo ""
echo "4. Check the logs to verify the fix:"
echo "   docker logs absensi_frontend_prod --tail 20"

echo ""
echo "🔍 To verify the fix is working:"
echo "1. Open browser developer tools"
echo "2. Check Network tab - API calls should go to https://api-siaki.kjri-dubai.local"
echo "3. Check Console - no more 'Failed to fetch' errors"
