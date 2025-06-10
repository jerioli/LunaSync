from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'address',
            'marital_status',
            'medical_info',
            'registration_date',
        ]