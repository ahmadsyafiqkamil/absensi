#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting Absensi Production Environment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate a secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to generate Django secret key
generate_secret_key() {
    python3 -c "import secrets; print(secrets.token_urlsafe(50))"
}

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command_exists docker-compose && ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Check if production.env file exists
if [ ! -f production.env ]; then
    echo "❌ production.env file not found."
    echo "Creating production.env with secure defaults..."

    # Generate secure passwords
    MYSQL_ROOT_PASSWORD=$(generate_password)
    MYSQL_PASSWORD=$(generate_password)
    SECRET_KEY=$(generate_secret_key)
    PASSWORD_SALT=$(generate_password)

    cat > production.env << EOF
# Database Configuration
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_USER=absensi_user
MYSQL_PASSWORD=${MYSQL_PASSWORD}

# Django Backend Configuration
SECRET_KEY=${SECRET_KEY}
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com,api.yourdomain.com,backend
PASSWORD_SALT=${PASSWORD_SALT}
BACKEND_CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com

# Domain Configuration for Caddy
FRONTEND_DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com

# Production Settings
DJANGO_DEBUG=0
NODE_ENV=production
EOF

    echo "✅ production.env created with secure credentials"
    echo "⚠️  IMPORTANT: Please update the domain settings in production.env"
    echo "   - FRONTEND_DOMAIN"
    echo "   - API_DOMAIN"
    echo "   - NEXT_PUBLIC_API_URL"
    echo "   - NEXT_PUBLIC_BACKEND_URL"
    echo "   - BACKEND_CORS_ORIGINS"
    echo "   - DJANGO_ALLOWED_HOSTS"
else
    echo "✅ production.env file found"
fi

# Validate environment variables
echo "🔍 Validating environment variables..."
source production.env

if [[ "$MYSQL_ROOT_PASSWORD" == "CHANGE_THIS_STRONG_ROOT_PASSWORD_IN_PRODUCTION" ]]; then
    echo "❌ Please change MYSQL_ROOT_PASSWORD in production.env"
    exit 1
fi

if [[ "$SECRET_KEY" == "CHANGE_THIS_DJANGO_SECRET_KEY_IN_PRODUCTION_USE_AT_LEAST_50_CHARACTERS" ]]; then
    echo "❌ Please change SECRET_KEY in production.env"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs/backend logs/frontend logs/caddy backups mysql/conf.d

# Build and start all services in production mode
echo "📦 Building and starting production services..."
docker-compose --env-file production.env -f docker-compose.prod.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 60

# Check database health
echo "🔍 Checking database health..."
if docker-compose --env-file production.env -f docker-compose.prod.yml exec -T mysql mysqladmin ping -h localhost --silent; then
    echo "✅ Database is healthy"
else
    echo "❌ Database health check failed"
    exit 1
fi

# Check backend health
echo "🔍 Checking backend health..."
max_attempts=10
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    else
        echo "⏳ Waiting for backend... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend health
echo "🔍 Checking frontend health..."
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is healthy"
        break
    else
        echo "⏳ Waiting for frontend... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Frontend health check failed"
    exit 1
fi

# Check if services are running
echo "🔍 Checking service status..."
docker-compose --env-file production.env -f docker-compose.prod.yml ps

echo ""
echo "✅ Production services are running successfully!"
echo ""
echo "🌐 Access your applications:"
echo "   Frontend:     https://${FRONTEND_DOMAIN}"
echo "   Backend API:  https://${API_DOMAIN}"
echo "   API Docs:     https://${API_DOMAIN}/docs"
echo ""
echo "🔧 Production Features:"
echo "   ✅ Optimized builds for production"
echo "   ✅ Environment variables from production.env"
echo "   ✅ Non-root user for security"
echo "   ✅ Proper logging setup"
echo "   ✅ Health checks configured"
echo "   ✅ SSL/TLS with Let's Encrypt"
echo "   ✅ Security headers"
echo "   ✅ Rate limiting"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:           docker-compose --env-file production.env -f docker-compose.prod.yml logs -f"
echo "   View specific logs:  docker-compose --env-file production.env -f docker-compose.prod.yml logs -f backend"
echo "   Stop services:       docker-compose --env-file production.env -f docker-compose.prod.yml down"
echo "   Restart services:    docker-compose --env-file production.env -f docker-compose.prod.yml restart"
echo "   Rebuild:             docker-compose --env-file production.env -f docker-compose.prod.yml up --build -d"
echo "   Backup database:     docker-compose --env-file production.env -f docker-compose.prod.yml --profile backup up -d"
echo ""
echo "🔧 Monitoring:"
echo "   Health checks:       curl https://${API_DOMAIN}/health/"
echo "   Logs location:       ./logs/"
echo "   Backup location:     ./backups/"
echo ""
echo "⚠️  Security Notes:"
echo "   - All services are secured with SSL/TLS"
echo "   - Database is not exposed publicly"
echo "   - Security headers are configured"
echo "   - Rate limiting is enabled"
echo "   - Regular database backups (optional)"
echo ""
echo "🚨 IMPORTANT:"
echo "   Make sure to:"
echo "   1. Update domain settings in production.env"
echo "   2. Point your domains to this server's IP"
echo "   3. Configure firewall rules if needed"
echo "   4. Set up monitoring and alerts"
echo "   5. Configure log rotation"
