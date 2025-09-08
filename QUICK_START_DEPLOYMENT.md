# 🚀 Quick Start: Deploy dengan GitHub Actions

Panduan cepat untuk mendeploy aplikasi Absensi ke production menggunakan GitHub Actions.

## ⚡ Langkah Cepat (5 Menit)

### 1. Setup Server Production

```bash
# Login ke server production
ssh user@your-server-ip

# Download dan jalankan setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/absensi-kjri-dubai/main/scripts/setup-server.sh | bash

# Atau clone repository dan jalankan
git clone https://github.com/your-repo/absensi-kjri-dubai.git /opt/absensi
cd /opt/absensi
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

### 2. Konfigurasi GitHub Secrets

Buka repository GitHub → Settings → Secrets and variables → Actions

Tambahkan secrets berikut:

| Secret | Value | Contoh |
|--------|-------|--------|
| `SERVER_IP` | IP server production | `192.168.1.100` |
| `SERVER_USER` | Username SSH | `ubuntu` |
| `SERVER_SSH_PRIVATE_KEY` | Private key dari server | `-----BEGIN OPENSSH...` |
| `FRONTEND_DOMAIN` | Domain frontend | `absensi.kjri-dubai.com` |
| `API_DOMAIN` | Domain API | `api.absensi.kjri-dubai.com` |

### 3. Update production.env

```bash
# Di server production
cd /opt/absensi
nano production.env

# Ganti nilai-nilai berikut:
# - MYSQL_ROOT_PASSWORD=password-kuat-anda
# - SECRET_KEY=secret-key-django-min-50-karakter
# - FRONTEND_DOMAIN=domain-anda.com
# - API_DOMAIN=api.domain-anda.com
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
# Di server production
cd /opt/absensi
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

## 🔧 Troubleshooting Cepat

### Deployment Gagal?
1. **Check GitHub Actions Logs** - Buka Actions tab di GitHub
2. **Check Server Logs** - `docker-compose logs` di server
3. **Test SSH** - `ssh -i ~/.ssh/github_actions_key user@server-ip`

### Service Tidak Running?
```bash
# Restart services
cd /opt/absensi
docker-compose --env-file production.env -f docker-compose.prod.yml restart

# Check logs
docker-compose --env-file production.env -f docker-compose.prod.yml logs -f
```

### Domain Tidak Bisa Diakses?
1. Pastikan domain pointing ke server IP
2. Check DNS propagation: `nslookup yourdomain.com`
3. Wait 5-10 menit untuk SSL certificate

## 📞 Butuh Bantuan?

1. **Check Logs**: `./scripts/monitor.sh logs`
2. **Check Health**: `./scripts/monitor.sh health`
3. **Manual Deploy**: `./docker-prod.sh`
4. **Rollback**: Restore dari backup di `./backups/`

---

**Total waktu setup: ~5 menit** ⏱️
