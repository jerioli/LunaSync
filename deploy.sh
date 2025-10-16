#!/bin/bash
# Deployment script for LunaSync application

set -e  # Exit on any error

echo "🚀 Starting LunaSync deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in production mode
if [ "$PRODUCTION" = "true" ]; then
    print_status "Running in PRODUCTION mode"
    ENV_FILE=".env.production"
else
    print_status "Running in DEVELOPMENT mode"
    ENV_FILE=".env"
fi

# Backend deployment
print_status "Setting up Django backend..."
cd capstone

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    exit 1
fi

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Run database migrations
print_status "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Collect static files (for production)
if [ "$PRODUCTION" = "true" ]; then
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput
fi

# Create superuser if it doesn't exist (only in development)
if [ "$PRODUCTION" != "true" ]; then
    print_status "Creating superuser (if needed)..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"
fi

print_status "Backend setup complete!"

# Frontend deployment
cd ../frontend/health-nexus-solution

print_status "Setting up React frontend..."

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build frontend
if [ "$PRODUCTION" = "true" ]; then
    print_status "Building production frontend..."
    npm run build
else
    print_status "Building development frontend..."
    npm run build
fi

print_status "Frontend setup complete!"

# Final instructions
echo ""
print_status "🎉 Deployment complete!"
echo ""
print_status "To start the application:"
if [ "$PRODUCTION" = "true" ]; then
    print_status "Backend: cd capstone && gunicorn capstone.wsgi:application --bind 0.0.0.0:8000"
    print_status "Frontend: Serve the dist/ folder with your web server"
else
    print_status "Backend: cd capstone && python manage.py runserver 8000"
    print_status "Frontend: cd frontend/health-nexus-solution && npm run dev"
fi
echo ""
print_warning "Make sure to:"
print_warning "1. Update .env.production with your actual production values"
print_warning "2. Configure your web server (nginx/apache) to serve static files"
print_warning "3. Set up SSL certificates for HTTPS"
print_warning "4. Configure your database for production"