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
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
        super().save(*args, **kwargs)

    def get_patient_name(self):
        if self.patient:
            return self.patient.name
        if self.notes and 'Patient Details (Pending):' in self.notes:
            try:
                import json
                patient_details = json.loads(self.notes.split('Patient Details (Pending):')[1].strip())
                return patient_details.get('name', 'Unknown')
            except:
                return 'Unknown'
        return 'Unknown'