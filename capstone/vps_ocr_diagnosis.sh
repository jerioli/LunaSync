#!/bin/bash
# VPS OCR Diagnosis Script
# Run this on your VPS to diagnose OCR issues

echo "=== LunaSync VPS OCR Diagnosis ==="
echo ""

echo "1. Checking hostname and environment detection..."
cd /path/to/your/lunasync/capstone
python manage.py shell -c "
import socket
from django.conf import settings
print(f'Hostname: {socket.gethostname()}')
print(f'Production mode: {settings.PRODUCTION}')
print(f'Debug mode: {settings.DEBUG}')
"

echo ""
echo "2. Checking AWS credentials..."
python manage.py shell -c "
import os
aws_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')
aws_region = os.getenv('AWS_REGION')
print(f'AWS_ACCESS_KEY_ID: {\"Set\" if aws_key else \"Not Set\"}')
print(f'AWS_SECRET_ACCESS_KEY: {\"Set (length: {})\" .format(len(aws_secret)) if aws_secret else \"Not Set\"}')
print(f'AWS_REGION: {aws_region or \"Not Set\"}')
"

echo ""
echo "3. Testing AWS Textract connection..."
python manage.py test_aws_config

echo ""
echo "4. Checking .env.production file..."
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    echo "File permissions: $(ls -la .env.production)"
    echo "AWS lines in file:"
    grep -E "AWS_|PRODUCTION=" .env.production || echo "No AWS or PRODUCTION variables found"
else
    echo "❌ .env.production file not found!"
fi

echo ""
echo "5. Checking Python packages..."
python -c "
try:
    import boto3
    print('✅ boto3 installed')
except ImportError:
    print('❌ boto3 not installed - run: pip install boto3')

try:
    from api.textract_lab_analysis import get_textract_client
    print('✅ textract_lab_analysis module accessible')
except ImportError as e:
    print(f'❌ textract_lab_analysis import error: {e}')
"

echo ""
echo "=== Diagnosis Complete ==="