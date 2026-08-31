@echo off
REM Startup script for Windows - ensures proper binding
setlocal enabledelayedexpansion

cd /d "%~dp0server"

set HOST=0.0.0.0
set PORT=8000

echo Starting FastAPI on %HOST%:%PORT%
python -m uvicorn main:app --host %HOST% --port %PORT% --no-reload --workers 1

pause
