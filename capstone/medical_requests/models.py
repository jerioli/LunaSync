from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from security_app.fields import EncryptedCharField, EncryptedTextField

class MedicalCertificateRequest(models.Model):
    REQUEST_TYPES = [
        ('sick_leave', 'Sick Leave Certificate'),
        ('fitness', 'Medical Fitness Certificate'),
        ('vaccination', 'Vaccination Certificate'),
        ('general', 'General Medical Certificate'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('receptionist_approved', 'Receptionist Approved'),
        ('doctor_approved', 'Doctor Approved'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPES)
    patient_name = EncryptedCharField(max_length=800)  # Encrypted patient name
    date_of_birth = EncryptedCharField(max_length=100)  # Encrypted DOB
    email = EncryptedCharField(max_length=600)  # Encrypted email
    phone = EncryptedCharField(max_length=100)  # Encrypted phone
    additional_info = EncryptedTextField(blank=True, null=True)  # Encrypted additional info
    id_verification = models.FileField(upload_to='medical_requests/id_verification/', null=True, blank=True)
    id_verification_front = models.FileField(upload_to='medical_requests/id_verification/', null=True, blank=True)
    id_verification_back = models.FileField(upload_to='medical_requests/id_verification/', null=True, blank=True)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    
    # Processing fields
    requested_at = models.DateTimeField(auto_now_add=True)
    receptionist_approved_at = models.DateTimeField(null=True, blank=True)
    receptionist_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_certificates')
    doctor_approved_at = models.DateTimeField(null=True, blank=True)
    doctor_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='doctor_approved_certificates')
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Certificate content - encrypted for patient privacy
    certificate_content = EncryptedTextField(blank=True, null=True)  # Encrypted certificate content
    doctor_notes = EncryptedTextField(blank=True, null=True)  # Encrypted doctor notes
    rejection_reason = EncryptedTextField(blank=True, null=True)  # Encrypted rejection reason
    
    class Meta:
        db_table = 'medical_certificate_request'
    
    def __str__(self):
        return f"{self.patient_name} - {self.get_request_type_display()}"

class PrescriptionRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('receptionist_approved', 'Receptionist Approved'),
        ('doctor_approved', 'Doctor Approved'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    
    medication_name = EncryptedCharField(max_length=600)  # Encrypted medication name
    dosage = EncryptedCharField(max_length=300)  # Encrypted dosage
    frequency = EncryptedCharField(max_length=300)  # Encrypted frequency
    duration = EncryptedCharField(max_length=300)  # Encrypted duration
    patient_name = EncryptedCharField(max_length=800)  # Encrypted patient name
    date_of_birth = EncryptedCharField(max_length=100)  # Encrypted DOB
    email = EncryptedCharField(max_length=600)  # Encrypted email
    phone = EncryptedCharField(max_length=100)  # Encrypted phone
    additional_notes = EncryptedTextField(blank=True, null=True)  # Encrypted additional notes
    id_verification = models.FileField(upload_to='medical_requests/id_verification/', null=True, blank=True)
    id_verification_front = models.FileField(upload_to='medical_requests/id_verification/', null=True, blank=True)
    id_verification_back = models.FileField(upload_to='medical_requests/id_verification/', null=True, blank=True)
    prescription_image = models.FileField(upload_to='medical_requests/prescriptions/', null=True, blank=True)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    
    # Processing fields
    requested_at = models.DateTimeField(auto_now_add=True)
    receptionist_approved_at = models.DateTimeField(null=True, blank=True)
    receptionist_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_prescriptions')
    doctor_approved_at = models.DateTimeField(null=True, blank=True)
    doctor_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='doctor_approved_prescriptions')
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Prescription content - encrypted for patient privacy
    prescription_content = EncryptedTextField(blank=True, null=True)  # Encrypted prescription content
    doctor_notes = EncryptedTextField(blank=True, null=True)  # Encrypted doctor notes
    rejection_reason = EncryptedTextField(blank=True, null=True)  # Encrypted rejection reason
    
    class Meta:
        db_table = 'prescription_request'
    
    def __str__(self):
        return f"{self.patient_name} - {self.medication_name}"
