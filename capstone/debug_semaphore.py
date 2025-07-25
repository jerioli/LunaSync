#!/usr/bin/env python
"""
Debug Semaphore SMS Issues
"""

import os
import sys
import django
import requests

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

def debug_semaphore_api():
    """Debug Semaphore API directly"""
    print("🔧 Debugging Semaphore API...")
    print("="*50)
    
    # Your API key
    api_key = '1d1b9ab6af89e61b3db59d9ab3796906'
    
    print(f"📱 API Key: {api_key[:8]}...{api_key[-4:]}")
    print(f"🌐 API URL: https://api.semaphore.co/api/v4/messages")
    
    # Test different phone number formats
    test_numbers = [
        "09852084989",      # Standard PH format
        "+639852084989",    # International format
        "639852084989"      # With country code, no plus
    ]
    
    for phone in test_numbers:
        print(f"\n📞 Testing with phone: {phone}")
        
        payload = {
            'apikey': api_key,
            'number': phone,
            'message': 'Test SMS from MedSync - Please ignore',
            'sendername': 'MedSync'
        }
        
        print(f"🔧 Payload: {payload}")
        
        try:
            response = requests.post(
                'https://api.semaphore.co/api/v4/messages',
                data=payload,
                timeout=30,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            print(f"📊 Status Code: {response.status_code}")
            print(f"📝 Response Headers: {dict(response.headers)}")
            print(f"📄 Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    json_response = response.json()
                    print(f"✅ JSON Response: {json_response}")
                except:
                    print(f"✅ Text Response: {response.text}")
                    
                print(f"✅ SMS might have been sent successfully!")
                break
            elif response.status_code == 403:
                print(f"❌ 403 Forbidden - Possible causes:")
                print(f"   • Invalid API key")
                print(f"   • API key not activated")
                print(f"   • Insufficient credits")
                print(f"   • Account suspended")
                print(f"   • IP address restrictions")
            elif response.status_code == 400:
                print(f"❌ 400 Bad Request - Possible causes:")
                print(f"   • Invalid phone number format")
                print(f"   • Missing required parameters")
                print(f"   • Invalid sender name")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"❌ Network Error: {e}")
    
    print(f"\n🔍 Troubleshooting Steps:")
    print(f"1. Check Semaphore Dashboard: https://dashboard.semaphore.co/")
    print(f"2. Verify API key is correct and active")
    print(f"3. Check account balance/credits")
    print(f"4. Verify account status (not suspended)")
    print(f"5. Check if sender name 'MedSync' is approved")
    print(f"6. Try with a different sender name (like 'INFO')")
    
    print(f"\n💡 Quick Fixes to Try:")
    print(f"• Replace 'MedSync' with 'INFO' in sender name")
    print(f"• Check if your Semaphore account needs verification")
    print(f"• Add credits to your Semaphore account")
    print(f"• Contact Semaphore support if API key issues persist")

if __name__ == "__main__":
    debug_semaphore_api()
