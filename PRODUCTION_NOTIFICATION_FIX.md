# Production Notification Error Fix

## 🔍 Masalah yang Ditemukan

### Error di Browser Console:
```
TypeError: Failed to fetch
[Backend Fetch] Attempt 1 failed: TypeError: Failed to fetch
[NotificationBadge] Failed to load unread count: TypeError: Failed to fetch
```

### Root Cause:
**Environment variable `NEXT_PUBLIC_BACKEND_URL` tidak ter-load dengan benar** di production build.

### Mengapa Ini Terjadi:
1. **Next.js Production Build**: `NEXT_PUBLIC_*` variables di-embed saat build time, bukan runtime
2. **Frontend container** menggunakan environment variable yang salah atau tidak ada
3. **Fallback ke localhost**: `process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'`
4. **Di production**: `localhost:8000` tidak tersedia → **Failed to fetch**

### Analisis Kode:
- `frontend/src/lib/backend.ts` line 9: `process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'`
- `frontend/src/lib/api-utils.ts` line 21: `process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'`
- `NotificationBadge.tsx` menggunakan `v2Fetch` yang memanggil `getBackendBaseUrl()`

## ✅ Solusi yang Diterapkan

### 1. Perbaikan Konfigurasi Environment
File `production.env` telah diperbaiki dengan konfigurasi yang benar:

```bash
# Frontend Configuration
FRONTEND_DOMAIN=siaki.kjri-dubai.local
API_DOMAIN=api.siaki.kjri-dubai.local
NEXT_PUBLIC_API_URL=https://api.siaki.kjri-dubai.local
NEXT_PUBLIC_BACKEND_URL=https://api.siaki.kjri-dubai.local
```

### 2. Langkah-langkah untuk Menerapkan di Production Server:

```bash
# 1. Copy file production.env yang sudah diperbaiki ke server
scp production.env user@your-server:/path/to/absensi/

# 2. REBUILD frontend container (PENTING: tidak cukup restart!)
docker-compose -f docker-compose.prod.yml up -d --build frontend

# 3. Verifikasi environment variables ter-load dengan benar
docker exec absensi_frontend_prod env | grep NEXT_PUBLIC

# 4. Verifikasi logs
docker logs absensi_frontend_prod --tail 20
```

### 3. Verifikasi Perbaikan:

1. **Browser Developer Tools → Network Tab**:
   - API calls harus ke `https://api.siaki.kjri-dubai.local`
   - Tidak ada request ke `localhost:8000`

2. **Browser Developer Tools → Console**:
   - Tidak ada error "Failed to fetch"
   - Notification badge berfungsi normal

3. **Environment Variables Check**:
   ```bash
   docker exec absensi_frontend_prod env | grep NEXT_PUBLIC
   # Should show:
   # NEXT_PUBLIC_API_URL=https://api.siaki.kjri-dubai.local
   # NEXT_PUBLIC_BACKEND_URL=https://api.siaki.kjri-dubai.local
   ```

## 🔧 File yang Dimodifikasi

- `production.env` - Konfigurasi environment variables
- `debug-production-env.sh` - Script untuk debugging dan troubleshooting

## 📋 Checklist Verifikasi

- [ ] File `production.env` sudah diperbarui di server
- [ ] Frontend container sudah di-REBUILD (bukan hanya restart)
- [ ] Environment variables ter-load dengan benar: `docker exec absensi_frontend_prod env | grep NEXT_PUBLIC`
- [ ] Browser console tidak ada error "Failed to fetch"
- [ ] Notification badge menampilkan data dengan benar
- [ ] API calls menggunakan domain yang benar (`api.siaki.kjri-dubai.local`)

## 🚨 Catatan Penting

- **NEXT_PUBLIC_*** variables di-embed saat build time, bukan runtime
- **MUST REBUILD** frontend container untuk perubahan environment variables
- **Restart saja tidak cukup** untuk mengubah NEXT_PUBLIC_* variables
- **Domain configuration** harus konsisten di semua file konfigurasi

## 🔄 Jika Masih Ada Masalah

1. **Cek Environment Variables**:
   ```bash
   docker exec absensi_frontend_prod env | grep NEXT_PUBLIC
   ```

2. **Cek DNS**: Pastikan domain `api.siaki.kjri-dubai.local` resolve dengan benar
   ```bash
   nslookup api.siaki.kjri-dubai.local
   ```

3. **Cek SSL**: Pastikan sertifikat SSL valid untuk domain tersebut
   ```bash
   curl -k https://api.siaki.kjri-dubai.local/api/v2/auth/health/
   ```

4. **Cek Caddy logs**: `docker logs absensi_caddy_prod`

5. **Cek Backend logs**: `docker logs absensi_backend_prod`

6. **Test dari dalam container**:
   ```bash
   docker exec -it absensi_frontend_prod sh
   # Inside container:
   curl -k https://api.siaki.kjri-dubai.local/api/v2/auth/health/
   ```

## 🎯 Expected Result

Setelah perbaikan, browser console seharusnya menampilkan:
- ✅ API calls ke `https://api.siaki.kjri-dubai.local/api/v2/notifications/...`
- ✅ Tidak ada error "Failed to fetch"
- ✅ Notification badge menampilkan jumlah notifikasi yang benar
- ✅ Semua fitur notification berfungsi normal
