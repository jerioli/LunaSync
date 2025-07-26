from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.conf import settings
import json
import logging
from .models import MedicalCertificateRequest, PrescriptionRequest
from .email_utils import send_medical_certificate_email, send_prescription_email

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["GET", "POST"])
def medical_certificates(request):
    if request.method == "GET":
        # Get all medical certificate requests
        requests = MedicalCertificateRequest.objects.all().order_by('-requested_at')
        
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
                'requested_at': req.requested_at.isoformat(),
                'receptionist_approved_at': req.receptionist_approved_at.isoformat() if req.receptionist_approved_at else None,
                'doctor_approved_at': req.doctor_approved_at.isoformat() if req.doctor_approved_at else None,
                'certificate_content': req.certificate_content,
                'doctor_notes': req.doctor_notes,
                'rejection_reason': req.rejection_reason,
            })
        
        return JsonResponse(data, safe=False)
    
    elif request.method == "POST":
        try:
            # Handle both JSON and multipart form data
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
                id_verification_file = None
            else:
                # Multipart form data with file upload
                data = request.POST.dict()
                id_verification_file = request.FILES.get('id_verification')
            
            # Create new medical certificate request
            certificate_request = MedicalCertificateRequest.objects.create(
                request_type=data.get('request_type'),
                patient_name=data.get('patient_name'),
                date_of_birth=data.get('date_of_birth'),
                email=data.get('email'),
                phone=data.get('phone'),
                additional_info=data.get('additional_info', ''),
                id_verification=id_verification_file,
                status='pending'
            )
            
            return JsonResponse({
                'id': certificate_request.id,
                'message': 'Medical certificate request submitted successfully',
                'status': 'pending'
            })
            
        except Exception as e:
            logger.error(f"Error creating medical certificate request: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def approve_medical_certificate(request, request_id):
    try:
        data = json.loads(request.body)
        certificate_request = MedicalCertificateRequest.objects.get(id=request_id)
        
        action = data.get('action')  # 'receptionist_approve', 'doctor_approve', 'reject'
        
        if action == 'receptionist_approve':
            certificate_request.status = 'receptionist_approved'
            certificate_request.receptionist_approved_at = timezone.now()
            # certificate_request.receptionist_approved_by = request.user
            
        elif action == 'doctor_approve':
            certificate_request.status = 'doctor_approved'
            certificate_request.doctor_approved_at = timezone.now()
            # certificate_request.doctor_approved_by = request.user
            certificate_request.certificate_content = data.get('certificate_content', '')
            certificate_request.doctor_notes = data.get('doctor_notes', '')
            
            # Send email to patient using our email utility
            try:
                # Get HTML content if provided, otherwise use plain text
                html_content = data.get('certificate_html', certificate_request.certificate_content)
                
                # Get doctor name from the approval or from data
                doctor_name = data.get('doctor_name', 'Health Nexus Medical Team')
                
                # Get fitness status from certificate content or doctor notes
                fitness_status = data.get('fitness_status', 'Fit for work')  # Default to fit for work
                
                # Send the email with complete certificate data
                email_result = send_medical_certificate_email(
                    patient_email=certificate_request.email,
                    patient_name=certificate_request.patient_name,
                    certificate_html=html_content,
                    doctor_name=doctor_name,
                    patient_dob=certificate_request.date_of_birth,
                    fitness_status=fitness_status,
                    certificate_request=certificate_request
                )
                
                if email_result:
                    certificate_request.status = 'completed'
                    certificate_request.completed_at = timezone.now()
                    logger.info(f"Medical certificate email sent to {certificate_request.email}")
                else:
                    logger.error(f"Failed to send medical certificate email to {certificate_request.email}")
            except Exception as e:
                logger.error(f"Error sending email: {str(e)}")
            
        elif action == 'reject':
            certificate_request.status = 'rejected'
            certificate_request.rejection_reason = data.get('rejection_reason', '')
            
        certificate_request.save()
        
        return JsonResponse({
            'message': f'Medical certificate request {action}d successfully',
            'status': certificate_request.status
        })
        
    except MedicalCertificateRequest.DoesNotExist:
        return JsonResponse({'error': 'Medical certificate request not found'}, status=404)
    except Exception as e:
        logger.error(f"Error updating medical certificate request: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET", "POST"])
def prescription_requests(request):
    if request.method == "GET":
        # Get all prescription requests
        requests = PrescriptionRequest.objects.all().order_by('-requested_at')
        
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
                'requested_at': req.requested_at.isoformat(),
                'receptionist_approved_at': req.receptionist_approved_at.isoformat() if req.receptionist_approved_at else None,
                'doctor_approved_at': req.doctor_approved_at.isoformat() if req.doctor_approved_at else None,
                'prescription_content': req.prescription_content,
                'doctor_notes': req.doctor_notes,
                'rejection_reason': req.rejection_reason,
            })
        
        return JsonResponse(data, safe=False)
    
    elif request.method == "POST":
        try:
            # Handle both JSON and multipart form data
            if request.content_type and 'application/json' in request.content_type:
                data = json.loads(request.body)
                id_verification_file = None
                prescription_image_file = None
            else:
                # Multipart form data with file upload
                data = request.POST.dict()
                id_verification_file = request.FILES.get('id_verification')
                prescription_image_file = request.FILES.get('prescription_image')
            
            # Create new prescription request
            prescription_request = PrescriptionRequest.objects.create(
                medication_name=data.get('medication_name'),
                dosage=data.get('dosage'),
                frequency=data.get('frequency'),
                duration=data.get('duration'),
                patient_name=data.get('patient_name'),
                date_of_birth=data.get('date_of_birth'),
                email=data.get('email'),
                phone=data.get('phone'),
                additional_notes=data.get('additional_notes', ''),
                id_verification=id_verification_file,
                prescription_image=prescription_image_file,
                status='pending'
            )
            
            return JsonResponse({
                'id': prescription_request.id,
                'message': 'Prescription request submitted successfully',
                'status': 'pending'
            })
            
        except Exception as e:
            logger.error(f"Error creating prescription request: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def approve_prescription(request, request_id):
    try:
        data = json.loads(request.body)
        prescription_request = PrescriptionRequest.objects.get(id=request_id)
        
        action = data.get('action')  # 'receptionist_approve', 'doctor_approve', 'reject'
        
        if action == 'receptionist_approve':
            prescription_request.status = 'receptionist_approved'
            prescription_request.receptionist_approved_at = timezone.now()
            
        elif action == 'doctor_approve':
            prescription_request.status = 'doctor_approved'
            prescription_request.doctor_approved_at = timezone.now()
            prescription_request.prescription_content = data.get('prescription_content', '')
            prescription_request.doctor_notes = data.get('doctor_notes', '')
            
            # Send email to patient using our email utility
            try:
                # Get HTML content if provided, otherwise use plain text
                html_content = data.get('prescription_html', prescription_request.prescription_content)
                
                # Get doctor name
                doctor_name = data.get('doctor_name', 'Health Nexus Medical Team')
                
                # Send the prescription email with complete prescription data
                email_result = send_prescription_email(
                    patient_email=prescription_request.email,
                    patient_name=prescription_request.patient_name,
                    prescription_html=html_content,
                    doctor_name=doctor_name,
                    patient_dob=prescription_request.date_of_birth,
                    prescription_request=prescription_request
                )
                
                if email_result:
                    prescription_request.status = 'completed'
                    prescription_request.completed_at = timezone.now()
                    logger.info(f"Prescription email sent to {prescription_request.email}")
                else:
                    logger.error(f"Failed to send prescription email to {prescription_request.email}")
            except Exception as e:
                logger.error(f"Error sending prescription email: {str(e)}")
            
        elif action == 'reject':
            prescription_request.status = 'rejected'
            prescription_request.rejection_reason = data.get('rejection_reason', '')
            
        prescription_request.save()
        
        return JsonResponse({
            'message': f'Prescription request {action}d successfully',
            'status': prescription_request.status
        })
        
    except PrescriptionRequest.DoesNotExist:
        return JsonResponse({'error': 'Prescription request not found'}, status=404)
    except Exception as e:
        logger.error(f"Error updating prescription request: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def send_medical_certificate_email_endpoint(request):
    """
    Endpoint to send a medical certificate as an HTML email
    """
    try:
        data = json.loads(request.body)
        
        patient_name = data.get('patient_name')
        patient_email = data.get('patient_email')
        certificate_html = data.get('certificate_html')
        doctor_name = data.get('doctor_name', 'Health Nexus Medical Team')
        hospital_name = data.get('hospital_name', 'HealthNexus Medical Center')
        
        if not patient_name or not patient_email or not certificate_html:
            return JsonResponse({'error': 'Missing required fields'}, status=400)
        
        # Use the email utility function
        result = send_medical_certificate_email(
            patient_email=patient_email,
            patient_name=patient_name,
            certificate_html=certificate_html,
            doctor_name=doctor_name,
            hospital_name=hospital_name
        )
        
        if result:
            logger.info(f"Medical certificate email sent successfully to {patient_email}")
            return JsonResponse({
                'message': 'Medical certificate email sent successfully',
                'status': 'sent'
            })
        else:
            logger.error(f"Failed to send medical certificate email to {patient_email}")
            return JsonResponse({'error': 'Failed to send email'}, status=500)
        
    except Exception as e:
        logger.error(f"Error sending medical certificate email: {str(e)}")
        return JsonResponse({'error': f'Failed to send email: {str(e)}'}, status=500)
