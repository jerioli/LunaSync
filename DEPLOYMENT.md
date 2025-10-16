# LunaSync Deployment Guide

## Overview
LunaSync is a healthcare management system with a Django backend and React frontend. This guide covers deployment for both development and production environments.

## Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (for production)
- Git

## Quick Start (Development)

### 1. Clone the repository
```bash
git clone <repository-url>
cd LunaSync
```

### 2. Run deployment script
```bash
# For Windows
deploy.bat

# For Unix/Linux/macOS
chmod +x deploy.sh
./deploy.sh
```

### 3. Start the application
```bash
# Terminal 1 - Backend
cd capstone
python manage.py runserver 8000

# Terminal 2 - Frontend
cd frontend/health-nexus-solution
npm run dev
```

## Production Deployment

### 1. Environment Setup
```bash
export PRODUCTION=true
```

### 2. Update environment files
- Copy `.env.production` to `.env` in the capstone directory
- Update all placeholder values with your production settings
- Copy `.env.production` to `.env` in the frontend directory

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb lunasync

# Update DATABASE_URL in .env.production
DATABASE_URL=postgresql://username:password@localhost:5432/lunasync
```

### 4. Security Configuration
Update `.env.production` with:
- `SECRET_KEY`: Generate a new Django secret key
- `ALLOWED_HOSTS`: Your domain(s)
- `CORS_ALLOWED_ORIGINS`: Your frontend URL(s)
- `CSRF_TRUSTED_ORIGINS`: Your frontend URL(s)

### 5. Run deployment
```bash
PRODUCTION=true ./deploy.sh
```

### 6. Web Server Configuration (nginx example)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/LunaSync/frontend/health-nexus-solution/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /path/to/LunaSync/capstone/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /path/to/LunaSync/capstone/media/;
    }
}
```

### 7. Start production services
```bash
# Backend with Gunicorn
cd capstone
gunicorn capstone.wsgi:application --bind 0.0.0.0:8000 --workers 3

# Or use systemd service (recommended)
sudo systemctl start lunasync
sudo systemctl enable lunasync
```

## Environment Variables

### Backend (.env in capstone/)
```bash
# Core Settings
DEBUG=False
PRODUCTION=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lunasync

# Security
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com

# Encryption
ENCRYPTION_KEY=your-32-byte-base64-encoded-key

# External Services
IPROG_API_TOKEN=your-sms-token
EMAIL_PASSWORD=your-email-password
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### Frontend (.env in frontend/health-nexus-solution/)
```bash
# API Configuration
VITE_API_URL=/api
```

## Features

### Core Features
- Patient Management with encryption
- Appointment Scheduling
- Doctor Availability Management
- Medical Document Processing (OCR)
- SMS Notifications
- Email Notifications
- Audit Logging
- Security Features

### API Endpoints
- `/api/appointments/` - Appointment management
- `/api/patients/` - Patient management
- `/api/doctors/` - Doctor information
- `/api/availability/` - Doctor availability
- `/api/auth/` - Authentication

## Security Features

### Data Encryption
- Patient data encrypted at rest using AES-256
- Secure field-level encryption for sensitive information

### Authentication & Authorization
- Session-based authentication
- Role-based access control
- CSRF protection
- XSS protection

### Production Security
- HTTPS enforcement
- Secure cookies
- Content Security Policy headers
- HSTS headers

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS_ALLOWED_ORIGINS in backend .env
   - Verify frontend is making requests to correct API URL

2. **Database Connection**
   - Verify DATABASE_URL format
   - Check PostgreSQL service is running
   - Verify user permissions

3. **Static Files Not Loading**
   - Run `python manage.py collectstatic`
   - Check nginx/web server configuration

4. **Environment Variables Not Loading**
   - Verify .env file location
   - Check file permissions
   - Restart services after changes

### Development Tips
- Use `DEBUG=True` for detailed error messages
- Check browser console for frontend errors
- Check Django logs for backend errors
- Use Django admin at `/admin/` for database management

## Support
For issues and questions, please check the troubleshooting section or contact the development team.