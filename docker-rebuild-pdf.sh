#!/bin/bash

echo "🚀 Rebuilding Docker containers for PDF export feature..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Remove old images to ensure fresh build
echo "🗑️  Removing old images..."
docker-compose -f docker-compose.dev.yml down --rmi all

# Rebuild containers with new requirements
echo "🔨 Rebuilding containers..."
docker-compose -f docker-compose.dev.yml build --no-cache

# Start containers
echo "▶️  Starting containers..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose -f docker-compose.dev.yml ps

# Test backend health
echo "🏥 Testing backend health..."
sleep 5
curl -f http://localhost:8000/api/v2/auth/health/ || echo "Backend not ready yet"

echo "✅ Rebuild completed! PDF export feature should now be available."
echo ""
echo "📋 To test the feature:"
echo "1. Go to /pegawai/overtime"
echo "2. Look for approved monthly summary requests"
echo "3. Click 'Export PDF' button (red button)"
echo ""
echo "🔍 To check logs:"
echo "docker-compose -f docker-compose.dev.yml logs -f drf"
