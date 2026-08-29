@echo off
REM Starts the Suraty/PaisaMate backend (FastAPI) and frontend (Next.js).
REM MongoDB runs as an auto-start Windows service, so it isn't started here.
REM Run setup.bat first if you haven't already (installs deps, creates the
REM backend's server\venv). If you re-run setup.bat later to update
REM dependencies, close these server windows first - a running --reload
REM server watches server\ (including venv\) and can lock files mid-install.

set ROOT=%~dp0
set VENV_PY=%ROOT%server\venv\Scripts\python.exe

if exist "%VENV_PY%" (
    start "Suraty API (FastAPI :8000)" cmd /k "cd /d "%ROOT%server" && "%VENV_PY%" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
) else (
    echo No server\venv found - falling back to the global python. Run setup.bat to create one.
    start "Suraty API (FastAPI :8000)" cmd /k "cd /d "%ROOT%server" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
)

start "Suraty Web (Next.js :3000)" cmd /k "cd /d "%ROOT%apps\web" && npm run dev"

echo.
echo Started backend on http://localhost:8000 and frontend on http://localhost:3000
echo Two new terminal windows have been opened. Close them to stop the servers.
