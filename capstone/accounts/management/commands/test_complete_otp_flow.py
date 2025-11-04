"""
Django management command to create a test user and test the complete OTP flow
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Create test user and test complete OTP flow'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='test@lunasync.site',
            help='Email for test user'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='TestPass123!',
            help='Password for test user'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        
        self.stdout.write(self.style.SUCCESS('🧪 Complete OTP Flow Test'))
        self.stdout.write("=" * 60)
        
        # Step 1: Create or get test user
        self.stdout.write(f"👤 Step 1: Setting up test user: {email}")
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"✅ Test user already exists: {user.email}")
        except User.DoesNotExist:
            # Create test user
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name='Test',
                last_name='User',
                username=email.split('@')[0],
                role='doctor'
            )
            self.stdout.write(f"✅ Test user created: {user.email}")
        
        # Ensure password is set correctly
        user.set_password(password)
        user.save()
        self.stdout.write(f"✅ Password set for user: {email}")
        
        client = Client()
        
        # Step 2: Test complete login flow
        self.stdout.write(f"\n🔐 Step 2: Testing complete login flow...")
        
        # Step 2a: Initial login (should trigger 2FA)
        login_data = {
            'identifier': email,
            'password': password
        }
        
        self.stdout.write(f"📤 Sending login request...")
        login_response = client.post(
            '/api/auth/session-login/',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Login response status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            self.stdout.write(f"❌ Login failed: {login_response.content}")
            return
        
        try:
            login_response_data = login_response.json()
            self.stdout.write(f"✅ Login response: {json.dumps(login_response_data, indent=2)}")
            
            if not login_response_data.get('2fa_required'):
                self.stdout.write(f"❌ 2FA not required - this is unexpected")
                return
                
            identifier = login_response_data.get('identifier')
            identifier_type = login_response_data.get('identifier_type')
            
            self.stdout.write(f"🔐 2FA required for {identifier_type}: {identifier}")
            
        except json.JSONDecodeError:
            self.stdout.write(f"❌ Login response not JSON: {login_response.content}")
            return
        
        # Step 2b: Check OTP in cache
        self.stdout.write(f"\n📧 Step 3: Checking OTP in cache...")
        cache_key = f"otp_{identifier}_{identifier_type}"
        stored_otp = cache.get(cache_key)
        
        self.stdout.write(f"📋 Cache key: {cache_key}")
        self.stdout.write(f"📋 Stored OTP: {stored_otp}")
        self.stdout.write(f"📋 OTP type: {type(stored_otp)}")
        
        if not stored_otp:
            self.stdout.write(f"❌ No OTP found in cache!")
            return
        
        # Step 2c: Test OTP verification
        self.stdout.write(f"\n🔍 Step 4: Testing OTP verification...")
        
        # Test with the stored OTP
        verify_data = {
            'identifier': identifier,
            'identifier_type': identifier_type,
            'otp': str(stored_otp)  # Ensure it's a string
        }
        
        self.stdout.write(f"📤 Sending OTP verification:")
        self.stdout.write(f"  - identifier: {identifier}")
        self.stdout.write(f"  - identifier_type: {identifier_type}")
        self.stdout.write(f"  - otp: {stored_otp} (type: {type(stored_otp)})")
        
        verify_response = client.post(
            '/api/auth/session-verify-otp/',
            data=json.dumps(verify_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Verification response status: {verify_response.status_code}")
        
        if verify_response.status_code == 200:
            try:
                verify_response_data = verify_response.json()
                self.stdout.write(f"✅ OTP verification successful!")
                self.stdout.write(f"User data: {json.dumps(verify_response_data.get('user', {}), indent=2)}")
            except json.JSONDecodeError:
                self.stdout.write(f"✅ OTP verification successful (non-JSON): {verify_response.content}")
        else:
            try:
                error_data = verify_response.json()
                self.stdout.write(f"❌ OTP verification failed: {json.dumps(error_data, indent=2)}")
            except json.JSONDecodeError:
                self.stdout.write(f"❌ OTP verification failed: {verify_response.content}")
        
        # Step 3: Test with wrong OTP
        self.stdout.write(f"\n🧪 Step 5: Testing with wrong OTP...")
        
        # First, set up the login state again since OTP was cleared
        client.post('/api/auth/session-login/', data=json.dumps(login_data), content_type='application/json')
        
        wrong_verify_data = {
            'identifier': identifier,
            'identifier_type': identifier_type,
            'otp': '999999'  # Wrong OTP
        }
        
        wrong_verify_response = client.post(
            '/api/auth/session-verify-otp/',
            data=json.dumps(wrong_verify_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Wrong OTP response status: {wrong_verify_response.status_code}")
        
        if wrong_verify_response.status_code == 400:
            self.stdout.write(f"✅ Wrong OTP correctly rejected")
        else:
            self.stdout.write(f"⚠️  Unexpected response for wrong OTP: {wrong_verify_response.content}")
        
        self.stdout.write(f"\n" + "=" * 60)
        self.stdout.write(f"🎯 TEST SUMMARY:")
        self.stdout.write(f"  - Test user: {email}")
        self.stdout.write(f"  - Login flow: {'✅ Working' if login_response.status_code == 200 else '❌ Failed'}")
        self.stdout.write(f"  - OTP generation: {'✅ Working' if stored_otp else '❌ Failed'}")
        self.stdout.write(f"  - OTP verification: {'✅ Working' if verify_response.status_code == 200 else '❌ Failed'}")
        self.stdout.write(f"  - Wrong OTP rejection: {'✅ Working' if wrong_verify_response.status_code == 400 else '❌ Failed'}")
        
        self.stdout.write(f"\n💡 RECOMMENDATIONS:")
        if verify_response.status_code != 200:
            self.stdout.write(f"  1. Check OTP type consistency (string vs int)")
            self.stdout.write(f"  2. Verify session data is preserved")
            self.stdout.write(f"  3. Check cache key format")
            self.stdout.write(f"  4. Monitor Django logs for detailed errors")
        else:
            self.stdout.write(f"  ✅ OTP system is working correctly!")
            self.stdout.write(f"  📧 Check email delivery if users report not receiving OTPs")
        
        self.stdout.write(f"\n" + "=" * 60)