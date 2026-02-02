from rest_framework import serializers
from .models import Patient
from security_app.secure_serializers import SecureBaseSerializer, EncryptedJSONField

class PatientSerializer(SecureBaseSerializer):
    # Override JSON fields with custom encrypted JSON field
    medical_info = EncryptedJSONField(required=False, allow_null=True, default=None, allow_blank=True)
    physical_examination = EncryptedJSONField(required=False, allow_null=True, default=None, allow_blank=True)
    
    # Red flag related read-only fields
    red_flagged_by_name = serializers.CharField(source='red_flagged_by.get_full_name', read_only=True)
    
    # Archive traceability fields
    deleted_by_name = serializers.SerializerMethodField()
    deleted_by_email = serializers.SerializerMethodField()
    
    def get_deleted_by_name(self, obj):
        """Get the name of the user who archived the patient"""
        if obj.deleted_by:
            return obj.deleted_by.get_full_name() if hasattr(obj.deleted_by, 'get_full_name') else str(obj.deleted_by)
        return None
    
    def get_deleted_by_email(self, obj):
        """Get the email of the user who archived the patient"""
        if obj.deleted_by:
            return obj.deleted_by.email if hasattr(obj.deleted_by, 'email') else None
        return None
    
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
            'is_deleted',  # Include soft delete status
            'deleted_at',
            'deleted_by',
            'deleted_by_name',
            'deleted_by_email',
            'deleted_reason',
            # Red flag fields
            'is_red_flagged',
            'red_flag_reason',
            'red_flagged_by',
            'red_flagged_by_name',
            'red_flagged_date',
        ]
        read_only_fields = ['red_flagged_by', 'red_flagged_date', 'deleted_by', 'deleted_at', 'deleted_by_name', 'deleted_by_email']
        # Remove json_fields since we're using custom fields now
    
    def validate(self, data):
        """Custom validation to check for duplicate patients"""
        email = data.get('email')
        phone = data.get('phone')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        date_of_birth = data.get('date_of_birth')
        
        # Check if this is an update (instance exists) or create (no instance)
        instance = getattr(self, 'instance', None)
        
        if email:
            # Check for duplicate email
            existing_patients = Patient.objects.all()
            for patient in existing_patients:
                # Skip self if updating
                if instance and patient.id == instance.id:
                    continue
                    
                if patient.email and patient.email.lower() == email.lower():
                    raise serializers.ValidationError({
                        'email': 'A patient with this email address already exists.'
                    })
        
        if phone:
            # Check for duplicate phone
            existing_patients = Patient.objects.all()
            for patient in existing_patients:
                # Skip self if updating
                if instance and patient.id == instance.id:
                    continue
                    
                if patient.phone and patient.phone == phone:
                    raise serializers.ValidationError({
                        'phone': 'A patient with this phone number already exists.'
                    })
        
        # Check for duplicate patient based on name and date of birth
        if first_name and last_name and date_of_birth:
            existing_patients = Patient.objects.all()
            for patient in existing_patients:
                # Skip self if updating
                if instance and patient.id == instance.id:
                    continue
                    
                if (patient.first_name and patient.last_name and patient.date_of_birth and
                    patient.first_name.lower() == first_name.lower() and
                    patient.last_name.lower() == last_name.lower() and
                    patient.date_of_birth == date_of_birth):
                    raise serializers.ValidationError({
                        'non_field_errors': f'A patient with the name "{first_name} {last_name}" and date of birth {date_of_birth} already exists.'
                    })
        
        return data
    
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