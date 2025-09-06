    #!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from accounts.models import CustomUser

print("=== Current Users and Roles ===")
users = CustomUser.objects.all()
for user in users:
    print(f"Username: {user.username}")
    print(f"Role: {user.role}")
    print(f"Is Active: {user.is_active}")
    print(f"Is Staff: {user.is_staff}")
    print(f"Is Superuser: {user.is_superuser}")
    print("-" * 30)

if not users.exists():
    print("No users found in the database!")
