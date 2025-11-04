"""
Django management command to test Jerry's superadmin account OTP flow
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Test Jerry Olivarez superadmin account OTP flow'

    def handle(self, *args, **options):
        # Jerry's account details
        email = 'jerryolivarez231@gmail.com'
        username = 'jerry_superadmin'
        password = 'JerryAdmin2024!'
        expected_user_id = 6
        
        self.stdout.write(self.style.SUCCESS('🧪 Testing Jerry\'s Superadmin Account OTP Flow'))
        self.stdout.write("=" * 60)
        self.stdout.write(f"👤 Testing account:")
        self.stdout.write(f"  - Name: Jerry Olivarez")
        self.stdout.write(f"  - Email: {email}")
        self.stdout.write(f"  - Username: {username}")
        self.stdout.write(f"  - Expected User ID: {expected_user_id}")
        self.stdout.write("=" * 60)
        
        # Step 1: Verify Jerry's account exists and details
        self.stdout.write(f"🔍 Step 1: Verifying Jerry's account...")
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"✅ User found in database:")
            self.stdout.write(f"  - ID: {user.id}")
            self.stdout.write(f"  - Email: {user.email}")
            self.stdout.write(f"  - Username: {user.username}")
            self.stdout.write(f"  - Role: {getattr(user, 'role', 'Not set')}")
            self.stdout.write(f"  - Active: {user.is_active}")
            self.stdout.write(f"  - Superuser: {user.is_superuser}")
            
            # Check permissions
            permissions = []
            permission_fields = [
                'can_manage_appointments', 'can_manage_patients', 'can_manage_staff',
                'can_view_reports', 'can_manage_clinic_settings', 'can_manage_inventory',
                'can_manage_permissions', 'can_access_integrations', 'can_view_audit_logs',
                'can_view_usage_reports', 'can_access_security_testing'
            ]
            
            for perm in permission_fields:
                if hasattr(user, perm):
                    value = getattr(user, perm)
                    permissions.append(f"{perm}: {'✅' if value else '❌'}")
            
            if permissions:
                self.stdout.write(f"  - Permissions:")
                for perm in permissions:
                    self.stdout.write(f"    {perm}")
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Jerry's account not found!"))
            self.stdout.write(f"💡 Run: python manage.py create_jerry_superadmin")
            return
        
        # Step 2: Test password authentication
        self.stdout.write(f"\n🔐 Step 2: Testing password authentication...")
        
        from django.contrib.auth import authenticate
        auth_user = authenticate(username=email, password=password)
        
        if auth_user:
            self.stdout.write(f"✅ Password authentication successful")
        else:
            self.stdout.write(f"❌ Password authentication failed")
            self.stdout.write(f"💡 The password might be incorrect or the user might be inactive")
            return
        
        # Step 3: Test complete login flow
        self.stdout.write(f"\n🔄 Step 3: Testing complete login flow...")
        
        client = Client()
        
        # Step 3a: Initial login (should trigger 2FA)
        login_data = {
            'identifier': email,
            'password': password
        }
        
        self.stdout.write(f"📤 Sending login request to /api/auth/session-login/...")
        login_response = client.post(
            '/api/auth/session-login/',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Login response status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            self.stdout.write(f"❌ Login failed!")
            try:
                error_data = login_response.json()
                self.stdout.write(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                self.stdout.write(f"Raw response: {login_response.content}")
            return
        
        try:
            login_response_data = login_response.json()
            self.stdout.write(f"✅ Login successful! Response:")
            self.stdout.write(f"  - Success: {login_response_data.get('success')}")
            self.stdout.write(f"  - 2FA Required: {login_response_data.get('2fa_required')}")
            self.stdout.write(f"  - Message: {login_response_data.get('message')}")
            self.stdout.write(f"  - Identifier: {login_response_data.get('identifier')}")
            self.stdout.write(f"  - Identifier Type: {login_response_data.get('identifier_type')}")
            
            if not login_response_data.get('2fa_required'):
                self.stdout.write(f"⚠️  2FA not required - user might be logged in directly")
                return
                
            identifier = login_response_data.get('identifier')
            identifier_type = login_response_data.get('identifier_type')
            
        except json.JSONDecodeError:
            self.stdout.write(f"❌ Login response not JSON: {login_response.content}")
            return
        
        # Step 4: Check OTP in cache
        self.stdout.write(f"\n📧 Step 4: Checking OTP generation and cache...")
        cache_key = f"otp_{identifier}_{identifier_type}"
        stored_otp = cache.get(cache_key)
        
        self.stdout.write(f"📋 Cache key: {cache_key}")
        self.stdout.write(f"📋 Stored OTP: {stored_otp}")
        self.stdout.write(f"📋 OTP type: {type(stored_otp)}")
        
        if not stored_otp:
            self.stdout.write(f"❌ No OTP found in cache!")
            self.stdout.write(f"💡 This means OTP email sending might have failed")
            self.stdout.write(f"💡 Check email configuration and logs")
            return
        
        self.stdout.write(f"✅ OTP generated and stored successfully")
        
        # Step 5: Test OTP verification
        self.stdout.write(f"\n🔍 Step 5: Testing OTP verification...")
        
        verify_data = {
            'identifier': identifier,
            'identifier_type': identifier_type,
            'otp': str(stored_otp)
        }
        
        self.stdout.write(f"📤 Sending OTP verification to /api/auth/session-verify-otp/...")
        self.stdout.write(f"  - identifier: {identifier}")
        self.stdout.write(f"  - identifier_type: {identifier_type}")
        self.stdout.write(f"  - otp: {stored_otp}")
        
        verify_response = client.post(
            '/api/auth/session-verify-otp/',
            data=json.dumps(verify_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 OTP verification response status: {verify_response.status_code}")
        
        if verify_response.status_code == 200:
            try:
                verify_response_data = verify_response.json()
                self.stdout.write(f"✅ OTP verification successful!")
                self.stdout.write(f"  - Success: {verify_response_data.get('success')}")
                self.stdout.write(f"  - Message: {verify_response_data.get('message')}")
                self.stdout.write(f"  - Session ID: {verify_response_data.get('session_id')}")
                
                user_data = verify_response_data.get('user', {})
                self.stdout.write(f"  - User ID: {user_data.get('id')}")
                self.stdout.write(f"  - User Name: {user_data.get('name')}")
                self.stdout.write(f"  - User Role: {user_data.get('role')}")
                
            except json.JSONDecodeError:
                self.stdout.write(f"✅ OTP verification successful (non-JSON response)")
                
        elif verify_response.status_code == 400:
            try:
                error_data = verify_response.json()
                self.stdout.write(f"❌ OTP verification failed (400 Bad Request):")
                self.stdout.write(f"  - Error: {error_data.get('error')}")
                self.stdout.write(f"  - Success: {error_data.get('success')}")
                
                # Provide specific troubleshooting
                error_msg = error_data.get('error', '').lower()
                if 'invalid or expired' in error_msg:
                    self.stdout.write(f"💡 OTP might have expired or there's a format mismatch")
                elif 'pending 2fa' in error_msg:
                    self.stdout.write(f"💡 Session state issue - no pending 2FA login found")
                elif 'required' in error_msg:
                    self.stdout.write(f"💡 Missing required fields in request")
                
            except json.JSONDecodeError:
                self.stdout.write(f"❌ OTP verification failed: {verify_response.content}")
        else:
            self.stdout.write(f"❌ OTP verification failed with status {verify_response.status_code}")
            self.stdout.write(f"Response: {verify_response.content}")
        
        # Step 6: Test sending OTP manually (resend functionality)
        self.stdout.write(f"\n🔄 Step 6: Testing manual OTP send (resend functionality)...")
        
        manual_otp_data = {
            'identifier': email,
            'identifier_type': 'email'
        }
        
        self.stdout.write(f"📤 Sending manual OTP request to /api/auth/send-otp/...")
        manual_otp_response = client.post(
            '/api/auth/send-otp/',
            data=json.dumps(manual_otp_data),
            content_type='application/json'
        )
        
        self.stdout.write(f"📊 Manual OTP response status: {manual_otp_response.status_code}")
        
        if manual_otp_response.status_code == 200:
            try:
                manual_otp_data = manual_otp_response.json()
                self.stdout.write(f"✅ Manual OTP send successful:")
                self.stdout.write(f"  - Success: {manual_otp_data.get('success')}")
                self.stdout.write(f"  - Message: {manual_otp_data.get('message')}")
            except json.JSONDecodeError:
                self.stdout.write(f"✅ Manual OTP send successful (non-JSON response)")
        elif manual_otp_response.status_code == 404:
            self.stdout.write(f"❌ Manual OTP send failed - 404 Not Found")
            self.stdout.write(f"💡 This matches your reported error!")
            self.stdout.write(f"💡 The /api/auth/send-otp/ endpoint is not accessible")
        else:
            self.stdout.write(f"❌ Manual OTP send failed with status {manual_otp_response.status_code}")
            self.stdout.write(f"Response: {manual_otp_response.content}")
        
        # Summary
        self.stdout.write(f"\n" + "=" * 60)
        self.stdout.write(f"📊 TEST SUMMARY FOR JERRY'S ACCOUNT:")
        self.stdout.write(f"  ✅ User exists and is active")
        self.stdout.write(f"  ✅ Password authentication works") 
        self.stdout.write(f"  {'✅' if login_response.status_code == 200 else '❌'} Session login triggers 2FA")
        self.stdout.write(f"  {'✅' if stored_otp else '❌'} OTP generation and caching")
        self.stdout.write(f"  {'✅' if verify_response.status_code == 200 else '❌'} OTP verification")
        self.stdout.write(f"  {'✅' if manual_otp_response.status_code == 200 else '❌'} Manual OTP send (resend)")
        
        if verify_response.status_code != 200:
            self.stdout.write(f"\n💡 NEXT STEPS TO FIX OTP VERIFICATION:")
            self.stdout.write(f"  1. Check Django logs: tail -f /home/lunasynccapstone/LunaSync/django.log")
            self.stdout.write(f"  2. Restart Gunicorn: sudo systemctl restart gunicorn")
            self.stdout.write(f"  3. Monitor real login attempt with logging")
        
        if manual_otp_response.status_code == 404:
            self.stdout.write(f"\n💡 TO FIX 404 ERROR ON RESEND OTP:")
            self.stdout.write(f"  1. Restart Gunicorn: sudo systemctl restart gunicorn")
            self.stdout.write(f"  2. Check URL patterns are loaded correctly")
            self.stdout.write(f"  3. Verify Django is running in production mode")
        
        self.stdout.write(f"\n" + "=" * 60)