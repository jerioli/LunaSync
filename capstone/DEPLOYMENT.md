# LunaSync Deployment Guide

## Overview
LunaSync is now configured to run in both development and production environments with automatic environment detection and appropriate security settings.

## Environment Detection
The system automatically detects the environment based on:
- Hostname (production domains vs localhost)
- Environment variables
- Frontend environment detection in `env.ts`

## Production Deployment

### 1. Environment Variables
Set these environment variables in your production environment:
```bash
# Required for production
PRODUCTION=true
SECRET_KEY=your-super-secure-secret-key-here
DATABASE_URL=postgresql://user:password@host:port/database
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional
DEBUG=false  # Automatically false in production
SENTRY_DSN=your-sentry-dsn-for-error-tracking
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Database Setup
```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

### 4. Run Production Server
```bash
gunicorn capstone.wsgi:application --bind 0.0.0.0:8000
```

## Development Setup

### 1. No Environment Variables Needed
The system works out of the box for development with SQLite database.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Development Server
```bash
python manage.py migrate
python manage.py runserver
```

## Security Features

### Automatic Production Security
When `PRODUCTION=true` or hostname is not localhost:
- ✅ DEBUG automatically set to False
- ✅ SECURE_SSL_REDIRECT = True
- ✅ HSTS enabled with 1-year duration
- ✅ Secure cookies (HTTPS only)
- ✅ CSRF protection enhanced
- ✅ XSS and content sniffing protection
- ✅ Restricted CORS origins

### Development Flexibility
When running on localhost:
- ✅ DEBUG = True (configurable)
- ✅ HTTP allowed for local development
- ✅ Permissive CORS for frontend development
- ✅ Multiple port support (3000, 5173, 8080, 8081, 4173)

## Frontend Configuration

The frontend automatically detects environment:
- **Production**: Uses relative `/api` URLs
- **Development**: Uses `http://localhost:8000/api`

## File Structure

### Backend (Django)
```
capstone/
├── requirements.txt          # All dependencies
├── requirements.production.txt  # Production-specific packages
├── static/                   # Static files directory
├── manage.py
└── capstone/
    ├── settings.py          # Environment-aware configuration
    └── ...
```

### Frontend (React/TypeScript)
```
frontend/health-nexus-solution/
├── src/
│   ├── utils/
│   │   ├── api.ts          # Environment-aware API calls
│   │   └── env.ts          # Environment detection
│   └── ...
└── ...
```

## Key Features

### 1. Appointment Scheduling
- ✅ Multi-step appointment wizard
- ✅ Patient creation and selection
- ✅ Duplicate prevention
- ✅ Form validation
- ✅ Encrypted patient data

### 2. API Integration
- ✅ Environment-aware endpoints
- ✅ Automatic CORS configuration
- ✅ CSRF protection
- ✅ Secure data transmission

### 3. Database Support
- ✅ SQLite for development
- ✅ PostgreSQL for production
- ✅ Automatic migration support
- ✅ Environment-based configuration

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure frontend URL is in CORS_ALLOWED_ORIGINS
2. **Database Connection**: Verify DATABASE_URL format for production
3. **Static Files**: Run `collectstatic` before deployment
4. **SSL Issues**: Ensure HTTPS is properly configured in production

### Deployment Checklist

- [ ] Environment variables set
- [ ] Database migrated
- [ ] Static files collected
- [ ] CORS origins configured
- [ ] SSL certificate installed
- [ ] Secret key secured
- [ ] Debug mode disabled

## Support

The system includes comprehensive logging and audit trails for troubleshooting and compliance.