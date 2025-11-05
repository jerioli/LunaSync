#!/bin/bash
# Direct Captcha Debug Test
echo "🔍 Direct Captcha Library Debug"
echo "================================"

cd /home/lunasynccapstone/LunaSync/capstone
source /home/lunasyncuser/lunasync_env/bin/activate

echo "1. Testing captcha library directly..."
python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url
from django.http import HttpRequest
from django.test import RequestFactory
import os

print("Testing captcha library components...")

# 1. Test captcha key generation
try:
    key = CaptchaStore.generate_key()
    print(f"✅ Generated captcha key: {key}")
    
    # Check if it's in database
    captcha = CaptchaStore.objects.get(hashkey=key)
    print(f"✅ Found in DB - Challenge: {captcha.challenge}, Response: {captcha.response}")
except Exception as e:
    print(f"❌ Key generation error: {e}")

# 2. Test captcha image generation
try:
    from captcha.views import captcha_image
    from django.http import HttpRequest
    
    # Create a mock request
    request = HttpRequest()
    request.method = 'GET'
    
    # Try to generate image
    response = captcha_image(request, key)
    print(f"✅ Image response status: {response.status_code}")
    print(f"✅ Content type: {response.get('Content-Type', 'Unknown')}")
    print(f"✅ Content length: {len(response.content)} bytes")
    
    # Check if it looks like PNG
    if response.content.startswith(b'\x89PNG'):
        print("🎉 SUCCESS: Valid PNG image generated!")
    else:
        print("❌ Not a PNG image")
        print(f"First bytes: {response.content[:20]}")
        
except Exception as e:
    print(f"❌ Image generation error: {e}")
    import traceback
    traceback.print_exc()

# 3. Test font availability
try:
    from captcha.conf import settings as captcha_settings
    print(f"Font path: {getattr(captcha_settings, 'CAPTCHA_FONT_PATH', 'Default')}")
    
    # Check if PIL can work
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new('RGB', (100, 50), 'white')
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default()
        draw.text((10, 10), "TEST", fill='black', font=font)
        print("✅ PIL font loading works")
    except Exception as fe:
        print(f"❌ PIL font error: {fe}")
        
except Exception as e:
    print(f"❌ Font test error: {e}")

# 4. Test settings
print(f"CAPTCHA_TEST_MODE: {getattr(captcha_settings, 'CAPTCHA_TEST_MODE', 'Not set')}")
print(f"CAPTCHA_IMAGE_SIZE: {getattr(captcha_settings, 'CAPTCHA_IMAGE_SIZE', 'Not set')}")
print(f"CAPTCHA_FONT_SIZE: {getattr(captcha_settings, 'CAPTCHA_FONT_SIZE', 'Not set')}")

EOF

echo ""
echo "2. Testing HTTP response for captcha image..."
# Create a real captcha and test the HTTP response
REAL_KEY=$(python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
key = CaptchaStore.generate_key()
print(key)
EOF
)

echo "Testing with key: $REAL_KEY"

# Use curl with more verbose output
curl -v -o /tmp/direct_captcha.png "https://lunasync.site/captcha/image/$REAL_KEY/" 2>&1 | head -20

echo ""
echo "File analysis:"
if [ -f /tmp/direct_captcha.png ]; then
    ls -la /tmp/direct_captcha.png
    file /tmp/direct_captcha.png
    echo "First 100 bytes:"
    head -c 100 /tmp/direct_captcha.png | xxd
else
    echo "No file created"
fi

echo ""
echo "🏁 Direct captcha test complete!"