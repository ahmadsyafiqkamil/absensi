# 🐳 Docker Setup - Sistem Absensi

Docker setup lengkap untuk sistem absensi dengan FastAPI backend, Next.js frontend, MySQL database, dan phpMyAdmin.

## 📋 Prerequisites

- Docker Desktop
- Docker Compose

## 🚀 Quick Start

### 1. Clone dan Setup

```bash
# Pastikan Anda berada di root directory project
cd /path/to/absensi

# Jalankan script Docker
./docker-run.sh
```

### 2. Manual Setup

```bash
# Build dan jalankan semua services
docker-compose up --build -d

# Atau jalankan satu per satu
docker-compose up mysql -d
docker-compose up phpmyadmin -d
docker-compose up backend -d
docker-compose up frontend -d
```

## 🌐 Services

Setelah berhasil dijalankan, Anda dapat mengakses:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js Application |
| Backend API | http://localhost:8000 | FastAPI Backend |
| API Documentation | http://localhost:8000/docs | Swagger UI |
| phpMyAdmin | http://localhost:8080 | Database Management |

## 🗄️ Database

### Credentials
- **Host**: localhost
- **Port**: 3306
- **Database**: absensi_db
- **Username**: absensi_user
- **Password**: absensi_password
- **Root Password**: rootpassword

### phpMyAdmin Access
- **Username**: root
- **Password**: rootpassword

## 📁 Project Structure

```
absensi/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
├── frontend/
│   ├── Dockerfile
│   └── src/
├── mysql/
│   └── init/
│       └── 01-init.sql
├── docker-compose.yml
├── docker-run.sh
└── README-Docker.md
```

## 🔧 Docker Commands

### View Services
```bash
# List running containers
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### Manage Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up --build -d
```

### Database Operations
```bash
# Access MySQL container
docker-compose exec mysql mysql -u root -p

# Backup database
docker-compose exec mysql mysqldump -u root -p absensi_db > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p absensi_db < backup.sql
```

## 🐛 Troubleshooting

### Port Conflicts
Jika ada port yang sudah digunakan, edit `docker-compose.yml`:

```yaml
ports:
  - "8001:8000"  # Change 8000 to 8001
```

### Database Connection Issues
1. Pastikan MySQL container sudah running:
   ```bash
   docker-compose logs mysql
   ```

2. Tunggu beberapa detik setelah MySQL start sebelum menjalankan backend

### Build Issues
1. Clean Docker cache:
   ```bash
   docker system prune -a
   ```

2. Rebuild tanpa cache:
   ```bash
   docker-compose build --no-cache
   ```

## 🔒 Environment Variables

Edit environment variables di `docker-compose.yml`:

```yaml
environment:
  - DATABASE_URL=mysql+pymysql://user:password@mysql:3306/absensi_db
  - SECRET_KEY=your-secret-key
  - PASSWORD_SALT=your-password-salt
```

## 📊 Monitoring

### Health Checks
```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000
```

### Resource Usage
```bash
# View container resource usage
docker stats
```

## 🚀 Production Deployment

Untuk production, pastikan untuk:

1. **Security**:
   - Ganti semua default passwords
   - Gunakan secrets management
   - Enable SSL/TLS

2. **Performance**:
   - Gunakan production images
   - Setup proper logging
   - Configure monitoring

3. **Backup**:
   - Setup automated database backups
   - Configure volume backups

## 📝 Notes

- Data MySQL akan tersimpan di Docker volume `mysql_data`
- Hot reload tersedia untuk development
- CORS sudah dikonfigurasi untuk localhost
- Sample admin user: `admin` / `admin123`
