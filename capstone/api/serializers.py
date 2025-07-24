from rest_framework import serializers
from .models import AWSCredentials

class AWSCredentialsSerializer(serializers.ModelSerializer):
    """Serializer for AWS credentials with security considerations"""
    
    class Meta:
        model = AWSCredentials
        fields = ['id', 'name', 'aws_access_key_id', 'aws_secret_access_key', 'aws_region', 'is_active', 'created_at', 'updated_at']
        extra_kwargs = {
            'aws_secret_access_key': {'write_only': True},  # Never return in GET requests
        }
    
    def to_representation(self, instance):
        """Custom representation to hide secret key"""
        data = super().to_representation(instance)
        # Never return the actual secret key in API responses
        data.pop('aws_secret_access_key', None)
        return data
    
    def update(self, instance, validated_data):
        """Custom update to handle secret key properly"""
        # Only update secret key if provided
        if 'aws_secret_access_key' in validated_data and not validated_data['aws_secret_access_key']:
            validated_data.pop('aws_secret_access_key')
        return super().update(instance, validated_data)
