#!/bin/bash

# Firewall setup script untuk berbagai sistem
# Menangani UFW, iptables, dan firewalld

set -e

echo "🔥 Setting up firewall..."

# Function to setup UFW
setup_ufw() {
    echo "📦 Setting up UFW firewall..."
    if command -v ufw &> /dev/null; then
        echo "✅ UFW already installed"
    else
        echo "📦 Installing UFW..."
        apt install -y ufw
    fi
    
    # Configure UFW
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw --force enable
    echo "✅ UFW firewall configured successfully"
}

# Function to setup iptables
setup_iptables() {
    echo "📦 Setting up iptables firewall..."
    
    # Basic iptables rules
    iptables -A INPUT -i lo -j ACCEPT
    iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    iptables -A INPUT -p tcp --dport 443 -j ACCEPT
    iptables -A INPUT -j DROP
    
    # Save iptables rules
    if command -v iptables-save &> /dev/null; then
        iptables-save > /etc/iptables/rules.v4 2>/dev/null || echo "⚠️  Could not save iptables rules"
    fi
    
    echo "✅ iptables firewall configured successfully"
}

# Function to setup firewalld
setup_firewalld() {
    echo "📦 Setting up firewalld firewall..."
    
    if command -v firewall-cmd &> /dev/null; then
        systemctl start firewalld
        systemctl enable firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        echo "✅ firewalld firewall configured successfully"
    else
        echo "❌ firewalld not available"
        return 1
    fi
}

# Detect and setup appropriate firewall
if command -v ufw &> /dev/null; then
    echo "🔍 UFW detected, using UFW..."
    setup_ufw
elif command -v firewall-cmd &> /dev/null; then
    echo "🔍 firewalld detected, using firewalld..."
    setup_firewalld
elif command -v iptables &> /dev/null; then
    echo "🔍 iptables detected, using iptables..."
    setup_iptables
else
    echo "⚠️  No firewall detected, installing UFW..."
    apt install -y ufw
    setup_ufw
fi

echo "✅ Firewall setup completed!"
