import os
import sys
sys.path.append('/home/lunasynccapstone/LunaSync/capstone')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')

import django
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
print(f"Total users: {User.objects.count()}")
print("Backend is working!")
