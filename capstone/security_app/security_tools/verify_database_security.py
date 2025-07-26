"""
Database Security Verification
Check if sensitive data is properly protected in the database
"""

import os
import sys
import django
import hashlib

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from django.contrib.auth import get_user_model
from patients.models import Patient
from django.db import connection

def check_password_security():
    """Check if passwords are properly hashed"""
    print("🔑 PASSWORD SECURITY CHECK")
    print("-" * 30)
    
    User = get_user_model()
    users = User.objects.all()[:3]  # Check first 3 users
    
    for user in users:
        print(f"User: {user.username}")
        print(f"Password Hash: {user.password[:50]}...")
        
        # Check hashing algorithm
        if user.password.startswith('pbkdf2_sha256$'):
            iterations = user.password.split('$')[1]
            print(f"✅ PBKDF2-SHA256 with {iterations} iterations")
        elif user.password.startswith('argon2$'):
            print("✅ Argon2 hashing algorithm")
        else:
            print("❌ Unknown or weak hashing method")
        
        # Verify password is not stored in plain text
        if len(user.password) > 20 and '$' in user.password:
            print("✅ Password properly hashed (not plain text)")
        else:
            print("❌ Password may not be properly hashed")
        
        print()

def check_sensitive_data_protection():
    """Check if sensitive patient data is protected"""
    print("🏥 PATIENT DATA PROTECTION CHECK")
    print("-" * 30)
    
    patients = Patient.objects.all()[:2]  # Check first 2 patients
    
    if not patients:
        print("ℹ️ No patients found in database")
        return
    
    for patient in patients:
        print(f"Patient: {patient.first_name} {patient.last_name}")
        
        # Check email protection
        print(f"Email stored as: {patient.email}")
        if '@' in patient.email and '.' in patient.email:
            print("⚠️ Email stored in plain text (consider field-level encryption)")
        
        # Check phone protection  
        print(f"Phone stored as: {patient.phone}")
        if patient.phone and patient.phone.isdigit():
            print("⚠️ Phone stored in plain text (consider field-level encryption)")
        
        print()

def check_database_connection_security():
    """Check database connection security"""
    print("🗄️ DATABASE CONNECTION SECURITY")
    print("-" * 30)
    
    with connection.cursor() as cursor:
        # Check if SSL is being used
        cursor.execute("SHOW ssl;")
        ssl_status = cursor.fetchone()
        
        if ssl_status and ssl_status[0] == 'on':
            print("✅ PostgreSQL SSL is enabled")
        else:
            print("⚠️ PostgreSQL SSL not detected")
        
        # Check database version
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"📊 Database version: {version.split()[0]} {version.split()[1]}")
        
        # Check encryption at rest capability
        cursor.execute("SELECT name, setting FROM pg_settings WHERE name LIKE '%ssl%' OR name LIKE '%tls%';")
        ssl_settings = cursor.fetchall()
        
        print("\n🔒 SSL/TLS Settings:")
        for setting_name, setting_value in ssl_settings:
            print(f"   {setting_name}: {setting_value}")

def main():
    print("🔐 DATABASE SECURITY VERIFICATION")
    print("=" * 50)
    
    try:
        check_password_security()
        check_sensitive_data_protection()
        check_database_connection_security()
        
        print("\n" + "=" * 50)
        print("🔐 VERIFICATION COMPLETE")
        print("\n💡 RECOMMENDATIONS:")
        print("1. Consider implementing field-level encryption for PII")
        print("2. Enable database SSL/TLS in production")
        print("3. Regular security audits and penetration testing")
        print("4. Use environment variables for sensitive config")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")

if __name__ == "__main__":
    main()
