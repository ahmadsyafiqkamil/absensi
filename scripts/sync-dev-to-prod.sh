#!/bin/bash

# Sync Development Changes to Production Server
# Usage: ./scripts/sync-dev-to-prod.sh [server_ip]
# Example: ./scripts/sync-dev-to-prod.sh 192.168.1.100

set -e

SERVER_IP=${1:-"your-server-ip"}
SSH_USER=${2:-"root"}

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

# Function to check if development has changes
check_dev_changes() {
    log_info "Checking for development changes..."

    # Check if there are uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "You have uncommitted changes in development:"
        git status --short
        echo ""
        read -p "Do you want to commit these changes first? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add .
            echo "Enter commit message:"
            read commit_msg
            git commit -m "$commit_msg"
        fi
    fi

    # Check if there are commits to push
    AHEAD=$(git rev-list --count origin/base-multi-role..HEAD 2>/dev/null || echo "0")
    if [ "$AHEAD" -eq 0 ]; then
        log_info "No new commits to sync"
        exit 0
    fi

    log_info "Found $AHEAD commits to sync to production"
}

# Function to push changes to repository
push_to_repo() {
    log_info "Pushing changes to GitHub repository..."

    git push origin base-multi-role

    if [ $? -eq 0 ]; then
        log_success "Changes pushed to repository"
    else
        log_error "Failed to push changes to repository"
        exit 1
    fi
}

# Function to deploy to production server
deploy_to_prod() {
    log_info "Deploying to production server: $SERVER_IP"

    # Check SSH connection
    if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "${SSH_USER}@${SERVER_IP}" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        log_error "Cannot connect to server $SERVER_IP"
        echo "Please ensure:"
        echo "1. Server IP is correct"
        echo "2. SSH key is properly configured"
        echo "3. Server is running"
        exit 1
    fi

    # Deploy via SSH
    ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SERVER_IP}" "
        cd /opt/absensi

        echo 'Pulling latest changes from repository...'
        git pull origin base-multi-role

        echo 'Setting proper permissions...'
        chmod +x docker-prod.sh scripts/*.sh

        echo 'Creating backup before deployment...'
        ./scripts/backup.sh

        echo 'Deploying with Docker...'
        ./docker-prod.sh

        echo 'Waiting for services to be ready...'
        sleep 30

        echo 'Running health checks...'
        if curl -f http://localhost:8000/health/ > /dev/null 2>&1 && curl -f http://localhost:3000 > /dev/null 2>&1; then
            echo '✅ Production deployment successful!'
        else
            echo '❌ Production deployment failed!'
            exit 1
        fi
    "

    if [ $? -eq 0 ]; then
        log_success "Production deployment completed successfully!"
    else
        log_error "Production deployment failed!"
        exit 1
    fi
}

# Main execution
main() {
    echo "🔄 Sync Development to Production"
    echo "Server: $SERVER_IP"
    echo ""

    if [ "$SERVER_IP" = "your-server-ip" ]; then
        log_error "Please provide your production server IP"
        echo "Usage: $0 <server-ip> [ssh-user]"
        echo "Example: $0 192.168.1.100"
        exit 1
    fi

    check_dev_changes
    push_to_repo
    deploy_to_prod

    echo ""
    log_success "🎉 Sync completed! Your development changes are now live in production!"
    echo ""
    echo "📊 Deployment Summary:"
    echo "   ✅ Code pushed to GitHub"
    echo "   ✅ Production server updated"
    echo "   ✅ Services restarted"
    echo "   ✅ Health checks passed"
    echo "   ✅ Database backup created"
}

# Run main function
main
