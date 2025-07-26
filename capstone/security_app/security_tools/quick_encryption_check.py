"""
Quick Encryption Status Check
Simple script to verify encryption implementation
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from security_app.models import EncryptionStatus
import requests

def quick_encryption_check():
    print("🔐 QUICK ENCRYPTION STATUS CHECK")
    print("=" * 40)
    
    # 1. Check password hashing
    print("\n1. 🔑 Password Hashing Test:")
    try:
        User = get_user_model()
        # Check if we have any users with hashed passwords
        user = User.objects.first()
        if user and user.password:
            if user.password.startswith('pbkdf2_sha256$'):
                print("   ✅ PBKDF2-SHA256 password hashing ACTIVE")
            elif user.password.startswith('argon2$'):
                print("   ✅ Argon2 password hashing ACTIVE")
            else:
                print("   ❌ Unknown password hashing method")
        else:
            print("   ⚠️ No users found to test password hashing")
    except Exception as e:
        print(f"   ❌ Error checking passwords: {e}")
    
    # 2. Check database encryption settings
    print("\n2. 🗄️ Database Encryption Settings:")
    try:
        db_config = settings.DATABASES['default']
        if 'OPTIONS' in db_config and 'sslmode' in db_config['OPTIONS']:
            ssl_mode = db_config['OPTIONS']['sslmode']
            print(f"   ✅ Database SSL mode: {ssl_mode}")
        else:
            print("   ⚠️ No SSL configuration found for database")
    except Exception as e:
        print(f"   ❌ Error checking database config: {e}")
    
    # 3. Check Django security settings
    print("\n3. 🌐 Django Security Settings:")
    security_settings = [
        ('SECRET_KEY', 'Secret key configured'),
        ('DEBUG', 'Debug mode (should be False in production)'),
        ('SESSION_COOKIE_SECURE', 'Secure session cookies'),
        ('CSRF_COOKIE_SECURE', 'Secure CSRF cookies'),
    ]
    
    for setting, description in security_settings:
        if hasattr(settings, setting):
            value = getattr(settings, setting)
            if setting == 'DEBUG':
                status = "⚠️" if value else "✅"
                print(f"   {status} {description}: {value}")
            elif setting == 'SECRET_KEY':
                if value and len(value) > 20:
                    print(f"   ✅ {description}: Present and sufficient length")
                else:
                    print(f"   ❌ {description}: Missing or too short")
            else:
                status = "✅" if value else "⚠️"
                print(f"   {status} {description}: {value}")
        else:
            print(f"   ❌ {description}: Not configured")
    
    # 4. Check API encryption status
    print("\n4. 🔒 Security API Status:")
    try:
        response = requests.get('http://127.0.0.1:8000/api/security-status/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                encryption_data = data['data']['encryption']
                print(f"   ✅ API accessible - Encryption status: {encryption_data['status']}")
                print(f"   ✅ Encrypted systems: {encryption_data['enabled_count']}/{encryption_data['total_count']}")
                
                overall = data['data']['overall_status']
                print(f"   🏆 Overall security score: {overall['score']}/100 ({overall['level']})")
            else:
                print(f"   ❌ API error: {data.get('message', 'Unknown error')}")
        else:
            print(f"   ❌ API returned status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ⚠️ Could not reach security API: {e}")
        print("   💡 Make sure Django server is running: python manage.py runserver")
    
    # 5. Check encryption models in database
    print("\n5. 📊 Database Encryption Records:")
    try:
        encryption_records = EncryptionStatus.objects.all()
        if encryption_records.exists():
            for record in encryption_records:
                status = "✅" if record.is_enabled else "❌"
                print(f"   {status} {record.get_encryption_type_display()}: {record.algorithm}")
        else:
            print("   ⚠️ No encryption status records found")
            print("   💡 Run: python manage.py init_security")
    except Exception as e:
        print(f"   ❌ Error checking encryption records: {e}")
    
    print("\n" + "=" * 40)
    print("🔐 QUICK CHECK COMPLETE")
    print("\nFor comprehensive testing, run:")
    print("python test_encryption.py")

if __name__ == "__main__":
    quick_encryption_check()
