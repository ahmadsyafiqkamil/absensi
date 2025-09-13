# Work Settings - Empty Database Handling

## Skenario: Database Kosong (Tidak Ada WorkSettings)

Ketika database tidak memiliki data WorkSettings, sistem harus dapat menangani situasi ini dengan baik.

### 🔍 **Perilaku Sistem Sebelum Perbaikan**

#### **GET Request**
```bash
curl -b cookies.txt http://localhost:3000/api/admin/settings/work
# Response: {"error":"Work settings not configured"}
# Status: 200
```

#### **PUT Request**
```bash
curl -X PUT -H "Content-Type: application/json" -b cookies.txt -d '{...}' http://localhost:3000/api/admin/settings/work
# Response: {"detail":"Settings ID not found"}
# Status: 400
```

**Masalah**: PUT request gagal karena tidak ada ID untuk di-update.

### ✅ **Perilaku Sistem Setelah Perbaikan**

#### **GET Request**
```bash
curl -b cookies.txt http://localhost:3000/api/admin/settings/work
# Response: {"error":"Work settings not configured"}
# Status: 200
```

#### **PUT Request (Create New)**
```bash
curl -X PUT -H "Content-Type: application/json" -b cookies.txt -d '{...}' http://localhost:3000/api/admin/settings/work
# Response: {"id":3,"timezone":"Asia/Dubai",...}
# Status: 201
```

#### **PUT Request (Update Existing)**
```bash
curl -X PUT -H "Content-Type: application/json" -b cookies.txt -d '{"id":3,...}' http://localhost:3000/api/admin/settings/work
# Response: {"id":3,"timezone":"Asia/Dubai",...}
# Status: 200
```

### 🔧 **Implementasi Perbaikan**

#### **Frontend API Route (`frontend/src/app/api/admin/settings/work/route.ts`)**

```typescript
export async function PUT(req: Request) {
  const chk = await ensureAdmin()
  if (!chk.ok) return NextResponse.json({ detail: 'Forbidden' }, { status: chk.status })
  const body = await req.json().catch(() => ({}))
  
  // Cek apakah WorkSettings sudah ada
  let settingsExists = false
  let id = body?.id
  
  try {
    const getResp = await fetch(`${chk.backendBase}/api/v2/settings/work/`, {
      headers: { Authorization: `Bearer ${chk.accessToken}` },
    })
    if (getResp.ok) {
      const settings = await getResp.json()
      settingsExists = true
      id = settings.id
    }
  } catch (e) {
    console.error('Error checking settings:', e)
  }
  
  let resp
  if (settingsExists && id) {
    // Update existing settings
    resp = await fetch(`${chk.backendBase}/api/v2/settings/work/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chk.accessToken}` },
      body: JSON.stringify(body),
    })
  } else {
    // Create new settings
    resp = await fetch(`${chk.backendBase}/api/v2/settings/work/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chk.accessToken}` },
      body: JSON.stringify(body),
    })
  }
  
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}
```

### 📋 **Flow Lengkap**

#### **1. Database Kosong**
- WorkSettings count: 0
- GET request mengembalikan error message
- PUT request akan membuat data baru

#### **2. Setelah Data Dibuat**
- WorkSettings count: 1
- GET request mengembalikan data lengkap
- PUT request akan mengupdate data existing

#### **3. Update Data**
- PUT request dengan ID yang sama akan mengupdate data
- Response mengembalikan data yang sudah diupdate

### 🧪 **Testing Skenario**

#### **Test 1: Database Kosong → Create**
```bash
# 1. Hapus semua data
docker-compose exec backend python manage.py shell -c "
from apps.settings.models import WorkSettings
WorkSettings.objects.all().delete()
print('WorkSettings count:', WorkSettings.objects.count())
"

# 2. Test GET (harus error)
curl -b cookies.txt http://localhost:3000/api/admin/settings/work
# Expected: {"error":"Work settings not configured"}

# 3. Test PUT (harus create)
curl -X PUT -H "Content-Type: application/json" -b cookies.txt -d '{...}' http://localhost:3000/api/admin/settings/work
# Expected: {"id":X,"timezone":"Asia/Dubai",...}
```

#### **Test 2: Data Ada → Update**
```bash
# 1. Test GET (harus return data)
curl -b cookies.txt http://localhost:3000/api/admin/settings/work
# Expected: {"id":X,"timezone":"Asia/Dubai",...}

# 2. Test PUT (harus update)
curl -X PUT -H "Content-Type: application/json" -b cookies.txt -d '{"id":X,...}' http://localhost:3000/api/admin/settings/work
# Expected: {"id":X,"timezone":"Asia/Dubai",...}
```

### 🎯 **Keuntungan Solusi Ini**

1. **Auto-Create**: Sistem otomatis membuat WorkSettings jika belum ada
2. **Auto-Update**: Sistem otomatis mengupdate WorkSettings jika sudah ada
3. **Transparent**: Frontend tidak perlu tahu apakah data ada atau tidak
4. **Robust**: Menangani semua skenario dengan baik
5. **User-Friendly**: Admin bisa langsung simpan settings tanpa setup manual

### 🔄 **Backend API Endpoints**

#### **GET /api/v2/settings/work/**
- **Ada data**: Return WorkSettings object
- **Tidak ada data**: Return 404 dengan error message

#### **POST /api/v2/settings/work/**
- **Ada data**: Return 400 "Work settings already exist"
- **Tidak ada data**: Create new WorkSettings

#### **PATCH /api/v2/settings/work/{id}/**
- **Ada data**: Update existing WorkSettings
- **Tidak ada data**: Return 404

### 📝 **Kesimpulan**

Sistem sekarang dapat menangani skenario database kosong dengan baik:
- ✅ **GET request** mengembalikan error message yang informatif
- ✅ **PUT request** otomatis membuat data baru jika belum ada
- ✅ **PUT request** mengupdate data existing jika sudah ada
- ✅ **Frontend** tidak perlu menangani logika create/update
- ✅ **User experience** smooth tanpa error 400
