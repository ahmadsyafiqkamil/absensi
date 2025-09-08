# 🚀 Panduan Deployment Lengkap - Absensi KJRI Dubai

Panduan step-by-step untuk mendeploy aplikasi Absensi ke server production menggunakan GitHub Actions.

## 📋 Prasyarat

### 1. Server Production
- **OS:** Debian 10+ (Recommended) atau Ubuntu 20.04+
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 50GB minimum
- **Network:** Port 80 dan 443 terbuka
- **Domain:** Sudah pointing ke server IP

### 2. GitHub Repository
- Repository: [https://github.com/ahmadsyafiqkamil/absensi](https://github.com/ahmadsyafiqkamil/absensi)
- Akses admin ke repository
- SSH key untuk server production

## 🔧 Setup Server Production

### Langkah 1: Persiapan Server

```bash
# Login ke server production
ssh user@your-server-ip

# Update sistem
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git rsync ca-certificates gnupg lsb-release

# Download dan jalankan setup script
curl -fsSL https://raw.githubusercontent.com/ahmadsyafiqkamil/absensi/main/scripts/setup-debian.sh | bash

# Atau clone repository dan jalankan
git clone https://github.com/ahmadsyafiqkamil/absensi.git /opt/absensi
cd /opt/absensi
chmod +x scripts/setup-debian.sh
./scripts/setup-debian.sh
```

### Langkah 2: Setup SSH Key untuk GitHub Actions

```bash
# Di server production, buat SSH key
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_key -N ""

# Tambahkan public key ke authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys

# Set permissions
chmod 600 ~/.ssh/github_actions_key
chmod 644 ~/.ssh/authorized_keys

# Tampilkan private key untuk GitHub Secrets
cat ~/.ssh/github_actions_key
```

### Langkah 3: Konfigurasi production.env

```bash
# Di server production
cd /opt/absensi
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

## 🔑 Setup GitHub Secrets

Buka repository GitHub → Settings → Secrets and variables → Actions → New repository secret

### Secrets yang Diperlukan:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `SERVER_IP` | IP address server production | `192.168.1.100` |
| `SERVER_USER` | Username untuk SSH ke server | `debian` atau `ubuntu` |
| `SERVER_SSH_PRIVATE_KEY` | Private key SSH (isi dari `~/.ssh/github_actions_key`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `FRONTEND_DOMAIN` | Domain untuk frontend | `absensi.kjri-dubai.com` |
| `API_DOMAIN` | Domain untuk API | `api.absensi.kjri-dubai.com` |

### Cara Menambahkan Secrets:

1. Buka [https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions](https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions)
2. Klik "New repository secret"
3. Masukkan nama secret dan value
4. Klik "Add secret"

## 🚀 Cara Deploy

### Metode 1: Otomatis (Push ke Branch)

```bash
# Di local machine
git add .
git commit -m "Deploy to production"
git push origin main
```

GitHub Actions akan otomatis menjalankan deployment.

### Metode 2: Manual (GitHub UI)

1. Buka [https://github.com/ahmadsyafiqkamil/absensi/actions](https://github.com/ahmadsyafiqkamil/absensi/actions)
2. Pilih workflow "Deploy to Production"
3. Klik "Run workflow"
4. Pilih branch `main`
5. Klik "Run workflow"

### Metode 3: Manual via GitHub CLI

```bash
# Install GitHub CLI
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

### 1. Melihat Status di GitHub

- Buka [https://github.com/ahmadsyafiqkamil/absensi/actions](https://github.com/ahmadsyafiqkamil/absensi/actions)
- Klik pada workflow run terbaru
- Lihat status setiap step

### 2. Melihat Status di Server

```bash
# Login ke server
ssh user@your-server-ip
cd /opt/absensi

# Check service status
./scripts/monitor.sh all

# Check specific service
docker-compose --env-file production.env -f docker-compose.prod.yml ps

# View logs
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f
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

# Add user to docker group
sudo usermod -aG docker $USER
# Logout dan login kembali
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

## 📋 Checklist Deployment

### Pre-Deployment
- [ ] Server provisioned dengan requirements
- [ ] Domain configured dan pointing ke server
- [ ] SSL certificate ready (auto via Caddy)
- [ ] Environment variables configured
- [ ] Database credentials secure
- [ ] Backup dari production data (jika ada)

### Deployment
- [ ] GitHub Actions workflow triggered
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

**Repository:** [https://github.com/ahmadsyafiqkamil/absensi](https://github.com/ahmadsyafiqkamil/absensi)  
**Last Updated:** $(date)  
**Version:** 1.0.0
