#!/bin/bash

echo "🚀 Starting Absensi Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start all services in development mode
echo "📦 Building and starting development services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ Development services are running!"
echo ""
echo "🌐 Access your applications:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:8000/api/v2/auth/health/"
echo "   Django Admin: http://localhost:8000/admin/"
echo "   phpMyAdmin:   http://localhost:8080"
echo ""
echo "📊 Database credentials:"
echo "   Host:         localhost"
echo "   Port:         3307 (host) -> 3306 (container)"
echo "   Database:     absensi_db"
echo "   Username:     absensi_user"
echo "   Password:     absensi_password"
echo "   Root Password: rootpassword"
echo ""
echo "🔧 Development Features:"
echo "   ✅ Hot reload enabled for both frontend and backend"
echo "   ✅ Volume mounting for live code changes"
echo "   ✅ Development environment variables"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:    docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.dev.yml down"
echo "   Restart:      docker-compose -f docker-compose.dev.yml restart"
echo "   Rebuild:      docker-compose -f docker-compose.dev.yml up --build -d"

# Run DB migration scripts inside MySQL container
echo "\n🗄️ Running database migration (add role + attendance)..."
# Use root credentials defined in compose for reliability
docker-compose -f docker-compose.dev.yml exec -T mysql sh -lc "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" absensi_db < /docker-entrypoint-initdb.d/01-init.sql" || true
docker-compose -f docker-compose.dev.yml exec -T mysql sh -lc "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" absensi_db < /migrations/01-add-role-and-attendance.sql" || true
echo "✅ Migration completed."
