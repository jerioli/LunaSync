@echo off
REM LunaSync Deployment Setup Script for Windows
REM This script sets up the default superadmin account and performs other deployment tasks

echo 🚀 Starting LunaSync deployment setup...

REM Check if Django is available
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "manage.py" (
    echo [ERROR] This script must be run from the Django project directory (where manage.py is located)
    exit /b 1
)

echo [INFO] Found Django project directory

REM Check if virtual environment is activated
if defined VIRTUAL_ENV (
    echo [SUCCESS] Virtual environment is activated: %VIRTUAL_ENV%
) else (
    echo [WARNING] No virtual environment detected. Consider using a virtual environment for production.
)

REM Run database migrations
echo [INFO] Running database migrations...
python manage.py migrate --noinput
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database migrations failed
    exit /b 1
)
echo [SUCCESS] Database migrations completed

REM Collect static files (for production)
if "%PRODUCTION%"=="True" (
    echo [INFO] Collecting static files for production...
    python manage.py collectstatic --noinput
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Static files collected
    ) else (
        echo [WARNING] Static files collection failed (continuing anyway)
    )
)

REM Create superadmin account
echo [INFO] Creating default superadmin account...

REM Use environment variables if available, otherwise use defaults
if not defined SUPERADMIN_EMAIL set SUPERADMIN_EMAIL=admin@lunasync.site
if not defined SUPERADMIN_PASSWORD set SUPERADMIN_PASSWORD=LunaSync2024!

python manage.py create_superadmin --email "%SUPERADMIN_EMAIL%" --password "%SUPERADMIN_PASSWORD%"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to create superadmin account
    exit /b 1
)

echo [SUCCESS] Superadmin account setup completed
echo.
echo 📋 SUPERADMIN CREDENTIALS:
echo    Email: %SUPERADMIN_EMAIL%
echo    Password: %SUPERADMIN_PASSWORD%
echo.
echo [WARNING] ⚠️  IMPORTANT: Change the password after first login!
echo.

REM Create cache table (if using database cache)
echo [INFO] Setting up cache table...
python manage.py createcachetable
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Cache table created
) else (
    echo [WARNING] Cache table creation failed (may already exist)
)

REM Clear any existing cache
echo [INFO] Clearing application cache...
python manage.py shell -c "from django.core.cache import cache; cache.clear()" 2>nul
echo [SUCCESS] Cache cleared

REM Check for environment configuration
echo [INFO] Checking environment configuration...

if "%PRODUCTION%"=="True" (
    echo [SUCCESS] Production mode detected
    
    REM Check critical production settings
    if not defined SECRET_KEY (
        echo [WARNING] SECRET_KEY not set in environment variables
    )
    
    if not defined DATABASE_URL (
        echo [WARNING] DATABASE_URL not set in environment variables
    )
    
    if not defined ALLOWED_HOSTS (
        echo [WARNING] ALLOWED_HOSTS not set in environment variables
    )
) else (
    echo [WARNING] Development mode detected
)

REM Final deployment summary
echo.
echo ✅ LunaSync deployment setup completed!
echo.
echo 📋 NEXT STEPS:
echo    1. Verify your database connection
echo    2. Test the application with the superadmin account
echo    3. Change the default superadmin password
echo    4. Configure your domain settings
echo    5. Set up SSL/HTTPS (recommended for production)
echo.
echo 🌐 Application should be ready at:
if "%PRODUCTION%"=="True" (
    echo    Production: https://lunasync.site
) else (
    echo    Development: http://localhost:8000
)
echo.
echo [SUCCESS] Setup script completed successfully!

pause