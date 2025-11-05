#!/bin/bash
# Comprehensive Captcha Troubleshooting Script
echo "🔧 Comprehensive Captcha Troubleshooting"
echo "========================================"

cd /home/lunasynccapstone/LunaSync/capstone
source /home/lunasyncuser/lunasync_env/bin/activate

echo "1. Testing captcha generation with enhanced logging..."
python manage.py shell << 'EOF'
import logging
logging.basicConfig(level=logging.DEBUG)

from captcha.models import CaptchaStore
from django.test import RequestFactory
from accounts.views import CaptchaGenerateView
import json

print("=== Testing Captcha Generation ===")

# Create proper request
factory = RequestFactory()
request = factory.get('/api/captcha/generate/', 
                     HTTP_HOST='lunasync.site',
                     SERVER_NAME='lunasync.site',
                     HTTP_X_FORWARDED_PROTO='https')

view = CaptchaGenerateView()
try:
    response = view.get(request)
    print(f"✅ Response status: {response.status_code}")
    print(f"✅ Response data: {json.dumps(response.data, indent=2)}")
    
    if response.status_code == 200 and 'captcha_image_url' in response.data:
        captcha_url = response.data['captcha_image_url']
        print(f"🎯 Generated captcha URL: {captcha_url}")
        
        # Extract captcha key
        captcha_key = response.data['captcha_key']
        print(f"🔑 Captcha key: {captcha_key}")
        
        # Test direct captcha generation
        print("\n=== Testing Direct Captcha Image Generation ===")
        from captcha.views import captcha_image
        from django.http import HttpRequest
        
        image_request = HttpRequest()
        image_request.method = 'GET'
        
        try:
            image_response = captcha_image(image_request, captcha_key)
            print(f"✅ Image response status: {image_response.status_code}")
            print(f"✅ Content type: {image_response.get('Content-Type', 'Unknown')}")
            print(f"✅ Content length: {len(image_response.content)} bytes")
            
            if image_response.content.startswith(b'\x89PNG'):
                print("🎉 SUCCESS: Valid PNG image generated!")
                
                # Save for inspection
                with open('/tmp/captcha_test.png', 'wb') as f:
                    f.write(image_response.content)
                print("💾 Saved test image to /tmp/captcha_test.png")
            else:
                print("❌ Not a valid PNG image")
                print(f"First 50 bytes: {image_response.content[:50]}")
                
        except Exception as e:
            print(f"❌ Image generation failed: {e}")
            import traceback
            traceback.print_exc()
            
    else:
        print("❌ Captcha generation failed")
        
except Exception as e:
    print(f"❌ View error: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Testing Font Configuration ===")
from captcha.conf import settings as captcha_settings
print(f"Font path: {getattr(captcha_settings, 'CAPTCHA_FONT_PATH', 'Not set')}")
print(f"Image size: {getattr(captcha_settings, 'CAPTCHA_IMAGE_SIZE', 'Not set')}")
print(f"Font size: {getattr(captcha_settings, 'CAPTCHA_FONT_SIZE', 'Not set')}")
print(f"Background: {getattr(captcha_settings, 'CAPTCHA_BACKGROUND_COLOR', 'Not set')}")
print(f"Foreground: {getattr(captcha_settings, 'CAPTCHA_FOREGROUND_COLOR', 'Not set')}")

EOF

echo ""
echo "2. Testing network connectivity to captcha URLs..."

# Generate a real captcha key
REAL_KEY=$(python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
key = CaptchaStore.generate_key()
print(key)
EOF
)

echo "Generated captcha key for testing: $REAL_KEY"

echo ""
echo "3. Testing different URL protocols..."

echo "Testing HTTPS:"
curl -v -o /tmp/https_captcha.png "https://lunasync.site/captcha/image/$REAL_KEY/" 2>&1 | head -20

echo ""
echo "Testing HTTP:"
curl -v -o /tmp/http_captcha.png "http://lunasync.site/captcha/image/$REAL_KEY/" 2>&1 | head -20

echo ""
echo "4. Analyzing downloaded files..."
for file in /tmp/https_captcha.png /tmp/http_captcha.png /tmp/captcha_test.png; do
    if [ -f "$file" ]; then
        echo "File: $file"
        ls -la "$file"
        file "$file"
        echo "First 20 bytes:"
        head -c 20 "$file" | xxd
        echo "---"
    fi
done

echo ""
echo "5. Testing Django test client..."
python manage.py shell << 'EOF'
from django.test import Client
from captcha.models import CaptchaStore

client = Client()
captcha_key = CaptchaStore.generate_key()

print(f"Testing with Django test client, key: {captcha_key}")
response = client.get(f'/captcha/image/{captcha_key}/')
print(f"Status: {response.status_code}")
print(f"Content-Type: {response.get('Content-Type')}")
print(f"Content length: {len(response.content)}")

if response.content.startswith(b'\x89PNG'):
    print("✅ Django test client: PNG image works!")
    with open('/tmp/django_test_captcha.png', 'wb') as f:
        f.write(response.content)
    print("💾 Saved Django test image to /tmp/django_test_captcha.png")
else:
    print("❌ Django test client: Not PNG")
    print(f"Content: {response.content[:100]}")
EOF

echo ""
echo "🏁 Comprehensive captcha troubleshooting complete!"
echo "Check the generated files in /tmp/ for analysis."