#!/bin/bash
echo "Adding SSL certificate directives to /etc/nginx/sites-available/lunasync.site"

# Backup the current file
sudo cp /etc/nginx/sites-available/lunasync.site /etc/nginx/sites-available/lunasync.site.backup-$(date +%Y%m%d-%H%M%S)

# Add SSL directives after the listen 443 ssl; line
sudo sed -i '/listen 443 ssl;/a\    ssl_certificate /etc/letsencrypt/live/lunasync.site/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/lunasync.site/privkey.pem;' /etc/nginx/sites-available/lunasync.site

echo "✅ SSL directives added. Testing nginx config..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Config test passed. Reloading nginx..."
    sudo systemctl reload nginx
    echo "🎉 Nginx reloaded successfully!"
else
    echo "❌ Config test failed. Please check the configuration."
    exit 1
fi
