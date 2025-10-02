from django.db import models
from security_app.fields import EncryptedCharField, EncryptedTextField
from django.contrib.auth import get_user_model
from django.utils import timezone
from patients.models import Patient
import uuid

User = get_user_model()

class MedicalDocument(models.Model):
    """Base model for all medical documents"""
    DOCUMENT_TYPES = [
        ('lab_result', 'Lab Result'),
        ('soap_note', 'SOAP Note'),
        ('prescription', 'Prescription'),
        ('clinical_note', 'Clinical Note'),
        ('medical_certificate', 'Medical Certificate'),
        ('physical_examination', 'Physical Examination'),
        ('imaging_report', 'Imaging Report'),
        ('discharge_summary', 'Discharge Summary'),
        ('referral_letter', 'Referral Letter'),
        ('consultation_note', 'Consultation Note'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('revised', 'Revised'),
        ('archived', 'Archived'),
    ]
    
    URGENCY_CHOICES = [
        ('routine', 'Routine'),
        ('urgent', 'Urgent'),
        ('stat', 'STAT'),
        ('emergency', 'Emergency'),
    ]
    
    # Primary identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    
    # Patient and provider information
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_documents')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_documents')
    authorized_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='authorized_documents')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_documents')
    
    # Document metadata
    title = EncryptedCharField(max_length=800)
    description = EncryptedTextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='routine')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    document_date = models.DateTimeField(default=timezone.now)  # Date of the medical event
    authorized_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # File attachments
    original_file = models.FileField(upload_to='medical_documents/originals/', null=True, blank=True)
    processed_file = models.FileField(upload_to='medical_documents/processed/', null=True, blank=True)
    
    # Extracted data (JSON fields for flexibility)
    extracted_data = EncryptedTextField(default=dict, blank=True)  # OCR/processed data (as JSON string)
    structured_data = EncryptedTextField(default=dict, blank=True)  # Organized medical data (as JSON string)
    metadata = EncryptedTextField(default=dict, blank=True)  # Additional metadata (as JSON string)
    
    # Document content
    content = EncryptedTextField(blank=True)  # Free text content
    
    # Confidentiality and access
    is_confidential = models.BooleanField(default=True)
    access_notes = EncryptedTextField(blank=True)
    
    class Meta:
        ordering = ['-document_date', '-created_at']
        db_table = 'medical_document'
        indexes = [
            models.Index(fields=['patient', 'document_type']),
            models.Index(fields=['document_date']),
            models.Index(fields=['status']),
            models.Index(fields=['created_by']),
        ]
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.patient.name} ({self.document_date.strftime('%Y-%m-%d')})"


class LabResult(models.Model):
    """Specific model for laboratory results"""
    TEST_CATEGORIES = [
        ('hematology', 'Hematology'),
        ('chemistry', 'Chemistry'),
        ('microbiology', 'Microbiology'),
        ('immunology', 'Immunology'),
        ('pathology', 'Pathology'),
        ('radiology', 'Radiology'),
        ('cardiology', 'Cardiology'),
        ('endocrinology', 'Endocrinology'),
        ('toxicology', 'Toxicology'),
        ('molecular', 'Molecular Biology'),
        ('genetics', 'Genetics'),
        ('other', 'Other'),
    ]
    
    SPECIMEN_TYPES = [
        ('blood', 'Blood'),
        ('urine', 'Urine'),
        ('stool', 'Stool'),
        ('saliva', 'Saliva'),
        ('csf', 'Cerebrospinal Fluid'),
        ('tissue', 'Tissue'),
        ('swab', 'Swab'),
        ('sputum', 'Sputum'),
        ('other', 'Other'),
    ]
    
    # Link to base document
    document = models.OneToOneField(MedicalDocument, on_delete=models.CASCADE, related_name='lab_result_detail')
    
    # Test information
    test_name = EncryptedCharField(max_length=800)
    test_category = models.CharField(max_length=50, choices=TEST_CATEGORIES)
    specimen_type = models.CharField(max_length=50, choices=SPECIMEN_TYPES)
    
    # Laboratory information
    laboratory_name = EncryptedCharField(max_length=800, blank=True)
    laboratory_address = EncryptedTextField(blank=True)
    lab_reference_number = EncryptedCharField(max_length=300, blank=True)
    
    # Test dates
    collection_date = models.DateTimeField(null=True, blank=True)
    received_date = models.DateTimeField(null=True, blank=True)
    reported_date = models.DateTimeField(null=True, blank=True)
    
    # Test results (JSON for flexibility with different test types)
    test_results = EncryptedTextField(default=list)  # List of individual test results (as JSON string)
    
    class Meta:
        db_table = 'lab_result'
    
    def __str__(self):
        return f"{self.test_name} - {self.document.patient.name}"


class SOAPNote(models.Model):
    """SOAP (Subjective, Objective, Assessment, Plan) clinical notes"""
    
    # Link to base document
    document = models.OneToOneField(MedicalDocument, on_delete=models.CASCADE, related_name='soap_note_detail')
    
    # SOAP components
    subjective = EncryptedTextField(help_text="Patient's reported symptoms and concerns")
    objective = EncryptedTextField(help_text="Observable findings, vital signs, examination results")
    assessment = EncryptedTextField(help_text="Clinical impression and diagnosis")
    plan = EncryptedTextField(help_text="Treatment plan and follow-up instructions")
    
    # Associated vital signs
    vital_signs = EncryptedTextField(default=dict, blank=True)  # Blood pressure, temperature, etc. (as JSON string)
    
    # Clinical context
    chief_complaint = EncryptedCharField(max_length=800, blank=True)
    history_present_illness = EncryptedTextField(blank=True)
    
    class Meta:
        db_table = 'soap_note'
    
    def __str__(self):
        return f"SOAP Note - {self.document.patient.name} ({self.document.document_date.strftime('%Y-%m-%d')})"


class Prescription(models.Model):
    """Electronic prescriptions"""
    
    # Link to base document
    document = models.OneToOneField(MedicalDocument, on_delete=models.CASCADE, related_name='prescription_detail')
    
    # Prescription metadata
    prescription_number = models.CharField(max_length=100, unique=True)
    prescribing_physician = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'doctor'})
    
    # Medications (JSON array for multiple medications)
    medications = EncryptedTextField(default=list)  # List of medication objects (as JSON string)
    
    # Instructions
    general_instructions = EncryptedTextField(blank=True)
    pharmacy_notes = EncryptedTextField(blank=True)
    
    # Validity and refills
    valid_until = models.DateField()
    refills_allowed = models.PositiveIntegerField(default=0)
    refills_remaining = models.PositiveIntegerField(default=0)
    
    # Status tracking
    dispensed_date = models.DateTimeField(null=True, blank=True)
    dispensed_by = models.CharField(max_length=255, blank=True)  # Pharmacy information
    
    class Meta:
        db_table = 'prescription'
    
    def __str__(self):
        return f"Prescription {self.prescription_number} - {self.document.patient.name}"


class ClinicalNote(models.Model):
    """General clinical notes and observations"""
    
    NOTE_TYPES = [
        ('progress', 'Progress Note'),
        ('consultation', 'Consultation Note'),
        ('discharge', 'Discharge Note'),
        ('follow_up', 'Follow-up Note'),
        ('telephone', 'Telephone Note'),
        ('referral', 'Referral Note'),
        ('procedure', 'Procedure Note'),
        ('general', 'General Note'),
    ]
    
    # Link to base document
    document = models.OneToOneField(MedicalDocument, on_delete=models.CASCADE, related_name='clinical_note_detail')
    
    # Note specifics
    note_type = models.CharField(max_length=50, choices=NOTE_TYPES, default='general')
    clinical_context = EncryptedTextField(blank=True)
    findings = EncryptedTextField(blank=True)
    recommendations = EncryptedTextField(blank=True)
    follow_up_required = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'clinical_note'
    
    def __str__(self):
        return f"{self.get_note_type_display()} - {self.document.patient.name}"


class MedicalCertificate(models.Model):
    """Medical certificates for fitness, disability, etc."""
    
    CERTIFICATE_TYPES = [
        ('fitness', 'Fitness Certificate'),
        ('disability', 'Disability Certificate'),
        ('sick_leave', 'Sick Leave Certificate'),
        ('work_clearance', 'Work Clearance'),
        ('travel_clearance', 'Travel Clearance'),
        ('sports_clearance', 'Sports Clearance'),
        ('school_clearance', 'School Clearance'),
        ('vaccination', 'Vaccination Certificate'),
        ('other', 'Other'),
    ]
    
    # Link to base document
    document = models.OneToOneField(MedicalDocument, on_delete=models.CASCADE, related_name='medical_certificate_detail')
    
    # Certificate details
    certificate_type = models.CharField(max_length=50, choices=CERTIFICATE_TYPES)
    purpose = models.CharField(max_length=255, blank=True, default='General medical certificate')
    medical_opinion = models.TextField(blank=True, default='Medical examination completed')
    
    # Validity
    valid_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    restrictions = models.TextField(blank=True)
    
    # Examination details
    examination_findings = models.TextField(blank=True)
    
    class Meta:
        db_table = 'medical_certificate'
    
    def __str__(self):
        return f"{self.get_certificate_type_display()} - {self.document.patient.name}"


class PhysicalExamination(models.Model):
    """Physical examination records"""
    
    # Link to base document
    document = models.OneToOneField(MedicalDocument, on_delete=models.CASCADE, related_name='physical_examination_detail')
    
    # Examination components (JSON for flexibility)
    general_appearance = models.JSONField(default=dict, blank=True)
    vital_signs = models.JSONField(default=dict, blank=True)
    head_neck = models.JSONField(default=dict, blank=True)
    cardiovascular = models.JSONField(default=dict, blank=True)
    respiratory = models.JSONField(default=dict, blank=True)
    abdominal = models.JSONField(default=dict, blank=True)
    neurological = models.JSONField(default=dict, blank=True)
    musculoskeletal = models.JSONField(default=dict, blank=True)
    skin = models.JSONField(default=dict, blank=True)
    other_systems = models.JSONField(default=dict, blank=True)
    
    # Overall assessment
    overall_impression = models.TextField(blank=True)
    abnormal_findings = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    
    class Meta:
        db_table = 'physical_examination'
    
    def __str__(self):
        return f"Physical Examination - {self.document.patient.name} ({self.document.document_date.strftime('%Y-%m-%d')})"


class DocumentAttachment(models.Model):
    """Additional file attachments for medical documents"""
    
    ATTACHMENT_TYPES = [
        ('image', 'Image'),
        ('pdf', 'PDF Document'),
        ('report', 'Report'),
        ('scan', 'Scanned Document'),
        ('xray', 'X-Ray'),
        ('lab_report', 'Lab Report'),
        ('prescription_image', 'Prescription Image'),
        ('other', 'Other'),
    ]
    
    document = models.ForeignKey(MedicalDocument, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='medical_documents/attachments/')
    attachment_type = models.CharField(max_length=50, choices=ATTACHMENT_TYPES, default='other')
    description = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Size in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'document_attachment'
    
    def __str__(self):
        return f"{self.get_attachment_type_display()} - {self.document.title}"


class DocumentVersion(models.Model):
    """Version control for medical documents"""
    
    document = models.ForeignKey(MedicalDocument, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    content_snapshot = models.JSONField()  # Snapshot of document content at this version
    changes_summary = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['document', 'version_number']
        ordering = ['-version_number']
        db_table = 'document_version'
    
    def __str__(self):
        return f"{self.document.title} - Version {self.version_number}"


class DocumentAccessLog(models.Model):
    """Audit trail for document access"""
    
    ACCESS_TYPES = [
        ('view', 'Viewed'),
        ('edit', 'Edited'),
        ('delete', 'Deleted'),
        ('download', 'Downloaded'),
        ('print', 'Printed'),
        ('share', 'Shared'),
    ]
    
    document = models.ForeignKey(MedicalDocument, on_delete=models.CASCADE, related_name='access_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        db_table = 'document_access_log'
    
    def __str__(self):
        return f"{self.user.username} {self.access_type} {self.document.title} at {self.timestamp}"
