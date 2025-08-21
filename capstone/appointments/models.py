from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import time
from django.core.exceptions import ValidationError
from django.utils import timezone
from patients.models import Patient
from accounts.models import CustomUser
import logging

logger = logging.getLogger(__name__)

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no-show', 'No Show'),
    ]

    TYPE_CHOICES = [
        ('Consultation', 'Consultation'),
        ('Follow-up', 'Follow-up'),
        ('Emergency', 'Emergency'),
        ('Routine Check-up', 'Routine Check-up'),
        ('Vaccination', 'Vaccination'),
        ('Lab Test', 'Lab Test'),
        ('Physical Examination', 'Physical Examination')
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, null=True, blank=True)
    doctor = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'role': 'doctor'}, null=True, blank=True)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    appointment_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='Consultation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Patient detail fields for pending appointments
    patient_name = models.CharField(max_length=255, blank=True, null=True)
    patient_email = models.EmailField(blank=True, null=True)
    patient_phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say')
    ], blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    marital_status = models.CharField(max_length=20, choices=[
        ('single', 'Single'),
        ('married', 'Married'),
        ('divorced', 'Divorced'),
        ('widowed', 'Widowed'),
        ('prefer_not_to_say', 'Prefer not to say')
    ], blank=True, null=True)

    class Meta:
        db_table = 'appointments'

    def __str__(self):
        return f"{self.get_patient_name()} on {self.date} at {self.time}"

    def clean(self):
        # Check if the appointment date is in the past
        if self.date < timezone.now().date():
            raise ValidationError("Cannot create appointment for a past date")

        # Check if the appointment time is in the past for today's appointments
        if self.date == timezone.now().date() and self.time < timezone.now().time():
            raise ValidationError("Cannot create appointment for a past time")

        # Check for overlapping appointments only if doctor is assigned
        if self.doctor:
            overlapping = Appointment.objects.filter(
                doctor=self.doctor,
                date=self.date,
                time=self.time,
                status__in=['pending', 'scheduled']
            ).exclude(id=self.id)

            if overlapping.exists():
                raise ValidationError("This time slot is already booked")

    def save(self, *args, **kwargs):
        self.clean()
        is_new = self.pk is None
        old_status = None
        
        # Get the old status if this is an update
        if not is_new:
            try:
                old_appointment = Appointment.objects.get(pk=self.pk)
                old_status = old_appointment.status
            except Appointment.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        # Update corresponding TimeSlot booking status
        if self.doctor:
            try:
                from doctor_availability.models import DoctorAvailability, TimeSlot
                
                # Find the corresponding availability and time slot
                availability = DoctorAvailability.objects.filter(
                    doctor=self.doctor,
                    date=self.date
                ).first()
                
                if availability:
                    # Find the time slot that matches this appointment time
                    time_slot = TimeSlot.objects.filter(
                        availability=availability,
                        start_time=self.time
                    ).first()
                    
                    if time_slot:
                        # Mark as booked if appointment is active (pending or scheduled)
                        should_be_booked = self.status in ['pending', 'scheduled']
                        
                        if time_slot.is_booked != should_be_booked:
                            time_slot.is_booked = should_be_booked
                            time_slot.save()
                            status_text = "booked" if should_be_booked else "available"
                            logger.info(f"Marked time slot {time_slot.id} as {status_text} for appointment {self.id}")
                    else:
                        logger.warning(f"No matching time slot found for appointment {self.id} at {self.time}")
                else:
                    logger.warning(f"No availability found for doctor {self.doctor.id} on {self.date}")
            except Exception as e:
                logger.error(f"Error updating time slot booking status: {str(e)}")
                # Don't raise the error to prevent appointment save failure
    
    def delete(self, *args, **kwargs):
        # Mark the time slot as available before deleting the appointment
        if self.doctor:
            try:
                from doctor_availability.models import DoctorAvailability, TimeSlot
                
                availability = DoctorAvailability.objects.filter(
                    doctor=self.doctor,
                    date=self.date
                ).first()
                
                if availability:
                    time_slot = TimeSlot.objects.filter(
                        availability=availability,
                        start_time=self.time,
                        is_booked=True
                    ).first()
                    
                    if time_slot:
                        time_slot.is_booked = False
                        time_slot.save()
                        logger.info(f"Marked time slot {time_slot.id} as available after deleting appointment {self.id}")
            except Exception as e:
                logger.error(f"Error updating time slot after appointment deletion: {str(e)}")
        
        super().delete(*args, **kwargs)

    def get_patient_name(self):
        if self.patient:
            return self.patient.name
        if self.patient_name:
            return self.patient_name
        if self.notes and 'Patient Details (Pending):' in self.notes:
            try:
                import json
                patient_details = json.loads(self.notes.split('Patient Details (Pending):')[1].strip())
                return patient_details.get('name', 'Unknown')
            except:
                return 'Unknown'
        return 'Unknown'