#!/bin/bash
# Test Django Simple Captcha Setup - Based on Stack Overflow Solution
echo "🔧 Testing Django Simple Captcha Setup"
echo "======================================="

cd /home/lunasynccapstone/LunaSync/capstone
source /home/lunasyncuser/lunasync_env/bin/activate

echo "1. Testing captcha app installation..."
python manage.py shell << 'EOF'
import django
print(f"Django version: {django.VERSION}")

# Check if captcha is in INSTALLED_APPS
from django.conf import settings
if 'captcha' in settings.INSTALLED_APPS:
    print("✅ captcha app is in INSTALLED_APPS")
else:
    print("❌ captcha app is NOT in INSTALLED_APPS")

# Check captcha models
try:
    from captcha.models import CaptchaStore
    count = CaptchaStore.objects.count()
    print(f"✅ CaptchaStore model accessible, {count} captchas in DB")
except Exception as e:
    print(f"❌ CaptchaStore model error: {e}")
EOF

echo ""
echo "2. Testing PIL/imaging capabilities..."
python manage.py shell << 'EOF'
try:
    from PIL import Image, ImageDraw, ImageFont
    print("✅ PIL imported successfully")
    
    # Test font loading
    try:
        font = ImageFont.load_default()
        print("✅ Default font loaded")
    except Exception as e:
        print(f"❌ Default font error: {e}")
    
    # Test truetype font
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30)
        print("✅ TrueType font loaded successfully")
    except Exception as e:
        print(f"⚠️  TrueType font error: {e}")
    
    # Test _imagingft module (the main issue from Stack Overflow)
    try:
        from PIL import _imagingft
        print("✅ _imagingft module is available")
    except ImportError:
        print("❌ _imagingft module is NOT available - this is the main issue!")
        print("   Run: sudo apt-get install libfreetype6-dev")
        print("   Then reinstall PIL: pip install --upgrade Pillow")
        
except ImportError as e:
    print(f"❌ PIL import error: {e}")
EOF

echo ""
echo "3. Testing captcha URL patterns..."
python manage.py shell << 'EOF'
from django.urls import reverse
from django.core.exceptions import NoReverseMatch

# Test URL patterns
try:
    # Test simple pattern
    url = reverse('captcha-image', args=['test123'])
    print(f"✅ Simple URL pattern works: {url}")
except NoReverseMatch as e:
    print(f"❌ Simple URL pattern failed: {e}")

try:
    # Test namespaced pattern
    url = reverse('captcha:captcha-image', args=['test123'])
    print(f"✅ Namespaced URL pattern works: {url}")
except NoReverseMatch as e:
    print(f"❌ Namespaced URL pattern failed: {e}")
EOF

echo ""
echo "4. Testing captcha image generation directly..."
python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
from captcha.views import captcha_image
from django.http import HttpRequest

# Generate a captcha
key = CaptchaStore.generate_key()
print(f"Generated captcha key: {key}")

# Test image generation
try:
    request = HttpRequest()
    request.method = 'GET'
    
    response = captcha_image(request, key)
    print(f"✅ Image generation status: {response.status_code}")
    print(f"✅ Content type: {response.get('Content-Type')}")
    print(f"✅ Content length: {len(response.content)} bytes")
    
    if response.content.startswith(b'\x89PNG'):
        print("✅ Valid PNG image generated!")
    else:
        print("❌ Not a valid PNG image")
        print(f"First bytes: {response.content[:20]}")
        
except Exception as e:
    print(f"❌ Image generation failed: {e}")
    import traceback
    traceback.print_exc()
EOF

echo ""
echo "5. Testing HTTP captcha access..."
curl -I "http://lunasync.site/captcha/image/test123/" 2>/dev/null | head -5

echo ""
echo "6. Testing HTTPS captcha access..."
curl -I "https://lunasync.site/captcha/image/test123/" 2>/dev/null | head -5

echo ""
echo "🏁 Captcha setup test complete!"
echo ""
echo "If you see '_imagingft module is NOT available', install missing dependencies:"
echo "  sudo apt-get update"
echo "  sudo apt-get install libfreetype6-dev libjpeg-dev libpng-dev"
echo "  pip install --upgrade Pillow"
echo "  sudo systemctl restart gunicorn"