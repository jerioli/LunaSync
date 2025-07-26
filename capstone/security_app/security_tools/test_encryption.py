"""
Encryption Testing Script for MedSync Health System
Tests various encryption aspects to ensure data protection
"""

import os
import sys
import django
import hashlib
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import psycopg2
import json
from datetime import datetime

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from patients.models import Patient
from security_app.models import EncryptionStatus, SecurityAudit

User = get_user_model()

class EncryptionTester:
    def __init__(self):
        self.results = {
            'database_encryption': {'status': 'UNKNOWN', 'details': []},
            'password_hashing': {'status': 'UNKNOWN', 'details': []},
            'session_encryption': {'status': 'UNKNOWN', 'details': []},
            'file_encryption': {'status': 'UNKNOWN', 'details': []},
            'communication_encryption': {'status': 'UNKNOWN', 'details': []},
            'overall_score': 0
        }
        
    def test_database_encryption(self):
        """Test if database connections and data are encrypted"""
        print("🔍 Testing Database Encryption...")
        
        try:
            # Check database connection encryption
            db_config = settings.DATABASES['default']
            
            # Test PostgreSQL SSL connection
            if 'OPTIONS' in db_config and 'sslmode' in db_config['OPTIONS']:
                ssl_mode = db_config['OPTIONS']['sslmode']
                if ssl_mode in ['require', 'verify-ca', 'verify-full']:
                    self.results['database_encryption']['details'].append(f"✅ SSL connection enabled: {ssl_mode}")
                    self.results['database_encryption']['status'] = 'ACTIVE'
                else:
                    self.results['database_encryption']['details'].append(f"⚠️ SSL connection not enforced: {ssl_mode}")
                    self.results['database_encryption']['status'] = 'PARTIAL'
            else:
                self.results['database_encryption']['details'].append("❌ No SSL configuration found")
                self.results['database_encryption']['status'] = 'INACTIVE'
            
            # Test if sensitive data is properly stored
            try:
                # Create test patient and check if data is encrypted at rest
                test_patient = Patient.objects.create(
                    name="Test Encryption",
                    email="test.encryption@example.com",
                    phone="1234567890",
                    date_of_birth="1990-01-01",
                    gender="other",
                    address="123 Test Street"
                )
                
                # Check if email appears in plain text in database
                conn = psycopg2.connect(
                    host=db_config['HOST'],
                    database=db_config['NAME'],
                    user=db_config['USER'],
                    password=db_config['PASSWORD'],
                    port=db_config['PORT']
                )
                
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT email FROM patients_patient WHERE email = %s",
                    [test_patient.email]
                )
                result = cursor.fetchone()
                
                if result and result[0] == test_patient.email:
                    self.results['database_encryption']['details'].append("⚠️ Email stored in plain text (field-level encryption recommended)")
                else:
                    self.results['database_encryption']['details'].append("✅ Email appears to be encrypted at field level")
                
                # Clean up test data
                test_patient.delete()
                conn.close()
                
            except Exception as e:
                self.results['database_encryption']['details'].append(f"❌ Database encryption test failed: {str(e)}")
                
        except Exception as e:
            self.results['database_encryption']['details'].append(f"❌ Database connection test failed: {str(e)}")
            self.results['database_encryption']['status'] = 'ERROR'
    
    def test_password_hashing(self):
        """Test if passwords are properly hashed"""
        print("🔍 Testing Password Hashing...")
        
        try:
            # Create test user to check password hashing
            test_user = User.objects.create_user(
                username="test_encryption_user",
                email="test@encryption.com",
                password="TestPassword123!",
                role="admin"
            )
            
            # Check if password is hashed (not stored in plain text)
            if test_user.password.startswith('pbkdf2_sha256$'):
                self.results['password_hashing']['details'].append("✅ Passwords use PBKDF2-SHA256 hashing")
                self.results['password_hashing']['status'] = 'ACTIVE'
            elif test_user.password.startswith('argon2$'):
                self.results['password_hashing']['details'].append("✅ Passwords use Argon2 hashing")
                self.results['password_hashing']['status'] = 'ACTIVE'
            else:
                self.results['password_hashing']['details'].append("❌ Password hashing method unknown or weak")
                self.results['password_hashing']['status'] = 'INACTIVE'
            
            # Test password verification
            if test_user.check_password("TestPassword123!"):
                self.results['password_hashing']['details'].append("✅ Password verification working correctly")
            else:
                self.results['password_hashing']['details'].append("❌ Password verification failed")
            
            # Clean up
            test_user.delete()
            
        except Exception as e:
            self.results['password_hashing']['details'].append(f"❌ Password hashing test failed: {str(e)}")
            self.results['password_hashing']['status'] = 'ERROR'
    
    def test_session_encryption(self):
        """Test if sessions are encrypted"""
        print("🔍 Testing Session Encryption...")
        
        try:
            # Check session security settings
            security_checks = [
                ('SESSION_COOKIE_SECURE', 'Session cookies sent over HTTPS only'),
                ('SESSION_COOKIE_HTTPONLY', 'Session cookies not accessible via JavaScript'),
                ('CSRF_COOKIE_SECURE', 'CSRF cookies sent over HTTPS only'),
                ('SECURE_SSL_REDIRECT', 'All traffic redirected to HTTPS'),
            ]
            
            active_count = 0
            for setting, description in security_checks:
                if hasattr(settings, setting) and getattr(settings, setting):
                    self.results['session_encryption']['details'].append(f"✅ {description}")
                    active_count += 1
                else:
                    self.results['session_encryption']['details'].append(f"⚠️ {description} - Not configured")
            
            if active_count == len(security_checks):
                self.results['session_encryption']['status'] = 'ACTIVE'
            elif active_count > 0:
                self.results['session_encryption']['status'] = 'PARTIAL'
            else:
                self.results['session_encryption']['status'] = 'INACTIVE'
                
        except Exception as e:
            self.results['session_encryption']['details'].append(f"❌ Session encryption test failed: {str(e)}")
            self.results['session_encryption']['status'] = 'ERROR'
    
    def test_file_encryption(self):
        """Test file encryption capabilities"""
        print("🔍 Testing File Encryption...")
        
        try:
            # Test basic file encryption capability
            test_data = "This is sensitive medical data that should be encrypted"
            
            # Generate encryption key
            password = b"medical_encryption_key_2025"
            salt = os.urandom(16)
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(password))
            
            # Encrypt data
            cipher_suite = Fernet(key)
            encrypted_data = cipher_suite.encrypt(test_data.encode())
            
            # Decrypt data
            decrypted_data = cipher_suite.decrypt(encrypted_data).decode()
            
            if decrypted_data == test_data:
                self.results['file_encryption']['details'].append("✅ File encryption/decryption working correctly")
                self.results['file_encryption']['status'] = 'ACTIVE'
            else:
                self.results['file_encryption']['details'].append("❌ File encryption/decryption failed")
                self.results['file_encryption']['status'] = 'INACTIVE'
            
            # Check if media files are in secure location
            media_root = getattr(settings, 'MEDIA_ROOT', '')
            if media_root and os.path.exists(media_root):
                # Check permissions on media directory
                stat_info = os.stat(media_root)
                permissions = oct(stat_info.st_mode)[-3:]
                
                if permissions <= '755':
                    self.results['file_encryption']['details'].append(f"✅ Media directory has secure permissions: {permissions}")
                else:
                    self.results['file_encryption']['details'].append(f"⚠️ Media directory permissions could be more secure: {permissions}")
            
        except Exception as e:
            self.results['file_encryption']['details'].append(f"❌ File encryption test failed: {str(e)}")
            self.results['file_encryption']['status'] = 'ERROR'
    
    def test_communication_encryption(self):
        """Test communication encryption settings"""
        print("🔍 Testing Communication Encryption...")
        
        try:
            # Check HTTPS enforcement settings
            https_settings = [
                ('SECURE_PROXY_SSL_HEADER', 'Proxy SSL header configured'),
                ('SECURE_SSL_REDIRECT', 'SSL redirect enabled'),
                ('SECURE_BROWSER_XSS_FILTER', 'XSS filter enabled'),
                ('SECURE_CONTENT_TYPE_NOSNIFF', 'Content type sniffing disabled'),
                ('SECURE_REFERRER_POLICY', 'Referrer policy configured'),
            ]
            
            active_count = 0
            for setting, description in https_settings:
                if hasattr(settings, setting) and getattr(settings, setting):
                    self.results['communication_encryption']['details'].append(f"✅ {description}")
                    active_count += 1
                else:
                    self.results['communication_encryption']['details'].append(f"⚠️ {description} - Not configured")
            
            # Check CORS settings for API security
            if hasattr(settings, 'CORS_ALLOWED_ORIGINS'):
                allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
                if any('localhost' in origin for origin in allowed_origins):
                    self.results['communication_encryption']['details'].append("⚠️ CORS allows localhost (development mode)")
                else:
                    self.results['communication_encryption']['details'].append("✅ CORS properly configured for production")
            
            if active_count >= 3:
                self.results['communication_encryption']['status'] = 'ACTIVE'
            elif active_count > 0:
                self.results['communication_encryption']['status'] = 'PARTIAL'
            else:
                self.results['communication_encryption']['status'] = 'INACTIVE'
                
        except Exception as e:
            self.results['communication_encryption']['details'].append(f"❌ Communication encryption test failed: {str(e)}")
            self.results['communication_encryption']['status'] = 'ERROR'
    
    def calculate_overall_score(self):
        """Calculate overall encryption score"""
        scores = {
            'ACTIVE': 25,
            'PARTIAL': 15,
            'INACTIVE': 0,
            'ERROR': 0,
            'UNKNOWN': 0
        }
        
        total_score = 0
        for category, result in self.results.items():
            if category != 'overall_score' and 'status' in result:
                total_score += scores.get(result['status'], 0)
        
        self.results['overall_score'] = total_score
        return total_score
    
    def run_all_tests(self):
        """Run all encryption tests"""
        print("🔐 Starting Comprehensive Encryption Tests")
        print("=" * 50)
        
        self.test_database_encryption()
        self.test_password_hashing()
        self.test_session_encryption()
        self.test_file_encryption()
        self.test_communication_encryption()
        
        score = self.calculate_overall_score()
        
        print("\n" + "=" * 50)
        print("🔐 ENCRYPTION TEST RESULTS")
        print("=" * 50)
        
        for category, result in self.results.items():
            if category == 'overall_score':
                continue
                
            status_emoji = {
                'ACTIVE': '✅',
                'PARTIAL': '⚠️',
                'INACTIVE': '❌',
                'ERROR': '💥',
                'UNKNOWN': '❓'
            }
            
            print(f"\n{status_emoji.get(result['status'], '❓')} {category.replace('_', ' ').title()}: {result['status']}")
            for detail in result['details']:
                print(f"  {detail}")
        
        print(f"\n🏆 OVERALL ENCRYPTION SCORE: {score}/100")
        
        if score >= 90:
            print("🎉 EXCELLENT - Your encryption is enterprise-grade!")
        elif score >= 70:
            print("👍 GOOD - Strong encryption with minor improvements needed")
        elif score >= 50:
            print("⚠️ FAIR - Basic encryption in place, significant improvements recommended")
        else:
            print("🚨 POOR - Critical encryption vulnerabilities detected!")
        
        # Update security status in database
        self.update_security_status(score)
        
        return self.results
    
    def update_security_status(self, score):
        """Update the security status in the database"""
        try:
            # Update encryption status records
            encryption_categories = ['database', 'files', 'communication', 'backup']
            
            for category in encryption_categories:
                encryption_status, created = EncryptionStatus.objects.get_or_create(
                    encryption_type=category,
                    defaults={
                        'is_enabled': True,
                        'algorithm': 'AES-256' if category != 'communication' else 'TLS 1.3',
                        'key_strength': '256-bit'
                    }
                )
                
                # Update based on test results
                if category in self.results:
                    encryption_status.is_enabled = self.results[category]['status'] in ['ACTIVE', 'PARTIAL']
                    encryption_status.save()
            
            # Create security audit record
            admin_user = User.objects.filter(is_superuser=True).first()
            if not admin_user:
                admin_user = User.objects.filter(role='admin').first()
            
            if admin_user:
                findings = []
                for category, result in self.results.items():
                    if category != 'overall_score':
                        findings.extend(result['details'])
                
                SecurityAudit.objects.create(
                    audit_type='encryption',
                    status='passed' if score >= 70 else 'warning',
                    auditor=admin_user,
                    findings='\n'.join(findings),
                    recommendations='Continue monitoring encryption status and implement missing security measures.',
                    score=score
                )
                
        except Exception as e:
            print(f"⚠️ Could not update security status in database: {str(e)}")

if __name__ == "__main__":
    tester = EncryptionTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open('encryption_test_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Detailed results saved to: encryption_test_results.json")
    print(f"📅 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
