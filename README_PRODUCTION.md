# Production Deployment Guide

Panduan lengkap untuk mendeploy sistem Absensi KJRI Dubai ke production environment.

## 📋 Prasyarat

### Sistem Requirements
- **Debian 10+** (Recommended) atau Ubuntu 20.04+ atau CentOS 7+
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- 50GB disk space minimum
- Domain name dengan SSL certificate

### Networking Requirements
- Port 80 dan 443 harus tersedia
- Domain harus pointing ke server IP
- Firewall yang mengizinkan HTTP/HTTPS traffic

## 🚀 Quick Start

### 1. Persiapan Server

#### Untuk Debian (Recommended):
```bash
# Download dan jalankan setup script khusus Debian
curl -fsSL https://raw.githubusercontent.com/your-repo/absensi-kjri-dubai/main/scripts/setup-debian.sh | bash

# Atau clone repository dan jalankan
git clone https://github.com/your-repo/absensi-kjri-dubai.git /opt/absensi
cd /opt/absensi
chmod +x scripts/setup-debian.sh
./scripts/setup-debian.sh
```

#### Untuk Ubuntu/CentOS:
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y  # Debian/Ubuntu
# atau
sudo yum update -y  # CentOS

# Install Docker dan Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Buat direktori project
sudo mkdir -p /opt/absensi
cd /opt/absensi
```

### 2. Clone Repository
```bash
# Clone repository
git clone https://github.com/your-repo/absensi-kjri-dubai.git .
cd absensi

# Buat branch production jika belum ada
git checkout -b production
```

### 3. Konfigurasi Environment
```bash
# Copy dan edit file environment
cp production.env.example production.env
nano production.env

# Minimal yang perlu diubah:
# - MYSQL_ROOT_PASSWORD
# - SECRET_KEY
# - FRONTEND_DOMAIN
# - API_DOMAIN
# - DJANGO_ALLOWED_HOSTS
```

### 4. Deploy Production
```bash
# Jalankan deployment script
chmod +x docker-prod.sh scripts/*.sh
./docker-prod.sh
```

## 🔧 Konfigurasi Lengkap

### Environment Variables
Edit file `production.env` dengan konfigurasi yang sesuai:

```bash
# Database
MYSQL_ROOT_PASSWORD=your-super-secure-password-here
MYSQL_USER=absensi_user
MYSQL_PASSWORD=your-secure-db-password

# Django
SECRET_KEY=your-django-secret-key-here
DJANGO_ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com,backend
BACKEND_CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com

# Domain
FRONTEND_DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com
```

### Domain Configuration
1. Point domain ke server IP:
   - `yourdomain.com` → server IP
   - `api.yourdomain.com` → server IP

2. Pastikan DNS sudah propagate:
   ```bash
   nslookup yourdomain.com
   nslookup api.yourdomain.com
   ```

## 🔒 Security Checklist

### Pre-Deployment
- [ ] Ganti semua password default
- [ ] Generate strong SECRET_KEY (minimal 50 karakter)
- [ ] Konfigurasi CORS origins yang benar
- [ ] Pastikan domain sudah pointing ke server
- [ ] Backup data existing jika ada

### Post-Deployment
- [ ] Verifikasi SSL certificate aktif
- [ ] Test semua endpoint API
- [ ] Test login functionality
- [ ] Check logs untuk error
- [ ] Verify database connection

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check semua service health
./scripts/monitor.sh all

# Check specific service
./scripts/monitor.sh health
./scripts/monitor.sh resources
./scripts/monitor.sh logs
```

### Regular Maintenance
```bash
# Weekly maintenance
./scripts/maintenance.sh cleanup
./scripts/maintenance.sh rotate-logs

# Monthly backup
./scripts/maintenance.sh backup

# Security audit
./scripts/maintenance.sh security
```

### Update Deployment
```bash
# Update dengan backup otomatis
./scripts/deploy.sh prod deploy

# Rollback jika ada masalah
./scripts/deploy.sh prod rollback
```

## 🔧 Troubleshooting

### Common Issues

#### 1. SSL Certificate Issues
```bash
# Check certificate status
./scripts/monitor.sh security

# Manual certificate renewal
docker-compose --env-file production.env -f docker-compose.prod.yml exec caddy caddy reload
```

#### 2. Database Connection Issues
```bash
# Check database health
docker-compose --env-file production.env -f docker-compose.prod.yml exec mysql mysqladmin ping

# Check logs
docker-compose --env-file production.env -f docker-compose.prod.yml logs mysql
```

#### 3. Service Not Starting
```bash
# Check service status
docker-compose --env-file production.env -f docker-compose.prod.yml ps

# Check logs
docker-compose --env-file production.env -f docker-compose.prod.yml logs
```

### Log Locations
- Backend logs: `./logs/backend/`
- Frontend logs: `./logs/frontend/`
- Caddy logs: `./logs/caddy/`
- Database logs: accessible via Docker logs

### Backup Locations
- Database backups: `./backups/`
- Deployment backups: `./backups/deployment_*`

## 📈 Performance Optimization

### Database Optimization
```bash
# Database sudah dikonfigurasi dengan:
# - InnoDB buffer pool: 1G
# - Max connections: 200
# - Query cache enabled
# - UTF8MB4 charset
```

### Application Optimization
- Gunicorn workers: 3 (configurable)
- Health checks enabled
- Rate limiting active
- Security headers configured

## 🔄 Backup Strategy

### Automated Backup
```bash
# Enable automated backup
docker-compose --env-file production.env -f docker-compose.prod.yml --profile backup up -d

# Backup runs daily at midnight
# Keeps 7 days of backups
# Stored in ./backups/
```

### Manual Backup
```bash
# Create immediate backup
./scripts/maintenance.sh backup

# List available backups
ls -la ./backups/
```

## 🚨 Emergency Procedures

### Service Down
1. Check service status: `docker-compose ps`
2. Check logs: `docker-compose logs [service_name]`
3. Restart service: `docker-compose restart [service_name]`
4. If persistent, rollback: `./scripts/deploy.sh prod rollback`

### Database Issues
1. Check database health: `./scripts/monitor.sh health`
2. Restore from backup if needed
3. Contact database administrator

### Security Incident
1. Immediate actions:
   - Change all passwords
   - Review access logs
   - Check for unauthorized access
2. Security audit: `./scripts/maintenance.sh security`
3. Update and patch: `./scripts/maintenance.sh update`

## 📞 Support

### Monitoring Dashboard
- Health endpoint: `https://api.yourdomain.com/health/`
- Service status: `./scripts/monitor.sh all`
- Resource usage: `./scripts/monitor.sh resources`

### Log Analysis
```bash
# Real-time log monitoring
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f

# Search for specific errors
docker-compose --env-file production.env -f docker-compose.prod.yml logs | grep ERROR
```

## 🔗 Useful Commands

```bash
# Start services
docker-compose --env-file production.env -f docker-compose.prod.yml up -d

# Stop services
docker-compose --env-file production.env -f docker-compose.prod.yml down

# View logs
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f

# Restart specific service
docker-compose --env-file production.env -f docker-compose.prod.yml restart backend

# Scale services (if needed)
docker-compose --env-file production.env -f docker-compose.prod.yml up -d --scale backend=3

# Clean up
docker system prune -f
```

## 📝 Checklist Deployment

### Pre-Deployment
- [ ] Server provisioned dengan requirements
- [ ] Domain configured dan pointing ke server
- [ ] SSL certificate ready (auto via Caddy)
- [ ] Environment variables configured
- [ ] Database credentials secure
- [ ] Backup dari production data (jika ada)

### Deployment
- [ ] `./docker-prod.sh` berhasil
- [ ] Semua services running
- [ ] Health checks pass
- [ ] SSL certificate aktif
- [ ] Domain accessible

### Post-Deployment
- [ ] Test login functionality
- [ ] Test CRUD operations
- [ ] Verify email notifications (jika ada)
- [ ] Performance testing
- [ ] Monitoring alerts configured

### Maintenance
- [ ] Automated backup enabled
- [ ] Log rotation configured
- [ ] Security monitoring active
- [ ] Regular updates scheduled

---

**Last Updated:** $(date)
**Version:** 1.0.0
