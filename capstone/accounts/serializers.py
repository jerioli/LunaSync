from rest_framework import serializers
from .models import CustomUser

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'phone',
            'password', 'role', 'is_active', 'is_staff', 'is_superuser', 'force_password_change',
            'can_manage_appointments', 'can_manage_patients', 'can_manage_staff', 
            'can_view_reports', 'can_manage_clinic_settings',
            'can_manage_permissions', 'can_access_integrations', 'can_view_audit_logs',
            'can_view_usage_reports', 'can_access_security_testing'
        ]
        extra_kwargs = {
            'password': {'write_only': True},  # Ensure password is write-only
        }

    def create(self, validated_data):
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