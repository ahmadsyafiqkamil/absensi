#!/bin/bash

# Restart Services (No sudo required)
# This script restarts all services without cleaning data

set -e

echo "🔄 Restarting all services..."

# Stop all services
echo "🛑 Stopping all services..."
docker-compose -f docker-compose.prod.yml down

# Wait a moment
echo "⏳ Waiting 5 seconds..."
sleep 5

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Services restarted!"
echo "🔍 Run './scripts/monitor.sh' to check service health"
