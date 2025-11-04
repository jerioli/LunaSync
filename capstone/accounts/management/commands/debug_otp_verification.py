"""
Django management command to debug OTP verification issues
"""

from django.core.management.base import BaseCommand
from django.test import Client
from django.contrib.auth import get_user_model
from django.core.cache import cache
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Debug OTP verification process step by step'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='jeri.olivarez@gmail.com',
            help='Email to test OTP verification with'
        )

    def handle(self, *args, **options):
        email = options['email']
        
        self.stdout.write(self.style.SUCCESS('🔍 OTP Verification Debug Test'))
        self.stdout.write("=" * 60)
        
        client = Client()
        
        # Step 1: Ensure user exists
        self.stdout.write(f"👤 Step 1: Checking user exists: {email}")
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"✅ User found: {user.email} (ID: {user.id})")
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ User not found: {email}"))
            return
        
        # Step 2: Simulate login to get pending 2FA state
        self.stdout.write(f"\n🔐 Step 2: Simulating login to trigger 2FA...")
        login_data = {
            'identifier': email,
            'password': 'testpass123'  # You might need to set a known password
        }
        
        login_response = client.post(
            '/api/auth/session-login/',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Login response status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            self.stdout.write(f"❌ Login failed: {login_response.content}")
            # Let's manually set up the 2FA state for testing
            self.stdout.write(f"🔧 Setting up manual 2FA state for testing...")
            
            # Manually create session and OTP for testing
            session = client.session
            session['pending_2fa_user_id'] = user.id
            session.save()
            
            # Set a test OTP in cache
            test_otp = '123456'
            cache_key = f"otp_{email}_email"
            cache.set(cache_key, test_otp, 300)
            
            self.stdout.write(f"✅ Manual setup complete:")
            self.stdout.write(f"  - Session ID: {session.session_key}")
            self.stdout.write(f"  - Pending user ID: {session['pending_2fa_user_id']}")
            self.stdout.write(f"  - OTP cache key: {cache_key}")
            self.stdout.write(f"  - Test OTP: {test_otp}")
            
        else:
            # Parse login response
            try:
                login_data_response = login_response.json()
                self.stdout.write(f"✅ Login response: {json.dumps(login_data_response, indent=2)}")
                
                if login_data_response.get('2fa_required'):
                    self.stdout.write(f"🔐 2FA required as expected")
                else:
                    self.stdout.write(f"⚠️  2FA not required - this might be the issue")
                    
            except json.JSONDecodeError:
                self.stdout.write(f"⚠️  Login response not JSON: {login_response.content}")
        
        # Step 3: Check cache state
        self.stdout.write(f"\n🔍 Step 3: Checking OTP cache state...")
        cache_key = f"otp_{email}_email"
        stored_otp = cache.get(cache_key)
        
        self.stdout.write(f"📋 Cache key: {cache_key}")
        self.stdout.write(f"📋 Stored OTP: {stored_otp}")
        
        if not stored_otp:
            self.stdout.write(f"⚠️  No OTP in cache - setting test OTP for verification test")
            test_otp = '123456'
            cache.set(cache_key, test_otp, 300)
            stored_otp = test_otp
            self.stdout.write(f"✅ Test OTP set: {test_otp}")
        
        # Step 4: Check session state
        self.stdout.write(f"\n🔍 Step 4: Checking session state...")
        session = client.session
        pending_user_id = session.get('pending_2fa_user_id')
        
        self.stdout.write(f"📋 Session ID: {session.session_key}")
        self.stdout.write(f"📋 Pending user ID: {pending_user_id}")
        self.stdout.write(f"📋 Session data: {dict(session.items())}")
        
        if not pending_user_id:
            self.stdout.write(f"⚠️  No pending user ID - setting for test")
            session['pending_2fa_user_id'] = user.id
            session.save()
            self.stdout.write(f"✅ Pending user ID set: {user.id}")
        
        # Step 5: Test OTP verification
        self.stdout.write(f"\n🧪 Step 5: Testing OTP verification...")
        otp_verify_data = {
            'identifier': email,
            'identifier_type': 'email',
            'otp': stored_otp
        }
        
        self.stdout.write(f"📤 Sending verification request:")
        self.stdout.write(f"  - identifier: {email}")
        self.stdout.write(f"  - identifier_type: email")
        self.stdout.write(f"  - otp: {stored_otp}")
        
        verify_response = client.post(
            '/api/auth/session-verify-otp/',
            data=json.dumps(otp_verify_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Verification response status: {verify_response.status_code}")
        
        if verify_response.status_code == 200:
            try:
                verify_data = verify_response.json()
                self.stdout.write(f"✅ Verification successful: {json.dumps(verify_data, indent=2)}")
            except json.JSONDecodeError:
                self.stdout.write(f"✅ Verification successful (non-JSON response): {verify_response.content}")
        elif verify_response.status_code == 400:
            try:
                error_data = verify_response.json()
                self.stdout.write(f"❌ Verification failed (400): {json.dumps(error_data, indent=2)}")
            except json.JSONDecodeError:
                self.stdout.write(f"❌ Verification failed (400): {verify_response.content}")
        else:
            self.stdout.write(f"❌ Verification failed ({verify_response.status_code}): {verify_response.content}")
        
        # Step 6: Check cache and session after verification
        self.stdout.write(f"\n🔍 Step 6: Post-verification state...")
        
        # Check if OTP was cleared from cache
        post_verify_otp = cache.get(cache_key)
        self.stdout.write(f"📋 OTP after verification: {post_verify_otp}")
        
        # Check session state
        post_verify_session = client.session
        pending_after = post_verify_session.get('pending_2fa_user_id')
        self.stdout.write(f"📋 Pending user ID after verification: {pending_after}")
        self.stdout.write(f"📋 Session data after verification: {dict(post_verify_session.items())}")
        
        self.stdout.write(f"\n" + "=" * 60)
        
        # Summary and recommendations
        self.stdout.write(f"📊 SUMMARY:")
        if verify_response.status_code == 200:
            self.stdout.write(f"✅ OTP verification is working correctly")
        else:
            self.stdout.write(f"❌ OTP verification failed")
            self.stdout.write(f"💡 Common issues to check:")
            self.stdout.write(f"  1. OTP format mismatch (string vs int)")
            self.stdout.write(f"  2. Cache expiration")
            self.stdout.write(f"  3. Session data missing")
            self.stdout.write(f"  4. User ID mismatch")
            self.stdout.write(f"  5. Frontend sending incorrect data format")
        
        self.stdout.write(f"\n" + "=" * 60)