# 🚀 Opsi Deployment untuk Absensi KJRI Dubai

Panduan lengkap semua opsi deployment yang tersedia untuk aplikasi Absensi.

## 📋 Daftar Opsi Deployment

### 1. 🐧 **Debian Server (Recommended)**
- **File:** `DEBIAN_DEPLOYMENT.md`
- **Script:** `scripts/setup-debian.sh`
- **OS:** Debian 10+ (Buster/Bullseye/Bookworm)
- **Keunggulan:** Stable, secure, lightweight

### 2. 🐧 **Ubuntu Server**
- **File:** `GITHUB_ACTIONS_DEPLOYMENT.md`
- **Script:** `scripts/setup-server.sh`
- **OS:** Ubuntu 20.04+
- **Keunggulan:** User-friendly, extensive documentation

### 3. 🔴 **CentOS/RHEL Server**
- **File:** `GITHUB_ACTIONS_DEPLOYMENT.md`
- **Script:** `scripts/setup-server.sh`
- **OS:** CentOS 7+
- **Keunggulan:** Enterprise-grade, long-term support

## 🚀 Quick Start Guide

### Untuk Debian (Paling Mudah)
```bash
# 1. Login ke server Debian
ssh user@your-debian-server

# 2. Jalankan setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/absensi-kjri-dubai/main/scripts/setup-debian.sh | bash

# 3. Konfigurasi GitHub Secrets
# 4. Deploy via GitHub Actions
```

### Untuk Ubuntu
```bash
# 1. Login ke server Ubuntu
ssh user@your-ubuntu-server

# 2. Jalankan setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/absensi-kjri-dubai/main/scripts/setup-server.sh | bash

# 3. Konfigurasi GitHub Secrets
# 4. Deploy via GitHub Actions
```

### Manual Setup (Semua OS)
```bash
# 1. Clone repository
git clone https://github.com/your-repo/absensi-kjri-dubai.git /opt/absensi
cd /opt/absensi

# 2. Pilih script sesuai OS
chmod +x scripts/setup-debian.sh    # Untuk Debian
# atau
chmod +x scripts/setup-server.sh    # Untuk Ubuntu/CentOS

# 3. Jalankan script
./scripts/setup-debian.sh
# atau
./scripts/setup-server.sh
```

## 🔧 GitHub Actions Deployment

### Konfigurasi GitHub Secrets
Buka GitHub → Settings → Secrets and variables → Actions

| Secret | Description | Example |
|--------|-------------|---------|
| `SERVER_IP` | IP server production | `192.168.1.100` |
| `SERVER_USER` | Username SSH | `debian`, `ubuntu`, `root` |
| `SERVER_SSH_PRIVATE_KEY` | Private key SSH | `-----BEGIN OPENSSH...` |
| `FRONTEND_DOMAIN` | Domain frontend | `absensi.kjri-dubai.com` |
| `API_DOMAIN` | Domain API | `api.absensi.kjri-dubai.com` |

### Menjalankan Deployment
1. **Otomatis:** Push ke branch `main` atau `production`
2. **Manual:** GitHub → Actions → Deploy to Production → Run workflow

## 📊 Perbandingan OS

| Feature | Debian | Ubuntu | CentOS |
|---------|--------|--------|--------|
| **Stability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Ease of Use** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Support** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Recommended** | ✅ | ✅ | ⚠️ |

## 🛠️ Troubleshooting per OS

### Debian
```bash
# Check system info
./scripts/system-info.sh

# Check services
systemctl status docker ssh

# Check logs
journalctl -u docker -f
```

### Ubuntu
```bash
# Check services
systemctl status docker ssh

# Check logs
journalctl -u docker -f
```

### CentOS
```bash
# Check services
systemctl status docker ssh

# Check logs
journalctl -u docker -f
```

## 📁 File Structure

```
absensi/
├── .github/workflows/
│   └── deploy.yml                    # GitHub Actions workflow
├── scripts/
│   ├── setup-debian.sh              # Setup script untuk Debian
│   ├── setup-server.sh              # Setup script untuk Ubuntu/CentOS
│   ├── backup.sh                    # Backup script
│   └── monitor.sh                   # Monitoring script
├── docker-compose.prod.yml          # Production Docker Compose
├── docker-prod.sh                   # Production deployment script
├── DEBIAN_DEPLOYMENT.md             # Panduan Debian
├── GITHUB_ACTIONS_DEPLOYMENT.md     # Panduan GitHub Actions
├── QUICK_START_DEPLOYMENT.md        # Quick start guide
└── README_PRODUCTION.md             # Production guide utama
```

## 🎯 Rekomendasi

### Untuk Production (Recommended)
- **OS:** Debian 11+ (Bullseye) atau Debian 12+ (Bookworm)
- **Script:** `scripts/setup-debian.sh`
- **Guide:** `DEBIAN_DEPLOYMENT.md`

### Untuk Development
- **OS:** Ubuntu 20.04+ atau 22.04+
- **Script:** `scripts/setup-server.sh`
- **Guide:** `GITHUB_ACTIONS_DEPLOYMENT.md`

### Untuk Enterprise
- **OS:** CentOS 8+ atau RHEL 8+
- **Script:** `scripts/setup-server.sh`
- **Guide:** `GITHUB_ACTIONS_DEPLOYMENT.md`

## 🆘 Support

### Jika Ada Masalah
1. **Check OS-specific guide** sesuai server Anda
2. **Check GitHub Actions logs** untuk deployment issues
3. **Check server logs** dengan script monitoring
4. **Test manual deployment** dengan `./docker-prod.sh`

### Useful Commands
```bash
# System info
./scripts/system-info.sh

# Monitor all
./scripts/monitor.sh all

# Check health
./scripts/monitor.sh health

# View logs
./scripts/monitor.sh logs

# Create backup
./scripts/backup.sh
```

---

**Last Updated:** $(date)  
**Version:** 1.0.0
