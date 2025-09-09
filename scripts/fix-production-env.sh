#!/bin/bash

# Fix Production Environment Variables
# This script fixes the production.env file with correct values for local IP deployment

set -e

echo "🔧 Fixing production.env file..."

# Backup original file
if [ -f "production.env" ]; then
    cp production.env production.env.backup
    echo "✅ Backed up original production.env to production.env.backup"
fi

# Create corrected production.env
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

echo "✅ Created corrected production.env file"
echo "📋 Environment variables configured for local IP: 192.168.141.7"

# Verify the file
echo "🔍 Verifying production.env file..."
if [ -f "production.env" ]; then
    echo "✅ production.env file exists"
    echo "📄 File contents:"
    cat production.env
else
    echo "❌ Failed to create production.env file"
    exit 1
fi

echo "🎉 Production environment variables fixed successfully!"
