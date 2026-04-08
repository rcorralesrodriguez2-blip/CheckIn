#!/bin/bash

# Face Recognition Service Launcher
# This script helps start the face recognition service with proper environment setup

echo "🚀 Starting Face Recognition Service..."
echo "====================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << EOF
# Database configuration
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=checkin_db

# Face recognition service
FACE_SERVICE_HOST=localhost
FACE_SERVICE_PORT=8000
EOF
    echo "✅ Created .env template. Please edit it with your database credentials."
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Start the service
echo "🎯 Starting FastAPI server..."
echo "🌐 Service will be available at: http://$FACE_SERVICE_HOST:$FACE_SERVICE_PORT"
echo "📊 Health check: http://$FACE_SERVICE_HOST:$FACE_SERVICE_PORT/health"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

python app.py