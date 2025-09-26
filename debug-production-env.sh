#!/bin/bash

# Script to debug and fix production environment variable loading
# This script helps identify why NEXT_PUBLIC_BACKEND_URL is not being loaded correctly

echo "🔍 Debugging Production Environment Variable Loading..."
echo ""

# Check if we're in the right directory
if [ ! -f "production.env" ]; then
    echo "❌ production.env file not found! Please run this script from the project root."
    exit 1
fi

echo "📋 Current production.env configuration:"
echo "----------------------------------------"
grep -E "(NEXT_PUBLIC_|API_DOMAIN|FRONTEND_DOMAIN)" production.env
echo ""

echo "🔧 Expected configuration for production:"
echo "----------------------------------------"
echo "FRONTEND_DOMAIN=siaki.kjri-dubai.local"
echo "API_DOMAIN=api.siaki.kjri-dubai.local"
echo "NEXT_PUBLIC_API_URL=https://api.siaki.kjri-dubai.local"
echo "NEXT_PUBLIC_BACKEND_URL=https://api.siaki.kjri-dubai.local"
echo ""

echo "🚀 Steps to fix the issue on production server:"
echo "=============================================="
echo ""
echo "1. 📁 Copy the corrected production.env to your server:"
echo "   scp production.env user@your-server:/path/to/absensi/"
echo ""
echo "2. 🔄 Rebuild the frontend container to ensure env vars are loaded:"
echo "   docker-compose -f docker-compose.prod.yml up -d --build frontend"
echo ""
echo "3. 🔍 Check if environment variables are loaded correctly:"
echo "   docker exec absensi_frontend_prod env | grep NEXT_PUBLIC"
echo ""
echo "4. 📊 Check frontend logs for any errors:"
echo "   docker logs absensi_frontend_prod --tail 50"
echo ""
echo "5. 🌐 Test the API endpoint directly:"
echo "   curl -k https://api.siaki.kjri-dubai.local/api/v2/auth/health/"
echo ""

echo "🔍 Debugging steps if the issue persists:"
echo "========================================"
echo ""
echo "1. Check if the domain resolves correctly:"
echo "   nslookup api.siaki.kjri-dubai.local"
echo ""
echo "2. Check Caddy configuration:"
echo "   docker logs absensi_caddy_prod --tail 20"
echo ""
echo "3. Check backend health:"
echo "   docker logs absensi_backend_prod --tail 20"
echo ""
echo "4. Test from inside the frontend container:"
echo "   docker exec -it absensi_frontend_prod sh"
echo "   # Then inside the container:"
echo "   curl -k https://api.siaki.kjri-dubai.local/api/v2/auth/health/"
echo ""

echo "✅ Expected behavior after fix:"
echo "=============================="
echo "- Browser console should show API calls to https://api.siaki.kjri-dubai.local"
echo "- No more 'Failed to fetch' errors"
echo "- Notification badge should load data correctly"
echo "- All API endpoints should work properly"
echo ""

echo "⚠️  Important notes:"
echo "=================="
echo "- NEXT_PUBLIC_* variables are embedded at build time"
echo "- You MUST rebuild the frontend container for changes to take effect"
echo "- Environment variables are not loaded dynamically in Next.js production builds"
echo "- Make sure the domain configuration is consistent across all files"
