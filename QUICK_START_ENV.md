# Quick Start - Environment Configuration

## 🚀 Development (localhost)
```bash
# Start development environment
./switch-env.sh dev
# atau
docker-compose -f docker-compose.dev.yml up

# URLs:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## 🏭 Production (https://api.siaki.kjri-dubai.local)
```bash
# 1. Setup environment file
cp production.env.example production.env
# Edit production.env dengan konfigurasi yang benar

# 2. Start production environment
./switch-env.sh prod
# atau
docker-compose -f docker-compose.prod.yml up

# URLs:
# Frontend: https://siaki.kjri-dubai.local
# Backend: https://api.siaki.kjri-dubai.local
```

## 🔧 Environment Variables

### Development
- `NODE_ENV=development`
- `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`
- `BACKEND_URL=http://backend:8000`

### Production
- `NODE_ENV=production`
- `NEXT_PUBLIC_BACKEND_URL=https://api.siaki.kjri-dubai.local`
- `BACKEND_URL=https://api.siaki.kjri-dubai.local`

## ✅ Testing
```bash
# Test development
curl http://localhost:3000/api/health

# Test production (setelah domain dikonfigurasi)
curl https://siaki.kjri-dubai.local/api/health
```

## 🐛 Troubleshooting
- Pastikan environment variables sudah benar
- Periksa Docker containers berjalan: `docker ps`
- Lihat logs: `docker-compose logs -f frontend`

