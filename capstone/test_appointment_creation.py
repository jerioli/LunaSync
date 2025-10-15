#!/usr/bin/env python
"""
Test script to verify appointment creation with existing patients doesn't create duplicates
and that appointment details are properly encrypted.
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

django.setup()

from patients.models import Patient
from appointments.models import Appointment
from accounts.models import CustomUser
from appointments.serializer import AppointmentSerializer
from datetime import date, time
import json

def test_appointment_with_existing_patient():
    """Test creating an appointment for an existing patient"""
    print("=== Testing Appointment Creation with Existing Patient ===")
    
    # Get an existing patient
    existing_patient = Patient.objects.first()
    if not existing_patient:
        print("No existing patients found. Creating a test patient first...")
        existing_patient = Patient.objects.create(
            name="Test Patient",
            email="test@example.com",
            phone="1234567890",
            date_of_birth=date(1990, 1, 1),
            gender="male",
            address="123 Test Street"
        )
        print(f"Created test patient: {existing_patient.name} (ID: {existing_patient.patient_id})")
    
    # Get a doctor
    doctor = CustomUser.objects.filter(role='doctor').first()
    if not doctor:
        print("No doctors found. Cannot create appointment.")
        return
    
    print(f"Using existing patient: {existing_patient.name} (ID: {existing_patient.patient_id})")
    print(f"Using doctor: {doctor.first_name} {doctor.last_name}")
    
    # Count patients before appointment creation
    patient_count_before = Patient.objects.count()
    print(f"Patient count before appointment creation: {patient_count_before}")
    
    # Test data that simulates the frontend request
    appointment_data = {
        'patient_id': existing_patient.id,  # Send database ID (as frontend currently does)
        'firstName': 'Updated',
        'lastName': 'Name',
        'patient_email': 'updated@example.com',
        'patient_phone': '9876543210',
        'date_of_birth': date(1990, 1, 1),
        'gender': 'female',
        'address': 'Updated address',
        'marital_status': 'single',
        'appointment_type': 'Consultation',
        'doctor_id': doctor.id,
        'date': date.today(),
        'time': time(10, 0),
        'status': 'scheduled'
    }
    
    print(f"Creating appointment with data: {appointment_data}")
    
    # Create appointment using serializer
    serializer = AppointmentSerializer(data=appointment_data)
    if serializer.is_valid():
        appointment = serializer.save()
        print(f"Appointment created successfully: {appointment.id}")
        
        # Count patients after appointment creation
        patient_count_after = Patient.objects.count()
        print(f"Patient count after appointment creation: {patient_count_after}")
        
        if patient_count_before == patient_count_after:
            print("✅ SUCCESS: No new patient record was created")
        else:
            print("❌ FAILURE: New patient record was created when it shouldn't have been")
        
        # Check if appointment data is encrypted
        print("\n=== Checking Appointment Encryption ===")
        print(f"Patient name (should be encrypted in DB): {appointment.patient_name}")
        print(f"Patient email (should be encrypted in DB): {appointment.patient_email}")
        print(f"Patient phone (should be encrypted in DB): {appointment.patient_phone}")
        
        # Check raw database values
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT patient_name, patient_email, patient_phone FROM appointments WHERE id = %s",
                [appointment.id]
            )
            raw_values = cursor.fetchone()
            if raw_values:
                raw_name, raw_email, raw_phone = raw_values
                print(f"Raw DB patient_name: {raw_name}")
                print(f"Raw DB patient_email: {raw_email}")
                print(f"Raw DB patient_phone: {raw_phone}")
                
                # Check if values are encrypted (should be different from plain text)
                if raw_name != appointment.patient_name:
                    print("✅ Patient name is encrypted in database")
                else:
                    print("❌ Patient name is not encrypted in database")
                    
                if raw_email != appointment.patient_email:
                    print("✅ Patient email is encrypted in database")
                else:
                    print("❌ Patient email is not encrypted in database")
        
        print(f"\nAppointment patient field links to: {appointment.patient}")
        if appointment.patient and appointment.patient.id == existing_patient.id:
            print("✅ Appointment correctly links to existing patient")
        else:
            print("❌ Appointment does not link to existing patient correctly")
            
    else:
        print(f"Serializer validation failed: {serializer.errors}")

def test_appointment_with_patient_id():
    """Test creating an appointment using patient_id field"""
    print("\n=== Testing Appointment Creation with patient_id ===")
    
    # Get an existing patient
    existing_patient = Patient.objects.first()
    if not existing_patient:
        print("No existing patients found.")
        return
    
    # Get a doctor
    doctor = CustomUser.objects.filter(role='doctor').first()
    if not doctor:
        print("No doctors found. Cannot create appointment.")
        return
    
    print(f"Using existing patient: {existing_patient.name} (patient_id: {existing_patient.patient_id})")
    
    # Count patients before appointment creation
    patient_count_before = Patient.objects.count()
    print(f"Patient count before appointment creation: {patient_count_before}")
    
    # Test data using patient_id field
    appointment_data = {
        'patient_id': existing_patient.patient_id,  # Use actual patient_id field
        'firstName': 'Test',
        'lastName': 'Patient',
        'patient_email': 'test@example.com',
        'patient_phone': '1234567890',
        'date_of_birth': date(1990, 1, 1),
        'gender': 'male',
        'address': 'Test address',
        'marital_status': 'single',
        'appointment_type': 'Follow-up',
        'doctor_id': doctor.id,
        'date': date.today(),
        'time': time(14, 0),
        'status': 'scheduled'
    }
    
    print(f"Creating appointment with patient_id: {existing_patient.patient_id}")
    
    # Create appointment using serializer
    serializer = AppointmentSerializer(data=appointment_data)
    if serializer.is_valid():
        appointment = serializer.save()
        print(f"Appointment created successfully: {appointment.id}")
        
        # Count patients after appointment creation
        patient_count_after = Patient.objects.count()
        print(f"Patient count after appointment creation: {patient_count_after}")
        
        if patient_count_before == patient_count_after:
            print("✅ SUCCESS: No new patient record was created with patient_id lookup")
        else:
            print("❌ FAILURE: New patient record was created when using patient_id")
            
        if appointment.patient and appointment.patient.id == existing_patient.id:
            print("✅ Appointment correctly links to existing patient via patient_id")
        else:
            print("❌ Appointment does not link to existing patient correctly via patient_id")
            
    else:
        print(f"Serializer validation failed: {serializer.errors}")

if __name__ == "__main__":
    print("Testing appointment creation and encryption...")
    test_appointment_with_existing_patient()
    test_appointment_with_patient_id()
    print("\nTest completed!")