# 🚀 Panduan Deployment dengan GitHub Actions

Panduan lengkap untuk mendeploy aplikasi Absensi KJRI Dubai ke server production menggunakan GitHub Actions.

## 📋 Prasyarat

### 1. Server Production
- Ubuntu 20.04+ atau CentOS 7+
- Docker 20.10+ dan Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- 50GB disk space
- Domain name dengan akses ke port 80 dan 443

### 2. GitHub Repository
- Repository sudah di-push ke GitHub
- Akses admin ke repository
- SSH key untuk server production

## 🔧 Setup GitHub Secrets

### Langkah 1: Buat SSH Key untuk Server

```bash
# Di server production, buat SSH key
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy"
# Simpan di ~/.ssh/github_actions_key

# Tambahkan public key ke authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys

# Set permissions
chmod 600 ~/.ssh/github_actions_key
chmod 644 ~/.ssh/authorized_keys
```

### Langkah 2: Konfigurasi GitHub Secrets

Buka repository GitHub → Settings → Secrets and variables → Actions → New repository secret

Tambahkan secrets berikut:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `SERVER_IP` | IP address server production | `192.168.1.100` |
| `SERVER_USER` | Username untuk SSH ke server | `ubuntu` atau `root` |
| `SERVER_SSH_PRIVATE_KEY` | Private key SSH (isi dari `~/.ssh/github_actions_key`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `FRONTEND_DOMAIN` | Domain untuk frontend | `absensi.kjri-dubai.com` |
| `API_DOMAIN` | Domain untuk API | `api.absensi.kjri-dubai.com` |

### Langkah 3: Setup Server Production

```bash
# Login ke server production
ssh user@your-server-ip

# Buat direktori aplikasi
sudo mkdir -p /opt/absensi
sudo chown $USER:$USER /opt/absensi
cd /opt/absensi

# Clone repository (opsional, akan di-overwrite oleh GitHub Actions)
git clone https://github.com/your-username/absensi-kjri-dubai.git .

# Buat file production.env
cp env.production.example production.env
nano production.env
```

### Langkah 4: Konfigurasi production.env

Edit file `production.env` di server:

```bash
# Database Configuration
MYSQL_ROOT_PASSWORD=your-super-secure-root-password
MYSQL_USER=absensi_user
MYSQL_PASSWORD=your-super-secure-db-password

# Django Backend Configuration
SECRET_KEY=your-django-secret-key-min-50-characters-long
DJANGO_ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com,backend,localhost,127.0.0.1
PASSWORD_SALT=your-password-salt-change-this-in-production
BACKEND_CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com

# Domain Configuration for Caddy
FRONTEND_DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com

# Production Settings
DJANGO_DEBUG=0
NODE_ENV=production
```

## 🚀 Cara Menjalankan Deployment

### Metode 1: Otomatis (Push ke Branch)

```bash
# Push ke branch main atau production
git add .
git commit -m "Deploy to production"
git push origin main
```

GitHub Actions akan otomatis menjalankan deployment.

### Metode 2: Manual (Workflow Dispatch)

1. Buka repository di GitHub
2. Klik tab "Actions"
3. Pilih workflow "Deploy to Production"
4. Klik "Run workflow"
5. Pilih branch dan environment
6. Klik "Run workflow"

### Metode 3: Manual via GitHub CLI

```bash
# Install GitHub CLI
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Login ke GitHub
gh auth login

# Jalankan workflow
gh workflow run deploy.yml
```

## 📊 Monitoring Deployment

### 1. Melihat Status Deployment

```bash
# Di GitHub
1. Buka repository → Actions tab
2. Klik pada workflow run terbaru
3. Lihat status setiap step

# Di server production
cd /opt/absensi
docker-compose --env-file production.env -f docker-compose.prod.yml ps
```

### 2. Melihat Logs

```bash
# Logs GitHub Actions
# Buka di GitHub → Actions → Workflow run → Job

# Logs aplikasi di server
cd /opt/absensi
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f

# Logs specific service
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f backend
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f frontend
```

### 3. Health Checks

```bash
# Check backend health
curl -f http://localhost:8000/health/

# Check frontend
curl -f http://localhost:3000

# Check external access (jika domain sudah dikonfigurasi)
curl -f https://yourdomain.com
curl -f https://api.yourdomain.com/health/
```

## 🔧 Troubleshooting

### Masalah Umum

#### 1. SSH Connection Failed
```bash
# Test SSH connection manual
ssh -i ~/.ssh/github_actions_key user@server-ip

# Check SSH key permissions
chmod 600 ~/.ssh/github_actions_key

# Check authorized_keys
cat ~/.ssh/authorized_keys
```

#### 2. Permission Denied
```bash
# Set proper permissions di server
sudo chown -R $USER:$USER /opt/absensi
chmod +x /opt/absensi/docker-prod.sh
chmod +x /opt/absensi/scripts/*.sh
```

#### 3. Docker Not Running
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Check Docker status
sudo systemctl status docker
```

#### 4. Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop apache2  # jika ada
sudo systemctl stop nginx    # jika ada
```

#### 5. Environment Variables Missing
```bash
# Check production.env exists
ls -la /opt/absensi/production.env

# Check content
cat /opt/absensi/production.env

# Create from template if missing
cp /opt/absensi/env.production.example /opt/absensi/production.env
```

### Debugging Steps

1. **Check GitHub Actions Logs**
   - Buka Actions tab di GitHub
   - Klik pada failed workflow
   - Lihat error di step yang gagal

2. **Check Server Logs**
   ```bash
   # Login ke server
   ssh user@server-ip
   cd /opt/absensi
   
   # Check Docker logs
   docker-compose --env-file production.env -f docker-compose.prod.yml logs
   
   # Check system logs
   sudo journalctl -u docker
   ```

3. **Manual Deployment Test**
   ```bash
   # Test manual deployment
   cd /opt/absensi
   ./docker-prod.sh
   ```

## 🔄 Rollback Deployment

### Jika Deployment Gagal

```bash
# Login ke server
ssh user@server-ip
cd /opt/absensi

# Stop current containers
docker-compose --env-file production.env -f docker-compose.prod.yml down

# Restore from backup
ls -la backups/
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz

# Start previous version
docker-compose --env-file production.env -f docker-compose.prod.yml up -d
```

### Jika Perlu Rollback ke Commit Sebelumnya

```bash
# Di GitHub, buka Actions
# Klik pada deployment yang berhasil
# Klik "Re-run jobs" untuk menjalankan ulang
```

## 📈 Best Practices

### 1. Pre-Deployment Checklist
- [ ] Server sudah siap dan accessible
- [ ] Domain sudah pointing ke server
- [ ] GitHub Secrets sudah dikonfigurasi
- [ ] production.env sudah dibuat dan dikonfigurasi
- [ ] SSH key sudah ditest

### 2. Post-Deployment Checklist
- [ ] Semua services running
- [ ] Health checks pass
- [ ] Domain accessible
- [ ] SSL certificate aktif
- [ ] Database connection OK

### 3. Monitoring
- [ ] Setup monitoring alerts
- [ ] Regular backup verification
- [ ] Log rotation configured
- [ ] Security updates scheduled

## 🆘 Support

### Jika Masih Bermasalah

1. **Check GitHub Actions Logs** - Detail error biasanya ada di sini
2. **Check Server Logs** - `docker-compose logs` untuk aplikasi
3. **Test Manual** - Coba deploy manual dengan `./docker-prod.sh`
4. **Verify Prerequisites** - Pastikan semua requirements terpenuhi

### Useful Commands

```bash
# Check GitHub Actions status
gh run list

# View specific run
gh run view <run-id>

# Check server status
ssh user@server-ip "cd /opt/absensi && docker-compose ps"

# View logs
ssh user@server-ip "cd /opt/absensi && docker-compose logs -f"
```

---

**Last Updated:** $(date)
**Version:** 1.0.0
