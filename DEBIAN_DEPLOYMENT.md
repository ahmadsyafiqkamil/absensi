# 🐧 Deploy ke Debian Server

Panduan khusus untuk mendeploy aplikasi Absensi KJRI Dubai ke server Debian menggunakan GitHub Actions.

## 📋 Prasyarat Debian

### Sistem Requirements
- **Debian 10+** (Buster, Bullseye, atau Bookworm)
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- 50GB disk space minimum
- Domain name dengan SSL certificate

### Networking Requirements
- Port 80 dan 443 harus tersedia
- Domain harus pointing ke server IP
- Firewall yang mengizinkan HTTP/HTTPS traffic

## 🚀 Quick Start untuk Debian

### 1. Persiapan Server Debian

```bash
# Login ke server Debian
ssh user@your-debian-server

# Update sistem Debian
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git rsync ca-certificates gnupg lsb-release

# Download dan jalankan setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/absensi-kjri-dubai/main/scripts/setup-server.sh | bash

# Atau clone repository dan jalankan
git clone https://github.com/your-repo/absensi-kjri-dubai.git /opt/absensi
cd /opt/absensi
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

### 2. Manual Setup untuk Debian

Jika script otomatis tidak berfungsi, lakukan setup manual:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Setup SSH key untuk GitHub Actions
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_key -N ""
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_actions_key
chmod 644 ~/.ssh/authorized_keys

# Setup firewall (UFW)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Create application directory
sudo mkdir -p /opt/absensi
sudo chown $USER:$USER /opt/absensi
```

### 3. Konfigurasi GitHub Secrets

Buka repository GitHub → Settings → Secrets and variables → Actions

Tambahkan secrets berikut:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `SERVER_IP` | IP address server Debian | `192.168.1.100` |
| `SERVER_USER` | Username untuk SSH ke server | `debian` atau `root` |
| `SERVER_SSH_PRIVATE_KEY` | Private key SSH (isi dari `~/.ssh/github_actions_key`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `FRONTEND_DOMAIN` | Domain untuk frontend | `absensi.kjri-dubai.com` |
| `API_DOMAIN` | Domain untuk API | `api.absensi.kjri-dubai.com` |

### 4. Update production.env

```bash
# Di server Debian
cd /opt/absensi
nano production.env

# Ganti nilai-nilai berikut:
MYSQL_ROOT_PASSWORD=your-super-secure-root-password
SECRET_KEY=your-django-secret-key-min-50-characters-long
DJANGO_ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com,backend,localhost,127.0.0.1
FRONTEND_DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### 5. Deploy!

```bash
# Push ke branch main
git add .
git commit -m "Deploy to Debian production"
git push origin main

# Atau jalankan manual di GitHub:
# Actions → Deploy to Production → Run workflow
```

## 🔧 Troubleshooting Debian

### Masalah Umum di Debian

#### 1. Permission Denied
```bash
# Fix permissions
sudo chown -R $USER:$USER /opt/absensi
chmod +x /opt/absensi/docker-prod.sh
chmod +x /opt/absensi/scripts/*.sh
```

#### 2. Docker Service Not Running
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Check status
sudo systemctl status docker

# Add user to docker group
sudo usermod -aG docker $USER
# Logout dan login kembali
```

#### 3. UFW Firewall Issues
```bash
# Check UFW status
sudo ufw status

# Reset UFW jika perlu
sudo ufw --force reset
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

#### 4. SSH Connection Issues
```bash
# Test SSH connection
ssh -i ~/.ssh/github_actions_key user@server-ip

# Check SSH service
sudo systemctl status ssh

# Check SSH config
sudo nano /etc/ssh/sshd_config
# Pastikan:
# PubkeyAuthentication yes
# PasswordAuthentication no (untuk security)
```

#### 5. Port Already in Use
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

### Debian-Specific Commands

```bash
# Check Debian version
lsb_release -a

# Check available packages
apt list --installed | grep docker

# Check system resources
free -h
df -h

# Check network
ip addr show
ss -tulpn
```

## 📊 Monitoring di Debian

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
du -sh /opt/absensi/*
du -sh /var/lib/docker/*

# Network monitoring
iftop
nload
```

## 🔄 Backup dan Restore

### Backup
```bash
# Manual backup
cd /opt/absensi
./scripts/backup.sh

# Check backup
ls -la backups/
```

### Restore
```bash
# Stop services
cd /opt/absensi
docker-compose --env-file production.env -f docker-compose.prod.yml down

# Restore from backup
tar -xzf backups/app_backup_YYYYMMDD_HHMMSS.tar.gz

# Start services
docker-compose --env-file production.env -f docker-compose.prod.yml up -d
```

## 🛡️ Security untuk Debian

### Hardening
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### Firewall Rules
```bash
# Check UFW status
sudo ufw status verbose

# Add specific rules if needed
sudo ufw allow from 192.168.1.0/24 to any port 22
sudo ufw deny 22
sudo ufw allow 22
```

## 📋 Checklist Debian Deployment

### Pre-Deployment
- [ ] Debian 10+ installed
- [ ] System updated (`apt update && apt upgrade`)
- [ ] Docker dan Docker Compose installed
- [ ] SSH key generated untuk GitHub Actions
- [ ] UFW firewall configured
- [ ] Domain pointing ke server IP
- [ ] GitHub Secrets configured

### Deployment
- [ ] GitHub Actions workflow triggered
- [ ] Files copied to server
- [ ] Docker containers started
- [ ] Health checks passed
- [ ] SSL certificate generated

### Post-Deployment
- [ ] Frontend accessible via domain
- [ ] API accessible via domain
- [ ] Database connection working
- [ ] Logs being generated
- [ ] Backup script working

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
- Application logs: `/opt/absensi/logs/`
- SSH logs: `/var/log/auth.log`

---

**Debian Version:** 10+ (Buster/Bullseye/Bookworm)  
**Last Updated:** $(date)  
**Version:** 1.0.0
