#!/bin/bash

echo "🚀 Starting Absensi Production Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create .env file from env.production.example"
    echo "cp env.production.example .env"
    exit 1
fi

# Build and start all services in production mode
echo "📦 Building and starting production services..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Production services are running!"
echo ""
echo "🌐 Access your applications:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000"
echo "   API Docs:     http://localhost:8000/docs"
echo ""
echo "🔧 Production Features:"
echo "   ✅ Optimized builds for production"
echo "   ✅ Environment variables from .env file"
echo "   ✅ Non-root user for security"
echo "   ✅ Proper logging setup"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   Restart:      docker-compose -f docker-compose.prod.yml restart"
echo "   Rebuild:      docker-compose -f docker-compose.prod.yml up --build -d"
echo ""
echo "⚠️  Security Notes:"
echo "   - Change all default passwords"
echo "   - Use strong SECRET_KEY"
echo "   - Configure proper CORS origins"
echo "   - Enable SSL/TLS in production"
