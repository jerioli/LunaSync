@echo off
REM Deployment script for LunaSync application (Windows)

echo Starting LunaSync deployment...

REM Check if we're in production mode
if "%PRODUCTION%"=="true" (
    echo Running in PRODUCTION mode
    set ENV_FILE=.env.production
) else (
    echo Running in DEVELOPMENT mode
    set ENV_FILE=.env
)

REM Backend deployment
echo Setting up Django backend...
cd capstone

REM Check if .env file exists
if not exist "%ENV_FILE%" (
    echo ERROR: Environment file %ENV_FILE% not found!
    exit /b 1
)

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Run database migrations
echo Running database migrations...
python manage.py makemigrations
python manage.py migrate

REM Collect static files (for production)
if "%PRODUCTION%"=="true" (
    echo Collecting static files...
    python manage.py collectstatic --noinput
)

REM Create superuser if it doesn't exist (only in development)
if not "%PRODUCTION%"=="true" (
    echo Creating superuser if needed...
    python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@example.com', 'admin123') if not User.objects.filter(username='admin').exists() else print('Superuser already exists')"
)

echo Backend setup complete!

REM Frontend deployment
cd ..\frontend\health-nexus-solution

echo Setting up React frontend...

REM Install Node.js dependencies
echo Installing Node.js dependencies...
npm install

REM Build frontend
if "%PRODUCTION%"=="true" (
    echo Building production frontend...
    npm run build
) else (
    echo Building development frontend...
    npm run build
)

echo Frontend setup complete!

REM Final instructions
echo.
echo Deployment complete!
echo.
echo To start the application:
if "%PRODUCTION%"=="true" (
    echo Backend: cd capstone ^&^& python manage.py runserver 8000
    echo Frontend: Serve the dist/ folder with your web server
) else (
    echo Backend: cd capstone ^&^& python manage.py runserver 8000
    echo Frontend: cd frontend\health-nexus-solution ^&^& npm run dev
)
echo.
echo Make sure to:
echo 1. Update .env.production with your actual production values
echo 2. Configure your web server to serve static files
echo 3. Set up SSL certificates for HTTPS
echo 4. Configure your database for production