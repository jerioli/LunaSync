"""
Django management command to check email configuration from environment variables
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Check current email configuration and environment variables'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔍 Checking Email Configuration'))
        self.stdout.write("=" * 60)
        
        # Check Django settings
        self.stdout.write("📧 DJANGO EMAIL SETTINGS:")
        self.stdout.write(f"  EMAIL_BACKEND: {getattr(settings, 'EMAIL_BACKEND', 'NOT SET')}")
        self.stdout.write(f"  EMAIL_HOST: {getattr(settings, 'EMAIL_HOST', 'NOT SET')}")
        self.stdout.write(f"  EMAIL_PORT: {getattr(settings, 'EMAIL_PORT', 'NOT SET')}")
        self.stdout.write(f"  EMAIL_USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', 'NOT SET')}")
        self.stdout.write(f"  EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', 'NOT SET')}")
        self.stdout.write(f"  EMAIL_HOST_USER: {getattr(settings, 'EMAIL_HOST_USER', 'NOT SET')}")
        
        # Check if password is set (without revealing it)
        password = getattr(settings, 'EMAIL_HOST_PASSWORD', None)
        if password and password != 'your_new_app_password_here':
            self.stdout.write(f"  EMAIL_HOST_PASSWORD: ✅ SET ({len(password)} characters)")
        else:
            self.stdout.write(f"  EMAIL_HOST_PASSWORD: ❌ NOT SET OR DEFAULT")
        
        self.stdout.write(f"  EMAIL_TIMEOUT: {getattr(settings, 'EMAIL_TIMEOUT', 'NOT SET')}")
        self.stdout.write(f"  DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', 'NOT SET')}")
        
        self.stdout.write("\n🔧 RAW ENVIRONMENT VARIABLES:")
        env_vars = [
            'DEBUG', 'PRODUCTION', 'EMAIL_HOST_USER', 'EMAIL_PASSWORD',
            'DATABASE_URL', 'SECRET_KEY'
        ]
        
        for var in env_vars:
            value = os.getenv(var)
            if value:
                if 'PASSWORD' in var or 'SECRET' in var:
                    self.stdout.write(f"  {var}: ✅ SET ({len(value)} characters)")
                else:
                    self.stdout.write(f"  {var}: {value}")
            else:
                self.stdout.write(f"  {var}: ❌ NOT SET")
        
        self.stdout.write("\n💡 RECOMMENDATIONS:")
        
        # Check for common issues
        if not getattr(settings, 'EMAIL_HOST_PASSWORD', None) or getattr(settings, 'EMAIL_HOST_PASSWORD') == 'your_new_app_password_here':
            self.stdout.write("  ⚠️  EMAIL_HOST_PASSWORD not properly set")
        
        if getattr(settings, 'EMAIL_HOST_USER', None) != os.getenv('EMAIL_HOST_USER'):
            self.stdout.write("  ⚠️  EMAIL_HOST_USER mismatch between settings and environment")
        
        if not os.getenv('EMAIL_PASSWORD'):
            self.stdout.write("  ⚠️  EMAIL_PASSWORD environment variable not set")
        
        # Check if we're in production
        if os.getenv('PRODUCTION', '').lower() == 'true':
            self.stdout.write("  🏭 Running in PRODUCTION mode")
            if not os.path.exists('.env.production'):
                self.stdout.write("  ⚠️  .env.production file not found in current directory")
        else:
            self.stdout.write("  🛠️  Running in DEVELOPMENT mode")
        
        self.stdout.write("\n" + "=" * 60)