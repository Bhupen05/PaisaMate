@echo off
REM One-time setup for Suraty/PaisaMate: installs backend (pip) and frontend
REM (npm) dependencies, and makes sure a server\.env exists. Run this once
REM after cloning, then use start-app.bat to launch the app.

setlocal
set ROOT=%~dp0

echo ============================================
echo  Suraty / PaisaMate - First-time setup
echo ============================================
echo.

REM --- Backend: virtualenv + Python dependencies ---
REM Uses a project-local venv (server\venv) instead of the global Python
REM install, so this repo's pinned package versions never clash with
REM whatever else you have installed system-wide.
echo [1/4] Setting up backend virtual environment...
where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python was not found on PATH. Install Python 3.11+ and re-run this script.
    goto :error
)
if not exist "%ROOT%server\venv\Scripts\python.exe" (
    REM `python -m venv` sometimes reports a non-zero exit from its internal
    REM ensurepip bootstrap even though the venv it created is perfectly
    REM usable (seen with antivirus/real-time scanning interference on
    REM Windows). So don't treat that alone as fatal - only fail if the
    REM interpreter genuinely wasn't created.
    python -m venv "%ROOT%server\venv"
    if not exist "%ROOT%server\venv\Scripts\python.exe" (
        echo ERROR: Failed to create the virtual environment.
        goto :error
    )
    echo Created server\venv.
) else (
    echo server\venv already exists, reusing it.
)

set VENV_PY=%ROOT%server\venv\Scripts\python.exe
"%VENV_PY%" -m pip install --upgrade pip

REM Installing many small files can hit a transient Windows file-lock
REM (commonly antivirus real-time scanning) that clears itself - retry once
REM before giving up.
"%VENV_PY%" -m pip install -r "%ROOT%server\requirements.txt"
if errorlevel 1 (
    echo First install attempt hit an error - usually a transient Windows file lock. Retrying...
    ping -n 3 127.0.0.1 >nul
    "%VENV_PY%" -m pip install -r "%ROOT%server\requirements.txt"
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies after a retry.
        echo        If this keeps happening, add an antivirus exclusion for %ROOT%server\venv and re-run.
        goto :error
    )
)
echo Backend dependencies installed into server\venv.
echo.

REM --- Backend: .env file ---
echo [2/4] Checking server\.env...
if exist "%ROOT%server\.env" (
    echo server\.env already exists, leaving it as-is.
) else (
    if exist "%ROOT%server\.env.example" (
        copy /y "%ROOT%server\.env.example" "%ROOT%server\.env" >nul
        echo Created server\.env from server\.env.example - review it before running in production.
    ) else (
        echo WARNING: No server\.env or server\.env.example found. The backend needs
        echo          MONGODB_URL, DB_NAME and SECRET_KEY set in server\.env to run.
    )
)
echo.

REM --- Frontend: Node dependencies ---
echo [3/4] Installing frontend Node dependencies...
where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found on PATH. Install Node.js 18+ and re-run this script.
    goto :error
)
pushd "%ROOT%apps\web"
call npm install
if errorlevel 1 (
    popd
    echo ERROR: Failed to install frontend dependencies.
    goto :error
)
popd
echo Frontend dependencies installed.
echo.

REM --- MongoDB check ---
echo [4/4] Checking MongoDB...
sc query MongoDB >nul 2>nul
if errorlevel 1 (
    echo WARNING: No "MongoDB" Windows service was found.
    echo          Install MongoDB Community Server - mongodb.com/try/download/community
    echo          or otherwise make sure a MongoDB instance is reachable at the
    echo          MONGODB_URL configured in server\.env before starting the app.
) else (
    echo MongoDB service found.
)
echo.

echo ============================================
echo  Setup complete. Run start-app.bat to launch.
echo ============================================
endlocal
exit /b 0

:error
echo.
echo Setup did not complete successfully.
endlocal
exit /b 1
