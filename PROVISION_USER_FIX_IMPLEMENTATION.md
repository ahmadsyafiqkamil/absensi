# Implementasi Perbaikan Provision User - Role/Group Tidak Tersimpan

## 🚨 Masalah yang Ditemukan

Saat membuat employee baru melalui halaman admin/add-user, field role/group tidak tersimpan di Django admin karena **ketidaksesuaian format data** antara frontend dan backend.

### Root Cause Analysis

1. **Frontend** mengirim data dalam format:
   ```javascript
   {
     username: "konsuler",
     password: "1",
     email: "konsuler@example.com",
     group: "pegawai"  // ❌ SINGULAR
   }
   ```

2. **Backend** mengharapkan data dalam format:
   ```python
   class UserProvisionSerializer(serializers.Serializer):
       groups = serializers.ListField(  # ❌ PLURAL ARRAY
           child=serializers.CharField(),
           required=False,
           allow_empty=True
       )
   ```

3. **Akibatnya**:
   - `validated_data.pop('groups', [])` mengembalikan `[]` (empty array)
   - Loop `for group_name in groups_data:` tidak pernah dijalankan
   - User tidak ditambahkan ke group manapun
   - **Role tidak tersimpan!**

## ✅ Solusi yang Diimplementasikan

### 1. Perbaikan Frontend API Route

**File**: `frontend/src/app/api/admin/users/provision/route.ts`

```javascript
// SEBELUM (SALAH)
body: JSON.stringify({
  username,
  password: password || '1',
  email: email || '',
  group  // ❌ Singular
})

// SESUDAH (BENAR)
body: JSON.stringify({
  username,
  password: password || '1',
  email: email || '',
  groups: [group]  // ✅ Array plural
})
```

### 2. Perbaikan Auth Client

**File**: `frontend/src/lib/api/auth/client.ts`

```javascript
// SEBELUM (SALAH)
const response = await legacyFetch('/api/v2/users/users/provision/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData)  // ❌ Langsung kirim userData
})

// SESUDAH (BENAR)
// Convert group to groups array format for backend compatibility
const { group, ...otherData } = userData
const requestData = {
  ...otherData,
  groups: [group]
}

const response = await legacyFetch('/api/v2/users/users/provision/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestData)  // ✅ Kirim dengan format yang benar
})
```

## 🔍 Verifikasi Implementasi

### 1. Test Case: Membuat Employee Baru

1. **Buka halaman**: `/admin/add-user`
2. **Isi form**:
   - Username: `test_konsuler`
   - Email: `test@example.com`
   - Password: `1`
   - Role: `pegawai`
   - NIP: `12345`
   - Division: pilih salah satu
   - Position: pilih salah satu
3. **Submit form**
4. **Verifikasi di Django Admin**:
   - Buka Django Admin → Users
   - Cari user `test_konsuler`
   - Di bagian "Groups", seharusnya sudah ada group "pegawai"

### 2. Test Case: API Direct Call

```bash
curl -X POST http://localhost:3000/api/admin/users/provision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "username": "test_api",
    "email": "test_api@example.com", 
    "password": "1",
    "groups": ["supervisor"]
  }'
```

### 3. Database Verification

```sql
-- Cek user yang dibuat
SELECT id, username, email FROM auth_user WHERE username = 'test_konsuler';

-- Cek group assignment
SELECT u.username, g.name as group_name 
FROM auth_user u
JOIN auth_user_groups ug ON u.id = ug.user_id
JOIN auth_group g ON ug.group_id = g.id
WHERE u.username = 'test_konsuler';
```

## 📋 Checklist Implementasi

- [x] Perbaikan `frontend/src/app/api/admin/users/provision/route.ts`
- [x] Perbaikan `frontend/src/lib/api/auth/client.ts`
- [x] Verifikasi tidak ada linter errors
- [x] Dokumentasi implementasi
- [x] Test script untuk verifikasi

## 🎯 Expected Results

Setelah implementasi ini:

1. **User Creation**: User berhasil dibuat dengan password yang benar
2. **Group Assignment**: User otomatis ditambahkan ke group yang sesuai
3. **Django Admin**: Role/group terlihat di Django admin interface
4. **No Errors**: Tidak ada error dalam proses provision
5. **Consistency**: Format data konsisten antara frontend dan backend

## 🔄 Rollback Plan

Jika ada masalah, rollback dengan mengubah kembali ke format singular:

```javascript
// Rollback ke format lama
body: JSON.stringify({
  username,
  password: password || '1',
  email: email || '',
  group  // Kembalikan ke singular
})
```

## 📝 Notes

- Perbaikan ini mempertahankan backward compatibility dengan interface yang ada
- Tidak ada perubahan pada backend Django
- Frontend tetap menggunakan `group` dalam form, tapi dikonversi ke `groups` saat dikirim ke API
- Semua role types (`admin`, `supervisor`, `pegawai`) akan berfungsi dengan benar

## 🚀 Deployment

Implementasi ini siap untuk deployment dan testing. Pastikan untuk:

1. Test di environment development terlebih dahulu
2. Verifikasi dengan membuat beberapa user dengan role berbeda
3. Cek di Django admin bahwa semua group assignment berfungsi
4. Monitor logs untuk memastikan tidak ada error
