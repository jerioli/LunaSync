from django.contrib import admin
from .models import CustomUser
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    
    # Fields to display in the admin list view
    list_display = ('username', 'email', 'role', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'superadmin_badge')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'date_joined')
    search_fields = ('username', 'email', 'role')
    ordering = ('-date_joined',)
    
    # Add role-based filtering
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.role == 'superadmin':
            return qs  # Superadmin can see all users
        else:
            return qs.filter(role__in=['doctor', 'receptionist'])  # Others see limited users
    
    # Custom badge for superadmin
    def superadmin_badge(self, obj):
        if obj.role == 'superadmin':
            return format_html('<span style="background-color: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">SUPERADMIN</span>')
        elif obj.role == 'admin':
            return format_html('<span style="background-color: #fd7e14; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">ADMIN</span>')
        elif obj.role == 'doctor':
            return format_html('<span style="background-color: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">DOCTOR</span>')
        elif obj.role == 'receptionist':
            return format_html('<span style="background-color: #17a2b8; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">RECEPTIONIST</span>')
        return obj.role
    superadmin_badge.short_description = 'Role Badge'
    
    # Customize fieldsets for editing users
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Permissions', {
            'fields': (
                'role',
                'force_password_change',
                'license_number',
            ),
        }),
        ('Standard Permissions', {
            'fields': (
                'can_manage_appointments',
                'can_manage_patients',
                'can_manage_staff',
                'can_view_reports',
                'can_manage_clinic_settings',
                'can_manage_inventory',
            ),
        }),
        ('Superadmin Permissions', {
            'fields': (
                'can_manage_permissions',
                'can_access_integrations',
                'can_view_audit_logs',
                'can_view_usage_reports',
                'can_access_security_testing',
            ),
            'description': 'These permissions are typically reserved for superadmin accounts only.',
        }),
    )
    
    # Add fields to the add user form
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role & Basic Info', {
            'fields': ('email', 'role', 'license_number'),
        }),
    )

# Register the custom admin
admin.site.register(CustomUser, CustomUserAdmin)

# Customize admin site header and title
admin.site.site_header = "LunaSync Administration"
admin.site.site_title = "LunaSync Admin Portal"
admin.site.index_title = "Welcome to LunaSync Administration"