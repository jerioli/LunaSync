from django.contrib import admin
from .models import MedicalCertificateRequest, PrescriptionRequest

@admin.register(MedicalCertificateRequest)
class MedicalCertificateRequestAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'request_type', 'status', 'requested_at')
    list_filter = ('status', 'request_type', 'requested_at')
    search_fields = ('patient_name', 'email')
    readonly_fields = ('requested_at',)

@admin.register(PrescriptionRequest)
class PrescriptionRequestAdmin(admin.ModelAdmin):
    list_display = ('patient_name', 'medication_name', 'status', 'requested_at')
    list_filter = ('status', 'requested_at')
    search_fields = ('patient_name', 'medication_name', 'email')
    readonly_fields = ('requested_at',)
