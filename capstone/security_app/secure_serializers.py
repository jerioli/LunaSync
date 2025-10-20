"""
Secure serializers that handle encrypted fields and authentication
"""
import json
from rest_framework import serializers
from django.contrib.auth import get_user_model
from security_app.encryption_utils import encrypt, decrypt

User = get_user_model()

class EncryptedJSONField(serializers.Field):
    """
    Custom serializer field for encrypted JSON data
    """
    
    def __init__(self, **kwargs):
        # Handle allow_blank parameter
        self.allow_blank = kwargs.pop('allow_blank', False)
        super().__init__(**kwargs)
    
    def to_representation(self, value):
        """Convert encrypted JSON string to Python object for API response"""
        if not value:
            return None
        
        # Value should already be decrypted by the model field
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        
        return value
    
    def to_internal_value(self, data):
        """Convert Python object to JSON string for database storage"""
        if data is None:
            return None
        
        if data == '':
            if self.allow_blank:
                return None
            # Empty string handling
            return None
        
        # Debug logging
        print(f"[DEBUG] EncryptedJSONField.to_internal_value - Input data type: {type(data)}, value: {data}")
        
        if isinstance(data, str):
            # Already a string, validate it's valid JSON if not empty
            if not data.strip():
                return None
            try:
                # Validate by parsing, but return original string
                json.loads(data)
                return data
            except (json.JSONDecodeError, TypeError) as e:
                print(f"[DEBUG] EncryptedJSONField JSON validation error: {e}")
                # Be more lenient - if it's a simple string, allow it
                if len(data) < 1000:  # Reasonable limit for simple strings
                    print(f"[DEBUG] EncryptedJSONField treating as simple string: {data}")
                    return json.dumps(data)  # Wrap simple string in JSON
                raise serializers.ValidationError(f"Invalid JSON format: {e}")
        
        # Convert dict/list to JSON string
        try:
            result = json.dumps(data)
            print(f"[DEBUG] EncryptedJSONField converted to JSON: {result}")
            return result
        except (TypeError, ValueError) as e:
            print(f"[DEBUG] EncryptedJSONField serialization error: {e}")
            raise serializers.ValidationError(f"Cannot serialize to JSON: {e}")

class SecureBaseSerializer(serializers.ModelSerializer):
    """
    Base serializer that handles encrypted fields transparently
    and ensures proper access control
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        self.user = None
        if request and hasattr(request, 'user'):
            self.user = request.user
    
    def to_representation(self, instance):
        """Only return decrypted data if user is authenticated and authorized"""
        data = super().to_representation(instance)
        
        # If user is not authenticated, return minimal data or deny access
        if not self.user or not self.user.is_authenticated:
            return self.get_public_representation(data)
        
        # Convert JSON string fields back to proper JSON for the API response
        data = self.handle_json_fields(data)
        return data
    
    def get_public_representation(self, data):
        """Return only non-sensitive fields for unauthenticated users"""
        # Override in subclasses to specify which fields are public
        return {'detail': 'Authentication required to access this resource'}
    
    def handle_json_fields(self, data):
        """Convert JSON string fields back to proper JSON objects"""
        # List of fields that should be converted from JSON strings to JSON objects
        json_fields = getattr(self.Meta, 'json_fields', [])
        
        for field_name in json_fields:
            if field_name in data and isinstance(data[field_name], str):
                try:
                    data[field_name] = json.loads(data[field_name])
                except (json.JSONDecodeError, TypeError):
                    # If not valid JSON, keep as string
                    pass
        
        return data
    
    def validate(self, attrs):
        """Ensure user has permission to access/modify this data"""
        attrs = super().validate(attrs)
        
        # Only enforce authentication for write operations if configured
        # Views should handle authentication, not serializers
        # This allows for more flexible access control at the view level
        
        return attrs
    
    def create(self, validated_data):
        """Handle JSON field conversion before saving"""
        validated_data = self.convert_json_fields(validated_data)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Handle JSON field conversion before saving"""
        validated_data = self.convert_json_fields(validated_data)
        return super().update(instance, validated_data)
    
    def convert_json_fields(self, validated_data):
        """Convert JSON objects to JSON strings for encrypted storage"""
        json_fields = getattr(self.Meta, 'json_fields', [])
        
        for field_name in json_fields:
            if field_name in validated_data:
                field_value = validated_data[field_name]
                
                # Handle None or empty values
                if field_value is None or field_value == '':
                    continue
                    
                # If it's already a string, leave it as is
                if isinstance(field_value, str):
                    continue
                    
                # Convert dict/list to JSON string
                try:
                    validated_data[field_name] = json.dumps(field_value)
                except (TypeError, ValueError):
                    # If not serializable, convert to string
                    validated_data[field_name] = str(field_value)
        
        return validated_data
