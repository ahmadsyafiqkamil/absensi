#!/bin/bash

echo "🚀 Starting Absensi Application with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start all services
echo "📦 Building and starting all services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ Services are running!"
echo ""
echo "🌐 Access your applications:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo "   phpMyAdmin:   http://localhost:8080"
echo ""
echo "📊 Database credentials:"
echo "   Host:         localhost"
echo "   Port:         3306"
echo "   Database:     absensi_db"
echo "   Username:     absensi_user"
echo "   Password:     absensi_password"
echo "   Root Password: rootpassword"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Rebuild:      docker-compose up --build -d"
