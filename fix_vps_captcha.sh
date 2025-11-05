#!/bin/bash
# VPS Captcha Fix Deployment Script
# Run this on your VPS to fix broken captcha images

echo "🔧 Fixing VPS Captcha Issues..."

# 1. Check if fonts are available
echo "📝 Checking system fonts..."
if [ -d "/usr/share/fonts" ]; then
    echo "✅ System fonts directory exists"
    find /usr/share/fonts -name "*.ttf" | head -5
else
    echo "❌ Installing fonts..."
    sudo apt-get update
    sudo apt-get install -y fonts-dejavu-core fontconfig
fi

# 2. Install required Python packages
echo "📦 Installing required packages..."
source /home/lunasynccapstone/lunasync_env/bin/activate
pip install Pillow==10.0.0  # Ensure Pillow is correctly installed

# 3. Check Django captcha installation
echo "🔍 Checking captcha installation..."
python -c "import captcha; print('✅ Captcha package installed')" 2>/dev/null || pip install django-simple-captcha

# 4. Clear captcha cache
echo "🗑️ Clearing captcha cache..."
cd /home/lunasynccapstone/LunaSync/capstone
python manage.py shell -c "from captcha.models import CaptchaStore; CaptchaStore.objects.all().delete(); print('✅ Captcha cache cleared')"

# 5. Run migrations for captcha
echo "🔄 Running captcha migrations..."
python manage.py migrate captcha

# 6. Test captcha generation
echo "🧪 Testing captcha generation..."
python manage.py shell -c "
from captcha.models import CaptchaStore
from captcha.helpers import captcha_image_url
try:
    # Create a test captcha
    store = CaptchaStore.generate_key()
    url = captcha_image_url(store)
    print(f'✅ Captcha test successful: {url}')
except Exception as e:
    print(f'❌ Captcha test failed: {e}')
"

# 7. Check static files serving
echo "📁 Checking static files configuration..."
python manage.py collectstatic --noinput

# 8. Restart services
echo "🔄 Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart lunasync 2>/dev/null || echo "Service lunasync not found - restart manually"

echo "✅ VPS Captcha fix deployment complete!"
echo "💡 Test the captcha at your VPS login page"