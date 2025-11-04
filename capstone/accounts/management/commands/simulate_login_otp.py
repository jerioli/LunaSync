"""
Django management command to simulate the exact login and OTP sending scenario
"""

from django.core.management.base import BaseCommand
from django.test import Client
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Simulate login and OTP sending to debug the 404 error'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='jeri.olivarez@gmail.com',
            help='Email to test login with'
        )

    def handle(self, *args, **options):
        email = options['email']
        
        self.stdout.write(self.style.SUCCESS('🔍 Simulating Login and OTP Flow'))
        self.stdout.write("=" * 60)
        
        client = Client()
        
        # Step 1: Check if user exists
        self.stdout.write(f"👤 Checking if user exists: {email}")
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"✅ User found: {user.email} (ID: {user.id})")
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ User not found: {email}"))
            self.stdout.write("💡 Creating a test user...")
            
            # Create a test user
            user = User.objects.create_user(
                email=email,
                password='testpass123',
                first_name='Test',
                last_name='User'
            )
            self.stdout.write(f"✅ Test user created: {user.email}")
        
        # Step 2: Test session login endpoint
        self.stdout.write(f"\n🔐 Testing session login...")
        login_data = {
            'identifier': email,
            'password': 'testpass123'  # You might need to adjust this
        }
        
        login_response = client.post(
            '/api/auth/session-login/',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Login response status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            try:
                login_data = login_response.json()
                self.stdout.write(f"✅ Login response: {json.dumps(login_data, indent=2)}")
                
                if login_data.get('2fa_required'):
                    self.stdout.write(f"🔐 2FA required, identifier: {login_data.get('identifier')}")
                
            except json.JSONDecodeError:
                self.stdout.write(f"⚠️  Login response not JSON: {login_response.content}")
        else:
            self.stdout.write(f"❌ Login failed: {login_response.content}")
        
        # Step 3: Test send-otp endpoint directly
        self.stdout.write(f"\n📧 Testing send-otp endpoint directly...")
        otp_data = {
            'identifier': email,
            'identifier_type': 'email'
        }
        
        otp_response = client.post(
            '/api/auth/send-otp/',
            data=json.dumps(otp_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 OTP response status: {otp_response.status_code}")
        
        if otp_response.status_code == 200:
            try:
                otp_data = otp_response.json()
                self.stdout.write(f"✅ OTP response: {json.dumps(otp_data, indent=2)}")
            except json.JSONDecodeError:
                self.stdout.write(f"⚠️  OTP response not JSON: {otp_response.content}")
        elif otp_response.status_code == 404:
            self.stdout.write(self.style.ERROR(f"❌ 404 Error - URL not found!"))
            self.stdout.write(f"Response content: {otp_response.content}")
        else:
            self.stdout.write(f"❌ OTP failed with status {otp_response.status_code}: {otp_response.content}")
        
        # Step 4: Test all possible OTP-related endpoints
        self.stdout.write(f"\n🧪 Testing all OTP-related endpoints:")
        
        endpoints_to_test = [
            '/api/auth/send-otp/',
            '/api/auth/verify-otp/',
            '/api/send-otp/',  # Alternative path
            '/api/otp/send/',  # Alternative path
        ]
        
        for endpoint in endpoints_to_test:
            test_response = client.post(endpoint, data=json.dumps(otp_data), content_type='application/json')
            status_emoji = "✅" if test_response.status_code != 404 else "❌"
            self.stdout.write(f"  {status_emoji} {endpoint}: {test_response.status_code}")
        
        self.stdout.write(f"\n" + "=" * 60)