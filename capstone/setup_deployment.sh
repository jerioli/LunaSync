#!/bin/bash

# LunaSync Deployment Setup Script
# This script sets up the default superadmin account and performs other deployment tasks

echo "🚀 Starting LunaSync deployment setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Django is available
if ! command -v python &> /dev/null; then
    print_error "Python is not installed or not in PATH"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "manage.py" ]; then
    print_error "This script must be run from the Django project directory (where manage.py is located)"
    exit 1
fi

print_status "Found Django project directory"

# Check if virtual environment is activated (optional but recommended)
if [[ "$VIRTUAL_ENV" != "" ]]; then
    print_success "Virtual environment is activated: $VIRTUAL_ENV"
else
    print_warning "No virtual environment detected. Consider using a virtual environment for production."
fi

# Run database migrations
print_status "Running database migrations..."
python manage.py migrate --noinput
if [ $? -eq 0 ]; then
    print_success "Database migrations completed"
else
    print_error "Database migrations failed"
    exit 1
fi

# Collect static files (for production)
if [ "$PRODUCTION" = "True" ] || [ "$PRODUCTION" = "true" ]; then
    print_status "Collecting static files for production..."
    python manage.py collectstatic --noinput
    if [ $? -eq 0 ]; then
        print_success "Static files collected"
    else
        print_warning "Static files collection failed (continuing anyway)"
    fi
fi

# Create superadmin account
print_status "Creating default superadmin account..."

# Use environment variables if available, otherwise use defaults
ADMIN_EMAIL=${SUPERADMIN_EMAIL:-"admin@lunasync.site"}
ADMIN_PASSWORD=${SUPERADMIN_PASSWORD:-"LunaSync2024!"}

python manage.py create_superadmin --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD"
if [ $? -eq 0 ]; then
    print_success "Superadmin account setup completed"
    echo ""
    echo "📋 SUPERADMIN CREDENTIALS:"
    echo "   Email: $ADMIN_EMAIL"
    echo "   Password: $ADMIN_PASSWORD"
    echo ""
    print_warning "⚠️  IMPORTANT: Change the password after first login!"
    echo ""
else
    print_error "Failed to create superadmin account"
    exit 1
fi

# Create cache table (if using database cache)
print_status "Setting up cache table..."
python manage.py createcachetable
if [ $? -eq 0 ]; then
    print_success "Cache table created"
else
    print_warning "Cache table creation failed (may already exist)"
fi

# Clear any existing cache
print_status "Clearing application cache..."
python manage.py shell -c "from django.core.cache import cache; cache.clear()" 2>/dev/null
print_success "Cache cleared"

# Check for environment configuration
print_status "Checking environment configuration..."

if [ "$PRODUCTION" = "True" ] || [ "$PRODUCTION" = "true" ]; then
    print_success "Production mode detected"
    
    # Check critical production settings
    if [ -z "$SECRET_KEY" ]; then
        print_warning "SECRET_KEY not set in environment variables"
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL not set in environment variables"
    fi
    
    if [ -z "$ALLOWED_HOSTS" ]; then
        print_warning "ALLOWED_HOSTS not set in environment variables"
    fi
else
    print_warning "Development mode detected"
fi

# Final deployment summary
echo ""
echo "✅ LunaSync deployment setup completed!"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Verify your database connection"
echo "   2. Test the application with the superadmin account"
echo "   3. Change the default superadmin password"
echo "   4. Configure your domain settings"
echo "   5. Set up SSL/HTTPS (recommended for production)"
echo ""
echo "🌐 Application should be ready at:"
if [ "$PRODUCTION" = "True" ] || [ "$PRODUCTION" = "true" ]; then
    echo "   Production: https://lunasync.site"
else
    echo "   Development: http://localhost:8000"
fi
echo ""
print_success "Setup script completed successfully!"