#!/bin/bash
# Render.com startup script for FastAPI backend
set -e

cd server

# Ensure we bind to 0.0.0.0 and use the PORT environment variable
PORT=${PORT:-8000}
HOST=0.0.0.0

echo "Starting FastAPI on $HOST:$PORT"
python -m uvicorn main:app --host $HOST --port $PORT --no-reload --workers 1
