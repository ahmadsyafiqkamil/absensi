#!/bin/bash

# Git-based Production Deployment Script
# Usage: ./scripts/deploy-git.sh [environment]
# Environment: staging, prod

set -e

ENVIRONMENT=${1:-prod}
GIT_REPO=${GIT_REPO:-"https://github.com/your-repo/absensi-kjri-dubai.git"}
BRANCH=${BRANCH:-"main"}

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

# Function to setup server for Git deployment
setup_git_server() {
    log_info "Setting up Git deployment on server..."

    # This would be run on the server
    cat << 'EOF'
# Run these commands on your production server:

# Install Git if not installed
sudo apt update
sudo apt install -y git curl wget

# Create deployment directory
sudo mkdir -p /opt/absensi
sudo chown $USER:$USER /opt/absensi
cd /opt/absensi

# Clone repository
git clone https://github.com/your-repo/absensi-kjri-dubai.git .
git checkout main

# Setup production environment
cp production.env.example production.env
nano production.env  # Configure your production settings

# Make scripts executable
chmod +x docker-prod.sh scripts/*.sh

# Initial deployment
./docker-prod.sh

# Setup auto-deployment (optional)
echo "Setting up auto-deployment..."
mkdir -p ~/.ssh
# Add your laptop's public key to ~/.ssh/authorized_keys

EOF
}

# Function to deploy via Git
deploy_via_git() {
    log_info "Starting Git-based deployment to $ENVIRONMENT..."

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a Git repository"
        exit 1
    fi

    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "You have uncommitted changes. Please commit or stash them first."
        echo "Run: git status"
        echo "Then: git add . && git commit -m 'Deployment commit'"
        exit 1
    fi

    # Push changes to repository
    log_info "Pushing changes to repository..."
    git push origin $BRANCH

    # Show deployment commands for server
    echo ""
    log_success "✅ Code pushed to repository"
    echo ""
    echo "🔧 Now run these commands on your server:"
    echo ""
    echo "cd /opt/absensi"
    echo "git pull origin $BRANCH"
    echo ""
    echo "# If there are new dependencies or major changes:"
    echo "./docker-prod.sh"
    echo ""
    echo "# For minor updates (code only):"
    echo "docker-compose -f docker-compose.prod.yml up --build -d backend frontend"
    echo ""
    echo "# Check services:"
    echo "docker-compose -f docker-compose.prod.yml ps"
    echo "docker-compose -f docker-compose.prod.yml logs -f"
}

# Function to setup webhook for automatic deployment
setup_webhook() {
    log_info "Setting up GitHub webhook for automatic deployment..."

    cat << 'EOF'
# GitHub Webhook Setup for Automatic Deployment

## On your server:

# Install webhook dependencies
sudo apt install -y webhook

# Create webhook script
sudo mkdir -p /opt/webhooks
sudo tee /opt/webhooks/deploy.sh > /dev/null <<'WEBHOOK_EOF'
#!/bin/bash
cd /opt/absensi
git pull origin main
./docker-prod.sh
WEBHOOK_EOF

sudo chmod +x /opt/webhooks/deploy.sh

# Create webhook configuration
sudo tee /etc/webhook.conf > /dev/null <<'CONF_EOF'
[
  {
    "id": "deploy",
    "execute-command": "/opt/webhooks/deploy.sh",
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
CONF_EOF

# Start webhook service
sudo systemctl enable webhook
sudo systemctl start webhook

## On GitHub:

1. Go to your repository Settings > Webhooks
2. Click "Add webhook"
3. Payload URL: http://your-server-ip:9000/hooks/deploy
4. Content type: application/json
5. Secret: your-webhook-secret
6. Events: Just the push event
7. Click "Add webhook"

EOF
}

# Function to show deployment status
show_status() {
    log_info "Checking deployment status..."

    echo ""
    echo "=== Git Repository Status ==="
    echo "Current branch: $(git branch --show-current)"
    echo "Latest commit: $(git log -1 --oneline)"
    echo "Uncommitted changes: $(git status --porcelain | wc -l)"

    echo ""
    echo "=== Remote Status ==="
    git status -b --ahead-behind

    echo ""
    echo "=== Recent Commits ==="
    git log --oneline -5
}

# Main menu
show_menu() {
    echo "🚀 Git-based Production Deployment"
    echo ""
    echo "Choose an option:"
    echo "1. Deploy via Git (manual)"
    echo "2. Setup server for Git deployment"
    echo "3. Setup automatic deployment webhook"
    echo "4. Show deployment status"
    echo "5. Help"
    echo ""
    read -p "Enter your choice (1-5): " choice

    case $choice in
        1)
            deploy_via_git
            ;;
        2)
            setup_git_server
            ;;
        3)
            setup_webhook
            ;;
        4)
            show_status
            ;;
        5)
            show_help
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
}

show_help() {
    echo "Git-based Production Deployment Script"
    echo ""
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environments:"
    echo "  staging    Deploy to staging environment"
    echo "  prod       Deploy to production environment (default)"
    echo ""
    echo "Commands:"
    echo "  $0 prod          Deploy to production"
    echo "  $0 staging       Deploy to staging"
    echo "  $0                Show interactive menu"
    echo ""
    echo "Prerequisites:"
    echo "1. Git repository with remote origin"
    echo "2. SSH access to production server"
    echo "3. Docker and Docker Compose on server"
    echo "4. Production environment configured"
    echo ""
    echo "Workflow:"
    echo "1. Make changes locally"
    echo "2. Commit changes: git add . && git commit -m 'message'"
    echo "3. Run: ./scripts/deploy-git.sh prod"
    echo "4. Follow on-screen instructions for server deployment"
}

# Main execution
if [ $# -eq 0 ]; then
    show_menu
else
    case $ENVIRONMENT in
        staging|prod)
            deploy_via_git
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            echo "Use 'staging' or 'prod'"
            exit 1
            ;;
    esac
fi
