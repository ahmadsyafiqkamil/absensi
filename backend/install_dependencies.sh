#!/bin/bash

echo "Installing FastAPI backend dependencies..."

# Aktifkan virtual environment jika ada
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo "Dependencies installed successfully!"
echo ""
echo "To run the application:"
echo "python3 run.py"
echo "or"
echo "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
