#!/bin/bash

echo "🚀 Rebuilding Docker containers with HeroUI dependencies..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Remove existing images
echo "🗑️ Removing existing frontend image..."
docker rmi absensi_frontend_dev 2>/dev/null || true

# Clean up volumes (optional - uncomment if you want to start fresh)
# echo "🧹 Cleaning up volumes..."
# docker-compose -f docker-compose.dev.yml down -v

# Rebuild frontend with new dependencies
echo "🔨 Rebuilding frontend container..."
docker-compose -f docker-compose.dev.yml build --no-cache frontend

# Start services
echo "▶️ Starting services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
sleep 10

# Install HeroUI dependencies inside container
echo "📦 Installing HeroUI dependencies inside container..."
docker exec -it absensi_frontend_dev bash -c "chmod +x install-heroui.sh && ./install-heroui.sh"

echo "✅ Rebuild completed successfully!"
echo "🌐 Frontend should be available at: http://localhost:3000"
echo "🔍 Check logs with: docker-compose -f docker-compose.dev.yml logs -f frontend"

