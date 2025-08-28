from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
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