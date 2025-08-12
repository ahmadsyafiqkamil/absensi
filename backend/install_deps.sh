#!/bin/bash

echo "🔧 Installing Backend Dependencies..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "✅ Dependencies installed successfully!"
echo ""
echo "🚀 To run the application:"
echo "   source .venv/bin/activate"
echo "   python run.py"
echo ""
echo "🌐 Access the API at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"

