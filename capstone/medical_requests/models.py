from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

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
    patient_name = models.CharField(max_length=200)
    date_of_birth = models.CharField(max_length=20)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    additional_info = models.TextField(blank=True, null=True)
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
    
    # Certificate content
    certificate_content = models.TextField(blank=True, null=True)
    doctor_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
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
    
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    patient_name = models.CharField(max_length=200)
    date_of_birth = models.CharField(max_length=20)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    additional_notes = models.TextField(blank=True, null=True)
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
    
    # Prescription content
    prescription_content = models.TextField(blank=True, null=True)
    doctor_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'prescription_request'
    
    def __str__(self):
        return f"{self.patient_name} - {self.medication_name}"
