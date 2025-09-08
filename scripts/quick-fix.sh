#!/bin/bash

# Quick fix untuk masalah direktori
# Jalankan sebagai root

echo "🔧 Quick Fix untuk Masalah Direktori"
echo "===================================="

APP_DIR="/home/kava/absensi"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Jalankan sebagai root: su -"
    exit 1
fi

# Backup dan hapus direktori yang ada
if [ -d "$APP_DIR" ]; then
    echo "📁 Direktori $APP_DIR sudah ada"
    echo "🔄 Membuat backup..."
    mv $APP_DIR ${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup dibuat"
fi

# Buat direktori baru
echo "📁 Membuat direktori baru..."
mkdir -p $APP_DIR
chown -R kava:kava $APP_DIR

# Clone repository
echo "📥 Cloning repository..."
cd $APP_DIR
sudo -u kava git clone https://github.com/ahmadsyafiqkamil/absensi.git .

# Set permissions
chmod +x docker-prod.sh scripts/*.sh 2>/dev/null || true
chown -R kava:kava $APP_DIR

echo ""
echo "✅ Masalah direktori sudah diperbaiki!"
echo "📁 Aplikasi ada di: $APP_DIR"
echo ""
echo "📋 Langkah selanjutnya:"
echo "1. Switch ke user kava: exit"
echo "2. Masuk ke direktori: cd $APP_DIR"
echo "3. Lanjutkan setup"
