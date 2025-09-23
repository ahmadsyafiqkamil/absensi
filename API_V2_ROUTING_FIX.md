# API V2 Routing Fix

## Problem
Error 404 (Not Found) saat mengakses endpoint `/api/v2/corrections/supervisor/corrections/?status=pending` di halaman supervisor approvals.

## Root Cause Analysis

### 1. **Frontend API Routes Structure**
Frontend menggunakan Next.js API routes sebagai proxy ke backend Django. Struktur yang ada:

```
frontend/src/app/api/v2/corrections/
├── supervisor/
│   └── route.ts                    # /api/v2/corrections/supervisor/
├── corrections/
│   ├── route.ts                    # /api/v2/corrections/corrections/
│   └── [id]/
│       └── approve/
│           └── route.ts            # /api/v2/corrections/corrections/[id]/approve/
└── [other routes...]
```

### 2. **Missing Route**
Frontend mencoba mengakses `/api/v2/corrections/supervisor/corrections/` tapi route yang ada adalah `/api/v2/corrections/supervisor/`.

### 3. **Incorrect Endpoint Usage**
Frontend menggunakan endpoint yang tidak sesuai dengan struktur API routes yang ada.

## Solutions Implemented

### 1. **Fixed List Endpoint**

**Before:**
```typescript
// Wrong endpoint - route doesn't exist
const resp = await fetch('/api/v2/corrections/supervisor/corrections/?status=pending')
```

**After:**
```typescript
// Correct endpoint - uses existing route
const resp = await fetch('/api/v2/corrections/supervisor/?status=pending', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
})
```

### 2. **Fixed Approval Endpoint**

**Before:**
```typescript
// Wrong endpoint - route doesn't exist
const path = `/api/v2/corrections/supervisor/corrections/${id}/approve/`
```

**After:**
```typescript
// Correct endpoint - uses existing route
const path = `/api/v2/corrections/corrections/${id}/approve/`
```

### 3. **Added Proper Headers**
Menambahkan `credentials: 'include'` untuk mengirim cookies dan proper headers untuk authentication.

## API Routes Mapping

### Frontend Routes → Backend Endpoints

| Frontend Route | Backend Endpoint | Purpose |
|----------------|------------------|---------|
| `/api/v2/corrections/supervisor/` | `/api/v2/corrections/supervisor/corrections/` | List supervisor corrections |
| `/api/v2/corrections/corrections/[id]/approve/` | `/api/v2/corrections/corrections/[id]/approve/` | Approve/reject correction |
| `/api/v2/corrections/corrections/` | `/api/v2/corrections/corrections/` | General corrections CRUD |

### Backend URL Structure

```
Django Backend:
├── /api/v2/corrections/
│   ├── corrections/                    # Main corrections endpoint
│   ├── supervisor/corrections/         # Supervisor-specific corrections
│   ├── admin/corrections/              # Admin-specific corrections
│   └── employee/corrections/           # Employee-specific corrections
```

## Frontend API Routes Details

### 1. Supervisor Corrections Route
**File:** `frontend/src/app/api/v2/corrections/supervisor/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  
  const backendUrl = `${getBackendBaseUrl()}/api/v2/corrections/supervisor/corrections/?status=${status}`
  
  const response = await fetch(backendUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store'
  })
  
  return NextResponse.json(transformedData)
}
```

### 2. Correction Approval Route
**File:** `frontend/src/app/api/v2/corrections/corrections/[id]/approve/route.ts`

```typescript
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get('access_token')?.value
  const body = await request.json()
  const backend = process.env.BACKEND_URL || 'http://backend:8000'
  const url = `${backend}/api/v2/corrections/corrections/${(await params).id}/approve/`
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  })
  
  return NextResponse.json(data, { status: resp.status })
}
```

## Testing Instructions

### Test with Konsuler Account

1. **Login** dengan akun konsuler (username: `konsuler`, password: `1`)
2. **Navigate** ke `/supervisor/approvals`
3. **Check Network Tab** - harus tidak ada error 404
4. **Verify Data Loads** - corrections data muncul di table
5. **Test Approval** - bisa approve/reject corrections

### Expected Results

✅ **No 404 Error** - Endpoint accessible melalui frontend API routes
✅ **Data Loads** - Corrections data muncul di table
✅ **Approval Works** - Bisa approve/reject corrections
✅ **Authentication** - Proper token handling melalui cookies

## Debug Information

### Frontend Console Logs
```javascript
// Check API call
console.log('LOAD_DATA_V2', { list, response: data });

// Check approval action
console.log('APPROVAL_ACTION_V2', { id, action, path });
console.log('APPROVAL_RESPONSE_V2', { status: resp.status, ok: resp.ok, body: d });
```

### Backend Logs
```python
# Check supervisor corrections API route
print('Fetching supervisor corrections from:', backendUrl)
print('Backend response data:', data)
```

### Network Tab
- **Request URL:** `http://localhost:3000/api/v2/corrections/supervisor/?status=pending`
- **Response Status:** 200 OK
- **Response Data:** Array of corrections

## Future Improvements

### 1. **Consistent Route Structure**
Buat route yang konsisten untuk semua endpoints:

```
frontend/src/app/api/v2/corrections/
├── supervisor/
│   ├── route.ts                    # List supervisor corrections
│   └── corrections/
│       ├── route.ts                # Supervisor corrections CRUD
│       └── [id]/
│           └── approve/
│               └── route.ts        # Supervisor approval actions
```

### 2. **Centralized API Configuration**
Buat konfigurasi terpusat untuk API endpoints:

```typescript
// lib/api-config.ts
export const API_ENDPOINTS = {
  CORRECTIONS: {
    SUPERVISOR: '/api/v2/corrections/supervisor/',
    APPROVE: (id: number) => `/api/v2/corrections/corrections/${id}/approve/`,
  }
}
```

### 3. **Error Handling**
Tambahkan error handling yang lebih baik:

```typescript
if (!response.ok) {
  const errorData = await response.json()
  throw new Error(`API Error: ${errorData.detail || 'Unknown error'}`)
}
```

## Conclusion

Perbaikan ini berhasil mengatasi masalah 404 Not Found dengan:

✅ **Correct API routes** - Menggunakan route yang sudah ada
✅ **Proper authentication** - Mengirim cookies dan headers dengan benar
✅ **Consistent endpoints** - Mapping yang jelas antara frontend dan backend
✅ **Working approval flow** - Endpoint approval yang berfungsi

Sekarang halaman supervisor approvals dapat mengakses data corrections dan melakukan approval actions tanpa error 404.
