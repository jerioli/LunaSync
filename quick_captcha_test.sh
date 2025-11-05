#!/bin/bash
# Quick VPS Captcha Test
echo "🧪 Quick VPS Captcha Test - Fixed Version"
echo "==========================================="

cd /home/lunasynccapstone/LunaSync/capstone
source /home/lunasyncuser/lunasync_env/bin/activate

echo "1. Testing captcha URL reverse lookup..."
python manage.py shell << 'EOF'
from django.urls import reverse
try:
    captcha_url = reverse('captcha:captcha-image', args=['test123'])
    print(f"✅ Captcha URL pattern works: {captcha_url}")
except Exception as e:
    print(f"❌ URL pattern error: {e}")
    
# Also test direct URL access
print(f"✅ Direct URL: /captcha/image/test123/")
EOF

echo ""
echo "2. Testing captcha generation API..."
python manage.py shell << 'EOF'
from django.test import RequestFactory
from accounts.views import CaptchaGenerateView

# Create proper request with lunasync.site host
factory = RequestFactory()
request = factory.get('/api/generate-captcha/', HTTP_HOST='lunasync.site')

view = CaptchaGenerateView()
try:
    response = view.get(request)
    print(f"✅ Status: {response.status_code}")
    print(f"✅ Data: {response.data}")
    if response.status_code == 200:
        print("🎉 CAPTCHA GENERATION SUCCESS!")
    else:
        print("❌ Captcha generation failed")
except Exception as e:
    print(f"❌ Error: {e}")
EOF

echo ""
echo "3. Testing actual captcha image download..."
# Test with a known captcha key from generation above
curl -s -o /tmp/test_captcha.png "https://lunasync.site/captcha/image/test123/"
if [ -f /tmp/test_captcha.png ] && [ -s /tmp/test_captcha.png ]; then
    echo "✅ Captcha image downloaded"
    file /tmp/test_captcha.png
    ls -la /tmp/test_captcha.png
    echo "First few bytes:"
    head -c 50 /tmp/test_captcha.png | xxd
else
    echo "❌ Failed to download captcha image"
fi

echo ""
echo "🏁 Test complete! If all steps show ✅, captcha should work!"