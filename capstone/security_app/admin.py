from django.contrib import admin
from .models import SecurityAudit, EncryptionStatus, BackupStatus, SecuritySettings, SecurityIncident

@admin.register(SecurityAudit)
class SecurityAuditAdmin(admin.ModelAdmin):
    list_display = ('audit_type', 'status', 'audit_date', 'auditor', 'score')
    list_filter = ('audit_type', 'status', 'audit_date')
    search_fields = ('findings', 'recommendations')
    readonly_fields = ('audit_date',)

@admin.register(EncryptionStatus)
class EncryptionStatusAdmin(admin.ModelAdmin):
    list_display = ('encryption_type', 'is_enabled', 'algorithm', 'key_strength', 'last_updated')
    list_filter = ('is_enabled', 'encryption_type')

@admin.register(BackupStatus)
class BackupStatusAdmin(admin.ModelAdmin):
    list_display = ('backup_type', 'status', 'start_time', 'end_time', 'file_size')
    list_filter = ('backup_type', 'status', 'start_time')
    readonly_fields = ('start_time',)

@admin.register(SecuritySettings)
class SecuritySettingsAdmin(admin.ModelAdmin):
    list_display = ('updated_at', 'updated_by', 'encryption_enabled', 'auto_backup_enabled')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(SecurityIncident)
class SecurityIncidentAdmin(admin.ModelAdmin):
    list_display = ('incident_id', 'incident_type', 'severity', 'status', 'detected_at', 'assigned_to')
    list_filter = ('incident_type', 'severity', 'status', 'detected_at')
    search_fields = ('incident_id', 'title', 'description')
    readonly_fields = ('detected_at',)
