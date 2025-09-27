#!/bin/bash

# Fix Notification Error in Production
# This script rebuilds the frontend container to fix NEXT_PUBLIC_BACKEND_URL issue

echo "🔧 Fixing Notification Error in Production..."
echo "=============================================="

# Check if production.env exists
if [ ! -f "production.env" ]; then
    echo "❌ Error: production.env file not found!"
    echo "Please ensure production.env exists with correct NEXT_PUBLIC_BACKEND_URL"
    exit 1
fi

# Check NEXT_PUBLIC_BACKEND_URL in production.env
echo "📋 Checking production.env configuration..."
BACKEND_URL=$(grep "NEXT_PUBLIC_BACKEND_URL" production.env | cut -d'=' -f2)
if [ -z "$BACKEND_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_BACKEND_URL not found in production.env"
    exit 1
fi
echo "✅ NEXT_PUBLIC_BACKEND_URL: $BACKEND_URL"

# Stop and remove existing frontend container
echo "🛑 Stopping existing frontend container..."
docker-compose -f docker-compose.prod.yml stop frontend
docker-compose -f docker-compose.prod.yml rm -f frontend

# Rebuild frontend container with new environment variables
echo "🔨 Rebuilding frontend container..."
docker-compose -f docker-compose.prod.yml up -d --build frontend

# Wait for container to be ready
echo "⏳ Waiting for frontend container to be ready..."
sleep 10

# Check if container is running
if ! docker-compose -f docker-compose.prod.yml ps frontend | grep -q "Up"; then
    echo "❌ Error: Frontend container failed to start"
    echo "Checking logs..."
    docker-compose -f docker-compose.prod.yml logs frontend --tail 20
    exit 1
fi

# Verify environment variables are loaded correctly
echo "🔍 Verifying environment variables in container..."
echo "NEXT_PUBLIC variables in container:"
docker exec absensi_frontend_prod env | grep NEXT_PUBLIC || echo "No NEXT_PUBLIC variables found"

# Test API connectivity from container
echo "🌐 Testing API connectivity from container..."
docker exec absensi_frontend_prod sh -c "curl -k -s -o /dev/null -w '%{http_code}' $BACKEND_URL/api/v2/auth/health/" || echo "API connectivity test failed"

# Check container logs
echo "📋 Recent frontend container logs:"
docker-compose -f docker-compose.prod.yml logs frontend --tail 10

echo ""
echo "✅ Frontend container rebuild completed!"
echo ""
echo "🔍 Next steps to verify the fix:"
echo "1. Open browser and go to your production URL"
echo "2. Open Developer Tools → Network tab"
echo "3. Check that API calls go to: $BACKEND_URL"
echo "4. Verify notification badge works without errors"
echo "5. Check browser console for any remaining errors"
echo ""
echo "📋 If issues persist, check:"
echo "- DNS resolution: nslookup api.siaki.kjri-dubai.local"
echo "- SSL certificate: curl -k $BACKEND_URL/api/v2/auth/health/"
echo "- Caddy logs: docker logs absensi_caddy_prod"
echo "- Backend logs: docker logs absensi_backend_prod"
