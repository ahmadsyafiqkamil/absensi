#!/bin/bash

# Script to add local domains to /etc/hosts for development/production testing
# This allows you to access the application using custom domains locally

set -e

echo "🔧 Setting up local domains for siaki.kjri-dubai.local..."

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script needs to be run with sudo to modify /etc/hosts"
    echo "Usage: sudo ./setup-local-domains.sh"
    exit 1
fi

# Backup original hosts file
echo "📋 Creating backup of /etc/hosts..."
cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d_%H%M%S)

# Check if domains already exist
if grep -q "kjri-dubai.local" /etc/hosts; then
    echo "⚠️  kjri-dubai.local domains already exist in /etc/hosts"
    echo "Current entries:"
    grep "kjri-dubai.local" /etc/hosts
    echo ""
    read -p "Do you want to update them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. No changes made."
        exit 1
    fi
    
    # Remove existing entries
    echo "🗑️  Removing existing kjri-dubai.local entries..."
    sed -i '' '/kjri-dubai\.local/d' /etc/hosts
fi

# Add new domain entries
echo "➕ Adding new domain entries to /etc/hosts..."
cat >> /etc/hosts << EOF

# SIAKI KJRI Dubai Application Local Domains
127.0.0.1 siaki.kjri-dubai.local
127.0.0.1 api-siaki.kjri-dubai.local
127.0.0.1 phpmyadmin-siaki.kjri-dubai.local
EOF

echo "✅ Successfully added domains to /etc/hosts:"
echo "   - siaki.kjri-dubai.local (Frontend)"
echo "   - api-siaki.kjri-dubai.local (Backend API)"
echo "   - phpmyadmin-siaki.kjri-dubai.local (Database Admin)"
echo ""
echo "🌐 You can now access the application at:"
echo "   Frontend: https://siaki.kjri-dubai.local"
echo "   API: https://api-siaki.kjri-dubai.local"
echo "   Django Admin: https://api-siaki.kjri-dubai.local/admin/"
echo "   phpMyAdmin: https://phpmyadmin-siaki.kjri-dubai.local"
echo ""
echo "📝 Note: You may need to restart your browser or clear DNS cache"
echo "   On macOS: sudo dscacheutil -flushcache"
echo "   On Linux: sudo systemctl restart systemd-resolved"
