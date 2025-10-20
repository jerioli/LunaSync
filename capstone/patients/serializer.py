from rest_framework import serializers
from .models import Patient
from security_app.secure_serializers import SecureBaseSerializer, EncryptedJSONField

class PatientSerializer(SecureBaseSerializer):
    # Override JSON fields with custom encrypted JSON field
    medical_info = EncryptedJSONField(required=False, allow_null=True, default=None, allow_blank=True)
    physical_examination = EncryptedJSONField(required=False, allow_null=True, default=None, allow_blank=True)
    class Meta:
        model = Patient
        fields = [
            'id',
            'patient_id',  # Include unique Patient ID
            'name',  # Keep for backward compatibility
            'first_name',
            'last_name', 
            'middle_initial',
            'suffix',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'address',
            'religion',  # Added religion field
            'marital_status',
            'medical_info',
            'physical_examination',
            'registration_date',
        ]
        # Remove json_fields since we're using custom fields now
    
    def to_representation(self, instance):
        """Handle patient ID lookup as a form of authentication"""
        # Check if this is a patient ID lookup (treat as authentication for that patient)
        if (self.context.get('allow_patient_id_auth') and 
            self.context.get('patient_id_lookup') and
            hasattr(instance, 'patient_id') and
            instance.patient_id == self.context.get('patient_id_lookup')):
            # Patient ID lookup is considered authentication for this patient's data
            # Skip the authentication check and return full decrypted data
            data = serializers.ModelSerializer.to_representation(self, instance)
            return self.handle_json_fields(data)
        
        # For all other cases, use the parent's to_representation (which checks authentication)
        return super().to_representation(instance)
    
    def get_public_representation(self, data):
        """Return only non-sensitive fields for unauthenticated users"""
        return {
            'id': data.get('id'),
            'patient_id': data.get('patient_id'),
            'registration_date': data.get('registration_date')
        }