#!/usr/bin/env python
"""
Quick email test script for VPS
Run this on your VPS to test email functionality
"""
import os
import django
import sys

# Add the project directory to Python path
sys.path.append('/home/lunasynccapstone/LunaSync/capstone')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
import smtplib
from email.mime.text import MIMEText

def test_smtp_connection():
    """Test raw SMTP connection"""
    try:
        print("Testing SMTP connection...")
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        print("✅ SMTP connection successful!")
        server.quit()
        return True
    except Exception as e:
        print(f"❌ SMTP connection failed: {e}")
        return False

def test_django_email():
    """Test Django email sending"""
    try:
        print("Testing Django email...")
        result = send_mail(
            'VPS Email Test',
            'This email confirms that Gmail SMTP is working on your VPS!',
            settings.DEFAULT_FROM_EMAIL,
            [settings.EMAIL_HOST_USER],  # Send to yourself
            fail_silently=False,
        )
        print(f"✅ Django email sent successfully! Result: {result}")
        return True
    except Exception as e:
        print(f"❌ Django email failed: {e}")
        return False

def test_otp_email():
    """Test OTP email functionality"""
    try:
        print("Testing OTP email system...")
        from accounts.models import User
        from accounts.views import send_otp_email
        
        # Get first admin user for testing
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            print("❌ No admin user found for testing")
            return False
            
        # Generate test OTP
        test_otp = "123456"
        
        # Send OTP email
        send_otp_email(user.email, test_otp)
        print(f"✅ OTP email sent to {user.email}")
        return True
    except Exception as e:
        print(f"❌ OTP email failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("EMAIL FUNCTIONALITY TEST - VPS")
    print("=" * 50)
    
    print(f"Email Host: {settings.EMAIL_HOST}")
    print(f"Email User: {settings.EMAIL_HOST_USER}")
    print(f"Email Port: {settings.EMAIL_PORT}")
    print(f"Use TLS: {settings.EMAIL_USE_TLS}")
    print("-" * 50)
    
    # Run tests
    smtp_ok = test_smtp_connection()
    print()
    
    django_ok = test_django_email()
    print()
    
    otp_ok = test_otp_email()
    print()
    
    print("=" * 50)
    print("TEST SUMMARY:")
    print(f"SMTP Connection: {'✅ PASS' if smtp_ok else '❌ FAIL'}")
    print(f"Django Email: {'✅ PASS' if django_ok else '❌ FAIL'}")
    print(f"OTP Email: {'✅ PASS' if otp_ok else '❌ FAIL'}")
    print("=" * 50)