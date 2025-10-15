#!/usr/bin/env python
"""
Doctor Availability Analysis Script

This script checks which doctors have scheduled availability and time slots.
It helps identify which doctors should be showing in the chatbot vs those who shouldn't.
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capstone.settings')
django.setup()

from accounts.models import CustomUser
from doctor_availability.models import DoctorAvailability, TimeSlot

def check_doctor_availability():
    """Check which doctors have availability and time slots"""
    
    print("=" * 80)
    print("DOCTOR AVAILABILITY ANALYSIS")
    print("=" * 80)
    
    # Get all doctors
    all_doctors = CustomUser.objects.filter(role='doctor').order_by('id')
    print(f"\n📋 Total doctors in database: {all_doctors.count()}")
    
    # Get doctors with availability records
    doctors_with_availability = DoctorAvailability.objects.values(
        'doctor_id', 'doctor__first_name', 'doctor__last_name'
    ).distinct().order_by('doctor_id')
    
    availability_doctor_ids = set(item['doctor_id'] for item in doctors_with_availability)
    
    # Get doctors with time slots
    doctors_with_timeslots = TimeSlot.objects.select_related(
        'availability__doctor'
    ).values(
        'availability__doctor_id',
        'availability__doctor__first_name', 
        'availability__doctor__last_name'
    ).distinct().order_by('availability__doctor_id')
    
    timeslot_doctor_ids = set(item['availability__doctor_id'] for item in doctors_with_timeslots)
    
    print(f"📅 Doctors with availability records: {len(availability_doctor_ids)}")
    print(f"⏰ Doctors with time slots: {len(timeslot_doctor_ids)}")
    
    print("\n" + "=" * 80)
    print("DETAILED DOCTOR ANALYSIS")
    print("=" * 80)
    
    # Check each doctor's status
    doctors_should_show = []
    doctors_should_not_show = []
    
    for doctor in all_doctors:
        doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}".strip()
        has_availability = doctor.id in availability_doctor_ids
        has_timeslots = doctor.id in timeslot_doctor_ids
        
        # Count availability records
        availability_count = DoctorAvailability.objects.filter(doctor_id=doctor.id).count()
        
        # Count time slots
        timeslot_count = TimeSlot.objects.filter(availability__doctor_id=doctor.id).count()
        
        # Count future availability (from today onwards)
        today = datetime.now().date()
        future_availability = DoctorAvailability.objects.filter(
            doctor_id=doctor.id,
            date__gte=today
        ).count()
        
        status = "❌ SHOULD NOT SHOW"
        if has_availability and has_timeslots and future_availability > 0:
            status = "✅ SHOULD SHOW"
            doctors_should_show.append(doctor_name)
        else:
            doctors_should_not_show.append(doctor_name)
        
        print(f"\nID: {doctor.id:2d} | {doctor_name}")
        print(f"   Status: {status}")
        print(f"   📅 Availability records: {availability_count}")
        print(f"   ⏰ Time slots: {timeslot_count}")
        print(f"   🔮 Future availability: {future_availability}")
        
        if has_availability and not has_timeslots:
            print("   ⚠️  WARNING: Has availability but NO time slots!")
        elif not has_availability:
            print("   ⚠️  WARNING: No availability records!")
    
    print("\n" + "=" * 80)
    print("SUMMARY RECOMMENDATIONS")
    print("=" * 80)
    
    print(f"\n✅ DOCTORS THAT SHOULD SHOW IN CHATBOT ({len(doctors_should_show)}):")
    for doctor in doctors_should_show:
        print(f"   • {doctor}")
    
    print(f"\n❌ DOCTORS THAT SHOULD NOT SHOW IN CHATBOT ({len(doctors_should_not_show)}):")
    for doctor in doctors_should_not_show:
        print(f"   • {doctor}")
    
    print("\n" + "=" * 80)
    print("AVAILABILITY DETAILS")
    print("=" * 80)
    
    # Show availability date ranges for doctors who should show
    for doctor in all_doctors:
        if doctor.id in timeslot_doctor_ids:
            doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}".strip()
            availability_dates = DoctorAvailability.objects.filter(
                doctor_id=doctor.id
            ).values_list('date', flat=True).order_by('date')
            
            if availability_dates:
                min_date = min(availability_dates)
                max_date = max(availability_dates)
                total_days = len(availability_dates)
                
                print(f"\n{doctor_name} (ID: {doctor.id}):")
                print(f"   📅 Date range: {min_date} to {max_date}")
                print(f"   📊 Total available days: {total_days}")
                
                # Show time slot count per day (sample)
                recent_dates = list(availability_dates)[-5:]  # Last 5 dates
                print(f"   ⏰ Recent time slots:")
                for date in recent_dates:
                    slot_count = TimeSlot.objects.filter(
                        availability__doctor_id=doctor.id,
                        availability__date=date
                    ).count()
                    print(f"      {date}: {slot_count} slots")
    
    print("\n" + "=" * 80)
    print("CHATBOT FILTERING STATUS")
    print("=" * 80)
    
    chatbot_should_show = len(doctors_should_show)
    chatbot_should_not_show = len(doctors_should_not_show)
    
    print(f"\n📊 Current filtering effectiveness:")
    print(f"   ✅ Doctors with proper schedules: {chatbot_should_show}")
    print(f"   ❌ Doctors without proper schedules: {chatbot_should_not_show}")
    
    if chatbot_should_not_show > 0:
        print(f"\n⚠️  ISSUE DETECTED:")
        print(f"   {chatbot_should_not_show} doctors are showing in chatbot but shouldn't!")
        print(f"   These doctors either:")
        print(f"   • Have no availability records")
        print(f"   • Have availability but no time slots")
        print(f"   • Have no future availability")
    else:
        print(f"\n✅ GOOD: All doctors showing in chatbot have proper schedules!")
    
    return {
        'total_doctors': all_doctors.count(),
        'should_show': len(doctors_should_show),
        'should_not_show': len(doctors_should_not_show),
        'doctors_should_show': doctors_should_show,
        'doctors_should_not_show': doctors_should_not_show
    }

if __name__ == "__main__":
    try:
        results = check_doctor_availability()
        
        # Save results to a file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"doctor_availability_report_{timestamp}.txt"
        
        print(f"\n📄 Report saved to: {output_file}")
        
    except Exception as e:
        print(f"\n❌ Error running analysis: {e}")
        sys.exit(1)