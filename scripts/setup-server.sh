#!/bin/bash

# Setup script untuk server production
# Jalankan script ini di server production sebelum deployment

set -e

echo "🚀 Setting up server for Absensi KJRI Dubai deployment..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root. This is not recommended for security reasons."
    echo "   Please run as a regular user with sudo privileges."
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
sudo apt install -y curl wget git rsync

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

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

# Setup firewall
echo "🔥 Configuring firewall..."
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
        ;;
    *)
        echo "Usage: $0 {health|logs|resources|all}"
        exit 1
        ;;
esac
EOF

chmod +x /opt/absensi/scripts/monitor.sh

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
echo "✅ Server setup completed successfully!"
echo ""
echo "🔧 Useful commands:"
echo "   Monitor services:  ./scripts/monitor.sh all"
echo "   View logs:         ./scripts/monitor.sh logs"
echo "   Check health:      ./scripts/monitor.sh health"
echo "   Create backup:     ./scripts/backup.sh"
