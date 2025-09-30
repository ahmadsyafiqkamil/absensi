# Environment Configuration Guide

## Overview
Sistem ini menggunakan konfigurasi backend URL yang berbeda untuk development dan production environment.

## Development Environment (docker-compose.dev.yml)

### Frontend Configuration
- **NODE_ENV**: `development`
- **NEXT_PUBLIC_BACKEND_URL**: `http://localhost:8000` (untuk client-side requests)
- **BACKEND_URL**: `http://backend:8000` (untuk server-side API routes)

### Backend URLs
- **Server-side (API routes)**: `http://backend:8000` (container-to-container networking)
- **Client-side (browser)**: `http://localhost:8000` (host networking)

## Production Environment (docker-compose.prod.yml)

### Frontend Configuration
- **NODE_ENV**: `production`
- **NEXT_PUBLIC_BACKEND_URL**: `https://api.siaki.kjri-dubai.local` (untuk client-side requests)
- **BACKEND_URL**: `https://api.siaki.kjri-dubai.local` (untuk server-side API routes)

### Backend URLs
- **Server-side (API routes)**: `https://api.siaki.kjri-dubai.local`
- **Client-side (browser)**: `https://api.siaki.kjri-dubai.local`

## Environment Variables

### Development (.env.dev)
```bash
NODE_ENV=development
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_URL=http://backend:8000
```

### Production (production.env)
```bash
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://api.siaki.kjri-dubai.local
BACKEND_URL=https://api.siaki.kjri-dubai.local
```

## How It Works

### 1. Backend URL Detection
Sistem secara otomatis mendeteksi environment berdasarkan `NODE_ENV`:

```typescript
// frontend/src/lib/backend.ts
export const getBackendBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side (API routes)
    if (process.env.NODE_ENV === 'production') {
      return process.env.BACKEND_URL || 'https://api.siaki.kjri-dubai.local'
    } else {
      return process.env.BACKEND_URL || 'http://backend:8000'
    }
  } else {
    // Client-side (browser)
    if (process.env.NODE_ENV === 'production') {
      return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.siaki.kjri-dubai.local'
    } else {
      return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    }
  }
}
```

### 2. API Utils Configuration
```typescript
// frontend/src/lib/api-utils.ts
export function getBackendUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL || 'https://api.siaki.kjri-dubai.local';
  } else {
    return process.env.BACKEND_URL || 'http://backend:8000';
  }
}
```

## Running Different Environments

### Development
```bash
# Menggunakan localhost untuk semua requests
docker-compose -f docker-compose.dev.yml up
```

### Production
```bash
# Menggunakan https://api.siaki.kjri-dubai.local untuk semua requests
docker-compose -f docker-compose.prod.yml up
```

## Troubleshooting

### Development Issues
- Pastikan backend container berjalan di port 8000
- Periksa Docker network `absensi_absensi_network_dev`
- Verifikasi environment variables di container

### Production Issues
- Pastikan domain `api.siaki.kjri-dubai.local` dapat diakses
- Periksa SSL certificate untuk HTTPS
- Verifikasi CORS configuration di backend

## Testing Configuration

### Test Development
```bash
curl -X GET http://localhost:3000/api/health
```

### Test Production
```bash
curl -X GET https://siaki.kjri-dubai.local/api/health
```

