#!/bin/bash

# Remote Production Deployment Script
# Usage: ./scripts/deploy-remote.sh [server_ip] [ssh_key_path]
# Example: ./scripts/deploy-remote.sh 192.168.1.100 ~/.ssh/production_key

set -e

SERVER_IP=${1:-"your-server-ip"}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
SSH_USER=${3:-"root"}

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

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if SSH key exists
    if [ ! -f "${SSH_KEY/#~/$HOME}" ]; then
        log_error "SSH key not found: ${SSH_KEY}"
        echo "Please ensure your SSH key exists or update the path"
        exit 1
    fi

    # Test SSH connection
    log_info "Testing SSH connection to $SERVER_IP..."
    if ! ssh -i "${SSH_KEY/#~/$HOME}" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "${SSH_USER}@${SERVER_IP}" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        log_error "Cannot connect to server $SERVER_IP"
        echo "Please check:"
        echo "1. Server IP is correct"
        echo "2. SSH key is properly configured on server"
        echo "3. Firewall allows SSH connections"
        exit 1
    fi

    # Check if Docker is installed on server
    if ! ssh -i "${SSH_KEY/#~/$HOME}" "${SSH_USER}@${SERVER_IP}" "docker --version" > /dev/null 2>&1; then
        log_error "Docker is not installed on server"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Function to backup current deployment
backup_remote() {
    log_info "Creating remote backup..."

    ssh -i "${SSH_KEY/#~/$HOME}" "${SSH_USER}@${SERVER_IP}" "
        mkdir -p /opt/absensi/backups
        cd /opt/absensi

        # Stop current services
        docker-compose -f docker-compose.prod.yml down || true

        # Create backup with timestamp
        TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
        mkdir -p backups/deployment_\${TIMESTAMP}

        # Backup current files
        cp -r * backups/deployment_\${TIMESTAMP}/ 2>/dev/null || true

        # Backup database
        if [ -f production.env ]; then
            source production.env
            docker run --rm \
                --network absensi_absensi_network_prod \
                -e MYSQL_HOST=mysql \
                -e MYSQL_USER=\$MYSQL_USER \
                -e MYSQL_PASSWORD=\$MYSQL_PASSWORD \
                -e MYSQL_DATABASE=absensi_db \
                -v \$(pwd)/backups:/backups \
                mysql:8.0 \
                mysqldump absensi_db > backups/db_backup_\${TIMESTAMP}.sql 2>/dev/null || true
        fi

        echo \"Backup created: deployment_\${TIMESTAMP}\"
    "

    log_success "Remote backup completed"
}

# Function to deploy to remote server
deploy_remote() {
    log_info "Starting remote deployment..."

    # Create deployment package
    log_info "Creating deployment package..."
    DEPLOY_DIR="deploy_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$DEPLOY_DIR"

    # Copy necessary files
    cp -r docker-compose.prod.yml "$DEPLOY_DIR/"
    cp -r Caddyfile.prod "$DEPLOY_DIR/"
    cp -r scripts "$DEPLOY_DIR/"
    cp -r drf/app "$DEPLOY_DIR/drf_app/"
    cp -r frontend "$DEPLOY_DIR/"
    cp -r mysql/conf.d "$DEPLOY_DIR/mysql_conf/"
    cp README_PRODUCTION.md "$DEPLOY_DIR/"

    # Create tar archive
    log_info "Compressing deployment package..."
    tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"
    rm -rf "$DEPLOY_DIR"

    # Upload to server
    log_info "Uploading to server..."
    scp -i "${SSH_KEY/#~/$HOME}" "${DEPLOY_DIR}.tar.gz" "${SSH_USER}@${SERVER_IP}:/tmp/"

    # Deploy on server
    log_info "Deploying on server..."
    ssh -i "${SSH_KEY/#~/$HOME}" "${SSH_USER}@${SERVER_IP}" "
        cd /opt

        # Backup current deployment
        if [ -d absensi ]; then
            mv absensi absensi_backup_\$(date +%Y%m%d_%H%M%S) || true
        fi

        # Extract new deployment
        mkdir -p absensi
        cd absensi
        tar -xzf /tmp/${DEPLOY_DIR}.tar.gz
        mv $DEPLOY_DIR/* .
        rm -rf $DEPLOY_DIR

        # Set proper permissions
        chmod +x scripts/*.sh
        mkdir -p logs/backend logs/frontend logs/caddy backups

        echo 'Deployment files extracted successfully'
    "

    # Clean up local file
    rm "${DEPLOY_DIR}.tar.gz"

    log_success "Deployment package uploaded to server"
}

# Function to start services on remote server
start_remote_services() {
    log_info "Starting services on remote server..."

    ssh -i "${SSH_KEY/#~/$HOME}" "${SSH_USER}@${SERVER_IP}" "
        cd /opt/absensi

        # Check if production.env exists
        if [ ! -f production.env ]; then
            echo 'ERROR: production.env not found on server'
            echo 'Please ensure production.env is configured on the server'
            exit 1
        fi

        # Start services
        docker-compose -f docker-compose.prod.yml up --build -d

        # Wait for services to be ready
        echo 'Waiting for services to start...'
        sleep 60

        # Health checks
        source production.env

        # Check database
        if docker-compose -f docker-compose.prod.yml exec -T mysql mysqladmin ping -h localhost --silent; then
            echo '✅ Database: Healthy'
        else
            echo '❌ Database: Unhealthy'
            exit 1
        fi

        # Check backend
        if curl -f http://localhost:8000/health/ > /dev/null 2>&1; then
            echo '✅ Backend: Healthy'
        else
            echo '❌ Backend: Unhealthy'
            exit 1
        fi

        # Check frontend
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            echo '✅ Frontend: Healthy'
        else
            echo '❌ Frontend: Unhealthy'
            exit 1
        fi

        echo '✅ All services are healthy!'
    "

    log_success "Services started successfully on remote server"
}

# Function to run post-deployment checks
post_deployment_check() {
    log_info "Running post-deployment checks..."

    # Get server IP for checks
    SERVER_IP_NO_PORT=$(echo $SERVER_IP | cut -d: -f1)

    # Check if services are accessible
    ssh -i "${SSH_KEY/#~/$HOME}" "${SSH_USER}@${SERVER_IP}" "
        source /opt/absensi/production.env

        echo '=== Service Status ==='
        cd /opt/absensi
        docker-compose -f docker-compose.prod.yml ps

        echo ''
        echo '=== Resource Usage ==='
        docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}' \$(docker ps -q) 2>/dev/null || echo 'Unable to get stats'

        echo ''
        echo '=== Environment Info ==='
        echo \"Frontend Domain: \$FRONTEND_DOMAIN\"
        echo \"API Domain: \$API_DOMAIN\"
    "

    log_success "Post-deployment checks completed"
}

# Main execution
main() {
    echo "🚀 Remote Production Deployment"
    echo "Server: $SERVER_IP"
    echo "SSH Key: $SSH_KEY"
    echo "SSH User: $SSH_USER"
    echo ""

    check_prerequisites
    backup_remote
    deploy_remote
    start_remote_services
    post_deployment_check

    echo ""
    log_success "🎉 Remote deployment completed successfully!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: https://$SERVER_IP (if using IP) or your configured domain"
    echo "   API: https://$SERVER_IP/api (if using IP) or your configured domain/api"
    echo ""
    echo "🔧 Useful remote commands:"
    echo "   SSH to server: ssh -i $SSH_KEY ${SSH_USER}@$SERVER_IP"
    echo "   View logs: ssh -i $SSH_KEY ${SSH_USER}@$SERVER_IP 'cd /opt/absensi && docker-compose -f docker-compose.prod.yml logs -f'"
    echo "   Restart services: ssh -i $SSH_KEY ${SSH_USER}@$SERVER_IP 'cd /opt/absensi && docker-compose -f docker-compose.prod.yml restart'"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "Remote Production Deployment Script"
            echo ""
            echo "Usage: $0 [server_ip] [ssh_key_path] [ssh_user]"
            echo ""
            echo "Arguments:"
            echo "  server_ip      Server IP address or hostname"
            echo "  ssh_key_path   Path to SSH private key (default: ~/.ssh/id_rsa)"
            echo "  ssh_user       SSH username (default: root)"
            echo ""
            echo "Examples:"
            echo "  $0 192.168.1.100"
            echo "  $0 192.168.1.100 ~/.ssh/production_key ubuntu"
            echo "  $0 my-server.com ~/.ssh/id_rsa root"
            exit 0
            ;;
        *)
            if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "your-server-ip" ]; then
                SERVER_IP="$1"
            elif [ -z "$SSH_KEY_SET" ]; then
                SSH_KEY="$1"
                SSH_KEY_SET=1
            elif [ -z "$SSH_USER_SET" ]; then
                SSH_USER="$1"
                SSH_USER_SET=1
            fi
            shift
            ;;
    esac
done

if [ "$SERVER_IP" = "your-server-ip" ]; then
    log_error "Server IP is required"
    echo "Usage: $0 <server_ip> [ssh_key_path] [ssh_user]"
    exit 1
fi

main
