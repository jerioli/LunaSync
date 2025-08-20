#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from patients.models import Patient

print("Patient model field lengths:")
for field in Patient._meta.fields:
    if hasattr(field, 'max_length'):
        print(f"{field.name}: {field.max_length}")
    else:
        print(f"{field.name}: {type(field).__name__}")
