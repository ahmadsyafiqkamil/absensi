# 🔧 Panduan Troubleshooting Aplikasi Absensi

Berdasarkan hasil monitoring, berikut adalah masalah yang teridentifikasi dan cara memperbaikinya:

## 🚨 Masalah yang Ditemukan

### 1. **Database MySQL Tidak Bisa Start** ❌
- Error: `Table 'mysql.plugin' doesn't exist`
- Error: `unknown variable 'query_cache_size=256M'`
- Status: Unhealthy

### 2. **Docker Compose Version Warning** ⚠️
- Warning: `the attribute 'version' is obsolete`

### 3. **Environment Variable Warning** ⚠️
- Warning: `The "TIMESTAMP" variable is not set`

### 4. **Semua Services Unhealthy** ❌
- Database, Backend, Frontend, Caddy semuanya tidak sehat

## 🛠️ Langkah-langkah Perbaikan

### Langkah 1: Hentikan Semua Services
```bash
cd /home/kava/absensi
docker-compose -f docker-compose.prod.yml down
```

### Langkah 2: Bersihkan Volume MySQL (HATI-HATI!)
```bash
# Backup data jika ada data penting
sudo cp -r mysql/ mysql_backup_$(date +%Y%m%d_%H%M%S)/

# Hapus volume MySQL yang corrupt
docker volume rm absensi_mysql_data_prod 2>/dev/null || true
```

### Langkah 3: Perbaiki Konfigurasi MySQL
```bash
# Edit konfigurasi MySQL
nano mysql/conf.d/mysql.cnf
```

**Hapus atau comment baris ini:**
```ini
# query_cache_size=256M  # <- HAPUS BARIS INI
```

**Pastikan konfigurasi MySQL minimal seperti ini:**
```ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
max_connections=200
innodb_buffer_pool_size=256M
# query_cache_size=256M  # <- DI-COMMENT ATAU DIHAPUS
```

### Langkah 4: Perbaiki Docker Compose
```bash
# Edit docker-compose.prod.yml
nano docker-compose.prod.yml
```

**Hapus baris version di bagian atas:**
```yaml
# version: '3.8'  # <- HAPUS BARIS INI
services:
  mysql:
    # ... rest of config
```

### Langkah 5: Perbaiki Environment Variables
```bash
# Edit production.env
nano production.env
```

**Tambahkan variabel TIMESTAMP:**
```bash
# Tambahkan di bagian atas file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
```

### Langkah 6: Rebuild dan Start Services
```bash
# Rebuild semua images
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Langkah 7: Verifikasi Status
```bash
# Cek status services
./scripts/monitor.sh

# Atau cek manual
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

## 🔍 Troubleshooting Tambahan

### Jika MySQL Masih Error:
```bash
# Cek log MySQL
docker-compose -f docker-compose.prod.yml logs mysql

# Restart MySQL saja
docker-compose -f docker-compose.prod.yml restart mysql

# Jika masih error, coba dengan konfigurasi minimal
docker-compose -f docker-compose.prod.yml down
docker volume rm absensi_mysql_data_prod
docker-compose -f docker-compose.prod.yml up -d mysql
```

### Jika Frontend Build Error:
```bash
# Cek log frontend
docker-compose -f docker-compose.prod.yml logs frontend

# Rebuild frontend saja
docker-compose -f docker-compose.prod.yml build frontend --no-cache
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Jika Backend Error:
```bash
# Cek log backend
docker-compose -f docker-compose.prod.yml logs backend

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

## 📋 Checklist Verifikasi

- [ ] MySQL container running dan healthy
- [ ] Backend container running dan healthy  
- [ ] Frontend container running dan healthy
- [ ] Caddy container running dan healthy
- [ ] Tidak ada warning tentang version di docker-compose
- [ ] Tidak ada warning tentang TIMESTAMP variable
- [ ] Aplikasi bisa diakses via browser

## 🚨 Jika Masih Bermasalah

1. **Cek disk space:**
   ```bash
   df -h
   ```

2. **Cek memory:**
   ```bash
   free -h
   ```

3. **Cek Docker resources:**
   ```bash
   docker system df
   docker system prune  # Hati-hati, ini akan hapus data yang tidak digunakan
   ```

4. **Restart Docker daemon:**
   ```bash
   sudo systemctl restart docker
   ```

## 📞 Bantuan Tambahan

Jika masih ada masalah, jalankan perintah ini dan kirimkan hasilnya:

```bash
# Kumpulkan informasi sistem
echo "=== System Info ===" > troubleshooting.log
uname -a >> troubleshooting.log
docker --version >> troubleshooting.log
docker-compose --version >> troubleshooting.log

echo "=== Docker Status ===" >> troubleshooting.log
docker ps -a >> troubleshooting.log

echo "=== Docker Compose Status ===" >> troubleshooting.log
docker-compose -f docker-compose.prod.yml ps >> troubleshooting.log

echo "=== Recent Logs ===" >> troubleshooting.log
docker-compose -f docker-compose.prod.yml logs --tail=50 >> troubleshooting.log

cat troubleshooting.log
```
