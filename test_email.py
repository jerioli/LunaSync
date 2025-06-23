"""
Test script to diagnose email sending issues
"""
import os
import sys
import django

# Add the Django project to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'capstone'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from django.core.mail import EmailMultiAlternatives, send_mail
from django.conf import settings

def test_basic_email():
    """Test basic email sending"""
    print("=== Testing Basic Email ===")
    try:
        result = send_mail(
            'Test Email from Django',
            'This is a test message.',
            settings.EMAIL_HOST_USER,
            [settings.CLINIC_DEFAULT_EMAIL],
            fail_silently=False,
        )
        print(f"Basic email result: {result}")
        return result == 1
    except Exception as e:
        print(f"Basic email failed: {e}")
        return False

def test_html_email():
    """Test HTML email similar to the review email"""
    print("\n=== Testing HTML Email ===")
    try:
        subject = 'Test Review Email'
        html_content = """
        <html>
        <body>
            <h2>Test Review</h2>
            <p>This is a test review email.</p>
        </body>
        </html>
        """
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body="Test review email",
            from_email=f"Test User <{settings.EMAIL_HOST_USER}>",
            to=[settings.CLINIC_DEFAULT_EMAIL],
            reply_to=['test@example.com'],
        )
        msg.attach_alternative(html_content, "text/html")
        
        result = msg.send()
        print(f"HTML email result: {result}")
        return result == 1
    except Exception as e:
        print(f"HTML email failed: {e}")
        return False

def test_smtp_connection():
    """Test SMTP connection directly"""
    print("\n=== Testing SMTP Connection ===")
    try:
        from django.core.mail import get_connection
        connection = get_connection()
        connection.open()
        print("SMTP connection successful!")
        connection.close()
        return True
    except Exception as e:
        print(f"SMTP connection failed: {e}")
        return False

if __name__ == "__main__":
    print("Django Email Test Script")
    print(f"Email Host: {settings.EMAIL_HOST}")
    print(f"Email Port: {settings.EMAIL_PORT}")
    print(f"Email User: {settings.EMAIL_HOST_USER}")
    print(f"Clinic Email: {settings.CLINIC_DEFAULT_EMAIL}")
    print("=" * 50)
    
    # Run tests
    smtp_ok = test_smtp_connection()
    basic_ok = test_basic_email()
    html_ok = test_html_email()
    
    print("\n" + "=" * 50)
    print("Test Results:")
    print(f"SMTP Connection: {'✓' if smtp_ok else '✗'}")
    print(f"Basic Email: {'✓' if basic_ok else '✗'}")
    print(f"HTML Email: {'✓' if html_ok else '✗'}")
    
    if all([smtp_ok, basic_ok, html_ok]):
        print("\n✅ All tests passed! Email should work.")
    else:
        print("\n❌ Some tests failed. Check the errors above.")
