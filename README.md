# 📊 Sistem Absensi - FastAPI + Next.js + MySQL

Sistem absensi modern dengan backend FastAPI, frontend Next.js, dan database MySQL.

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │    Backend  │    │   Database  │
│  Next.js    │◄──►│   FastAPI   │◄──►│    MySQL    │
│  Port:3000  │    │  Port:8000  │    │  Port:3306  │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Development Environment
./docker-dev.sh

# Production Environment
cp env.production.example .env
# Edit .env file with your configuration
./docker-prod.sh
```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python run.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Database Setup
```bash
# Install MySQL
# Create database: absensi_db
# Run SQL scripts from mysql/init/
```

## 🌐 Services

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

### Sample Data
- Admin user: `admin` / `admin123`

## 📁 Project Structure

```
absensi/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   └── attendance.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   └── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── package.json
├── mysql/
│   └── init/
│       └── 01-init.sql
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── docker-run.sh
├── docker-dev.sh
├── docker-prod.sh
└── README.md
```

## 🔧 Docker Commands

### Development
```bash
# Start development environment
./docker-dev.sh

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production
```bash
# Setup production environment
cp env.production.example .env
# Edit .env file

# Start production environment
./docker-prod.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/logout` - Logout

### Users
- `GET /api/v1/users/` - Get all users
- `GET /api/v1/users/{user_id}` - Get user by ID
- `POST /api/v1/users/` - Create user
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user

### Attendance
- `GET /api/v1/attendance/` - Get all attendance records
- `GET /api/v1/attendance/{record_id}` - Get attendance record by ID
- `POST /api/v1/attendance/check-in` - Check in
- `POST /api/v1/attendance/check-out` - Check out
- `GET /api/v1/attendance/user/{user_id}` - Get user attendance
- `GET /api/attendance/report` - Get detailed attendance report with summary statistics
- `GET /api/attendance/report/pdf` - Download attendance report as PDF

### Supervisor
- `GET /api/supervisor/team-attendance` - Get team attendance overview (supervisor/admin only)
- `GET /api/supervisor/attendance-detail/{employee_id}` - Get detailed attendance for specific employee (supervisor/admin only)

### Corrections
- `GET /api/attendance-corrections/` - List corrections
- `POST /api/attendance-corrections/[id]/approve` - Approve correction
- `POST /api/attendance-corrections/[id]/reject` - Reject correction

## 🛠️ Development

### Backend Development
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Database Management
```bash
# Access MySQL
docker-compose exec mysql mysql -u root -p

# Backup database
docker-compose exec mysql mysqldump -u root -p absensi_db > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p absensi_db < backup.sql
```

## 🔒 Security

### Development
- Default passwords for easy setup
- CORS enabled for localhost
- Debug mode enabled

### Production
- Change all default passwords
- Use strong SECRET_KEY
- Configure proper CORS origins
- Enable SSL/TLS
- Use environment variables

## 📊 Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000
```

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

## 🚀 Deployment

### Local Development
1. Clone repository
2. Run `./docker-dev.sh`
3. Access applications at localhost

### Production Deployment
1. Copy `env.production.example` to `.env`
2. Edit environment variables
3. Run `./docker-prod.sh`
4. Configure reverse proxy (nginx)
5. Setup SSL certificates

### Cloud Deployment
- **AWS**: Use ECS or EKS
- **Google Cloud**: Use GKE or Cloud Run
- **Azure**: Use AKS or Container Instances
- **DigitalOcean**: Use App Platform or Droplets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check documentation at `/docs`
- Review API documentation at `/docs`

## Fitur Utama

### 1. **Sistem Absensi dengan Geolocation**
- Check-in dan Check-out dengan GPS coordinates
- Geofencing untuk memastikan kehadiran di kantor
- Perhitungan otomatis keterlambatan dan jam kerja
- Support untuk hari kerja khusus (Jumat) dan hari libur

### 2. **Auto-Reset Data Absensi Harian**
- Data absensi hari ini (check-in, check-out, total kerja, keterlambatan) otomatis di-reset setiap hari
- Reset berdasarkan timezone kantor (default: Asia/Dubai)
- Refresh data real-time tanpa reload halaman setelah check-in/check-out
- Event system untuk sinkronisasi data antar komponen

### 3. **Format Jam Kerja yang Rapi**
- Utility function untuk format jam kerja yang konsisten di seluruh aplikasi
- Support format Indonesia (6j 30m) dan English (6h 30m)
- Auto-rounding menit untuk menghindari angka desimal yang tidak rapi
- Handling edge case untuk menit yang round up ke 60

### 4. **Filter System dengan Reset Button**
- Filter data berdasarkan date range, month, dan employee ID
- Tombol reset filter untuk mengosongkan semua filter sekaligus
- Konsisten di semua halaman attendance (pegawai, supervisor, admin)
- User experience yang lebih baik dengan kemudahan reset filter

### 5. **PDF Report Generation**
- Generate PDF report untuk data absensi
- Include summary statistics, work hours, dan detailed records
- Support filtering berdasarkan date range dan month
- Professional PDF layout dengan tables dan styling
- Auto-download dengan nama file yang informatif
- Utility function untuk format jam kerja yang konsisten (6j 30m bukan 6.0j 50.329999999999984m)

### 6. **Supervisor Attendance System**
- Fitur check-in dan check-out untuk supervisor
- Status absensi hari ini dengan real-time updates
- Geolocation tracking untuk verifikasi lokasi
- Auto-reset data setiap hari seperti pegawai
- Integration dengan existing attendance system
- Event-based refresh untuk sinkronisasi data
- Layout yang konsisten dengan halaman pegawai (Your Overview + Functions Grid)
- Monthly summary untuk ringkasan absensi bulanan supervisor
- Permission access untuk work settings (read-only) untuk supervisor
