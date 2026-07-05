@echo off
title Social Media Engagement Tracker Launcher
echo ===================================================
echo   Social Media Video Analytics Tracker Launcher
echo ===================================================
echo.
echo Cleaning up existing processes on ports 5001 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1

echo Starting backend API server...
start "Backend API Server" cmd /k "cd backend && npm start"

echo Starting frontend Vite dev server...
start "Frontend Dev Server" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo   System running successfully!
echo   - Backend API URL: http://localhost:5000
echo   - Frontend Client URL: http://localhost:5173
echo ===================================================
echo.
echo Press any key to exit this launcher window...
pause > nul
