#!/usr/bin/env python
"""
iProg SMS Integration Test Script
Run this script to test iProg SMS functionality
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from accounts.iprog_sms_service import iprog_sms_service


def test_phone_formatting():
    """Test phone number formatting"""
    print("🔢 Testing Phone Number Formatting")
    print("=" * 40)
    
    test_numbers = [
        "09123456789",
        "+639123456789", 
        "639123456789",
        "0917-123-4567",
        "+63 917 123 4567"
    ]
    
    for number in test_numbers:
        formatted = iprog_sms_service.format_phone_number(number)
        print(f"  {number:20} → {formatted}")
    
    print()


def test_phone_validation():
    """Test phone number validation"""
    print("✅ Testing Phone Number Validation")
    print("=" * 40)
    
    test_numbers = [
        "639123456789",  # Valid mobile
        "632123456789",  # Valid landline
        "6391234567",    # Too short
        "63912345678901", # Too long
    ]
    
    for number in test_numbers:
        is_valid, formatted, info = iprog_sms_service.verify_phone_number(number)
        status = "✅ Valid" if is_valid else "❌ Invalid"
        print(f"  {number:15} → {status:10} | {info['type']:10} | {formatted}")
    
    print()


def test_sms_configuration():
    """Test SMS service configuration"""
    print("⚙️  Testing SMS Service Configuration")
    print("=" * 40)
    
    print(f"  API Key Configured: {'✅ Yes' if iprog_sms_service.is_configured else '❌ No'}")
    print(f"  API URL: {iprog_sms_service.api_url}")
    print(f"  Sender ID: {iprog_sms_service.sender_id}")
    
    if iprog_sms_service.api_key:
        key_preview = f"{iprog_sms_service.api_key[:8]}...{iprog_sms_service.api_key[-4:]}"
        print(f"  API Key Preview: {key_preview}")
    else:
        print(f"  API Key: ❌ Not configured")
    
    print()


def test_sms_sending():
    """Test OTP SMS sending (development mode safe)"""
    print("📱 Testing OTP SMS Sending")
    print("=" * 40)
    
    test_phone = "09123456789"
    test_otp = "123456"
    
    print(f"  Sending OTP to: {test_phone}")
    print(f"  OTP Code: {test_otp}")
    print()
    
    success, message, reference_id = iprog_sms_service.send_otp_sms(test_phone, test_otp)
    
    status = "✅ Success" if success else "❌ Failed"
    print(f"  Result: {status}")
    print(f"  Message: {message}")
    
    if reference_id:
        print(f"  Reference ID: {reference_id}")
    
    print()


def test_balance_check():
    """Test balance checking functionality"""
    print("💰 Testing Balance Check")
    print("=" * 40)
    
    if not iprog_sms_service.is_configured:
        print("  ⚠️  Skipped - iProg not configured")
        print()
        return
    
    success, balance, message = iprog_sms_service.get_balance()
    
    if success:
        print(f"  ✅ Balance: {balance}")
    else:
        print(f"  ❌ Failed: {message}")
    
    print()


def main():
    """Run all tests"""
    print("🚀 iProg SMS Integration Test Suite")
    print("=" * 50)
    print()
    
    # Run all tests
    test_sms_configuration()
    test_phone_formatting()
    test_phone_validation()
    test_sms_sending()
    test_balance_check()
    
    print("📋 Test Summary")
    print("=" * 40)
    print("✅ All tests completed!")
    print()
    print("Next Steps:")
    if not iprog_sms_service.is_configured:
        print("  1. Add IPROG_API_KEY to your .env file")
        print("  2. Restart Django development server")
        print("  3. Test with real phone number")
    else:
        print("  1. iProg SMS is configured and ready!")
        print("  2. Test the login flow with SMS OTP")
        print("  3. Monitor logs for any issues")
    
    print()


if __name__ == "__main__":
    main()
