from rest_framework import serializers
from .models import (
    MedicalDocument, LabResult, SOAPNote, Prescription, 
    ClinicalNote, MedicalCertificate, PhysicalExamination,
    DocumentAttachment, DocumentVersion, DocumentAccessLog
)
from patients.models import Patient
from accounts.models import CustomUser

class MedicalDocumentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    authorized_by_name = serializers.CharField(source='authorized_by.get_full_name', read_only=True)
    
    class Meta:
        model = MedicalDocument
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

class LabResultSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = LabResult
        fields = '__all__'

class LabResultCreateSerializer(serializers.ModelSerializer):
    # For creating lab results with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    authorized_by = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    
    # Document fields (write_only since they don't exist on LabResult model)
    title = serializers.CharField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    content = serializers.CharField(required=False, allow_blank=True, write_only=True)
    document_date = serializers.DateTimeField(required=False, write_only=True)
    status = serializers.CharField(required=False, default='approved', write_only=True)
    urgency = serializers.CharField(required=False, default='routine', write_only=True)
    
    # File fields for original document and processed PDF
    document = serializers.FileField(required=False, write_only=True)
    processed_file = serializers.FileField(required=False, write_only=True)
    
    # Read-only fields for the response
    document_info = MedicalDocumentSerializer(source='document', read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = LabResult
        fields = [
            # LabResult fields
            'test_name', 'test_category', 'specimen_type', 'laboratory_name', 
            'laboratory_address', 'lab_reference_number', 'collection_date', 
            'received_date', 'reported_date', 'test_results', 'critical_values', 
            'abnormal_values', 'interpretation', 'clinical_significance', 
            'recommendations', 'specimen_quality', 'processing_notes',
            # Document creation fields (write_only)
            'patient', 'created_by', 'authorized_by', 'title', 'description', 
            'content', 'document_date', 'status', 'urgency',
            # File fields
            'document', 'processed_file',
            # Read-only fields
            'document_info', 'patient_name'
        ]
    
    def create(self, validated_data):
        # Debug logging to see what data we're receiving
        print("=== DEBUG: LabResultCreateSerializer.create ===")
        print(f"Received validated_data keys: {list(validated_data.keys())}")
        print(f"Patient: {validated_data.get('patient')}")
        print(f"Created by: {validated_data.get('created_by')}")
        print(f"Title: {validated_data.get('title')}")
        print(f"Has document file: {'document' in validated_data}")
        print(f"Has processed_file: {'processed_file' in validated_data}")
        print("=" * 50)
        
        # Extract file fields before creating document
        original_file = validated_data.pop('document', None)
        processed_file = validated_data.pop('processed_file', None)
        
        # Get or create a default user for testing purposes
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            # Create or get a default system user for testing
            created_by, _ = CustomUser.objects.get_or_create(
                email='system@demo.com',
                defaults={
                    'first_name': 'System',
                    'last_name': 'User',
                    'role': 'doctor',
                    'is_active': True
                }
            )
        
        # Handle authorized_by - can be a string name or None
        authorized_by_name = validated_data.pop('authorized_by', None)
        authorized_by_user = None
        
        if authorized_by_name and authorized_by_name.strip():
            # Try to find a user by name or create a placeholder
            try:
                # Try to find by first/last name combination
                name_parts = authorized_by_name.strip().split()
                if len(name_parts) >= 2:
                    first_name = name_parts[0]
                    last_name = ' '.join(name_parts[1:])
                    authorized_by_user = CustomUser.objects.filter(
                        first_name__icontains=first_name,
                        last_name__icontains=last_name
                    ).first()
                
                # If not found, try username or email
                if not authorized_by_user:
                    authorized_by_user = CustomUser.objects.filter(
                        username__icontains=authorized_by_name
                    ).first()
                
                # If still not found, leave as None (we'll store the name in content)
                if not authorized_by_user:
                    print(f"Could not find user for authorized_by: {authorized_by_name}")
                    
            except Exception as e:
                print(f"Error finding authorized_by user: {e}")
                authorized_by_user = None
        
        # Extract document-related data
        document_data = {
            'document_type': 'lab_result',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': authorized_by_user,  # This can be None
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'content': validated_data.pop('content', ''),
            'document_date': validated_data.pop('document_date', None),
            'status': validated_data.pop('status', 'approved'),
            'urgency': validated_data.pop('urgency', 'routine'),
        }
        
        # Add file fields if provided
        if original_file:
            document_data['original_file'] = original_file
            print(f"Added original_file: {original_file.name}")
        
        if processed_file:
            document_data['processed_file'] = processed_file
            print(f"Added processed_file: {processed_file.name}")
        
        # If we have an authorized_by name but no user, store it in the content
        if authorized_by_name and not authorized_by_user:
            content = document_data.get('content', '')
            if content:
                document_data['content'] = f"{content}\n\nAuthorized by: {authorized_by_name}"
            else:
                document_data['content'] = f"Authorized by: {authorized_by_name}"
        
        # Create the base document
        document = MedicalDocument.objects.create(**document_data)
        
        # Create the lab result with the document
        lab_result = LabResult.objects.create(document=document, **validated_data)
        
        return lab_result

    def to_representation(self, instance):
        """Return the complete lab result with document information using the read serializer"""
        return LabResultSerializer(instance).data
    
    def validate(self, data):
        print("=== DEBUG: LabResultCreateSerializer.validate ===")
        print(f"Received data keys: {list(data.keys())}")
        
        # Check patient validation
        patient = data.get('patient')
        if patient:
            print(f"Patient ID: {patient}")
            try:
                from patients.models import Patient
                patient_obj = Patient.objects.get(id=patient)
                print(f"Patient found: {patient_obj.name}")
            except Patient.DoesNotExist:
                print(f"ERROR: Patient with ID {patient} not found!")
            except Exception as e:
                print(f"ERROR checking patient: {e}")
        
        # Check test_results format
        test_results = data.get('test_results', [])
        print(f"Test results count: {len(test_results)}")
        if test_results:
            print(f"First test result: {test_results[0]}")
        
        print("=" * 50)
        return data

class SOAPNoteSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = SOAPNote
        fields = '__all__'

class SOAPNoteCreateSerializer(serializers.ModelSerializer):
    # For creating SOAP notes with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    authorized_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    
    # Document fields (write-only for creation)
    title = serializers.CharField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    document_date = serializers.DateTimeField(required=False, write_only=True)
    status = serializers.CharField(required=False, default='approved', write_only=True)
    
    # Read-only fields for response
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = SOAPNote
        fields = [
            # Write-only fields for creation
            'patient', 'created_by', 'authorized_by', 'title', 'description', 'document_date', 'status',
            # SOAP-specific fields
            'subjective', 'objective', 'assessment', 'plan', 'vital_signs', 
            'chief_complaint', 'history_present_illness',
            # Read-only fields for response
            'id', 'document', 'patient_name'
        ]
    
    def create(self, validated_data):
        # Get or create a default user for testing purposes
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            # Create or get a default system user for testing
            created_by, _ = CustomUser.objects.get_or_create(
                email='system@demo.com',
                defaults={
                    'first_name': 'System',
                    'last_name': 'User',
                    'role': 'doctor',
                    'is_active': True
                }
            )
        
        # Extract document-related data
        document_data = {
            'document_type': 'soap_note',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': validated_data.pop('authorized_by', None),
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'document_date': validated_data.pop('document_date', None),
            'status': validated_data.pop('status', 'approved'),
            'content': f"SOAP Note\n\nSubjective: {validated_data.get('subjective', '')}\n\nObjective: {validated_data.get('objective', '')}\n\nAssessment: {validated_data.get('assessment', '')}\n\nPlan: {validated_data.get('plan', '')}",
        }
        
        # Create the base document
        document = MedicalDocument.objects.create(**document_data)
        
        # Create the SOAP note with the document
        soap_note = SOAPNote.objects.create(document=document, **validated_data)
        
        return soap_note

class PrescriptionSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = Prescription
        fields = '__all__'

class PrescriptionCreateSerializer(serializers.ModelSerializer):
    # For creating prescriptions with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    prescribing_physician = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.filter(role='doctor'), required=False)
    
    # Document fields (write-only for creation)
    title = serializers.CharField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    document_date = serializers.DateTimeField(required=False, write_only=True)
    status = serializers.CharField(required=False, write_only=True)
    
    # Read-only fields for response
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            # Write-only fields for creation
            'patient', 'created_by', 'title', 'description', 'document_date', 'status',
            # Prescription-specific fields
            'prescription_number', 'prescribing_physician', 'medications', 
            'general_instructions', 'pharmacy_notes', 'valid_until', 
            'refills_allowed', 'refills_remaining',
            # Read-only fields for response
            'id', 'document', 'patient_name', 'dispensed_date', 'dispensed_by'
        ]
    
    def create(self, validated_data):
        # Get or create a default user for testing purposes
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            # Create or get a default system user for testing
            created_by, _ = CustomUser.objects.get_or_create(
                email='system@demo.com',
                defaults={
                    'first_name': 'System',
                    'last_name': 'User',
                    'role': 'doctor',
                    'is_active': True
                }
            )
        
        prescribing_physician = validated_data.get('prescribing_physician') or created_by
        
        # Extract document-related data
        document_data = {
            'document_type': 'prescription',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': prescribing_physician,
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'document_date': validated_data.pop('document_date', None),
            'status': validated_data.pop('status', 'approved'),
        }
        
        # Create the base document
        document = MedicalDocument.objects.create(**document_data)
        
        # Extract prescription-specific data
        prescription_data = {
            'document': document,
            'prescription_number': validated_data.get('prescription_number'),
            'prescribing_physician': prescribing_physician,
            'medications': validated_data.get('medications', []),
            'general_instructions': validated_data.get('general_instructions', ''),
            'pharmacy_notes': validated_data.get('pharmacy_notes', ''),
            'valid_until': validated_data.get('valid_until'),
            'refills_allowed': validated_data.get('refills_allowed', 0),
            'refills_remaining': validated_data.get('refills_remaining', 0),
        }
        
        # Create the prescription with only prescription-specific fields
        prescription = Prescription.objects.create(**prescription_data)
        
        return prescription

class ClinicalNoteSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = ClinicalNote
        fields = '__all__'

class MedicalCertificateSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = MedicalCertificate
        fields = '__all__'

class MedicalCertificateCreateSerializer(serializers.ModelSerializer):
    # For creating medical certificates with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    authorized_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    
    # Document fields
    title = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    document_date = serializers.DateTimeField(required=False)
    status = serializers.CharField(required=False, default='approved')
    
    class Meta:
        model = MedicalCertificate
        exclude = ('document',)
    
    def create(self, validated_data):
        # Get or create a default user for testing purposes
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            created_by, _ = CustomUser.objects.get_or_create(
                email='system@demo.com',
                defaults={
                    'first_name': 'System',
                    'last_name': 'User',
                    'role': 'doctor',
                    'is_active': True
                }
            )
        
        # Extract document-related data
        document_data = {
            'document_type': 'medical_certificate',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': validated_data.pop('authorized_by', None),
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'document_date': validated_data.pop('document_date', None),
            'status': validated_data.pop('status', 'approved'),
            'content': f"Medical Certificate - {validated_data.get('certificate_type', '').replace('_', ' ').title()}\n\nPurpose: {validated_data.get('purpose', '')}\n\nMedical Opinion: {validated_data.get('medical_opinion', '')}",
        }
        
        # Create the base document
        document = MedicalDocument.objects.create(**document_data)
        
        # Create the medical certificate with the document
        medical_certificate = MedicalCertificate.objects.create(document=document, **validated_data)
        
        return medical_certificate

class PhysicalExaminationSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = PhysicalExamination
        fields = '__all__'

class PhysicalExaminationCreateSerializer(serializers.ModelSerializer):
    # For creating physical examinations with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    authorized_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False)
    
    # Document fields
    title = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    document_date = serializers.DateTimeField(required=False)
    status = serializers.CharField(required=False, default='approved')
    
    class Meta:
        model = PhysicalExamination
        exclude = ('document',)
    
    def create(self, validated_data):
        # Get or create a default user for testing purposes
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            created_by, _ = CustomUser.objects.get_or_create(
                email='system@demo.com',
                defaults={
                    'first_name': 'System',
                    'last_name': 'User',
                    'role': 'doctor',
                    'is_active': True
                }
            )
        
        # Extract document-related data
        document_data = {
            'document_type': 'physical_examination',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': validated_data.pop('authorized_by', None),
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'document_date': validated_data.pop('document_date', None),
            'status': validated_data.pop('status', 'approved'),
            'content': f"Physical Examination\n\nOverall Impression: {validated_data.get('overall_impression', '')}\n\nAbnormal Findings: {validated_data.get('abnormal_findings', '')}\n\nRecommendations: {validated_data.get('recommendations', '')}",
        }
        
        # Create the base document
        document = MedicalDocument.objects.create(**document_data)
        
        # Create the physical examination with the document
        physical_examination = PhysicalExamination.objects.create(document=document, **validated_data)
        
        return physical_examination

class ClinicalNoteCreateSerializer(serializers.ModelSerializer):
    # For creating clinical notes with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    authorized_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    
    # Document fields (write-only for creation)
    title = serializers.CharField(write_only=True)
    description = serializers.CharField(required=False, allow_blank=True, write_only=True)
    document_date = serializers.DateTimeField(required=False, write_only=True)
    status = serializers.CharField(required=False, default='approved', write_only=True)
    
    # Read-only fields for response
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    class Meta:
        model = ClinicalNote
        fields = [
            # Write-only fields for creation
            'patient', 'created_by', 'authorized_by', 'title', 'description', 'document_date', 'status',
            # Clinical note-specific fields
            'note_type', 'clinical_context', 'findings', 'recommendations', 
            'follow_up_required', 'follow_up_date',
            # Read-only fields for response
            'id', 'document', 'patient_name'
        ]
    
    def create(self, validated_data):
        # Get or create a default user for testing purposes
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            created_by, _ = CustomUser.objects.get_or_create(
                email='system@demo.com',
                defaults={
                    'first_name': 'System',
                    'last_name': 'User',
                    'role': 'doctor',
                    'is_active': True
                }
            )
        
        # Extract document-related data
        document_data = {
            'document_type': 'clinical_note',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': validated_data.pop('authorized_by', None),
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'document_date': validated_data.pop('document_date', None),
            'status': validated_data.pop('status', 'approved'),
            'content': f"Clinical Note - {validated_data.get('note_type', '').replace('_', ' ').title()}\n\nFindings: {validated_data.get('findings', '')}\n\nRecommendations: {validated_data.get('recommendations', '')}",
        }
        
        # Create the base document
        document = MedicalDocument.objects.create(**document_data)
        
        # Create the clinical note with the document
        clinical_note = ClinicalNote.objects.create(document=document, **validated_data)
        
        return clinical_note

class DocumentAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAttachment
        fields = '__all__'
