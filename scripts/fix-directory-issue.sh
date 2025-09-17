#!/bin/bash

# Script untuk mengatasi masalah direktori yang sudah ada
# Jalankan sebagai root

set -e

echo "🔧 Fixing Directory Issue"
echo "========================"

APP_DIR="/home/kava/absensi"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root."
    echo "Run: su -"
    exit 1
fi

# Check if directory exists
if [ -d "$APP_DIR" ]; then
    echo "📁 Directory $APP_DIR exists"
    
    # Check if it's empty
    if [ "$(ls -A $APP_DIR)" ]; then
        echo "⚠️  Directory is not empty"
        
        # Show what's in the directory
        echo "📋 Contents of $APP_DIR:"
        ls -la $APP_DIR
        
        # Ask for confirmation
        echo ""
        echo "🔄 Options:"
        echo "1. Backup and create fresh directory"
        echo "2. Remove directory completely"
        echo "3. Exit"
        echo ""
        read -p "Choose option (1-3): " choice
        
        case $choice in
            1)
                echo "🔄 Backing up existing directory..."
                BACKUP_DIR="${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
                mv $APP_DIR $BACKUP_DIR
                echo "✅ Directory backed up to: $BACKUP_DIR"
                ;;
            2)
                echo "🗑️  Removing directory..."
                rm -rf $APP_DIR
                echo "✅ Directory removed"
                ;;
            3)
                echo "❌ Exiting..."
                exit 0
                ;;
            *)
                echo "❌ Invalid option"
                exit 1
                ;;
        esac
    else
        echo "✅ Directory is empty"
    fi
else
    echo "✅ Directory does not exist"
fi

# Create fresh directory
echo "📁 Creating fresh directory..."
mkdir -p $APP_DIR
chown -R kava:kava $APP_DIR

# Create necessary subdirectories
mkdir -p $APP_DIR/logs/{backend,frontend,caddy}
mkdir -p $APP_DIR/backups
mkdir -p $APP_DIR/mysql/conf.d
chown -R kava:kava $APP_DIR

echo "✅ Directory structure created successfully"

# Clone repository
echo "📥 Cloning repository..."
cd $APP_DIR
sudo -u kava git clone https://github.com/ahmadsyafiqkamil/absensi.git .

echo "✅ Repository cloned successfully"

# Set permissions
chmod +x docker-prod.sh scripts/*.sh 2>/dev/null || true
chown -R kava:kava $APP_DIR

echo ""
echo "🎉 Directory issue fixed!"
echo "📁 Application directory: $APP_DIR"
echo ""
echo "📋 Next steps:"
echo "1. Switch to kava user: exit"
echo "2. Go to app directory: cd $APP_DIR"
echo "3. Continue with setup"
