@echo off
title SmartPlate Launcher
color 0A

echo ============================================
echo         SmartPlate - Project Launcher
echo ============================================
echo.

:: ---- Paths ----
set ROOT=%~dp0
set BACKEND_DIR=%ROOT%back-end
set FRONTEND_DIR=%ROOT%SmartPlate
set VENV_ACTIVATE=%BACKEND_DIR%\venv\Scripts\activate.bat

:: ---- Check virtual environment ----
if not exist "%VENV_ACTIVATE%" (
    echo [ERROR] Virtual environment not found at:
    echo         %VENV_ACTIVATE%
    echo.
    echo Please create it by running inside back-end\:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: ---- Check Node / npm ----
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: ---- Launch Django backend in a new window ----
echo [1/2] Starting Django backend ...
start "SmartPlate - Backend" cmd /k "cd /d "%BACKEND_DIR%" && call "%VENV_ACTIVATE%" && python manage.py migrate --run-syncdb && python manage.py runserver"

:: Give the backend a moment to boot
timeout /t 3 /nobreak >nul

:: ---- Point frontend .env at local backend ----
echo [2/2] Configuring frontend to use local backend ...
(
    echo EXPO_PUBLIC_API_URL=http://localhost:8000
    echo EXPO_PUBLIC_GOOGLE_CLIENT_ID=231840486454-mn8iibfo8kpee0d54s35h71her9htp3d.apps.googleusercontent.com
) > "%FRONTEND_DIR%\.env"

:: ---- Launch Expo frontend in a new window ----
echo [3/3] Starting Expo frontend ...
start "SmartPlate - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm install && npx expo start"

echo.
echo ============================================
echo  Both servers are starting in new windows.
echo  Backend  -> http://localhost:8000
echo  Frontend -> Expo DevTools (press 'w' for web)
echo ============================================
echo.
pause
