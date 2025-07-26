@echo off
echo 🔐 MedSync Security Testing Launcher
echo ====================================
echo.

echo Starting Django server...
start "Django Server" cmd /c "cd /d c:\Users\smira\Downloads\Demo\capstone && python manage.py runserver"

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Opening security test dashboard...
start "" "c:\Users\smira\Downloads\Demo\capstone\encryption_test.html"

echo.
echo ✅ Security testing environment ready!
echo.
echo 📋 Instructions:
echo 1. Django server is starting in a separate window
echo 2. Security test dashboard will open in your browser
echo 3. Click "Run All Tests" to check encryption status
echo 4. Close Django server window when done testing
echo.
pause
