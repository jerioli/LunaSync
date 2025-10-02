from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
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
        
        # Pass request context for URL building
        serializer = self.get_serializer(lab_results, many=True, context={'request': request})
        
        # Add debug info about PDF availability
        response_data = {
            'patient': patient.name,
            'lab_results': serializer.data
        }
        
        # Debug: Log PDF availability for each result
        for i, result in enumerate(serializer.data):
            has_pdf = result.get('has_pdf', False)
            original_url = result.get('original_file_url')
            processed_url = result.get('processed_file_url')
            print(f"[DEBUG] Lab Result {i+1}: has_pdf={has_pdf}, original_url={original_url}, processed_url={processed_url}")
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download PDF for a specific lab result"""
        lab_result = self.get_object()
        
        if not lab_result.document:
            return Response({'error': 'No document associated with this lab result'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check for processed file first, then original
        pdf_file = lab_result.document.processed_file or lab_result.document.original_file
        
        if not pdf_file:
            return Response({'error': 'No PDF file available for this lab result'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Return file URL
        file_url = request.build_absolute_uri(pdf_file.url)
        return Response({
            'pdf_url': file_url,
            'filename': pdf_file.name,
            'size': pdf_file.size if hasattr(pdf_file, 'size') else None
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


@csrf_exempt
def send_medical_certificate_email_endpoint(request):
    """
    Endpoint to send medical certificate email with PDF attachment
    """
    from django.http import JsonResponse
    from django.core.mail import EmailMultiAlternatives
    from django.conf import settings
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from io import BytesIO
    import json
    import re
    import html
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        logger.info("Processing email request for medical certificate")
        
        # Try to get the most recent medical certificate
        try:
            certificate_document = MedicalCertificate.objects.select_related('document', 'document__patient', 'document__doctor').latest('created_at')
            logger.info(f"Found latest certificate document: {certificate_document.id}")
        except MedicalCertificate.DoesNotExist:
            logger.error("No medical certificates found")
            return JsonResponse({'error': 'No medical certificates found'}, status=404)
        except Exception as e:
            logger.error(f"Error retrieving certificate: {e}")
            return JsonResponse({'error': f'Error retrieving certificate: {str(e)}'}, status=500)
        
        # Get patient information
        patient = certificate_document.document.patient
        patient_name = patient.name if hasattr(patient, 'name') else f"{patient.first_name} {patient.last_name}"
        patient_email = patient.email
        
        # Get doctor information
        doctor = certificate_document.document.doctor
        doctor_name = doctor.name if hasattr(doctor, 'name') else f"Dr. {doctor.first_name} {doctor.last_name}"
        hospital_name = "Health Nexus Medical Center"
        
        logger.info(f"Sending email to patient: {patient_name} ({patient_email})")
        
        # Email configuration
        subject = f"Medical Certificate - {patient_name}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@healthnexus.com')
        to_email = [patient_email]
        
        # Basic text content
        text_content = f"""
        Dear {patient_name},
        
        Please find your medical certificate attached to this email as a PDF.
        
        If you have any questions, please contact us.
        
        Best regards,
        {doctor_name}
        {hospital_name}
        """
        
        # Create email message
        msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
        
        # Generate PDF from HTML content
        if certificate_document.document.content:
            try:
                # Create PDF buffer
                buffer = BytesIO()
                doc = SimpleDocTemplate(buffer, pagesize=A4, 
                                      rightMargin=72, leftMargin=72,
                                      topMargin=72, bottomMargin=72)
                styles = getSampleStyleSheet()
                story = []
                
                # Get the HTML content
                html_content = certificate_document.document.content
                logger.info(f"Converting HTML content to PDF (length: {len(html_content)} chars)")
                
                # Create custom styles
                header_style = ParagraphStyle('HeaderStyle',
                                            parent=styles['Heading1'],
                                            fontSize=18,
                                            spaceAfter=30,
                                            alignment=1,
                                            textColor=colors.black)
                
                clinic_style = ParagraphStyle('ClinicStyle',
                                            parent=styles['Normal'],
                                            fontSize=12,
                                            spaceAfter=20,
                                            alignment=1,
                                            textColor=colors.blue)
                
                content_style = ParagraphStyle('ContentStyle',
                                             parent=styles['Normal'],
                                             fontSize=11,
                                             spaceAfter=12)
                
                signature_style = ParagraphStyle('SignatureStyle',
                                                parent=styles['Normal'],
                                                fontSize=10,
                                                spaceAfter=6,
                                                alignment=2)
                
                # Clean HTML content
                clean_content = html.unescape(html_content)
                clean_content = re.sub(r'<br\s*/?>', '\n', clean_content)
                clean_content = re.sub(r'<p[^>]*>', '\n', clean_content)
                clean_content = re.sub(r'</p>', '\n', clean_content)
                clean_content = re.sub(r'<[^>]+>', '', clean_content)
                clean_content = re.sub(r'\n\s*\n', '\n\n', clean_content)
                clean_content = clean_content.strip()
                
                # Add clinic header
                story.append(Paragraph("Medratrics Medical Diagnostic Center", clinic_style))
                story.append(Paragraph("123 Health Avenue, Medical District, Cityville, California 12345", content_style))
                story.append(Paragraph("Phone: (123) 456-7890 | Email: medratrics@healthnexus.com", content_style))
                story.append(Spacer(1, 20))
                
                # Add main title
                story.append(Paragraph("MEDICAL CERTIFICATE", header_style))
                story.append(Spacer(1, 30))
                
                # Add content
                lines = clean_content.split('\n')
                for line in lines:
                    line = line.strip()
                    if line:
                        story.append(Paragraph(line, content_style))
                        story.append(Spacer(1, 6))
                
                # Add signature section
                story.append(Spacer(1, 40))
                story.append(Paragraph("_" * 30, signature_style))
                story.append(Paragraph("Dr. Queenie Torrejos", signature_style))
                story.append(Paragraph("Attending Physician", signature_style))
                story.append(Paragraph("License No. 4324", signature_style))
                
                # Build PDF
                doc.build(story)
                pdf_content = buffer.getvalue()
                buffer.close()
                
                # Attach PDF to email
                filename = f"medical_certificate_{patient_name.replace(' ', '_')}.pdf"
                msg.attach(filename, pdf_content, 'application/pdf')
                logger.info(f"Generated and attached PDF: {filename} (size: {len(pdf_content)} bytes)")
                
            except Exception as e:
                logger.error(f"Error generating PDF: {e}")
                return JsonResponse({'error': f'Error generating PDF: {str(e)}'}, status=500)
        
        # Create HTML email content
        html_email_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 20px;">
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ccc;">
                <h2 style="text-align: center; color: #333;">Medical Certificate</h2>
                <p>Dear {patient_name},</p>
                <p>Please find your medical certificate attached as a PDF to this email.</p>
                <div style="border: 2px solid #333; padding: 20px; margin: 20px 0; background-color: #f9f9f9;">
                    {certificate_document.document.content}
                </div>
                <p>Best regards,<br>
                {doctor_name}<br>
                {hospital_name}</p>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML alternative
        msg.attach_alternative(html_email_content, "text/html")
        logger.info("Added HTML certificate content to email")
        
        # Send the email
        try:
            msg.send()
            logger.info(f"Medical certificate email sent successfully to {patient_email}")
            return JsonResponse({
                'message': 'Medical certificate email sent successfully',
                'status': 'sent',
                'certificate_id': str(certificate_document.id),
                'pdf_attached': True
            })
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return JsonResponse({'error': f'Failed to send email: {str(e)}'}, status=500)
            
    except Exception as e:
        logger.error(f"Error in email endpoint: {str(e)}")
        return JsonResponse({'error': f'Failed to send email: {str(e)}'}, status=500)


@csrf_exempt 
def prescription_requests_endpoint(request):
    """
    Handle prescription requests - using actual medical_requests models
    """
    from medical_requests.models import PrescriptionRequest
    
    if request.method == 'GET':
        # Get all prescription requests from the database
        requests = PrescriptionRequest.objects.all().order_by('-requested_at')
        
        # Convert to list of dictionaries
        data = []
        for req in requests:
            data.append({
                'id': req.id,
                'medication_name': req.medication_name,
                'dosage': req.dosage,
                'frequency': req.frequency,
                'duration': req.duration,
                'patient_name': req.patient_name,
                'date_of_birth': req.date_of_birth,
                'email': req.email,
                'phone': req.phone,
                'additional_notes': req.additional_notes,
                'status': req.status,
                'requested_at': req.requested_at.isoformat() if req.requested_at else None,
                'receptionist_approved_at': req.receptionist_approved_at.isoformat() if req.receptionist_approved_at else None,
                'doctor_approved_at': req.doctor_approved_at.isoformat() if req.doctor_approved_at else None,
                'prescription_content': req.prescription_content,
                'doctor_notes': req.doctor_notes,
                'rejection_reason': req.rejection_reason,
                'id_verification_front': req.id_verification_front.url if req.id_verification_front else None,
                'id_verification_back': req.id_verification_back.url if req.id_verification_back else None,
                'prescription_image': req.prescription_image.url if req.prescription_image else None
            })
        
        return JsonResponse(data, safe=False)
    elif request.method == 'POST':
        # Handle creating new prescription request
        try:
            import json
            from django.core.files.storage import default_storage
            
            # Handle form data
            medication_name = request.POST.get('medication_name')
            dosage = request.POST.get('dosage')
            frequency = request.POST.get('frequency')
            duration = request.POST.get('duration')
            patient_name = request.POST.get('patient_name')
            date_of_birth = request.POST.get('date_of_birth')
            email = request.POST.get('email')
            phone = request.POST.get('phone')
            additional_notes = request.POST.get('additional_notes', '')
            
            # Create new prescription request
            prescription_request = PrescriptionRequest.objects.create(
                medication_name=medication_name,
                dosage=dosage,
                frequency=frequency,
                duration=duration,
                patient_name=patient_name,
                date_of_birth=date_of_birth,
                email=email,
                phone=phone,
                additional_notes=additional_notes,
                status='pending'
            )
            
            # Handle file uploads
            if 'id_verification_front' in request.FILES:
                prescription_request.id_verification_front = request.FILES['id_verification_front']
            if 'id_verification_back' in request.FILES:
                prescription_request.id_verification_back = request.FILES['id_verification_back']
            if 'prescription_image' in request.FILES:
                prescription_request.prescription_image = request.FILES['prescription_image']
            
            prescription_request.save()
            
            return JsonResponse({
                'message': 'Prescription request submitted successfully',
                'status': 'submitted',
                'id': prescription_request.id
            }, status=201)
            
        except Exception as e:
            return JsonResponse({
                'error': f'Failed to create prescription request: {str(e)}'
            }, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)
@csrf_exempt 
def medical_certificates_endpoint(request):
    """
    Handle medical certificate requests - using actual medical_requests models
    """
    from medical_requests.models import MedicalCertificateRequest
    
    if request.method == 'GET':
        # Get all medical certificate requests from the database
        requests = MedicalCertificateRequest.objects.all().order_by('-requested_at')
        
        # Convert to list of dictionaries
        data = []
        for req in requests:
            data.append({
                'id': req.id,
                'request_type': req.request_type,
                'patient_name': req.patient_name,
                'date_of_birth': req.date_of_birth,
                'email': req.email,
                'phone': req.phone,
                'additional_info': req.additional_info,
                'status': req.status,
                'requested_at': req.requested_at.isoformat() if req.requested_at else None,
                'receptionist_approved_at': req.receptionist_approved_at.isoformat() if req.receptionist_approved_at else None,
                'doctor_approved_at': req.doctor_approved_at.isoformat() if req.doctor_approved_at else None,
                'certificate_content': req.certificate_content,
                'doctor_notes': req.doctor_notes,
                'rejection_reason': req.rejection_reason,
                'id_verification_front': req.id_verification_front.url if req.id_verification_front else None,
                'id_verification_back': req.id_verification_back.url if req.id_verification_back else None
            })
        
        return JsonResponse(data, safe=False)
    elif request.method == 'POST':
        # Handle creating new medical certificate request
        try:
            import json
            from django.core.files.storage import default_storage
            
            # Handle form data
            request_type = request.POST.get('request_type', 'Medical Certificate')
            patient_name = request.POST.get('patient_name')
            date_of_birth = request.POST.get('date_of_birth')
            email = request.POST.get('email')
            phone = request.POST.get('phone')
            additional_info = request.POST.get('additional_info', '')
            
            # Create new medical certificate request
            cert_request = MedicalCertificateRequest.objects.create(
                request_type=request_type,
                patient_name=patient_name,
                date_of_birth=date_of_birth,
                email=email,
                phone=phone,
                additional_info=additional_info,
                status='pending'
            )
            
            # Handle file uploads
            if 'id_verification_front' in request.FILES:
                cert_request.id_verification_front = request.FILES['id_verification_front']
            if 'id_verification_back' in request.FILES:
                cert_request.id_verification_back = request.FILES['id_verification_back']
            
            cert_request.save()
            
            return JsonResponse({
                'message': 'Medical certificate request submitted successfully',
                'status': 'submitted',
                'id': cert_request.id
            }, status=201)
            
        except Exception as e:
            return JsonResponse({
                'error': f'Failed to create medical certificate request: {str(e)}'
            }, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def approve_prescription_endpoint(request, request_id):
    """
    Handle prescription approval - using actual medical_requests models
    """
    from medical_requests.models import PrescriptionRequest
    from django.utils import timezone
    import json
    
    if request.method == 'POST':
        try:
            # Get the prescription request
            prescription_request = PrescriptionRequest.objects.get(id=request_id)
            
            # Parse request data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST
            
            action = data.get('action')
            
            if action == 'receptionist_approve':
                prescription_request.status = 'receptionist_approved'
                prescription_request.receptionist_approved_at = timezone.now()
                if request.user.is_authenticated:
                    prescription_request.receptionist_approved_by = request.user
                    
            elif action == 'doctor_approve':
                prescription_request.status = 'doctor_approved'
                prescription_request.doctor_approved_at = timezone.now()
                if request.user.is_authenticated:
                    prescription_request.doctor_approved_by = request.user
                prescription_request.prescription_content = data.get('prescription_content', '')
                prescription_request.doctor_notes = data.get('doctor_notes', '')
                
            elif action == 'reject':
                prescription_request.status = 'rejected'
                prescription_request.rejection_reason = data.get('rejection_reason', '')
                
            prescription_request.save()
            
            return JsonResponse({
                'message': 'Prescription approval processed successfully',
                'status': prescription_request.status
            }, status=200)
            
        except PrescriptionRequest.DoesNotExist:
            return JsonResponse({'error': 'Prescription request not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': f'Failed to process approval: {str(e)}'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def approve_medical_certificate_endpoint(request, request_id):
    """
    Handle medical certificate approval - using actual medical_requests models
    """
    from medical_requests.models import MedicalCertificateRequest
    from django.utils import timezone
    import json
    
    if request.method == 'POST':
        try:
            # Get the medical certificate request
            cert_request = MedicalCertificateRequest.objects.get(id=request_id)
            
            # Parse request data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST
            
            action = data.get('action')
            
            if action == 'receptionist_approve':
                cert_request.status = 'receptionist_approved'
                cert_request.receptionist_approved_at = timezone.now()
                if request.user.is_authenticated:
                    cert_request.receptionist_approved_by = request.user
                    
            elif action == 'doctor_approve':
                cert_request.status = 'doctor_approved'
                cert_request.doctor_approved_at = timezone.now()
                if request.user.is_authenticated:
                    cert_request.doctor_approved_by = request.user
                cert_request.certificate_content = data.get('certificate_content', '')
                cert_request.doctor_notes = data.get('doctor_notes', '')
                
            elif action == 'reject':
                cert_request.status = 'rejected'
                cert_request.rejection_reason = data.get('rejection_reason', '')
                
            cert_request.save()
            
            return JsonResponse({
                'message': 'Medical certificate approval processed successfully',
                'status': cert_request.status
            }, status=200)
            
        except MedicalCertificateRequest.DoesNotExist:
            return JsonResponse({'error': 'Medical certificate request not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': f'Failed to process approval: {str(e)}'}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)
