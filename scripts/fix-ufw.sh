#!/bin/bash

# Quick fix untuk UFW yang tidak terinstall
# Jalankan script ini jika ada error "ufw: command not found"

set -e

echo "🔧 Fixing UFW firewall..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root."
    echo "   Please run: su -"
    echo "   Then run this script again."
    exit 1
fi

# Install UFW
echo "📦 Installing UFW..."
apt update
apt install -y ufw

# Configure UFW
echo "🔥 Configuring UFW firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

echo "✅ UFW firewall installed and configured successfully!"
echo ""
echo "🔍 Check firewall status:"
ufw status
