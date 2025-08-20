#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, character_maximum_length, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND character_maximum_length IS NOT NULL
        ORDER BY column_name;
    """)
    
    print("Database schema for patients table:")
    for row in cursor.fetchall():
        print(f"{row[0]}: {row[1]} ({row[2]})")
