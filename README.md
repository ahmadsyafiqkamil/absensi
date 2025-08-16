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
