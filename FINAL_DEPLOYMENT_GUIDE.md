# 🚀 Final Deployment Guide - Absensi KJRI Dubai

Panduan lengkap untuk mendeploy aplikasi Absensi ke server production dengan direktori `/home/kava/absensi`.

## 📋 Prasyarat

### Server Information
- **OS:** Debian 13 (trixie) ✅
- **User:** kava ✅
- **IP:** 192.168.141.7 ✅
- **Directory:** `/home/kava/absensi` (bukan `/opt/absensi`)

## 🚀 Quick Start (5 Menit)

### 1. Setup Server Production

```bash
# Login ke server production sebagai kava
ssh kava@192.168.141.7

# Switch ke root
su -

# Jalankan script final setup
curl -fsSL https://raw.githubusercontent.com/ahmadsyafiqkamil/absensi/main/scripts/setup-final.sh | bash

# Switch kembali ke kava user
exit
cd /home/kava/absensi
```

### 2. Konfigurasi GitHub Secrets

Buka [https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions](https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions)

Tambahkan secrets berikut:

| Secret | Value | Contoh |
|--------|-------|--------|
| `SERVER_IP` | IP server production | `192.168.141.7` |
| `SERVER_USER` | Username SSH | `kava` |
| `SERVER_SSH_PRIVATE_KEY` | Private key dari server | `-----BEGIN OPENSSH...` |
| `FRONTEND_DOMAIN` | Domain frontend | `absensi.kjri-dubai.com` |
| `API_DOMAIN` | Domain API | `api.absensi.kjri-dubai.com` |

### 3. Update production.env

```bash
# Di server production sebagai kava user
cd /home/kava/absensi
nano production.env

# Ganti nilai-nilai berikut:
MYSQL_ROOT_PASSWORD=your-super-secure-root-password
MYSQL_USER=absensi_user
MYSQL_PASSWORD=your-super-secure-db-password
SECRET_KEY=your-django-secret-key-min-50-characters-long
DJANGO_ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com,backend,localhost,127.0.0.1
FRONTEND_DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
BACKEND_CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]
```

### 4. Deploy!

```bash
# Push ke branch main
git add .
git commit -m "Deploy to production"
git push origin main

# Atau jalankan manual di GitHub:
# Actions → Deploy to Production → Run workflow
```

## ✅ Verifikasi Deployment

### Check Status
```bash
# Di server production sebagai kava user
cd /home/kava/absensi
./scripts/monitor.sh all
```

### Test Aplikasi
```bash
# Test backend
curl http://localhost:8000/health/

# Test frontend
curl http://localhost:3000

# Test external (jika domain sudah dikonfigurasi)
curl https://yourdomain.com
```

## 🔧 Troubleshooting

### Masalah Umum

#### 1. Permission Denied
```bash
# Set proper permissions
sudo chown -R kava:kava /home/kava/absensi
chmod +x /home/kava/absensi/docker-prod.sh
chmod +x /home/kava/absensi/scripts/*.sh
```

#### 2. Docker Not Running
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Check Docker status
sudo systemctl status docker

# Add user to docker group
sudo usermod -aG docker kava
# Logout dan login kembali
```

#### 3. SSH Connection Issues
```bash
# Test SSH connection
ssh -i ~/.ssh/github_actions_key kava@192.168.141.7

# Check SSH service
sudo systemctl status ssh

# Check SSH config
sudo nano /etc/ssh/sshd_config
```

#### 4. Port Already in Use
```bash
# Check what's using the ports
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop apache2  # jika ada
sudo systemctl stop nginx    # jika ada
sudo systemctl disable apache2
sudo systemctl disable nginx
```

## 📊 Monitoring

### Service Management
```bash
# Check all services
sudo systemctl status docker
sudo systemctl status ssh

# Check Docker containers
docker ps
docker-compose --env-file production.env -f docker-compose.prod.yml ps

# View logs
journalctl -u docker -f
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f
```

### Performance Monitoring
```bash
# System resources
htop
iotop
nethogs

# Disk usage
du -sh /home/kava/absensi/*
du -sh /var/lib/docker/*

# Network monitoring
iftop
nload
```

## 🔄 Backup dan Restore

### Backup
```bash
# Manual backup
cd /home/kava/absensi
./scripts/backup.sh

# Check backup
ls -la backups/
```

### Restore
```bash
# Stop services
cd /home/kava/absensi
docker-compose --env-file production.env -f docker-compose.prod.yml down

# Restore from backup
tar -xzf backups/app_backup_YYYYMMDD_HHMMSS.tar.gz

# Start services
docker-compose --env-file production.env -f docker-compose.prod.yml up -d
```

## 📋 Checklist Deployment

### Pre-Deployment
- [ ] Server Debian 13 sudah siap ✅
- [ ] User kava sudah ada ✅
- [ ] IP 192.168.141.7 ✅
- [ ] Domain pointing ke server IP
- [ ] GitHub Secrets dikonfigurasi
- [ ] production.env sudah dibuat

### Deployment
- [ ] GitHub Actions workflow berhasil
- [ ] Semua services running
- [ ] Health checks pass
- [ ] Domain accessible

### Post-Deployment
- [ ] Test login functionality
- [ ] Test CRUD operations
- [ ] Verify SSL certificate
- [ ] Monitor logs

## 🆘 Support

### Useful Commands
```bash
# System info
uname -a
lsb_release -a
docker --version
docker-compose --version

# Service status
systemctl status docker ssh
docker ps -a

# Logs
journalctl -u docker --since "1 hour ago"
docker-compose logs --tail=100
```

### Log Locations
- System logs: `/var/log/syslog`
- Docker logs: `docker logs <container_name>`
- Application logs: `/home/kava/absensi/logs/`
- SSH logs: `/var/log/auth.log`

## 📚 Dokumentasi Lengkap

- **`DEPLOYMENT_GUIDE.md`** - Panduan lengkap deployment
- **`DEBIAN_DEPLOYMENT.md`** - Panduan khusus Debian
- **`GITHUB_ACTIONS_DEPLOYMENT.md`** - Panduan GitHub Actions
- **`QUICK_START_DEPLOYMENT.md`** - Quick start guide

---

**Server Info:**
- OS: Debian GNU/Linux 13 (trixie)
- User: kava
- IP: 192.168.141.7
- Directory: /home/kava/absensi
- Status: Ready for deployment

**Next Step:** Jalankan script final setup sebagai root
