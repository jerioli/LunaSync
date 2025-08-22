from django.db import models
import uuid
import string
import random

class Patient(models.Model):
    # Unique Patient ID field - temporarily allow null for migration
    patient_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    
    # Separate name fields - temporarily nullable for migration
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    middle_initial = models.CharField(max_length=5, blank=True, null=True)
    suffix = models.CharField(max_length=20, blank=True, null=True)  # Jr., Sr., III, etc.
    
    # Keep name field for backward compatibility (computed property)
    name = models.CharField(max_length=255, blank=True, null=True)
    
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other'), ('prefer_not_to_say', 'Prefer not to say')], blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    marital_status = models.CharField(max_length=30, choices=[('single', 'Single'), ('married', 'Married'), ('divorced', 'Divorced'), ('widowed', 'Widowed'), ('prefer_not_to_say', 'Prefer not to say')], blank=True, null=True)
    medical_info = models.JSONField(blank=True, null=True)  # Store medical info as JSON
    physical_examination = models.JSONField(blank=True, null=True)  # Store physical examination data as JSON
    registration_date = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'patients'

    def save(self, *args, **kwargs):
        # Generate patient ID if not set
        if not self.patient_id:
            self.patient_id = self.generate_unique_patient_id()
        
        # Automatically construct full name when saving
        name_parts = [self.first_name, self.last_name]
        if self.middle_initial:
            name_parts.insert(1, self.middle_initial + '.')
        if self.suffix:
            name_parts.append(self.suffix)
        self.name = ' '.join(filter(None, name_parts))
        super().save(*args, **kwargs)

    def generate_unique_patient_id(self):
        """Generate a unique patient ID in format: P-YYYYMMDD-XXXX"""
        from django.utils import timezone
        current_date = timezone.now()
        date_part = current_date.strftime('%Y%m%d')
        
        # Generate a 4-digit random number
        random_part = ''.join(random.choices(string.digits, k=4))
        patient_id = f"P-{date_part}-{random_part}"
        
        # Ensure uniqueness - if exists, generate new one
        while Patient.objects.filter(patient_id=patient_id).exists():
            random_part = ''.join(random.choices(string.digits, k=4))
            patient_id = f"P-{date_part}-{random_part}"
        
        return patient_id

    def get_full_name(self):
        """Return the full name including middle initial and suffix"""
        name_parts = [self.first_name, self.last_name]
        if self.middle_initial:
            name_parts.insert(1, self.middle_initial + '.')
        if self.suffix:
            name_parts.append(self.suffix)
        return ' '.join(filter(None, name_parts))

    def __str__(self):
        return self.get_full_name()