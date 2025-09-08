#!/bin/bash

# Script untuk membersihkan direktori lama dan pindah ke direktori baru
# Jalankan script ini sebagai root

set -e

echo "🧹 Cleaning up old directories and moving to new location..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root."
    echo "   Please run: su -"
    echo "   Then run this script again."
    exit 1
fi

OLD_DIR="/opt/absensi"
NEW_DIR="/home/kava/absensi"

# Check if old directory exists
if [ -d "$OLD_DIR" ]; then
    echo "📁 Found old directory at $OLD_DIR"
    
    # Ask for confirmation
    echo "⚠️  This will move the application from $OLD_DIR to $NEW_DIR"
    echo "   Do you want to continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        # Create new directory
        echo "📁 Creating new directory at $NEW_DIR"
        mkdir -p $NEW_DIR
        chown -R kava:kava $NEW_DIR
        
        # Move files
        echo "📦 Moving files from $OLD_DIR to $NEW_DIR"
        cp -r $OLD_DIR/* $NEW_DIR/ 2>/dev/null || true
        cp -r $OLD_DIR/.* $NEW_DIR/ 2>/dev/null || true
        
        # Set permissions
        chown -R kava:kava $NEW_DIR
        
        # Remove old directory
        echo "🗑️  Removing old directory"
        rm -rf $OLD_DIR
        
        echo "✅ Successfully moved application to $NEW_DIR"
    else
        echo "❌ Operation cancelled"
        exit 1
    fi
else
    echo "✅ No old directory found at $OLD_DIR"
fi

# Create new directory if it doesn't exist
if [ ! -d "$NEW_DIR" ]; then
    echo "📁 Creating new directory at $NEW_DIR"
    mkdir -p $NEW_DIR
    chown -R kava:kava $NEW_DIR
fi

# Create necessary subdirectories
echo "📁 Creating necessary subdirectories..."
mkdir -p $NEW_DIR/logs/{backend,frontend,caddy}
mkdir -p $NEW_DIR/backups
mkdir -p $NEW_DIR/mysql/conf.d
chown -R kava:kava $NEW_DIR

echo "✅ Cleanup and move completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Switch to kava user: exit"
echo "2. Go to new directory: cd /home/kava/absensi"
echo "3. Continue with setup or deployment"
