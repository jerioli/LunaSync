"""
Django management command to switch to production environment and verify OTP email functionality
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os
import shutil

class Command(BaseCommand):
    help = 'Switch to production environment and test OTP email functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force copy .env.production to .env without confirmation'
        )

    def handle(self, *args, **options):
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS('🔧 Production Environment Setup'))
        self.stdout.write("=" * 60)
        
        # Check current environment
        current_debug = os.getenv('DEBUG', 'True')
        current_production = os.getenv('PRODUCTION', 'False')
        
        self.stdout.write(f"📊 Current Environment Status:")
        self.stdout.write(f"  DEBUG: {current_debug}")
        self.stdout.write(f"  PRODUCTION: {current_production}")
        
        # Check if .env.production exists
        env_production_path = '.env.production'
        env_path = '.env'
        
        if not os.path.exists(env_production_path):
            self.stdout.write(
                self.style.ERROR(f"❌ {env_production_path} file not found!")
            )
            return
        
        # Show what would change
        self.stdout.write(f"\n📋 Files to process:")
        self.stdout.write(f"  Source: {env_production_path}")
        self.stdout.write(f"  Target: {env_path}")
        
        # Check if .env already exists
        if os.path.exists(env_path):
            self.stdout.write(f"  ⚠️  {env_path} already exists and will be overwritten")
        
        # Confirm unless force flag is used
        if not force:
            confirm = input("\n❓ Copy .env.production to .env? (y/N): ")
            if confirm.lower() != 'y':
                self.stdout.write("❌ Operation cancelled")
                return
        
        # Copy the file
        try:
            shutil.copy2(env_production_path, env_path)
            self.stdout.write(
                self.style.SUCCESS(f"✅ Successfully copied {env_production_path} to {env_path}")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Failed to copy file: {e}")
            )
            return
        
        # Verify the new environment
        self.stdout.write(f"\n🔍 Verifying new environment configuration...")
        
        # Read the new .env file to show key settings
        try:
            with open(env_path, 'r') as f:
                env_content = f.read()
            
            self.stdout.write(f"📧 Email configuration in new .env:")
            
            for line in env_content.split('\n'):
                line = line.strip()
                if line.startswith('EMAIL_HOST_USER='):
                    self.stdout.write(f"  {line}")
                elif line.startswith('EMAIL_PASSWORD='):
                    # Hide password but show it's set
                    password = line.split('=', 1)[1] if '=' in line else ''
                    self.stdout.write(f"  EMAIL_PASSWORD={'✅ SET' if password else '❌ NOT SET'}")
                elif line.startswith('PRODUCTION='):
                    self.stdout.write(f"  {line}")
                elif line.startswith('DEBUG='):
                    self.stdout.write(f"  {line}")
        
        except Exception as e:
            self.stdout.write(f"⚠️  Could not read new .env file: {e}")
        
        # Important instructions
        self.stdout.write(f"\n💡 IMPORTANT NEXT STEPS:")
        self.stdout.write(f"  1. Restart Gunicorn service to load new environment:")
        self.stdout.write(f"     sudo systemctl restart gunicorn")
        self.stdout.write(f"")
        self.stdout.write(f"  2. Test OTP email functionality after restart:")
        self.stdout.write(f"     python manage.py test_otp_email --email jeri.olivarez@gmail.com")
        self.stdout.write(f"")
        self.stdout.write(f"  3. Check environment status:")
        self.stdout.write(f"     python manage.py check_email_config")
        
        self.stdout.write(f"\n" + "=" * 60)