from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from capstone.settings import CsrfExemptSessionAuthentication
from .models import (
    MedicalDocument, LabResult, SOAPNote, Prescription, 
    ClinicalNote, MedicalCertificate, PhysicalExamination,
    DocumentAttachment, DocumentAccessLog
)
from .serializers import (
    MedicalDocumentSerializer, LabResultSerializer, LabResultCreateSerializer,
    SOAPNoteSerializer, SOAPNoteCreateSerializer, PrescriptionSerializer, 
    PrescriptionCreateSerializer, ClinicalNoteSerializer, ClinicalNoteCreateSerializer,
    MedicalCertificateSerializer, MedicalCertificateCreateSerializer, 
    PhysicalExaminationSerializer, PhysicalExaminationCreateSerializer,
    DocumentAttachmentSerializer
)
from patients.models import Patient
import logging

logger = logging.getLogger(__name__)

class MedicalStaffPermission(permissions.BasePermission):
    """
    Custom permission to only allow receptionist, doctor, and admin access to medical documents.
    """
    def has_permission(self, request, view):
        print(f"[DEBUG] MedicalStaffPermission check - User: {request.user}")
        print(f"[DEBUG] User authenticated: {request.user.is_authenticated if request.user else 'No user'}")
        
        if not request.user or not request.user.is_authenticated:
            print("[DEBUG] Permission denied: User not authenticated")
            return False
        
        # Check if user has role attribute
        if not hasattr(request.user, 'role'):
            print(f"[DEBUG] Permission denied: User {request.user} has no role attribute")
            return False
            
        user_role = request.user.role
        print(f"[DEBUG] User role: {user_role}")
        
        # Allow access only to receptionist, doctor, and admin roles (and superadmin)
        allowed_roles = ['receptionist', 'doctor', 'admin', 'superadmin']
        has_valid_role = user_role in allowed_roles
        
        print(f"[DEBUG] User role '{user_role}' allowed: {has_valid_role}")
        
        if not has_valid_role:
            print(f"[DEBUG] Permission denied: User role '{user_role}' not in allowed roles {allowed_roles}")
        
        return has_valid_role

class MedicalDocumentViewSet(viewsets.ModelViewSet):
    queryset = MedicalDocument.objects.all()
    serializer_class = MedicalDocumentSerializer
    permission_classes = [IsAuthenticated, MedicalStaffPermission]  # Only receptionist, doctor, and admin
    
    def get_queryset(self):
        queryset = MedicalDocument.objects.all()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        
        # Filter by document type if specified
        document_type = self.request.query_params.get('document_type')
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(document_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(document_date__lte=end_date)
        
        # Search in title and content
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(content__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.order_by('-document_date', '-created_at')
    
    def perform_create(self, serializer):
        # Always use authenticated user for medical document creation
        serializer.save(created_by=self.request.user)
        
        # Log the creation
        self._log_document_access(serializer.instance, 'create')
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Log the update
        self._log_document_access(serializer.instance, 'edit')
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Log the view access
        self._log_document_access(instance, 'view')
        
        return super().retrieve(request, *args, **kwargs)
    
    def _log_document_access(self, document, access_type):
        """Log document access for audit trail"""
        try:
            # User is guaranteed to be authenticated due to permission class
            DocumentAccessLog.objects.create(
                document=document,
                user=self.request.user,
                access_type=access_type,
                ip_address=self.request.META.get('REMOTE_ADDR'),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:500]
            )
        except Exception as e:
            logger.error(f"Failed to log document access: {e}")
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a document"""
        document = self.get_object()
        document.status = 'approved'
        document.authorized_by = self.request.user
        document.authorized_at = timezone.now()
        document.save()
        
        self._log_document_access(document, 'approve')
        
        return Response({'status': 'Document approved'})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a document"""
        document = self.get_object()
        document.status = 'archived'
        document.save()
        
        self._log_document_access(document, 'archive')
        
        return Response({'status': 'Document archived'})

@method_decorator(csrf_exempt, name='dispatch')
class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all()
    authentication_classes = [CsrfExemptSessionAuthentication]  # Use same auth as patients
    permission_classes = [IsAuthenticated, MedicalStaffPermission]  # Restored permissions
    
    def get_permissions(self):
        print(f"[DEBUG] LabResultViewSet.get_permissions() called")
        print(f"[DEBUG] Action: {self.action}")
        print(f"[DEBUG] Permission classes: {self.permission_classes}")
        return super().get_permissions()
    
    def dispatch(self, request, *args, **kwargs):
        print(f"[DEBUG] LabResultViewSet.dispatch() called")
        print(f"[DEBUG] Method: {request.method}")
        print(f"[DEBUG] User: {request.user}")
        print(f"[DEBUG] Authenticated: {request.user.is_authenticated}")
        print(f"[DEBUG] Session key: {request.session.session_key}")
        print(f"[DEBUG] Session data: {dict(request.session.items())}")
        print(f"[DEBUG] Cookies: {request.COOKIES}")
        print(f"[DEBUG] Headers: {dict(request.headers)}")
        return super().dispatch(request, *args, **kwargs)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LabResultCreateSerializer
        return LabResultSerializer
    
    def create(self, request, *args, **kwargs):
        print(f"[DEBUG] LabResultViewSet CREATE - User: {request.user}")
        print(f"[DEBUG] User authenticated: {request.user.is_authenticated}")
        print(f"[DEBUG] User type: {type(request.user)}")
        print(f"[DEBUG] User role: {getattr(request.user, 'role', 'No role attribute')}")
        print(f"[DEBUG] Request method: {request.method}")
        print(f"[DEBUG] Request path: {request.path}")
        print(f"[DEBUG] Permission classes: {self.permission_classes}")
        
        # Check permissions manually
        for permission_class in self.permission_classes:
            permission_instance = permission_class()
            has_permission = permission_instance.has_permission(request, self)
            print(f"[DEBUG] Permission {permission_class.__name__}: {has_permission}")
        
        return super().create(request, *args, **kwargs)
    
    def get_queryset(self):
        queryset = LabResult.objects.select_related('document', 'document__patient').all()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(document__patient_id=patient_id)
        
        # Filter by test category
        test_category = self.request.query_params.get('test_category')
        if test_category:
            queryset = queryset.filter(test_category=test_category)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(document__document_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(document__document_date__lte=end_date)
        
        return queryset.order_by('-document__document_date')
    
    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get lab results for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id parameter required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        patient = get_object_or_404(Patient, id=patient_id)
        # Order by document creation date descending (newest first)
        lab_results = self.get_queryset().filter(document__patient=patient).order_by('-document__created_at')
        serializer = self.get_serializer(lab_results, many=True)
        
        return Response({
            'patient': patient.name,
            'lab_results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def critical_values(self, request):
        """Get lab results with critical values"""
        lab_results = self.get_queryset().exclude(critical_values=[])
        serializer = self.get_serializer(lab_results, many=True)
        return Response(serializer.data)

class SOAPNoteViewSet(viewsets.ModelViewSet):
    queryset = SOAPNote.objects.all()
    permission_classes = [IsAuthenticated, MedicalStaffPermission]  # Only receptionist, doctor, and admin
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SOAPNoteCreateSerializer
        return SOAPNoteSerializer
    
    def get_queryset(self):
        queryset = SOAPNote.objects.select_related('document', 'document__patient').all()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(document__patient_id=patient_id)
        
        return queryset.order_by('-document__document_date')

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    permission_classes = [IsAuthenticated, MedicalStaffPermission]  # Only receptionist, doctor, and admin
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PrescriptionCreateSerializer
        return PrescriptionSerializer
    
    def get_queryset(self):
        queryset = Prescription.objects.select_related('document', 'document__patient', 'prescribing_physician').all()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(document__patient_id=patient_id)
        
        # Filter by prescribing physician
        physician_id = self.request.query_params.get('physician_id')
        if physician_id:
            queryset = queryset.filter(prescribing_physician_id=physician_id)
        
        # Filter by validity
        valid_only = self.request.query_params.get('valid_only')
        if valid_only and valid_only.lower() == 'true':
            queryset = queryset.filter(valid_until__gte=timezone.now().date())
        
        return queryset.order_by('-document__document_date')
    
    @action(detail=True, methods=['post'])
    def dispense(self, request, pk=None):
        """Mark prescription as dispensed"""
        prescription = self.get_object()
        
        if prescription.refills_remaining > 0:
            prescription.refills_remaining -= 1
            prescription.dispensed_date = timezone.now()
            prescription.dispensed_by = request.data.get('dispensed_by', '')
            prescription.save()
            
            return Response({'status': 'Prescription dispensed', 'refills_remaining': prescription.refills_remaining})
        else:
            return Response({'error': 'No refills remaining'}, status=status.HTTP_400_BAD_REQUEST)

class ClinicalNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.all()
    permission_classes = [IsAuthenticated, MedicalStaffPermission]  # Only receptionist, doctor, and admin
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ClinicalNoteCreateSerializer
        return ClinicalNoteSerializer
    
    def get_queryset(self):
        queryset = ClinicalNote.objects.select_related('document', 'document__patient').all()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(document__patient_id=patient_id)
        
        # Filter by note type
        note_type = self.request.query_params.get('note_type')
        if note_type:
            queryset = queryset.filter(note_type=note_type)
        
        return queryset.order_by('-document__document_date')

class MedicalCertificateViewSet(viewsets.ModelViewSet):
    queryset = MedicalCertificate.objects.all()
    permission_classes = [IsAuthenticated, MedicalStaffPermission]  # Only receptionist, doctor, and admin
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MedicalCertificateCreateSerializer
        return MedicalCertificateSerializer
    
    def get_queryset(self):
        queryset = MedicalCertificate.objects.select_related('document', 'document__patient').all()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(document__patient_id=patient_id)
        
        # Filter by certificate type
        certificate_type = self.request.query_params.get('certificate_type')
        if certificate_type:
            queryset = queryset.filter(certificate_type=certificate_type)
        
        return queryset.order_by('-document__document_date')

class PhysicalExaminationViewSet(viewsets.ModelViewSet):
    queryset = PhysicalExamination.objects.all()
    permission_classes = [IsAuthenticated, MedicalStaffPermission]  # Only receptionist, doctor, and admin
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PhysicalExaminationCreateSerializer
        return PhysicalExaminationSerializer
    
    def get_queryset(self):
        queryset = PhysicalExamination.objects.select_related('document', 'document__patient').all()
        
        # Filter by patient if specified
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(document__patient_id=patient_id)
        
        return queryset.order_by('-document__document_date')
