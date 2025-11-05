#!/bin/bash
# Simple Captcha URL Test
echo "🧪 Simple Captcha URL Test"
echo "=========================="

cd /home/lunasynccapstone/LunaSync/capstone
source /home/lunasyncuser/lunasync_env/bin/activate

echo "1. Generating real captcha..."
CAPTCHA_DATA=$(python manage.py shell << 'EOF'
from django.test import RequestFactory
from accounts.views import CaptchaGenerateView
import json

factory = RequestFactory()
request = factory.get('/api/captcha/generate/', 
                     HTTP_HOST='lunasync.site',
                     HTTP_X_FORWARDED_PROTO='https')

view = CaptchaGenerateView()
response = view.get(request)
print(json.dumps(response.data))
EOF
)

echo "Captcha generation response: $CAPTCHA_DATA"

# Extract captcha URL (simplified)
CAPTCHA_URL=$(echo "$CAPTCHA_DATA" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'captcha_image_url' in data:
        print(data['captcha_image_url'])
    else:
        print('ERROR: No captcha_image_url found')
except:
    print('ERROR: Failed to parse JSON')
")

echo "Extracted captcha URL: $CAPTCHA_URL"

if [[ "$CAPTCHA_URL" != ERROR* ]]; then
    echo ""
    echo "2. Testing captcha URL access..."
    
    echo "Downloading captcha image..."
    curl -v -o /tmp/simple_captcha_test.png "$CAPTCHA_URL" 2>&1 | grep -E "(Content-Type|HTTP/|Content-Length)"
    
    echo ""
    echo "File analysis:"
    if [ -f /tmp/simple_captcha_test.png ]; then
        ls -la /tmp/simple_captcha_test.png
        file /tmp/simple_captcha_test.png
        
        if file /tmp/simple_captcha_test.png | grep -q "PNG"; then
            echo "🎉 SUCCESS: Captcha image is a valid PNG!"
        elif file /tmp/simple_captcha_test.png | grep -q "HTML"; then
            echo "❌ ERROR: Still getting HTML instead of PNG"
            echo "First 200 chars of file:"
            head -c 200 /tmp/simple_captcha_test.png
        else
            echo "❓ UNKNOWN: File type not recognized"
            head -c 100 /tmp/simple_captcha_test.png | xxd
        fi
    else
        echo "❌ ERROR: No file downloaded"
    fi
else
    echo "❌ ERROR: Could not extract valid captcha URL"
fi

echo ""
echo "🏁 Simple test complete!"