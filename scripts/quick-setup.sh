#!/bin/bash

# Quick setup script untuk deployment Absensi KJRI Dubai
# Jalankan script ini di server production

set -e

echo "🚀 Quick Setup untuk Absensi KJRI Dubai Deployment"
echo "=================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root. This is not recommended for security reasons."
    echo "   Please run as a regular user with sudo privileges."
    exit 1
fi

# Get server information
echo "📋 Server Information:"
echo "OS: $(lsb_release -d | cut -f2)"
echo "User: $(whoami)"
echo "IP: $(hostname -I | awk '{print $1}')"
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
sudo apt install -y curl wget git rsync ca-certificates gnupg lsb-release software-properties-common

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose (standalone)
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# Start and enable Docker
echo "🔧 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/absensi
sudo chown $USER:$USER /opt/absensi

# Create necessary subdirectories
mkdir -p /opt/absensi/logs/{backend,frontend,caddy}
mkdir -p /opt/absensi/backups
mkdir -p /opt/absensi/mysql/conf.d

# Setup SSH key for GitHub Actions
echo "🔑 Setting up SSH key for GitHub Actions..."
if [ ! -f ~/.ssh/github_actions_key ]; then
    ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_key -N ""
    echo "✅ SSH key generated"
else
    echo "✅ SSH key already exists"
fi

# Add public key to authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_actions_key
chmod 644 ~/.ssh/authorized_keys

# Configure SSH
echo "🔧 Configuring SSH..."
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Setup UFW firewall
echo "🔥 Configuring UFW firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Clone repository
echo "📥 Cloning repository..."
if [ ! -d "/opt/absensi/.git" ]; then
    git clone https://github.com/ahmadsyafiqkamil/absensi.git /opt/absensi
    cd /opt/absensi
else
    cd /opt/absensi
    git pull origin main
fi

# Create production.env
echo "📝 Creating production.env..."
if [ ! -f production.env ]; then
    cat > production.env << 'EOF'
# Database Configuration
MYSQL_ROOT_PASSWORD=CHANGE_THIS_STRONG_ROOT_PASSWORD_IN_PRODUCTION
MYSQL_USER=absensi_user
MYSQL_PASSWORD=CHANGE_THIS_STRONG_DB_PASSWORD_IN_PRODUCTION

# Django Backend Configuration
SECRET_KEY=CHANGE_THIS_DJANGO_SECRET_KEY_IN_PRODUCTION_USE_AT_LEAST_50_CHARACTERS
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com,api.yourdomain.com,backend
PASSWORD_SALT=CHANGE_THIS_PASSWORD_SALT_IN_PRODUCTION
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
    echo "✅ production.env created"
else
    echo "✅ production.env already exists"
fi

# Set permissions
chmod +x docker-prod.sh scripts/*.sh 2>/dev/null || true

echo ""
echo "🎉 Quick setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Update production.env with your actual values:"
echo "   nano /opt/absensi/production.env"
echo ""
echo "2. Copy the SSH private key below to GitHub Secrets:"
echo "   Repository → Settings → Secrets and variables → Actions"
echo ""
echo "🔑 SSH Private Key for GitHub Actions:"
echo "======================================"
cat ~/.ssh/github_actions_key
echo ""
echo "======================================"
echo ""
echo "📋 Required GitHub Secrets:"
echo "- SERVER_IP: $(hostname -I | awk '{print $1}')"
echo "- SERVER_USER: $(whoami)"
echo "- SERVER_SSH_PRIVATE_KEY: (copy from above)"
echo "- FRONTEND_DOMAIN: yourdomain.com"
echo "- API_DOMAIN: api.yourdomain.com"
echo ""
echo "🚀 After setting up GitHub Secrets, you can deploy by:"
echo "1. Push to main branch: git push origin main"
echo "2. Or run workflow manually in GitHub Actions"
echo ""
echo "🔧 Useful commands:"
echo "   Check status:    cd /opt/absensi && ./scripts/monitor.sh all"
echo "   View logs:       cd /opt/absensi && docker-compose logs -f"
echo "   Manual deploy:   cd /opt/absensi && ./docker-prod.sh"
echo ""
echo "⚠️  Important:"
echo "   - Logout and login again to apply docker group changes"
echo "   - Or run: newgrp docker"
echo "   - Test Docker: docker run hello-world"
