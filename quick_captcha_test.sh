#!/bin/bash
# Quick VPS Captcha Test
echo "🧪 Quick VPS Captcha Test"
echo "========================"

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
EOF

echo ""
echo "2. Testing captcha generation with proper host..."
python manage.py shell << 'EOF'
from django.test import RequestFactory
from accounts.views import CaptchaGenerateView
import os

# Create proper request with lunasync.site host
factory = RequestFactory()
request = factory.get('/api/generate-captcha/', HTTP_HOST='lunasync.site')

view = CaptchaGenerateView()
try:
    response = view.get(request)
    print(f"✅ Status: {response.status_code}")
    print(f"✅ Data: {response.data}")
except Exception as e:
    print(f"❌ Error: {e}")
EOF

echo ""
echo "3. Testing direct captcha URL access..."
curl -s -o /tmp/test_captcha.png "https://lunasync.site/captcha/image/test123/"
if [ -f /tmp/test_captcha.png ] && [ -s /tmp/test_captcha.png ]; then
    echo "✅ Captcha image downloaded successfully"
    file /tmp/test_captcha.png
else
    echo "❌ Failed to download captcha image"
fi

echo "🏁 Test complete!"