@echo off
REM Starts the Suraty/PaisaMate backend (FastAPI) and frontend (Next.js).
REM MongoDB runs as an auto-start Windows service, so it isn't started here.

set ROOT=%~dp0

start "Suraty API (FastAPI :8000)" cmd /k "cd /d "%ROOT%server" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

start "Suraty Web (Next.js :3000)" cmd /k "cd /d "%ROOT%apps\web" && npm run dev"

echo.
echo Started backend on http://localhost:8000 and frontend on http://localhost:3000
echo Two new terminal windows have been opened. Close them to stop the servers.
