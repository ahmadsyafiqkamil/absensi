#!/bin/bash

# Clean and Restart All Services
# This script stops all services, cleans up, and restarts them

set -e

echo "🧹 Cleaning and restarting all services..."

# Stop all services
echo "🛑 Stopping all services..."
docker-compose -f docker-compose.prod.yml down

# Remove all containers and volumes
echo "🗑️ Removing all containers and volumes..."
docker-compose -f docker-compose.prod.yml down -v --remove-orphans

# Clean up Docker system
echo "🧽 Cleaning up Docker system..."
docker system prune -f

# Remove MySQL data directory to start fresh
echo "🗑️ Removing MySQL data directory..."
sudo rm -rf mysql/data/*

# Start services again
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Clean restart completed!"
echo "📊 Run './scripts/monitor.sh' to check service health"
