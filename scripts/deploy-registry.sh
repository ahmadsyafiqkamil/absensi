#!/bin/bash

# Docker Registry-based Production Deployment
# Usage: ./scripts/deploy-registry.sh [registry] [tag]
# Example: ./scripts/deploy-registry.sh your-registry.com absensi:v1.0.0

set -e

REGISTRY=${1:-"your-registry.com"}
TAG=${2:-"absensi:$(date +%Y%m%d_%H%M%S)"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to build and push images
build_and_push() {
    log_info "Building and pushing Docker images..."

    # Build backend image
    log_info "Building backend image..."
    docker build -t ${REGISTRY}/absensi-backend:${TAG} ./drf

    # Build frontend image
    log_info "Building frontend image..."
    docker build -t ${REGISTRY}/absensi-frontend:${TAG} ./frontend

    # Push images
    log_info "Pushing images to registry..."
    docker push ${REGISTRY}/absensi-backend:${TAG}
    docker push ${REGISTRY}/absensi-frontend:${TAG}

    log_success "Images built and pushed successfully"
}

# Function to generate deployment files
generate_deployment_files() {
    log_info "Generating deployment files for server..."

    DEPLOY_DIR="registry-deploy-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$DEPLOY_DIR"

    # Create docker-compose.prod.yml with registry images
    cat > "$DEPLOY_DIR/docker-compose.prod.yml" << EOF
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: absensi_mysql_prod
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: absensi_db
      MYSQL_USER: \${MYSQL_USER}
      MYSQL_PASSWORD: \${MYSQL_PASSWORD}
      MYSQL_CHARSET: utf8mb4
      MYSQL_COLLATION: utf8mb4_unicode_ci
    volumes:
      - mysql_data_prod:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d
      - ./mysql/conf.d:/etc/mysql/conf.d:ro
    networks:
      - absensi_network_prod
    command:
      - --default-authentication-plugin=mysql_native_password
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --innodb-buffer-pool-size=1G
      - --max-connections=200
      - --query-cache-size=256M
      - --query-cache-type=1
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p\${MYSQL_ROOT_PASSWORD}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  backend:
    image: ${REGISTRY}/absensi-backend:${TAG}
    container_name: absensi_backend_prod
    restart: unless-stopped
    environment:
      - DJANGO_DEBUG=0
      - DJANGO_SECRET_KEY=\${SECRET_KEY}
      - DJANGO_ALLOWED_HOSTS=\${DJANGO_ALLOWED_HOSTS}
      - MYSQL_HOST=mysql
      - MYSQL_PORT=3306
      - MYSQL_DATABASE=absensi_db
      - MYSQL_USER=\${MYSQL_USER}
      - MYSQL_PASSWORD=\${MYSQL_PASSWORD}
      - CORS_ALLOWED_ORIGINS=\${BACKEND_CORS_ORIGINS}
      - DJANGO_SETTINGS_MODULE=core.settings
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - absensi_network_prod
    volumes:
      - ./logs/backend:/app/logs
      - ./drf/app/media:/app/media
      - ./drf/app/staticfiles:/app/staticfiles
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: ${REGISTRY}/absensi-frontend:${TAG}
    container_name: absensi_frontend_prod
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_BACKEND_URL=\${NEXT_PUBLIC_BACKEND_URL}
      - NODE_ENV=production
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - absensi_network_prod
    volumes:
      - ./logs/frontend:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  caddy:
    image: caddy:2
    container_name: absensi_caddy_prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - FRONTEND_DOMAIN=\${FRONTEND_DOMAIN}
      - API_DOMAIN=\${API_DOMAIN}
    volumes:
      - ./Caddyfile.prod:/etc/caddy/Caddyfile:ro
      - caddy_data_prod:/data
      - caddy_config_prod:/config
      - ./logs/caddy:/var/log/caddy
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    networks:
      - absensi_network_prod
    healthcheck:
      test: ["CMD", "caddy", "version"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  mysql_data_prod:
    driver: local
  caddy_data_prod:
    driver: local
  caddy_config_prod:
    driver: local

networks:
  absensi_network_prod:
    driver: bridge
EOF

    # Copy other necessary files
    cp Caddyfile.prod "$DEPLOY_DIR/" 2>/dev/null || echo "# Caddyfile.prod not found, will be generated on server"
    cp production.env "$DEPLOY_DIR/" 2>/dev/null || echo "# production.env not found, needs to be configured on server"

    # Create deployment script for server
    cat > "$DEPLOY_DIR/deploy.sh" << EOF
#!/bin/bash
# Server deployment script for registry-based deployment

set -e

echo "🚀 Deploying from Docker Registry..."

# Create necessary directories
mkdir -p logs/backend logs/frontend logs/caddy backups mysql/conf.d

# Login to registry (if needed)
# echo "Logging into registry..."
# docker login $REGISTRY

# Pull latest images
echo "Pulling latest images..."
docker pull ${REGISTRY}/absensi-backend:${TAG}
docker pull ${REGISTRY}/absensi-frontend:${TAG}

# Stop current services
echo "Stopping current services..."
docker-compose -f docker-compose.prod.yml down || true

# Start new services
echo "Starting new services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
echo "Waiting for services to be ready..."
sleep 60

# Health checks
echo "Running health checks..."
source production.env

if docker-compose -f docker-compose.prod.yml exec -T mysql mysqladmin ping -h localhost --silent; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Unhealthy"
    exit 1
fi

if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Unhealthy"
    exit 1
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Unhealthy"
    exit 1
fi

echo "✅ Deployment completed successfully!"
EOF

    chmod +x "$DEPLOY_DIR/deploy.sh"

    # Create archive
    log_info "Creating deployment package..."
    tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"
    rm -rf "$DEPLOY_DIR"

    log_success "Deployment package created: ${DEPLOY_DIR}.tar.gz"
    echo ""
    echo "📦 Upload this file to your server and run:"
    echo "   tar -xzf ${DEPLOY_DIR}.tar.gz"
    echo "   cd $DEPLOY_DIR"
    echo "   ./deploy.sh"
}

# Function to show registry setup instructions
show_registry_setup() {
    echo "🐳 Docker Registry Setup Instructions"
    echo ""
    echo "1. Docker Hub (Free):"
    echo "   - Registry: docker.io"
    echo "   - Login: docker login"
    echo "   - Usage: ./scripts/deploy-registry.sh docker.io/yourusername absensi:v1.0"
    echo ""
    echo "2. AWS ECR:"
    echo "   - Setup AWS CLI and authenticate"
    echo "   - Get registry URL: aws ecr describe-repositories"
    echo "   - Usage: ./scripts/deploy-registry.sh your-account.dkr.ecr.region.amazonaws.com absensi:v1.0"
    echo ""
    echo "3. Google Container Registry (GCR):"
    echo "   - Setup: gcloud auth configure-docker"
    echo "   - Registry: gcr.io/your-project"
    echo "   - Usage: ./scripts/deploy-registry.sh gcr.io/your-project absensi:v1.0"
    echo ""
    echo "4. Self-hosted Registry:"
    echo "   - Setup: docker run -d -p 5000:5000 --name registry registry:2"
    echo "   - Registry: your-server:5000"
    echo "   - Usage: ./scripts/deploy-registry.sh your-server:5000 absensi:v1.0"
    echo ""
    echo "5. GitHub Container Registry:"
    echo "   - Login: echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
    echo "   - Registry: ghcr.io/yourusername"
    echo "   - Usage: ./scripts/deploy-registry.sh ghcr.io/yourusername absensi:v1.0"
}

# Main execution
main() {
    echo "🐳 Docker Registry-based Production Deployment"
    echo "Registry: $REGISTRY"
    echo "Tag: $TAG"
    echo ""

    case ${1:-build} in
        build)
            build_and_push
            generate_deployment_files
            ;;
        setup)
            show_registry_setup
            ;;
        *)
            echo "Usage: $0 [command] [registry] [tag]"
            echo ""
            echo "Commands:"
            echo "  build     Build and push images, generate deployment files"
            echo "  setup     Show registry setup instructions"
            echo ""
            echo "Examples:"
            echo "  $0 build docker.io/yourusername absensi:v1.0"
            echo "  $0 build your-registry.com absensi:latest"
            echo "  $0 setup"
            exit 1
            ;;
    esac
}

main "$@"
