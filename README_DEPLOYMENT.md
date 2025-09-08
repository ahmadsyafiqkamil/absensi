# 🚀 Cara Deploy Absensi ke Server Production

Panduan sederhana untuk mendeploy aplikasi Absensi KJRI Dubai ke server production.

## ⚡ Quick Start (5 Menit)

### 1. Setup Server Production

```bash
# Login ke server production
ssh user@your-server-ip

# Download dan jalankan quick setup
curl -fsSL https://raw.githubusercontent.com/ahmadsyafiqkamil/absensi/main/scripts/quick-setup.sh | bash

# Atau clone repository dan jalankan
git clone https://github.com/ahmadsyafiqkamil/absensi.git /opt/absensi
cd /opt/absensi
chmod +x scripts/quick-setup.sh
./scripts/quick-setup.sh
```

### 2. Konfigurasi GitHub Secrets

Buka [https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions](https://github.com/ahmadsyafiqkamil/absensi/settings/secrets/actions)

Tambahkan secrets berikut:

| Secret | Value | Contoh |
|--------|-------|--------|
| `SERVER_IP` | IP server production | `192.168.1.100` |
| `SERVER_USER` | Username SSH | `debian` atau `ubuntu` |
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
1. **Check GitHub Actions Logs** - Buka [Actions tab](https://github.com/ahmadsyafiqkamil/absensi/actions)
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

## 📋 Checklist Deployment

### Pre-Deployment
- [ ] Server Debian/Ubuntu sudah siap
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

## 🆘 Butuh Bantuan?

1. **Check Logs**: `./scripts/monitor.sh logs`
2. **Check Health**: `./scripts/monitor.sh health`
3. **Manual Deploy**: `./docker-prod.sh`
4. **Rollback**: Restore dari backup di `./backups/`

## 📚 Dokumentasi Lengkap

- **`DEPLOYMENT_GUIDE.md`** - Panduan lengkap deployment
- **`DEBIAN_DEPLOYMENT.md`** - Panduan khusus Debian
- **`GITHUB_ACTIONS_DEPLOYMENT.md`** - Panduan GitHub Actions
- **`QUICK_START_DEPLOYMENT.md`** - Quick start guide

---

**Repository:** [https://github.com/ahmadsyafiqkamil/absensi](https://github.com/ahmadsyafiqkamil/absensi)  
**Total waktu setup: ~5 menit** ⏱️
