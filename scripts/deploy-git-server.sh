#!/bin/bash

# Git-based Server Deployment Script
# Run this on your production server to enable automatic deployment

set -e

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

# Setup Git repository on server
setup_git_repo() {
    log_info "Setting up Git repository..."

    # Initialize or update git repo
    if [ ! -d ".git" ]; then
        git init
        git remote add origin https://github.com/ahmadsyafiqkamil/absensi.git
    fi

    # Configure Git
    git config user.name "Production Server"
    git config user.email "server@production.local"

    # Pull latest changes
    git fetch origin
    git checkout -b production origin/base-multi-role
    git pull origin base-multi-role

    log_success "Git repository configured"
}

# Setup deployment hook
setup_deployment_hook() {
    log_info "Setting up deployment hook..."

    # Create deployment script
    cat > /usr/local/bin/deploy-absensi << 'EOF'
#!/bin/bash
LOG_FILE="/opt/absensi/logs/deploy.log"
DEPLOY_DIR="/opt/absensi"

echo "$(date): Starting deployment..." >> "$LOG_FILE"

cd "$DEPLOY_DIR"

# Pull latest changes
git pull origin base-multi-role >> "$LOG_FILE" 2>&1

# Set permissions
chmod +x docker-prod.sh scripts/*.sh >> "$LOG_FILE" 2>&1

# Backup current deployment
./scripts/backup.sh >> "$LOG_FILE" 2>&1

# Deploy
./docker-prod.sh >> "$LOG_FILE" 2>&1

# Health check
sleep 30
if curl -f http://localhost:8000/health/ >> "$LOG_FILE" 2>&1 && \
   curl -f http://localhost:3000 >> "$LOG_FILE" 2>&1; then
    echo "$(date): Deployment successful!" >> "$LOG_FILE"
    exit 0
else
    echo "$(date): Deployment failed - health checks failed!" >> "$LOG_FILE"
    exit 1
fi
EOF

    chmod +x /usr/local/bin/deploy-absensi

    log_success "Deployment hook created"
}

# Setup cron job for regular deployment
setup_cron_job() {
    log_info "Setting up cron job for regular deployment..."

    # Add cron job to check for updates every 5 minutes
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/deploy-absensi") | crontab -

    log_success "Cron job configured (runs every 5 minutes)"
}

# Setup webhook endpoint (alternative to cron)
setup_webhook() {
    log_info "Setting up webhook endpoint..."

    # Install webhook if not available
    if ! command -v webhook &> /dev/null; then
        log_warning "Webhook not installed. Install with: sudo apt install webhook"
        return 1
    fi

    # Create webhook configuration
    cat > /etc/webhook.conf << EOF
[
  {
    "id": "deploy-absensi",
    "execute-command": "/usr/local/bin/deploy-absensi",
    "command-working-directory": "/opt/absensi",
    "trigger-rule": {
      "match": {
        "type": "payload-hash-sha256",
        "secret": "your-webhook-secret",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
EOF

    # Enable and start webhook service
    sudo systemctl enable webhook
    sudo systemctl start webhook

    log_success "Webhook configured on port 9000"
}

# Main setup
main() {
    echo "🚀 Git-based Production Deployment Setup"
    echo ""

    setup_git_repo
    setup_deployment_hook

    echo ""
    echo "Choose deployment method:"
    echo "1. Cron job (automatic every 5 minutes)"
    echo "2. Webhook (real-time deployment)"
    echo "3. Manual (run deployment manually)"
    echo ""
    read -p "Enter your choice (1-3): " choice

    case $choice in
        1)
            setup_cron_job
            ;;
        2)
            setup_webhook
            ;;
        3)
            log_info "Manual deployment - run: /usr/local/bin/deploy-absensi"
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    echo ""
    log_success "Setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test deployment: /usr/local/bin/deploy-absensi"
    echo "2. Check logs: tail -f /opt/absensi/logs/deploy.log"
    echo "3. Monitor services: docker-compose -f docker-compose.prod.yml ps"
}

# Run main function
main
