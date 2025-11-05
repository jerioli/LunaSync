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
echo "3. Testing actual captcha image download with real key..."
# Generate a real captcha and extract the key
python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
from django.test import RequestFactory
from accounts.views import CaptchaGenerateView

# Generate a real captcha
captcha_key = CaptchaStore.generate_key()
print(f"REAL_KEY:{captcha_key}")

# Also test the view
factory = RequestFactory()
request = factory.get('/api/generate-captcha/', HTTP_HOST='lunasync.site')
view = CaptchaGenerateView()
response = view.get(request)
print(f"VIEW_RESPONSE:{response.data}")
EOF

# Extract the real captcha key from the output
REAL_KEY=$(python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
captcha_key = CaptchaStore.generate_key()
print(captcha_key)
EOF
)

echo "Using real captcha key: $REAL_KEY"

# Test downloading with the real key
curl -s -o /tmp/test_captcha.png "https://lunasync.site/captcha/image/$REAL_KEY/"
if [ -f /tmp/test_captcha.png ] && [ -s /tmp/test_captcha.png ]; then
    echo "✅ Captcha image downloaded"
    file /tmp/test_captcha.png
    ls -la /tmp/test_captcha.png
    echo "First few bytes:"
    head -c 50 /tmp/test_captcha.png | xxd
    
    # Check if it's actually an image
    if file /tmp/test_captcha.png | grep -q "PNG\|JPEG\|GIF"; then
        echo "🎉 SUCCESS: Real image file downloaded!"
    else
        echo "❌ Downloaded file is not an image"
    fi
else
    echo "❌ Failed to download captcha image"
fi

# Also test the captcha URL structure
echo ""
echo "4. Testing captcha database and URL structure..."
python manage.py shell << 'EOF'
from captcha.models import CaptchaStore
from django.urls import reverse

# Check existing captcha entries
captchas = CaptchaStore.objects.all()[:5]
print(f"Total captchas in DB: {CaptchaStore.objects.count()}")
for captcha in captchas:
    print(f"Captcha: {captcha.hashkey} - Challenge: {captcha.challenge} - Response: {captcha.response}")
    try:
        url = reverse('captcha:captcha-image', args=[captcha.hashkey])
        print(f"  URL: {url}")
    except Exception as e:
        print(f"  URL Error: {e}")
EOF

echo ""
echo "🏁 Test complete! If all steps show ✅, captcha should work!"