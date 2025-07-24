from django.contrib import admin
from django.forms import ModelForm, PasswordInput
from .models import AWSCredentials

class AWSCredentialsForm(ModelForm):
    """Custom form to hide secret key in admin"""
    class Meta:
        model = AWSCredentials
        fields = '__all__'
        widgets = {
            'aws_secret_access_key': PasswordInput(render_value=True),
        }

@admin.register(AWSCredentials)
class AWSCredentialsAdmin(admin.ModelAdmin):
    form = AWSCredentialsForm
    list_display = ('name', 'aws_region', 'is_active', 'updated_at')
    list_filter = ('is_active', 'aws_region', 'created_at')
    search_fields = ('name', 'aws_access_key_id')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Configuration', {
            'fields': ('name', 'is_active')
        }),
        ('AWS Credentials', {
            'fields': ('aws_access_key_id', 'aws_secret_access_key', 'aws_region'),
            'classes': ('collapse',),
            'description': 'Enter your AWS credentials. Secret key will be hidden for security.'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion if it's the only active configuration
        if obj and obj.is_active:
            active_count = AWSCredentials.objects.filter(is_active=True).count()
            return active_count > 1
        return True
