# Backend FastAPI - Sistem Absensi

Backend API untuk sistem absensi menggunakan FastAPI dan MySQL.

## Setup

### 1. Install Dependencies

```bash
# Aktifkan virtual environment
source .venv/bin/activate  # macOS/Linux
# atau
.venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Setup Database MySQL

1. Install MySQL Server
2. Buat database:
```sql
CREATE DATABASE absensi_db;
```

### 3. Konfigurasi Environment

1. Copy file `env.example` ke `.env`:
```bash
cp env.example .env
```

2. Edit file `.env` dengan konfigurasi database Anda:
```env
DATABASE_URL=mysql+pymysql://username:password@localhost/absensi_db
SECRET_KEY=your-super-secret-key
PASSWORD_SALT=your-password-salt
```

### 4. Jalankan Aplikasi

```bash
# Menggunakan uvicorn langsung
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Atau menggunakan file run.py
python run.py
```

## API Endpoints

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

## Dokumentasi API

Setelah menjalankan aplikasi, Anda dapat mengakses:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Struktur Project

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── users.py
│   │       │   └── attendance.py
│   │       └── api.py
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   └── main.py
├── requirements.txt
├── run.py
└── env.example
```
