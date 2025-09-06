#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def reset_and_recreate_tables():
    cursor = connection.cursor()
    
    # Apps that need their migration records reset
    apps_to_reset = [
        'doctor_availability', 
        'medical_documents', 
        'medical_requests', 
        'security_app', 
        'systemlogs', 
        'authtoken', 
        'sessions'
    ]
    
    print("Resetting migration records...")
    for app in apps_to_reset:
        cursor.execute("DELETE FROM django_migrations WHERE app = %s", [app])
        print(f"Reset {app} migrations")
    
    print("Migration records reset successfully!")
    print("Now run: python manage.py migrate")

if __name__ == "__main__":
    reset_and_recreate_tables()
