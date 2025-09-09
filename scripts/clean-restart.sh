#!/bin/bash

# Clean and Restart All Services
# This script stops all services, cleans up, and restarts them

set -e

echo "🧹 Cleaning and restarting all services..."

# Stop all services
echo "🛑 Stopping all services..."
docker-compose -f docker-compose.prod.yml down

# Clean up containers and volumes
echo "🧹 Cleaning up containers and volumes..."
docker system prune -f
docker volume prune -f

# Remove MySQL data directory to start fresh
echo "🗑️ Removing MySQL data directory..."
sudo rm -rf mysql/data/*

# Create MySQL data directory
echo "📁 Creating MySQL data directory..."
sudo mkdir -p mysql/data
sudo chown -R 999:999 mysql/data

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Clean restart completed!"
echo "🔍 Run './scripts/monitor.sh' to check service health"