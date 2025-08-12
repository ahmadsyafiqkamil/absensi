# 🔧 Troubleshooting Guide

## ImportError: email-validator is not installed

### Problem
```
ImportError: email-validator is not installed, run `pip install pydantic[email]`
```

### Solution 1: Install with pydantic[email]
```bash
cd backend
source .venv/bin/activate
pip install pydantic[email]
```

### Solution 2: Use the provided script
```bash
cd backend
./install_deps.sh
```

### Solution 3: Manual installation
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Database Connection Issues

### Problem: MySQL connection failed
```
Database error: (pymysql.err.OperationalError) (2003, "Can't connect to MySQL server")
```

### Solution 1: Check if MySQL is running
```bash
# If using Docker
docker-compose ps mysql

# If using local MySQL
sudo systemctl status mysql
```

### Solution 2: Check database configuration
```bash
# Edit .env file
cp env.example .env
# Update DATABASE_URL with correct credentials
```

### Solution 3: Initialize database
```bash
# Run database initialization
curl http://localhost:8000/api/v1/test/init-db
```

## Module Import Errors

### Problem: Module not found
```
ModuleNotFoundError: No module named 'app'
```

### Solution: Run from correct directory
```bash
cd backend
python run.py
```

## Port Already in Use

### Problem: Port 8000 is already in use
```
OSError: [Errno 48] Address already in use
```

### Solution 1: Kill existing process
```bash
lsof -ti:8000 | xargs kill -9
```

### Solution 2: Use different port
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Virtual Environment Issues

### Problem: Virtual environment not activated
```bash
# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate  # Windows
```

### Problem: Virtual environment not found
```bash
# Create new virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Testing Issues

### Problem: Requests module not found
```bash
pip install requests
```

### Problem: Test fails
```bash
# Use simple test script
python test_simple.py
```

## Quick Fix Scripts

### Install Dependencies
```bash
cd backend
./install_deps.sh
```

### Run Development Server
```bash
cd backend
./run_dev.sh
```

### Test API
```bash
cd backend
python test_simple.py
```

## Common Commands

### Start Backend
```bash
cd backend
source .venv/bin/activate
python run.py
```

### Test Database Connection
```bash
curl http://localhost:8000/api/v1/test/test-connection
```

### Get All Users
```bash
curl http://localhost:8000/api/v1/users/
```

### View API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

### Create .env file
```bash
cp env.example .env
```

### Required Variables
```env
DATABASE_URL=mysql+pymysql://user:password@localhost/absensi_db
SECRET_KEY=your-secret-key
PASSWORD_SALT=your-password-salt
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Docker Issues

### Problem: Docker containers not starting
```bash
# Check Docker status
docker info

# Restart Docker Desktop
# Then run
./docker-dev.sh
```

### Problem: Port conflicts
```bash
# Check what's using the port
lsof -i :8000
lsof -i :3000
lsof -i :3306
```

## Logs and Debugging

### View Backend Logs
```bash
# If using Docker
docker-compose logs backend

# If running locally
# Check console output
```

### Enable Debug Mode
```bash
# Add to .env file
DEBUG=true
```

## Still Having Issues?

1. **Check Python version**: `python --version`
2. **Check pip version**: `pip --version`
3. **Check virtual environment**: `which python`
4. **Reinstall dependencies**: `pip install -r requirements.txt --force-reinstall`
5. **Clear cache**: `pip cache purge`

## Support

If you're still experiencing issues:
1. Check the logs for specific error messages
2. Try running the simple test script: `python test_simple.py`
3. Verify all prerequisites are installed
4. Check if the database is accessible

