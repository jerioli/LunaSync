from django.contrib import admin
from .models import (
    MedicalDocument, LabResult, SOAPNote, Prescription, 
    ClinicalNote, MedicalCertificate, PhysicalExamination,
    DocumentAttachment, DocumentVersion, DocumentAccessLog
)

@admin.register(MedicalDocument)
class MedicalDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'patient', 'created_by', 'status', 'document_date', 'created_at')
    list_filter = ('document_type', 'status', 'urgency', 'created_at', 'is_confidential')
    search_fields = ('title', 'patient__name', 'created_by__username', 'content')
    readonly_fields = ('id', 'created_at', 'updated_at')
    date_hierarchy = 'document_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('document_type', 'title', 'description', 'patient')
        }),
        ('Medical Staff', {
            'fields': ('created_by', 'authorized_by', 'reviewed_by')
        }),
        ('Document Details', {
            'fields': ('status', 'urgency', 'document_date', 'content')
        }),
        ('Files & Data', {
            'fields': ('original_file', 'processed_file', 'extracted_data', 'structured_data', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Security', {
            'fields': ('is_confidential', 'access_notes'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'authorized_at', 'reviewed_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ('test_name', 'get_patient_name', 'laboratory_name', 'collection_date')
    list_filter = ('specimen_type', 'collection_date')
    search_fields = ('test_name', 'laboratory_name', 'document__patient__name')
    
    def get_patient_name(self, obj):
        return obj.document.patient.name
    get_patient_name.short_description = 'Patient'

@admin.register(SOAPNote)
class SOAPNoteAdmin(admin.ModelAdmin):
    list_display = ('get_patient_name', 'chief_complaint', 'get_document_date')
    search_fields = ('document__patient__name', 'chief_complaint', 'subjective', 'assessment')
    
    def get_patient_name(self, obj):
        return obj.document.patient.name
    get_patient_name.short_description = 'Patient'
    
    def get_document_date(self, obj):
        return obj.document.document_date
    get_document_date.short_description = 'Date'

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('prescription_number', 'get_patient_name', 'prescribing_physician', 'valid_until', 'refills_remaining')
    list_filter = ('valid_until', 'refills_allowed', 'dispensed_date')
    search_fields = ('prescription_number', 'document__patient__name', 'prescribing_physician__username')
    
    def get_patient_name(self, obj):
        return obj.document.patient.name
    get_patient_name.short_description = 'Patient'

@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ('get_patient_name', 'note_type', 'follow_up_required', 'follow_up_date', 'get_document_date')
    list_filter = ('note_type', 'follow_up_required', 'follow_up_date')
    search_fields = ('document__patient__name', 'clinical_context', 'findings')
    
    def get_patient_name(self, obj):
        return obj.document.patient.name
    get_patient_name.short_description = 'Patient'
    
    def get_document_date(self, obj):
        return obj.document.document_date
    get_document_date.short_description = 'Date'

@admin.register(MedicalCertificate)
class MedicalCertificateAdmin(admin.ModelAdmin):
    list_display = ('get_patient_name', 'certificate_type', 'purpose', 'valid_from', 'valid_until')
    list_filter = ('certificate_type', 'valid_from', 'valid_until')
    search_fields = ('document__patient__name', 'purpose', 'medical_opinion')
    
    def get_patient_name(self, obj):
        return obj.document.patient.name
    get_patient_name.short_description = 'Patient'

@admin.register(PhysicalExamination)
class PhysicalExaminationAdmin(admin.ModelAdmin):
    list_display = ('get_patient_name', 'get_document_date', 'overall_impression')
    search_fields = ('document__patient__name', 'overall_impression', 'abnormal_findings')
    
    def get_patient_name(self, obj):
        return obj.document.patient.name
    get_patient_name.short_description = 'Patient'
    
    def get_document_date(self, obj):
        return obj.document.document_date
    get_document_date.short_description = 'Date'

@admin.register(DocumentAttachment)
class DocumentAttachmentAdmin(admin.ModelAdmin):
    list_display = ('get_document_title', 'attachment_type', 'description', 'file_size', 'uploaded_at', 'uploaded_by')
    list_filter = ('attachment_type', 'uploaded_at')
    search_fields = ('document__title', 'description', 'uploaded_by__username')
    
    def get_document_title(self, obj):
        return obj.document.title
    get_document_title.short_description = 'Document'

@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ('get_document_title', 'version_number', 'created_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('document__title', 'changes_summary', 'created_by__username')
    
    def get_document_title(self, obj):
        return obj.document.title
    get_document_title.short_description = 'Document'

@admin.register(DocumentAccessLog)
class DocumentAccessLogAdmin(admin.ModelAdmin):
    list_display = ('get_document_title', 'user', 'access_type', 'ip_address', 'timestamp')
    list_filter = ('access_type', 'timestamp')
    search_fields = ('document__title', 'user__username', 'ip_address')
    readonly_fields = ('timestamp',)
    
    def get_document_title(self, obj):
        return obj.document.title
    get_document_title.short_description = 'Document'
