from django.db import models
from security_app.fields import EncryptedCharField, EncryptedTextField
import uuid
import string
import random
from django.utils import timezone

class PatientManager(models.Manager):
    def get_queryset(self):
        """Return only non-deleted patients by default"""
        return super().get_queryset().filter(is_deleted=False)
    
    def all_including_deleted(self):
        """Return all patients including deleted ones"""
        return super().get_queryset()
    
    def deleted_only(self):
        """Return only deleted patients"""
        return super().get_queryset().filter(is_deleted=True)

class Patient(models.Model):
    # Unique Patient ID field - temporarily allow null for migration
    patient_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    
    # Separate name fields - temporarily nullable for migration
    first_name = EncryptedCharField(max_length=300, blank=True, null=True)
    last_name = EncryptedCharField(max_length=300, blank=True, null=True)
    middle_initial = EncryptedCharField(max_length=50, blank=True, null=True)
    suffix = EncryptedCharField(max_length=100, blank=True, null=True)  # Jr., Sr., III, etc.
    # Keep name field for backward compatibility (computed property)
    name = EncryptedCharField(max_length=800, blank=True, null=True)
    email = EncryptedCharField(max_length=600, unique=False)  # Temporarily disable unique for encrypted fields
    phone = EncryptedCharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other'), ('prefer_not_to_say', 'Prefer not to say')], blank=True, null=True)
    address = EncryptedTextField(blank=True, null=True)
    religion = EncryptedCharField(max_length=300, blank=True, null=True)  # Added religion field
    marital_status = models.CharField(max_length=30, choices=[('single', 'Single'), ('married', 'Married'), ('divorced', 'Divorced'), ('widowed', 'Widowed'), ('prefer_not_to_say', 'Prefer not to say')], blank=True, null=True)
    medical_info = EncryptedTextField(blank=True, null=True)  # Store medical info as encrypted JSON string
    physical_examination = EncryptedTextField(blank=True, null=True)  # Store physical examination data as encrypted JSON string
    registration_date = models.DateField(auto_now_add=True)
    
    # Red flag system
    is_red_flagged = models.BooleanField(default=False, help_text="Mark patient as red flagged for special attention")
    red_flag_reason = EncryptedTextField(blank=True, null=True, help_text="Reason for red flagging this patient")
    red_flagged_by = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='red_flagged_patients', help_text="User who red flagged this patient")
    red_flagged_date = models.DateTimeField(null=True, blank=True, help_text="When the patient was red flagged")
    
    is_deleted = models.BooleanField(default=False)  # Soft delete field
    deleted_at = models.DateTimeField(null=True, blank=True)  # When the patient was deleted

    # Custom manager
    objects = PatientManager()

    class Meta:
        db_table = 'patients'

    def soft_delete(self):
        """Soft delete the patient"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
    
    def restore(self):
        """Restore a soft-deleted patient"""
        self.is_deleted = False
        self.deleted_at = None
        self.save()
    
    def set_red_flag(self, reason, user):
        """Set red flag for this patient"""
        self.is_red_flagged = True
        self.red_flag_reason = reason
        self.red_flagged_by = user
        self.red_flagged_date = timezone.now()
        self.save()
    
    def clear_red_flag(self):
        """Clear red flag for this patient"""
        self.is_red_flagged = False
        self.red_flag_reason = None
        self.red_flagged_by = None
        self.red_flagged_date = None
        self.save()

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