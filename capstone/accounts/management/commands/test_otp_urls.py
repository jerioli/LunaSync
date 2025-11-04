"""
Django management command to test URL resolution and view accessibility
"""

from django.core.management.base import BaseCommand
from django.urls import reverse, resolve
from django.test import RequestFactory
from django.conf import settings
import json

class Command(BaseCommand):
    help = 'Test URL resolution and SendOTPView accessibility'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔍 Testing OTP URL Resolution'))
        self.stdout.write("=" * 60)
        
        # Test URL reverse resolution
        try:
            send_otp_url = reverse('send-otp')
            self.stdout.write(f"✅ URL reverse resolution successful: {send_otp_url}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ URL reverse resolution failed: {e}"))
            return
        
        # Test URL resolution
        try:
            resolved = resolve('/api/auth/send-otp/')
            self.stdout.write(f"✅ URL resolution successful:")
            self.stdout.write(f"  View: {resolved.func.__name__}")
            self.stdout.write(f"  View class: {resolved.func.cls.__name__}")
            self.stdout.write(f"  URL name: {resolved.url_name}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ URL resolution failed: {e}"))
        
        # Test SendOTPView import
        try:
            from accounts.views import SendOTPView
            self.stdout.write(f"✅ SendOTPView import successful")
            
            # Check view methods
            view_instance = SendOTPView()
            if hasattr(view_instance, 'post'):
                self.stdout.write(f"✅ SendOTPView has POST method")
            else:
                self.stdout.write(self.style.ERROR(f"❌ SendOTPView missing POST method"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ SendOTPView import failed: {e}"))
        
        # Test with a mock request
        self.stdout.write(f"\n🧪 Testing SendOTPView with mock request:")
        try:
            from accounts.views import SendOTPView
            from django.test import RequestFactory
            from django.contrib.auth.models import AnonymousUser
            
            factory = RequestFactory()
            request = factory.post('/api/auth/send-otp/', {
                'identifier': 'jeri.olivarez@gmail.com',
                'identifier_type': 'email'
            }, content_type='application/json')
            request.user = AnonymousUser()
            
            view = SendOTPView()
            view.request = request
            
            # Test if view processes without errors (we expect some error since it's not a real user)
            try:
                response = view.post(request)
                self.stdout.write(f"✅ SendOTPView POST method executed")
                self.stdout.write(f"  Response status: {response.status_code}")
                
                if hasattr(response, 'data'):
                    self.stdout.write(f"  Response data: {response.data}")
                    
            except Exception as view_error:
                self.stdout.write(f"⚠️  SendOTPView execution error (expected): {view_error}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Mock request test failed: {e}"))
        
        # Check all registered URLs containing 'otp'
        self.stdout.write(f"\n📋 All registered URLs containing 'otp':")
        from django.urls import get_resolver
        resolver = get_resolver()
        
        def find_otp_urls(url_patterns, prefix=''):
            otp_urls = []
            for pattern in url_patterns:
                if hasattr(pattern, 'url_patterns'):
                    # This is an include, recurse into it
                    otp_urls.extend(find_otp_urls(pattern.url_patterns, prefix + str(pattern.pattern)))
                else:
                    # This is a regular pattern
                    full_pattern = prefix + str(pattern.pattern)
                    if 'otp' in full_pattern.lower() or 'otp' in str(pattern.name).lower():
                        otp_urls.append((full_pattern, pattern.name, getattr(pattern.callback, '__name__', str(pattern.callback))))
            return otp_urls
        
        otp_urls = find_otp_urls(resolver.url_patterns)
        
        if otp_urls:
            for url_pattern, name, view_name in otp_urls:
                self.stdout.write(f"  📍 {url_pattern} -> {view_name} (name: {name})")
        else:
            self.stdout.write(f"  ⚠️  No OTP URLs found")
        
        self.stdout.write(f"\n" + "=" * 60)