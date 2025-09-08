# 🐧 Setup Debian Server Tanpa Sudo

Panduan untuk setup server Debian yang tidak memiliki `sudo` terinstall.

## 🔍 Analisis Masalah

Berdasarkan output shell yang Anda tunjukkan:

```
OS: Debian GNU/Linux 13 (trixie)
User: kava
IP: 192.168.141.7
bash: line 27: sudo: command not found
```

**Masalah:**
- Server Debian tidak memiliki `sudo` terinstall
- User `kava` tidak memiliki akses root
- Script setup gagal karena memerlukan `sudo`

## 🚀 Solusi

### Metode 1: Setup sebagai Root (Recommended)

```bash
# 1. Login ke server sebagai kava
ssh kava@192.168.141.7

# 2. Switch ke root
su -

# 3. Jalankan script setup khusus
curl -fsSL https://raw.githubusercontent.com/ahmadsyafiqkamil/absensi/main/scripts/setup-debian-no-sudo.sh | bash

# 4. Switch kembali ke kava user
exit
cd /opt/absensi
```

### Metode 2: Install Sudo Terlebih Dahulu

```bash
# 1. Login ke server sebagai kava
ssh kava@192.168.141.7

# 2. Switch ke root
su -

# 3. Install sudo
apt update && apt install -y sudo

# 4. Add kava user to sudo group
usermod -aG sudo kava

# 5. Switch kembali ke kava user
exit

# 6. Test sudo
sudo whoami

# 7. Jalankan script setup regular
curl -fsSL https://raw.githubusercontent.com/ahmadsyafiqkamil/absensi/main/scripts/quick-setup.sh | bash
```

### Metode 3: Manual Setup

```bash
# 1. Login sebagai root
ssh root@192.168.141.7
# atau
su -

# 2. Update system
apt update && apt upgrade -y

# 3. Install required packages
apt install -y curl wget git rsync ca-certificates gnupg lsb-release software-properties-common sudo

# 4. Install Docker
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Install Docker Compose
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# 6. Start Docker
systemctl start docker
systemctl enable docker

# 7. Create application directory
mkdir -p /opt/absensi
chown -R kava:kava /opt/absensi

# 8. Clone repository
sudo -u kava git clone https://github.com/ahmadsyafiqkamil/absensi.git /opt/absensi

# 9. Add kava to docker group
usermod -aG docker kava

# 10. Switch to kava user
exit
cd /opt/absensi
```

## 🔧 Setup GitHub Actions

### 1. Generate SSH Key

```bash
# Di server sebagai kava user
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_key -N ""
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_actions_key
chmod 644 ~/.ssh/authorized_keys
```

### 2. Copy Private Key

```bash
# Tampilkan private key untuk GitHub Secrets
cat ~/.ssh/github_actions_key
```

### 3. Konfigurasi GitHub Secrets

Buka [https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions](https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions)

Tambahkan secrets:
- `SERVER_IP`: `192.168.141.7`
- `SERVER_USER`: `kava`
- `SERVER_SSH_PRIVATE_KEY`: (copy dari output `cat ~/.ssh/github_actions_key`)
- `FRONTEND_DOMAIN`: `yourdomain.com`
- `API_DOMAIN`: `api.yourdomain.com`

## 📝 Konfigurasi production.env

```bash
# Di server sebagai kava user
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

## 🚀 Deploy

### Metode 1: GitHub Actions (Recommended)

```bash
# Push ke GitHub
git add .
git commit -m "Deploy to production"
git push origin main
```

### Metode 2: Manual Deploy

```bash
# Di server sebagai kava user
cd /opt/absensi
./docker-prod.sh
```

## ✅ Verifikasi

### Check Status
```bash
# Di server sebagai kava user
cd /opt/absensi
./scripts/monitor.sh all
```

### Test Aplikasi
```bash
# Test backend
curl http://localhost:8000/health/

# Test frontend
curl http://localhost:3000
```

## 🔧 Troubleshooting

### Jika Masih Ada Masalah

1. **Check Docker Status**
   ```bash
   systemctl status docker
   docker --version
   ```

2. **Check Permissions**
   ```bash
   ls -la /opt/absensi
   whoami
   groups
   ```

3. **Check SSH Key**
   ```bash
   ls -la ~/.ssh/
   cat ~/.ssh/github_actions_key.pub
   ```

4. **Check GitHub Actions Logs**
   - Buka [Actions tab](https://github.com/ahmadsyafiqkamil/absensi/actions)
   - Lihat error di workflow run

## 📋 Checklist

### Pre-Setup
- [ ] Server Debian 13 (trixie) ✅
- [ ] User: kava ✅
- [ ] IP: 192.168.141.7 ✅
- [ ] Root access tersedia

### Setup
- [ ] Install Docker dan Docker Compose
- [ ] Clone repository ke /opt/absensi
- [ ] Set permissions untuk kava user
- [ ] Generate SSH key untuk GitHub Actions
- [ ] Konfigurasi production.env

### GitHub Actions
- [ ] Tambahkan semua required secrets
- [ ] Test SSH connection
- [ ] Trigger deployment

### Post-Deployment
- [ ] Semua services running
- [ ] Health checks pass
- [ ] Domain accessible (jika sudah dikonfigurasi)

---

**Server Info:**
- OS: Debian GNU/Linux 13 (trixie)
- User: kava
- IP: 192.168.141.7
- Status: Ready for setup

**Next Step:** Jalankan script setup sebagai root
