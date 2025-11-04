"""
Emergency fix command for OTP URL 404 issue
"""

from django.core.management.base import BaseCommand
from django.test import Client
from django.urls import reverse
import json
import subprocess
import os

class Command(BaseCommand):
    help = 'Emergency fix for OTP 404 error - restart services and test'

    def add_arguments(self, parser):
        parser.add_argument(
            '--restart-services',
            action='store_true',
            help='Restart Gunicorn and Nginx services'
        )

    def handle(self, *args, **options):
        restart_services = options['restart_services']
        
        self.stdout.write(self.style.SUCCESS('🚨 Emergency OTP 404 Fix'))
        self.stdout.write("=" * 60)
        
        # Step 1: Test URL resolution
        self.stdout.write("🔍 Step 1: Testing URL resolution...")
        try:
            url = reverse('send-otp')
            self.stdout.write(f"✅ URL reverse successful: {url}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ URL reverse failed: {e}"))
            self.stdout.write("💡 This indicates a URL configuration problem")
            return
        
        # Step 2: Test the view directly
        self.stdout.write("🔍 Step 2: Testing SendOTPView endpoint...")
        client = Client()
        
        test_data = {
            'identifier': 'test@example.com',
            'identifier_type': 'email'
        }
        
        response = client.post('/api/auth/send-otp/', 
                              data=json.dumps(test_data), 
                              content_type='application/json')
        
        self.stdout.write(f"📊 Response status: {response.status_code}")
        
        if response.status_code == 404:
            self.stdout.write(self.style.ERROR("❌ 404 Error confirmed!"))
            self.stdout.write("🔧 Possible causes:")
            self.stdout.write("  1. Gunicorn not restarted after code changes")
            self.stdout.write("  2. URL patterns not properly loaded")
            self.stdout.write("  3. Import errors in views or urls")
            
            if restart_services:
                self.stdout.write("\n🔄 Attempting to restart services...")
                self._restart_services()
        else:
            self.stdout.write(f"✅ Endpoint responding with status: {response.status_code}")
            try:
                response_data = response.json()
                self.stdout.write(f"📄 Response: {json.dumps(response_data, indent=2)}")
            except:
                self.stdout.write(f"📄 Response content: {response.content}")
        
        # Step 3: Test all auth endpoints
        self.stdout.write("\n🔍 Step 3: Testing all auth endpoints...")
        auth_endpoints = [
            '/api/auth/send-otp/',
            '/api/auth/verify-otp/',
            '/api/auth/session-login/',
            '/api/auth/session-verify-otp/',
            '/api/auth/current-user/'
        ]
        
        for endpoint in auth_endpoints:
            test_response = client.get(endpoint)
            status_emoji = "✅" if test_response.status_code != 404 else "❌"
            self.stdout.write(f"  {status_emoji} {endpoint}: {test_response.status_code}")
        
        # Step 4: Recommendations
        self.stdout.write(f"\n💡 RECOMMENDATIONS:")
        self.stdout.write(f"  1. If you see 404 errors above, restart Gunicorn:")
        self.stdout.write(f"     sudo systemctl restart gunicorn")
        self.stdout.write(f"")
        self.stdout.write(f"  2. Check Gunicorn logs:")
        self.stdout.write(f"     sudo journalctl -u gunicorn -n 50")
        self.stdout.write(f"")
        self.stdout.write(f"  3. Verify Django is loading properly:")
        self.stdout.write(f"     python manage.py check")
        
        self.stdout.write(f"\n" + "=" * 60)
    
    def _restart_services(self):
        """Restart Gunicorn and Nginx services"""
        try:
            # Restart Gunicorn
            self.stdout.write("🔄 Restarting Gunicorn...")
            result = subprocess.run(['sudo', 'systemctl', 'restart', 'gunicorn'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.stdout.write("✅ Gunicorn restarted successfully")
            else:
                self.stdout.write(f"❌ Gunicorn restart failed: {result.stderr}")
            
            # Check Gunicorn status
            status_result = subprocess.run(['sudo', 'systemctl', 'status', 'gunicorn'], 
                                         capture_output=True, text=True)
            if 'active (running)' in status_result.stdout:
                self.stdout.write("✅ Gunicorn is running")
            else:
                self.stdout.write("❌ Gunicorn is not running properly")
                self.stdout.write(f"Status: {status_result.stdout}")
            
        except Exception as e:
            self.stdout.write(f"❌ Failed to restart services: {e}")
            self.stdout.write("💡 You may need to run this command manually:")
            self.stdout.write("   sudo systemctl restart gunicorn")