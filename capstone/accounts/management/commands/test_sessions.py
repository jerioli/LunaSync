"""
Test Session Management Command
Usage: python manage.py test_sessions
"""

from django.core.management.base import BaseCommand
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.test import RequestFactory, Client
from django.urls import reverse
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Test session functionality'

    def handle(self, *args, **options):
        self.stdout.write("Testing Session Management...")
        
        # Test 1: Check session table exists
        try:
            session_count = Session.objects.count()
            self.stdout.write(f"✅ Session table exists. Current sessions: {session_count}")
        except Exception as e:
            self.stdout.write(f"❌ Session table error: {e}")
            return
        
        # Test 2: Create test user if not exists
        try:
            user, created = User.objects.get_or_create(
                username='testuser',
                defaults={
                    'email': 'test@example.com',
                    'first_name': 'Test',
                    'last_name': 'User'
                }
            )
            if created:
                user.set_password('testpass123')
                user.save()
                self.stdout.write("✅ Test user created")
            else:
                self.stdout.write("✅ Test user exists")
        except Exception as e:
            self.stdout.write(f"❌ User creation error: {e}")
            return
        
        # Test 3: Test session creation via client
        client = Client()
        try:
            # Test login
            response = client.post('/api/login/', {
                'username': 'testuser',
                'password': 'testpass123'
            }, content_type='application/json')
            
            if response.status_code == 200:
                self.stdout.write("✅ Login successful")
                
                # Check if session was created
                session_key = client.session.session_key
                if session_key:
                    self.stdout.write(f"✅ Session created: {session_key}")
                else:
                    self.stdout.write("❌ No session key found")
                
                # Test session data
                session_data = client.session.items()
                self.stdout.write(f"📋 Session data: {dict(session_data)}")
                
            else:
                self.stdout.write(f"❌ Login failed: {response.status_code}")
                self.stdout.write(f"Response: {response.content}")
                
        except Exception as e:
            self.stdout.write(f"❌ Login test error: {e}")
        
        # Test 4: Check session middleware
        try:
            from django.conf import settings
            middleware = settings.MIDDLEWARE
            session_middleware = 'django.contrib.sessions.middleware.SessionMiddleware'
            
            if session_middleware in middleware:
                self.stdout.write("✅ Session middleware is configured")
            else:
                self.stdout.write("❌ Session middleware not found in MIDDLEWARE")
                
        except Exception as e:
            self.stdout.write(f"❌ Middleware check error: {e}")
        
        # Test 5: Check session settings
        try:
            from django.conf import settings
            
            session_settings = [
                ('SESSION_ENGINE', getattr(settings, 'SESSION_ENGINE', 'Not set')),
                ('SESSION_COOKIE_AGE', getattr(settings, 'SESSION_COOKIE_AGE', 'Not set')),
                ('SESSION_SAVE_EVERY_REQUEST', getattr(settings, 'SESSION_SAVE_EVERY_REQUEST', 'Not set')),
                ('SESSION_COOKIE_HTTPONLY', getattr(settings, 'SESSION_COOKIE_HTTPONLY', 'Not set')),
                ('SESSION_COOKIE_SECURE', getattr(settings, 'SESSION_COOKIE_SECURE', 'Not set')),
            ]
            
            self.stdout.write("\n📋 Session Settings:")
            for setting, value in session_settings:
                self.stdout.write(f"   {setting}: {value}")
                
        except Exception as e:
            self.stdout.write(f"❌ Settings check error: {e}")
        
        self.stdout.write("\n🎯 Session test completed!")
