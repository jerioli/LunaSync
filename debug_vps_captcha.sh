#!/bin/bash
# VPS Captcha Debug Script
# Run this on VPS to debug captcha image serving

echo "🔍 VPS Captcha Debug Script"
echo "================================"

cd /home/lunasynccapstone/LunaSync/capstone

# Activate virtual environment
source /home/lunasyncuser/lunasync_env/bin/activate

echo "1. Testing captcha model creation..."
python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url
import os

# Create test captcha
try:
    key = CaptchaStore.generate_key()
    print(f"✅ Generated captcha key: {key}")
    
    # Get image URL
    image_url = captcha_image_url(key)
    print(f"✅ Generated image URL: {image_url}")
    
    # Check if it's a full URL or relative
    if image_url.startswith('http'):
        print("✅ Full URL generated")
    else:
        print(f"📍 Relative URL: {image_url}")
    
except Exception as e:
    print(f"❌ Error: {e}")
EOF

echo ""
echo "2. Checking captcha URLs in Django..."
python manage.py shell << 'EOF'
from django.urls import reverse
try:
    # Test captcha URLs
    captcha_url = reverse('captcha:captcha-image', args=['test123'])
    print(f"✅ Captcha URL pattern works: {captcha_url}")
except Exception as e:
    print(f"❌ URL pattern error: {e}")
EOF

echo ""
echo "3. Testing actual captcha generation via HTTP..."
curl -s -I "http://localhost:8000/captcha/image/test123/" | head -5

echo ""
echo "4. Checking nginx captcha proxy..."
curl -s -I "https://lunasync.site/captcha/image/test123/" | head -5

echo ""
echo "5. Manual captcha test via API..."
python manage.py shell << 'EOF'
from accounts.views import CaptchaGenerateView
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser

# Create test request
factory = RequestFactory()
request = factory.get('/api/generate-captcha/')
request.user = AnonymousUser()

# Test captcha generation
view = CaptchaGenerateView()
response = view.get(request)

print(f"Status: {response.status_code}")
print(f"Data: {response.data}")
EOF

echo ""
echo "🏁 Debug complete! Check results above."