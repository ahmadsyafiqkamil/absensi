#!/bin/bash

echo "🚀 Starting Backend Development Server..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Virtual environment not found. Creating..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

# Initialize database tables
echo "🗄️ Initializing database tables..."
python -c "
from app.core.database_init import init_db
init_db()
print('✅ Database tables initialized!')
"

# Run the application
echo "🌐 Starting FastAPI server..."
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🔗 Health Check: http://localhost:8000/health"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

