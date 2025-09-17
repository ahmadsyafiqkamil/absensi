#!/bin/bash

# Setup script untuk Debian tanpa sudo
# Jalankan script ini sebagai root di server production

set -e

echo "🚀 Setup Absensi KJRI Dubai untuk Debian tanpa sudo"
echo "==================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root."
    echo ""
    echo "📋 To run this script:"
    echo "1. Switch to root: su -"
    echo "2. Run this script: curl -fsSL https://raw.githubusercontent.com/ahmadsyafiqkamil/absensi/main/scripts/setup-debian-no-sudo.sh | bash"
    echo "3. After setup, switch back to regular user: exit"
    echo ""
    echo "⚠️  Or install sudo first:"
    echo "   su -"
    echo "   apt update && apt install -y sudo"
    echo "   usermod -aG sudo kava"
    echo "   exit"
    echo "   Then run the regular setup script"
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
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget git rsync ca-certificates gnupg lsb-release sudo

# Try to install software-properties-common (not available in all Debian versions)
echo "📦 Installing additional packages..."
apt install -y software-properties-common 2>/dev/null || echo "⚠️  software-properties-common not available, skipping..."

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose (standalone)
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# Start and enable Docker
echo "🔧 Starting Docker service..."
systemctl start docker
systemctl enable docker

# Create application directory
echo "📁 Creating application directory..."
APP_DIR="/home/kava/absensi"
mkdir -p $APP_DIR
chown -R kava:kava $APP_DIR

# Create necessary subdirectories
mkdir -p $APP_DIR/logs/{backend,frontend,caddy}
mkdir -p $APP_DIR/backups
mkdir -p $APP_DIR/mysql/conf.d
chown -R kava:kava $APP_DIR

# Setup SSH key for GitHub Actions
echo "🔑 Setting up SSH key for GitHub Actions..."
if [ ! -f /home/kava/.ssh/github_actions_key ]; then
    sudo -u kava ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f /home/kava/.ssh/github_actions_key -N ""
    echo "✅ SSH key generated"
else
    echo "✅ SSH key already exists"
fi

# Add public key to authorized_keys
cat /home/kava/.ssh/github_actions_key.pub >> /home/kava/.ssh/authorized_keys
chmod 600 /home/kava/.ssh/github_actions_key
chmod 644 /home/kava/.ssh/authorized_keys
chown -R kava:kava /home/kava/.ssh

# Configure SSH
echo "🔧 Configuring SSH..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart ssh

# Setup UFW firewall
echo "🔥 Configuring UFW firewall..."
if command -v ufw &> /dev/null; then
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw --force enable
    echo "✅ UFW firewall configured"
else
    echo "⚠️  UFW not available, installing..."
    apt install -y ufw
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw --force enable
    echo "✅ UFW firewall installed and configured"
fi

# Clone repository
echo "📥 Cloning repository..."
if [ ! -d "$APP_DIR/.git" ]; then
    sudo -u kava git clone https://github.com/ahmadsyafiqkamil/absensi.git $APP_DIR
    cd $APP_DIR
else
    cd $APP_DIR
    sudo -u kava git pull origin main
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
chown -R kava:kava /opt/absensi

# Add user to docker group
echo "👤 Adding user to docker group..."
usermod -aG docker kava

# Install sudo for kava user
echo "🔧 Installing sudo for kava user..."
usermod -aG sudo kava

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Switch back to kava user:"
echo "   exit"
echo "   cd /opt/absensi"
echo ""
echo "2. Update production.env with your actual values:"
echo "   nano production.env"
echo ""
echo "3. Copy the SSH private key below to GitHub Secrets:"
echo "   Repository → Settings → Secrets and variables → Actions"
echo ""
echo "🔑 SSH Private Key for GitHub Actions:"
echo "======================================"
cat /home/kava/.ssh/github_actions_key
echo ""
echo "======================================"
echo ""
echo "📋 Required GitHub Secrets:"
echo "- SERVER_IP: $(hostname -I | awk '{print $1}')"
echo "- SERVER_USER: kava"
echo "- SERVER_SSH_PRIVATE_KEY: (copy from above)"
echo "- FRONTEND_DOMAIN: yourdomain.com"
echo "- API_DOMAIN: api.yourdomain.com"
echo ""
echo "🚀 After setting up GitHub Secrets, you can deploy by:"
echo "1. Push to main branch: git push origin main"
echo "2. Or run workflow manually in GitHub Actions"
echo ""
echo "🔧 Useful commands (run as kava user):"
echo "   Check status:    cd /opt/absensi && ./scripts/monitor.sh all"
echo "   View logs:       cd /opt/absensi && docker-compose logs -f"
echo "   Manual deploy:   cd /opt/absensi && ./docker-prod.sh"
echo ""
echo "⚠️  Important:"
echo "   - Logout and login again to apply docker group changes"
echo "   - Or run: newgrp docker"
echo "   - Test Docker: docker run hello-world"
