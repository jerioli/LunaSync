from rest_framework import serializers
from .models import CustomUser
from security_app.secure_serializers import SecureBaseSerializer

class CustomUserSerializer(SecureBaseSerializer):
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 'name', 'email', 'phone',
            'password', 'role', 'is_active', 'is_staff', 'is_superuser', 'force_password_change',
            'can_manage_appointments', 'can_manage_patients', 'can_manage_staff', 
            'can_view_reports', 'can_manage_clinic_settings',
            'can_manage_permissions', 'can_view_audit_logs', 'can_manage_inventory'
        ]
        extra_kwargs = {
            'password': {'write_only': True},  # Ensure password is write-only
        }
    
    def get_name(self, obj):
        """Return the full name constructed from first_name and last_name"""
        return f"{obj.first_name} {obj.last_name}".strip()
    
    def to_representation(self, instance):
        """Override to ensure admins and superadmins can see encrypted fields"""
        data = super().to_representation(instance)
        
        # If user is authenticated and has permission to manage staff, show full data
        if (self.user and self.user.is_authenticated and 
            (self.user.role in ['admin', 'superadmin'] or 
             getattr(self.user, 'can_manage_staff', False))):
            # Return full data for authorized users (encrypted fields are auto-decrypted by model)
            return data
        
        # For unauthenticated or unauthorized users, return limited data
        if not self.user or not self.user.is_authenticated:
            return self.get_public_representation(data)
        
        # For regular authenticated users, return data but without sensitive fields
        return {
            'id': data.get('id'),
            'username': data.get('username'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'name': data.get('name'),
            'role': data.get('role'),
            'is_active': data.get('is_active')
        }
    
    def get_public_representation(self, data):
        """Return only non-sensitive fields for unauthenticated users"""
        return {
            'id': data.get('id'),
            'username': data.get('username'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'name': data.get('name'),
            'role': data.get('role'),
            'is_active': data.get('is_active')
        }

    def create(self, validated_data):
        # Remove fields that don't exist on the model
        validated_data.pop('middle_initial', None)
        validated_data.pop('suffix', None)
        validated_data.pop('temp_password', None)  # Remove temp_password as it's not a model field
        validated_data.pop('send_email', None)     # Remove send_email as it's not a model field
        
        # Set force_password_change to True for new staff accounts
        validated_data['force_password_change'] = True
        
        # Use the create_user method to hash the password
        user = CustomUser.objects.create_user(
            username=validated_data.get('username') or validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            role=validated_data['role'],
            is_active=validated_data.get('is_active', True),
            is_staff=validated_data.get('is_staff', False),
            is_superuser=validated_data.get('is_superuser', False),
            force_password_change=validated_data.get('force_password_change', True),
        )
        return user