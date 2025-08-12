# 📚 API Endpoints Documentation

## 🔗 Base URL
```
http://localhost:8000/api/v1
```

## 🗄️ Database Testing Endpoints

### Test Database Connection
```http
GET /test/test-connection
```
**Response:**
```json
{
  "status": "success",
  "message": "Database connection successful",
  "user_count": 1
}
```

### Initialize Database Tables
```http
GET /test/init-db
```
**Response:**
```json
{
  "status": "success",
  "message": "Database tables initialized successfully"
}
```

## 👥 User Endpoints

### Get All Users
```http
GET /users/?skip=0&limit=100&active_only=false
```

**Query Parameters:**
- `skip` (int, optional): Number of records to skip (default: 0)
- `limit` (int, optional): Number of records to return (default: 100, max: 1000)
- `active_only` (bool, optional): Show only active users (default: false)

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@absensi.com",
    "full_name": "Administrator",
    "is_active": true,
    "is_admin": true,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
]
```

### Get User by ID
```http
GET /users/{user_id}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@absensi.com",
  "full_name": "Administrator",
  "is_active": true,
  "is_admin": true,
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

### Get User by Username
```http
GET /users/username/{username}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@absensi.com",
  "full_name": "Administrator",
  "is_active": true,
  "is_admin": true,
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

### Get User by Email
```http
GET /users/email/{email}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@absensi.com",
  "full_name": "Administrator",
  "is_active": true,
  "is_admin": true,
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

### Create New User
```http
POST /users/
```

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "full_name": "New User",
  "password": "password123",
  "is_active": true,
  "is_admin": false
}
```

**Response:**
```json
{
  "id": 2,
  "username": "newuser",
  "email": "newuser@example.com",
  "full_name": "New User",
  "is_active": true,
  "is_admin": false,
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

### Update User
```http
PUT /users/{user_id}
```

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "is_active": false
}
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@absensi.com",
  "full_name": "Updated Name",
  "is_active": false,
  "is_admin": true,
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

### Delete User
```http
DELETE /users/{user_id}
```

**Response:** 204 No Content

## 🔐 Authentication Endpoints

### Login
```http
POST /auth/login
```

### Register
```http
POST /auth/register
```

### Logout
```http
POST /auth/logout
```

## 📊 Attendance Endpoints

### Get All Attendance Records
```http
GET /attendance/
```

### Get Attendance Record by ID
```http
GET /attendance/{record_id}
```

### Check In
```http
POST /attendance/check-in
```

### Check Out
```http
POST /attendance/check-out
```

### Get User Attendance
```http
GET /attendance/user/{user_id}
```

## 🧪 Testing

### Run API Tests
```bash
cd backend
python test_api.py
```

### Manual Testing with curl

#### Test Database Connection
```bash
curl http://localhost:8000/api/v1/test/test-connection
```

#### Get All Users
```bash
curl http://localhost:8000/api/v1/users/
```

#### Get User by ID
```bash
curl http://localhost:8000/api/v1/users/1
```

#### Get User by Username
```bash
curl http://localhost:8000/api/v1/users/username/admin
```

#### Create New User
```bash
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "testpassword123",
    "is_active": true,
    "is_admin": false
  }'
```

## 📝 Error Responses

### 404 Not Found
```json
{
  "detail": "User with ID 999 not found"
}
```

### 400 Bad Request
```json
{
  "detail": "Username already registered"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Database error: connection failed"
}
```

## 🔧 Development

### Initialize Database
```bash
# Run database initialization
curl http://localhost:8000/api/v1/test/init-db
```

### View API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
