#!/bin/bash

# Setup script khusus untuk Debian server
# Jalankan script ini di server Debian sebelum deployment

set -e

echo "🐧 Setting up Debian server for Absensi KJRI Dubai deployment..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root. This is not recommended for security reasons."
    echo "   Please run as a regular user with sudo privileges."
    exit 1
fi

# Check if Debian
if ! command -v apt-get &> /dev/null; then
    echo "❌ This script is designed for Debian/Ubuntu systems."
    echo "   Please use the appropriate script for your OS."
    exit 1
fi

# Update system
echo "📦 Updating Debian system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install required packages
echo "📦 Installing required packages..."
sudo apt-get install -y curl wget git rsync ca-certificates gnupg lsb-release software-properties-common

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
    # Get latest version
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
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

# Create production.env template
echo "📝 Creating production.env template..."
cat > /opt/absensi/production.env << 'EOF'
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

# Create backup script
echo "💾 Creating backup script..."
cat > /opt/absensi/scripts/backup.sh << 'EOF'
#!/bin/bash
# Backup script for Absensi application

BACKUP_DIR="/opt/absensi/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔄 Creating backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backups' \
    /opt/absensi/

# Backup database if running
if docker-compose --env-file production.env -f docker-compose.prod.yml ps mysql | grep -q "Up"; then
    echo "📊 Backing up database..."
    docker-compose --env-file production.env -f docker-compose.prod.yml exec -T mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD absensi_db > $BACKUP_DIR/db_backup_$TIMESTAMP.sql
    gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql
fi

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR"
EOF

chmod +x /opt/absensi/scripts/backup.sh

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > /opt/absensi/scripts/monitor.sh << 'EOF'
#!/bin/bash
# Monitoring script for Absensi application

case "$1" in
    "health")
        echo "🔍 Checking service health..."
        docker-compose --env-file production.env -f docker-compose.prod.yml ps
        ;;
    "logs")
        echo "📋 Showing recent logs..."
        docker-compose --env-file production.env -f docker-compose.prod.yml logs --tail=50
        ;;
    "resources")
        echo "💻 Checking resource usage..."
        docker stats --no-stream
        ;;
    "all")
        echo "🔍 Full system check..."
        echo "=== Service Status ==="
        docker-compose --env-file production.env -f docker-compose.prod.yml ps
        echo ""
        echo "=== Resource Usage ==="
        docker stats --no-stream
        echo ""
        echo "=== Disk Usage ==="
        df -h
        echo ""
        echo "=== Memory Usage ==="
        free -h
        echo ""
        echo "=== Debian Version ==="
        lsb_release -a
        ;;
    *)
        echo "Usage: $0 {health|logs|resources|all}"
        exit 1
        ;;
esac
EOF

chmod +x /opt/absensi/scripts/monitor.sh

# Create system info script
echo "ℹ️  Creating system info script..."
cat > /opt/absensi/scripts/system-info.sh << 'EOF'
#!/bin/bash
# System information script for Debian

echo "🐧 Debian System Information"
echo "============================"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Uptime: $(uptime -p)"
echo ""
echo "🐳 Docker Information"
echo "===================="
docker --version
docker-compose --version
echo ""
echo "💾 Disk Usage"
echo "============="
df -h
echo ""
echo "🧠 Memory Usage"
echo "==============="
free -h
echo ""
echo "🌐 Network Interfaces"
echo "====================="
ip addr show | grep -E "inet |UP"
echo ""
echo "🔧 Services Status"
echo "=================="
systemctl is-active docker
systemctl is-active ssh
EOF

chmod +x /opt/absensi/scripts/system-info.sh

# Display SSH public key
echo ""
echo "🔑 SSH Public Key for GitHub Actions:"
echo "======================================"
cat ~/.ssh/github_actions_key.pub
echo ""
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo "1. Copy the SSH public key above"
echo "2. Add it to your GitHub repository secrets as SERVER_SSH_PRIVATE_KEY"
echo "3. Add other required secrets (SERVER_IP, SERVER_USER, etc.)"
echo "4. Update production.env with your actual values"
echo "5. Run your first deployment via GitHub Actions"
echo ""
echo "✅ Debian server setup completed successfully!"
echo ""
echo "🔧 Useful commands:"
echo "   System info:      ./scripts/system-info.sh"
echo "   Monitor services: ./scripts/monitor.sh all"
echo "   View logs:        ./scripts/monitor.sh logs"
echo "   Check health:     ./scripts/monitor.sh health"
echo "   Create backup:    ./scripts/backup.sh"
echo ""
echo "⚠️  Important:"
echo "   - Logout and login again to apply docker group changes"
echo "   - Or run: newgrp docker"
echo "   - Test Docker: docker run hello-world"
