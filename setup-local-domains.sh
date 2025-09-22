#!/bin/bash

# Script to add local domains to /etc/hosts for development/production testing
# This allows you to access the application using custom domains locally

set -e

echo "🔧 Setting up local domains for absensi.local..."

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
if grep -q "absensi.local" /etc/hosts; then
    echo "⚠️  absensi.local domains already exist in /etc/hosts"
    echo "Current entries:"
    grep "absensi.local" /etc/hosts
    echo ""
    read -p "Do you want to update them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. No changes made."
        exit 1
    fi
    
    # Remove existing entries
    echo "🗑️  Removing existing absensi.local entries..."
    sed -i '' '/absensi\.local/d' /etc/hosts
fi

# Add new domain entries
echo "➕ Adding new domain entries to /etc/hosts..."
cat >> /etc/hosts << EOF

# Absensi Application Local Domains
127.0.0.1 absensi.local
127.0.0.1 api.absensi.local
127.0.0.1 phpmyadmin.absensi.local
EOF

echo "✅ Successfully added domains to /etc/hosts:"
echo "   - absensi.local (Frontend)"
echo "   - api.absensi.local (Backend API)"
echo "   - phpmyadmin.absensi.local (Database Admin)"
echo ""
echo "🌐 You can now access the application at:"
echo "   Frontend: https://absensi.local"
echo "   API: https://api.absensi.local"
echo "   Django Admin: https://api.absensi.local/admin/"
echo "   phpMyAdmin: https://phpmyadmin.absensi.local"
echo ""
echo "📝 Note: You may need to restart your browser or clear DNS cache"
echo "   On macOS: sudo dscacheutil -flushcache"
echo "   On Linux: sudo systemctl restart systemd-resolved"
