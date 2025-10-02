from rest_framework import serializers
from .models import (
    MedicalDocument, LabResult, SOAPNote, Prescription, 
    ClinicalNote, MedicalCertificate, PhysicalExamination,
    DocumentAttachment, DocumentVersion, DocumentAccessLog
)
from patients.models import Patient
from accounts.models import CustomUser
from security_app.secure_serializers import SecureBaseSerializer, EncryptedJSONField

def get_default_user():
    """Helper function to get a default user for document creation"""
    # Use the first available doctor user
    user = CustomUser.objects.filter(role='doctor').first()
    if not user:
        # If no doctor exists, use any user
        user = CustomUser.objects.first()
    if not user:
        raise ValueError("No users exist in the system")
    return user

class PDFFieldsMixin:
    """Mixin to add PDF-related fields to medical document serializers"""
    
    def get_original_file_url(self, obj):
        """Return the original file URL if available"""
        if obj.document and obj.document.original_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.original_file.url)
            return obj.document.original_file.url
        return None
        
    def get_processed_file_url(self, obj):
        """Return the processed file URL if available"""
        if obj.document and obj.document.processed_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.processed_file.url)
            return obj.document.processed_file.url
        return None
        
    def get_has_pdf(self, obj):
        """Return True if any PDF file is available"""
        if obj.document:
            return bool(obj.document.original_file or obj.document.processed_file)
        return False
        
    def get_pdf_url(self, obj):
        """Return the preferred PDF URL (processed first, then original)"""
        if obj.document:
            pdf_file = obj.document.processed_file or obj.document.original_file
            if pdf_file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(pdf_file.url)
                return pdf_file.url
        return None
        
    def get_file_url(self, obj):
        """Alternative method for file URL"""
        return self.get_pdf_url(obj)

class MedicalDocumentSerializer(SecureBaseSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    authorized_by_name = serializers.CharField(source='authorized_by.get_full_name', read_only=True)
    
    # Custom JSON fields for encrypted data
    extracted_data = EncryptedJSONField()
    structured_data = EncryptedJSONField()
    metadata = EncryptedJSONField()
    
    class Meta:
        model = MedicalDocument
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_public_representation(self, data):
        """Return only non-sensitive fields for unauthenticated users"""
        return {
            'id': data.get('id'),
            'document_type': data.get('document_type'),
            'status': data.get('status'),
            'created_at': data.get('created_at'),
            'document_date': data.get('document_date')
        }

class LabResultSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    # Custom JSON fields for encrypted data
    test_results = EncryptedJSONField()
    
    # PDF file URLs
    original_file_url = serializers.SerializerMethodField()
    processed_file_url = serializers.SerializerMethodField()
    has_pdf = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()  # Common field name frontends look for
    file_url = serializers.SerializerMethodField()  # Alternative field name
    
    class Meta:
        model = LabResult
        fields = '__all__'
        
    def to_representation(self, instance):
        """Override to ensure PDF fields are included in response"""
        data = super().to_representation(instance)
        
        # Explicitly add PDF-related fields
        data['has_pdf'] = self.get_has_pdf(instance)
        data['original_file_url'] = self.get_original_file_url(instance)
        data['processed_file_url'] = self.get_processed_file_url(instance)
        data['pdf_url'] = self.get_pdf_url(instance)
        data['file_url'] = self.get_file_url(instance)
        
        # Also add these to the document object if needed
        if data.get('document') and instance.document:
            document_data = data['document']
            if instance.document.original_file:
                request = self.context.get('request')
                if request:
                    document_data['original_file'] = request.build_absolute_uri(instance.document.original_file.url)
                else:
                    document_data['original_file'] = instance.document.original_file.url
            
            if instance.document.processed_file:
                request = self.context.get('request')
                if request:
                    document_data['processed_file'] = request.build_absolute_uri(instance.document.processed_file.url)
                else:
                    document_data['processed_file'] = instance.document.processed_file.url
        
        return data
        
    def get_original_file_url(self, obj):
        """Return the original file URL if available"""
        if obj.document and obj.document.original_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.original_file.url)
            return obj.document.original_file.url
        return None
        
    def get_processed_file_url(self, obj):
        """Return the processed file URL if available"""
        if obj.document and obj.document.processed_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.processed_file.url)
            return obj.document.processed_file.url
        return None
        
    def get_has_pdf(self, obj):
        """Return True if any PDF file is available"""
        if obj.document:
            return bool(obj.document.original_file or obj.document.processed_file)
        return False
        
    def get_pdf_url(self, obj):
        """Return the preferred PDF URL (processed first, then original)"""
        if obj.document:
            pdf_file = obj.document.processed_file or obj.document.original_file
            if pdf_file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(pdf_file.url)
                return pdf_file.url
        return None
        
    def get_file_url(self, obj):
        """Alternative method for file URL"""
        return self.get_pdf_url(obj)

class LabResultCreateSerializer(serializers.ModelSerializer):
    # For creating lab results with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    authorized_by = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    
    # Custom JSON fields for encrypted data
    test_results = EncryptedJSONField()
    
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
            'received_date', 'reported_date', 'test_results',
            # Document creation fields (write_only)
            'patient', 'created_by', 'authorized_by', 'title', 'description', 
            'content', 'document_date', 'status', 'urgency',
            # File fields
            'document', 'processed_file',
            # Read-only fields
            'document_info', 'patient_name'
        ]
    
    def create(self, validated_data):
        
        # Extract file fields before creating document
        original_file = validated_data.pop('document', None)
        processed_file = validated_data.pop('processed_file', None)
        
        # Get or use existing user for testing purposes
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            # Use the first available doctor user
            try:
                created_by = CustomUser.objects.filter(role='doctor').first()
                if not created_by:
                    # If no doctor exists, use any user
                    created_by = CustomUser.objects.first()
                if not created_by:
                    raise ValueError("No users available in the system")
            except Exception as e:
                print(f"Error finding user: {e}")
                raise e
        
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
        return data

class SOAPNoteSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    # Custom JSON field for encrypted data
    vital_signs = EncryptedJSONField()
    
    class Meta:
        model = SOAPNote
        fields = '__all__'

class SOAPNoteCreateSerializer(serializers.ModelSerializer):
    # For creating SOAP notes with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    authorized_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    
    # Custom JSON field for encrypted data
    vital_signs = EncryptedJSONField()
    
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
        # Get or use existing user for document creation
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            created_by = get_default_user()
        
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
    document_uuid = serializers.UUIDField(source='document.id', read_only=True)
    
    # Custom JSON field for encrypted data
    medications = EncryptedJSONField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'document', 'patient_name', 'document_uuid',
            'prescription_number', 'prescribing_physician', 'medications',
            'general_instructions', 'pharmacy_notes', 'valid_until',
            'refills_allowed', 'refills_remaining', 'dispensed_date', 'dispensed_by'
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add document_uuid to the output
        data['document_uuid'] = str(instance.document.id) if instance.document else None
        return data

class PrescriptionCreateSerializer(serializers.ModelSerializer):
    # For creating prescriptions with embedded document data
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), required=False, write_only=True)
    prescribing_physician = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.filter(role='doctor'), required=False)
    
    # Custom JSON field for encrypted data (medications field contains JSON)
    medications = EncryptedJSONField()
    
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
        request = self.context.get('request')
        created_by = validated_data.pop('created_by', None)
        prescribing_physician = validated_data.get('prescribing_physician')
        # If not provided, use request.user if doctor
        if not prescribing_physician and request and hasattr(request, 'user') and getattr(request.user, 'role', None) == 'doctor':
            prescribing_physician = request.user
        if not created_by:
            if request and hasattr(request, 'user'):
                created_by = request.user
            else:
                created_by = get_default_user()
        # Extract document-related data
        from django.utils import timezone
        document_data = {
            'document_type': 'prescription',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': prescribing_physician or created_by,
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'document_date': validated_data.pop('document_date', None) or timezone.now(),
            'status': validated_data.pop('status', 'approved'),
        }
        document = MedicalDocument.objects.create(**document_data)
        prescription_data = {
            'document': document,
            'prescription_number': validated_data.get('prescription_number'),
            'prescribing_physician': prescribing_physician or created_by,
            'medications': validated_data.get('medications', []),
            'general_instructions': validated_data.get('general_instructions', ''),
            'pharmacy_notes': validated_data.get('pharmacy_notes', ''),
            'valid_until': validated_data.get('valid_until'),
            'refills_allowed': validated_data.get('refills_allowed', 0),
            'refills_remaining': validated_data.get('refills_remaining', 0),
        }
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
    
    # PDF file URLs
    original_file_url = serializers.SerializerMethodField()
    processed_file_url = serializers.SerializerMethodField()
    has_pdf = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalCertificate
        fields = '__all__'
        
    def get_original_file_url(self, obj):
        """Return the original file URL if available"""
        if obj.document and obj.document.original_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.original_file.url)
            return obj.document.original_file.url
        return None
        
    def get_processed_file_url(self, obj):
        """Return the processed file URL if available"""
        if obj.document and obj.document.processed_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.processed_file.url)
            return obj.document.processed_file.url
        return None
        
    def get_has_pdf(self, obj):
        """Return True if any PDF file is available"""
        if obj.document:
            return bool(obj.document.original_file or obj.document.processed_file)
        return False
        
    def get_pdf_url(self, obj):
        """Return the preferred PDF URL (processed first, then original)"""
        if obj.document:
            pdf_file = obj.document.processed_file or obj.document.original_file
            if pdf_file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(pdf_file.url)
                return pdf_file.url
        return None
        
    def get_file_url(self, obj):
        """Alternative method for file URL"""
        return self.get_pdf_url(obj)

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
    
    # MedicalCertificate fields - explicitly define to handle validation
    certificate_type = serializers.CharField(required=False, default='fitness')
    purpose = serializers.CharField(required=False, allow_blank=True, default='General medical certificate')
    medical_opinion = serializers.CharField(required=False, allow_blank=True, default='Medical examination completed')
    valid_from = serializers.DateField(required=False)
    valid_until = serializers.DateField(required=False, allow_null=True)
    restrictions = serializers.CharField(required=False, allow_blank=True, default='')
    examination_findings = serializers.CharField(required=False, allow_blank=True, default='')
    
    class Meta:
        model = MedicalCertificate
        exclude = ('document',)
    
    def to_representation(self, instance):
        """Custom representation to handle patient field access"""
        # Create a custom representation without calling super() first
        # to avoid the AttributeError on patient field
        data = {}
        
        # Handle MedicalCertificate fields directly
        if hasattr(instance, 'certificate_type'):
            data['certificate_type'] = instance.certificate_type
        if hasattr(instance, 'purpose'):
            data['purpose'] = instance.purpose
        if hasattr(instance, 'medical_opinion'):
            data['medical_opinion'] = instance.medical_opinion
        if hasattr(instance, 'valid_from'):
            data['valid_from'] = instance.valid_from
        if hasattr(instance, 'valid_until'):
            data['valid_until'] = instance.valid_until
        if hasattr(instance, 'restrictions'):
            data['restrictions'] = instance.restrictions
        if hasattr(instance, 'examination_findings'):
            data['examination_findings'] = instance.examination_findings
        
        # Add document-related fields from the related document
        if hasattr(instance, 'document') and instance.document:
            data['patient'] = instance.document.patient.id
            data['created_by'] = instance.document.created_by.id
            data['authorized_by'] = instance.document.authorized_by.id if instance.document.authorized_by else None
            data['title'] = instance.document.title
            data['description'] = instance.document.description
            data['document_date'] = instance.document.document_date
            data['status'] = instance.document.status
            # Add the document ID for reference
            data['document_id'] = instance.document.id
        
        # Add the medical certificate ID
        if hasattr(instance, 'id'):
            data['id'] = instance.id
        
        return data
    
    def validate_patient(self, value):
        """Validate that the patient exists and is active"""
        if not value:
            raise serializers.ValidationError("Patient is required")
        return value
    
    def validate_valid_from(self, value):
        """Validate that valid_from date is not in the past"""
        from django.utils import timezone
        if value and value < timezone.now().date():
            raise serializers.ValidationError("Valid from date cannot be in the past")
        return value
    
    def validate_valid_until(self, value):
        """Validate that valid_until is after valid_from"""
        valid_from = self.initial_data.get('valid_from')
        if value and valid_from:
            from datetime import datetime
            if isinstance(valid_from, str):
                try:
                    valid_from_date = datetime.strptime(valid_from, '%Y-%m-%d').date()
                except ValueError:
                    # If date parsing fails, let the field validation handle it
                    return value
            else:
                valid_from_date = valid_from
            
            if isinstance(value, str):
                try:
                    valid_until_date = datetime.strptime(value, '%Y-%m-%d').date()
                except ValueError:
                    return value
            else:
                valid_until_date = value
            
            if valid_until_date <= valid_from_date:
                raise serializers.ValidationError("Valid until date must be after valid from date")
        return value
    
    def validate(self, data):
        """Additional validation for the entire object"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"=== SERIALIZER VALIDATION ===")
        logger.info(f"Input data: {data}")
        
        # Apply default values for empty fields BEFORE validation
        if not data.get('purpose', '').strip():
            data['purpose'] = 'General medical certificate'
            logger.info(f"Applied default purpose: {data['purpose']}")
        
        if not data.get('medical_opinion', '').strip():
            data['medical_opinion'] = 'Medical examination completed'
            logger.info(f"Applied default medical_opinion: {data['medical_opinion']}")
        
        if not data.get('certificate_type', '').strip():
            data['certificate_type'] = 'fitness'
            logger.info(f"Applied default certificate_type: {data['certificate_type']}")
        
        # Now check for truly required fields (only those without defaults)
        required_fields = ['valid_from']  # Only fields that truly must be provided
        missing_fields = []
        
        for field in required_fields:
            if not data.get(field):
                missing_fields.append(field)
                logger.error(f"Missing required field: {field}")
        
        if missing_fields:
            error_dict = {}
            for field in missing_fields:
                error_dict[field] = f"{field.replace('_', ' ').title()} is required"
            
            logger.error(f"Validation failed due to missing fields: {error_dict}")
            raise serializers.ValidationError(error_dict)
        
        logger.info(f"Validation passed for data: {data}")
        return data
    
    def create(self, validated_data):
        # Get or use existing user for document creation
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            created_by = get_default_user()
        
        # Defaults are already applied in validate() method, so no need to re-apply here
        
        # Extract document-related data
        document_data = {
            'document_type': 'medical_certificate',
            'patient': validated_data.pop('patient'),
            'created_by': created_by,
            'authorized_by': validated_data.pop('authorized_by', None),
            'title': validated_data.pop('title'),
            'description': validated_data.pop('description', ''),
            'status': validated_data.pop('status', 'approved'),
            'content': f"Medical Certificate - {validated_data.get('certificate_type', '').replace('_', ' ').title()}\n\nPurpose: {validated_data.get('purpose', '')}\n\nMedical Opinion: {validated_data.get('medical_opinion', '')}",
        }
        
        # Only include document_date if it's provided, otherwise let the model use its default
        document_date = validated_data.pop('document_date', None)
        if document_date is not None:
            document_data['document_date'] = document_date
        
        # Create the base document
        document = MedicalDocument.objects.create(**document_data)
        
        # Create the medical certificate with the document
        medical_certificate = MedicalCertificate.objects.create(document=document, **validated_data)
        
        return medical_certificate

class PhysicalExaminationSerializer(serializers.ModelSerializer):
    document = MedicalDocumentSerializer(read_only=True)
    patient_name = serializers.CharField(source='document.patient.name', read_only=True)
    
    # PDF file URLs
    original_file_url = serializers.SerializerMethodField()
    processed_file_url = serializers.SerializerMethodField()
    has_pdf = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PhysicalExamination
        fields = '__all__'
        
    def get_original_file_url(self, obj):
        """Return the original file URL if available"""
        if obj.document and obj.document.original_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.original_file.url)
            return obj.document.original_file.url
        return None
        
    def get_processed_file_url(self, obj):
        """Return the processed file URL if available"""
        if obj.document and obj.document.processed_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.processed_file.url)
            return obj.document.processed_file.url
        return None
        
    def get_has_pdf(self, obj):
        """Return True if any PDF file is available"""
        if obj.document:
            return bool(obj.document.original_file or obj.document.processed_file)
        return False
        
    def get_pdf_url(self, obj):
        """Return the preferred PDF URL (processed first, then original)"""
        if obj.document:
            pdf_file = obj.document.processed_file or obj.document.original_file
            if pdf_file:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(pdf_file.url)
                return pdf_file.url
        return None
        
    def get_file_url(self, obj):
        """Alternative method for file URL"""
        return self.get_pdf_url(obj)

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
        # Get or use existing user for document creation
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            created_by = get_default_user()
        
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
        # Get or use existing user for document creation
        created_by = validated_data.pop('created_by', None)
        if not created_by:
            created_by = get_default_user()
        
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
