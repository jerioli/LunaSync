from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.conf import settings
from django.db.models import Q
from datetime import timedelta
import json
import logging
from .models import MedicalCertificateRequest, PrescriptionRequest
# Using lazy import to avoid circular import
# from .email_utils import send_medical_certificate_email, send_prescription_email

logger = logging.getLogger(__name__)

def format_prescription_as_table(prescription_content, patient_name, doctor_notes=""):
    """
    Format prescription content as an HTML table for email
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"format_prescription_as_table called with content: {prescription_content}")
    
    if not prescription_content:
        return "<p>No prescription content available</p>"
    
    # Parse the prescription content to extract medications
    medications = []
    lines = prescription_content.split('\n')
    current_med = {}
    
    logger.info(f"Parsing {len(lines)} lines of prescription content")
    
    for i, line in enumerate(lines):
        line = line.strip()
        logger.info(f"Line {i}: '{line}'")
        
        # Check for numbered medication (1., 2., etc.) or simple medication names
        if line.startswith(('1.', '2.', '3.', '4.', '5.')) or (not any(keyword in line for keyword in ['Dose:', 'Quantity:', 'Frequency:', 'Duration:', 'Notes:']) and line and not current_med.get('name')):
            # Save previous medication if exists
            if current_med.get('name'):
                medications.append(current_med)
                logger.info(f"Added medication: {current_med}")
            # Start new medication
            if line.startswith(('1.', '2.', '3.', '4.', '5.')):
                med_name = line.split('.', 1)[1].strip()
            else:
                med_name = line.strip()
            
            current_med = {
                'name': med_name,
                'dose': '',
                'quantity': '',
                'frequency': '',
                'duration': '',
                'notes': ''
            }
            logger.info(f"Started new medication: {current_med['name']}")
        elif line.startswith('Dose:'):
            if current_med:
                current_med['dose'] = line.replace('Dose:', '').strip()
                logger.info(f"Set dose: {current_med['dose']}")
        elif line.startswith('Quantity:'):
            if current_med:
                current_med['quantity'] = line.replace('Quantity:', '').strip()
                logger.info(f"Set quantity: {current_med['quantity']}")
        elif line.startswith('Frequency:'):
            if current_med:
                current_med['frequency'] = line.replace('Frequency:', '').strip()
                logger.info(f"Set frequency: {current_med['frequency']}")
        elif line.startswith('Duration:'):
            if current_med:
                current_med['duration'] = line.replace('Duration:', '').strip()
                logger.info(f"Set duration: {current_med['duration']}")
        elif line.startswith('Notes:'):
            if current_med:
                current_med['notes'] = line.replace('Notes:', '').strip()
                logger.info(f"Set notes: {current_med['notes']}")
    
    # Add the last medication
    if current_med.get('name'):
        medications.append(current_med)
        logger.info(f"Added final medication: {current_med}")
    
    logger.info(f"Total medications parsed: {len(medications)}")
    logger.info(f"Final medications list: {medications}")
    
    # If no medications were parsed, try to create from the raw content
    if not medications:
        logger.warning("No medications parsed from structured format, trying fallback parsing")
        # Fallback: treat the entire content as a single medication
        medications = [{
            'name': prescription_content.replace('\n', ' ').strip(),
            'dose': 'As prescribed',
            'quantity': 'As prescribed', 
            'frequency': 'As prescribed',
            'duration': 'As prescribed',
            'notes': ''
        }]
    
    # Generate HTML table
    from django.utils import timezone
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; text-align: center; margin-bottom: 30px; font-size: 24px;">E-Prescription</h2>
            <div style="margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <h3 style="color: #34495e; margin: 0; font-size: 18px;">Patient: {patient_name}</h3>
                <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 14px;">Prescription Date: {timezone.now().strftime('%B %d, %Y')}</p>
            </div>
            
            <h4 style="color: #34495e; margin-bottom: 15px; font-size: 16px;">Prescribed Medications</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ddd; background-color: white;">
                <thead>
                    <tr style="background-color: #3498db; color: white;">
                        <th style="border: 1px solid #2980b9; padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Medication</th>
                        <th style="border: 1px solid #2980b9; padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Dose</th>
                        <th style="border: 1px solid #2980b9; padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Qty</th>
                        <th style="border: 1px solid #2980b9; padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Frequency</th>
                        <th style="border: 1px solid #2980b9; padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Duration</th>
                        <th style="border: 1px solid #2980b9; padding: 12px; text-align: left; font-weight: bold; font-size: 14px;">Notes</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for i, med in enumerate(medications):
        row_bg = "#f8f9fa" if i % 2 == 0 else "white"
        html += f"""
                    <tr style="background-color: {row_bg};">
                        <td style="border: 1px solid #ddd; padding: 12px; font-weight: 500; color: #2c3e50;">{med['name']}</td>
                        <td style="border: 1px solid #ddd; padding: 12px; color: #34495e;">{med['dose'] or '-'}</td>
                        <td style="border: 1px solid #ddd; padding: 12px; color: #34495e;">{med['quantity'] or '-'}</td>
                        <td style="border: 1px solid #ddd; padding: 12px; color: #34495e;">{med['frequency'] or '-'}</td>
                        <td style="border: 1px solid #ddd; padding: 12px; color: #34495e;">{med['duration'] or '-'}</td>
                        <td style="border: 1px solid #ddd; padding: 12px; color: #34495e;">{med['notes'] or '-'}</td>
                    </tr>
        """
    
    html += """
                </tbody>
            </table>
        """
    
    if doctor_notes:
        html += f"""
            <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3498db;">
                <h4 style="margin: 0 0 10px 0; color: #34495e;">Doctor's Notes:</h4>
                <p style="margin: 0; color: #555;">{doctor_notes}</p>
            </div>
        """
    
    html += """
            <div style="margin-top: 30px; text-align: center; color: #7f8c8d; font-size: 12px;">
                <p>This is an official electronic prescription. Please present this to your pharmacy.</p>
            </div>
        </div>
    </div>
    """
    
    return html

def get_email_functions():
    """Lazy import of email functions to avoid circular import"""
    try:
        from .email_utils import send_medical_certificate_email, send_prescription_email
        return send_medical_certificate_email, send_prescription_email
    except ImportError as e:
        logger.error(f"Could not import email functions: {e}")
        return None, None

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
                'id_verification_front': req.id_verification_front.url if req.id_verification_front else None,
                'id_verification_back': req.id_verification_back.url if req.id_verification_back else None,
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
                id_verification_front_file = None
                id_verification_back_file = None
            else:
                # Multipart form data with file upload
                data = request.POST.dict()
                id_verification_file = request.FILES.get('id_verification')
                id_verification_front_file = request.FILES.get('id_verification_front')
                id_verification_back_file = request.FILES.get('id_verification_back')
            
            # Create new medical certificate request
            certificate_request = MedicalCertificateRequest.objects.create(
                request_type=data.get('request_type'),
                patient_name=data.get('patient_name'),
                date_of_birth=data.get('date_of_birth'),
                email=data.get('email'),
                phone=data.get('phone'),
                additional_info=data.get('additional_info', ''),
                id_verification=id_verification_file,
                id_verification_front=id_verification_front_file,
                id_verification_back=id_verification_back_file,
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
            
            # Send email to patient using lazy import to avoid circular import
            try:
                send_medical_certificate_email, send_prescription_email = get_email_functions()
                if send_medical_certificate_email is None:
                    logger.error("Email functions not available")
                    email_result = False
                else:
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
            
            # Send SMS notification if phone number is provided
            try:
                if certificate_request.phone:
                    from accounts.iprog_sms_service import IProgSMSService
                    sms_service = IProgSMSService()
                    
                    # Medical certificates are pickup only
                    sms_message = f"Hello {certificate_request.patient_name},\n\nYour medical certificate has been approved and is ready for pickup at our clinic.\n\nHealthNexus Medical Center"
                    
                    success, message, message_id = sms_service.send_sms(
                        phone_number=certificate_request.phone,
                        message=sms_message
                    )
                    
                    if success:
                        logger.info(f"SMS notification sent to {certificate_request.phone} for medical certificate approval")
                    else:
                        logger.error(f"Failed to send SMS notification: {message}")
            except Exception as e:
                logger.error(f"Error sending SMS notification: {str(e)}")
            
        elif action == 'reject':
            certificate_request.status = 'rejected'
            certificate_request.rejection_reason = data.get('rejection_reason', '')
            
            # Send email notification about rejection
            try:
                from django.core.mail import send_mail
                from clinic.models import ClinicSettings
                
                clinic_settings = ClinicSettings.objects.first()
                clinic_name = clinic_settings.clinic_name if clinic_settings else "HealthNexus Medical Center"
                
                subject = f"Medical Certificate Request - Status Update"
                message = f"""Dear {certificate_request.patient_name},

We regret to inform you that your medical certificate request has been declined.

Reason: {certificate_request.rejection_reason}

If you have any questions or would like to discuss this further, please contact our clinic directly.

Best regards,
{clinic_name}"""
                
                send_mail(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    [certificate_request.email],
                    fail_silently=True,
                )
                logger.info(f"Rejection email sent to {certificate_request.email}")
            except Exception as e:
                logger.error(f"Error sending rejection email: {str(e)}")
            
            # Send SMS notification about rejection
            try:
                if certificate_request.phone:
                    from accounts.iprog_sms_service import IProgSMSService
                    sms_service = IProgSMSService()
                    
                    sms_message = f"Hello {certificate_request.patient_name},\n\nYour medical certificate request has been declined. Please check your email for details or contact us.\n\nHealthNexus Medical Center"
                    
                    success, message, message_id = sms_service.send_sms(
                        phone_number=certificate_request.phone,
                        message=sms_message
                    )
                    
                    if success:
                        logger.info(f"Rejection SMS sent to {certificate_request.phone}")
                    else:
                        logger.error(f"Failed to send rejection SMS: {message}")
            except Exception as e:
                logger.error(f"Error sending rejection SMS: {str(e)}")
            
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
                'id_verification_front': req.id_verification_front.url if req.id_verification_front else None,
                'id_verification_back': req.id_verification_back.url if req.id_verification_back else None,
                'prescription_image': req.prescription_image.url if req.prescription_image else None,
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
                id_verification_front_file = None
                id_verification_back_file = None
                prescription_image_file = None
            else:
                # Multipart form data with file upload
                data = request.POST.dict()
                id_verification_file = request.FILES.get('id_verification')
                id_verification_front_file = request.FILES.get('id_verification_front')
                id_verification_back_file = request.FILES.get('id_verification_back')
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
                id_verification_front=id_verification_front_file,
                id_verification_back=id_verification_back_file,
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
            logger.info(f"Starting doctor approval for prescription request {request_id}")
            prescription_request.status = 'doctor_approved'
            prescription_request.doctor_approved_at = timezone.now()
            prescription_request.prescription_content = data.get('prescription_content', '')
            prescription_request.doctor_notes = data.get('doctor_notes', '')
            
            logger.info(f"Prescription content: {prescription_request.prescription_content}")
            logger.info(f"Patient name to search: {prescription_request.patient_name}")
            
            # Create E-Prescription in medical documents system
            try:
                from medical_documents.models import MedicalDocument, Prescription
                from patients.models import Patient
                from accounts.models import CustomUser
                import uuid
                import json as json_module
                
                logger.info("Starting E-Prescription creation process")
                
                # Find the patient by name
                patient = Patient.objects.filter(
                    first_name__iexact=prescription_request.patient_name.split()[0],
                    last_name__iexact=' '.join(prescription_request.patient_name.split()[1:])
                ).first()
                
                logger.info(f"Patient search by first/last name: {patient}")
                
                if not patient:
                    # Try alternative name matching
                    patient = Patient.objects.filter(
                        Q(name__iexact=prescription_request.patient_name) |
                        Q(full_name__iexact=prescription_request.patient_name)
                    ).first()
                    logger.info(f"Patient search by name/full_name: {patient}")
                
                if patient:
                    logger.info(f"Found patient: {patient.name if hasattr(patient, 'name') else f'{patient.first_name} {patient.last_name}'}")
                    
                    # Get the current user (doctor) or default doctor
                    doctor = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                    logger.info(f"Request user: {doctor}")
                    
                    if not doctor or not hasattr(doctor, 'role') or doctor.role != 'doctor':
                        doctor = CustomUser.objects.filter(role='doctor').first()
                        logger.info(f"Default doctor found: {doctor}")
                    
                    if doctor:
                        logger.info(f"Using doctor: {doctor.username} for prescription creation")
                        
                        # Create the base medical document
                        medical_doc = MedicalDocument.objects.create(
                            document_type='prescription',
                            patient=patient,
                            created_by=doctor,
                            authorized_by=doctor,
                            title=f"E-Prescription for {prescription_request.patient_name}",
                            description=f"Electronic prescription issued on {timezone.now().strftime('%Y-%m-%d')}",
                            status='approved',
                            urgency='routine',
                            document_date=timezone.now(),
                            authorized_at=timezone.now(),
                            content=prescription_request.prescription_content
                        )
                        
                        logger.info(f"Created medical document: {medical_doc.id}")
                        
                        # Parse medications from prescription content
                        medications_data = []
                        if prescription_request.prescription_content:
                            # Try to parse structured medication data
                            lines = prescription_request.prescription_content.split('\n')
                            current_med = {}
                            
                            for line in lines:
                                line = line.strip()
                                if line.startswith(('1.', '2.', '3.', '4.', '5.')):
                                    # Save previous medication if exists
                                    if current_med.get('name'):
                                        medications_data.append(current_med)
                                    # Start new medication
                                    current_med = {
                                        'name': line.split('.', 1)[1].strip(),
                                        'dose': '',
                                        'quantity': '',
                                        'frequency': '',
                                        'notes': ''
                                    }
                                elif line.startswith('Dose:'):
                                    current_med['dose'] = line.replace('Dose:', '').strip()
                                elif line.startswith('Quantity:'):
                                    current_med['quantity'] = line.replace('Quantity:', '').strip()
                                elif line.startswith('Frequency:'):
                                    current_med['frequency'] = line.replace('Frequency:', '').strip()
                                elif line.startswith('Notes:'):
                                    current_med['notes'] = line.replace('Notes:', '').strip()
                            
                            # Add the last medication
                            if current_med.get('name'):
                                medications_data.append(current_med)
                        
                        # If no structured data found, create from basic request data
                        if not medications_data:
                            medications_data = [{
                                'name': prescription_request.medication_name or 'Prescribed Medication',
                                'dose': prescription_request.dosage or '',
                                'quantity': '',
                                'frequency': prescription_request.frequency or '',
                                'duration': prescription_request.duration or '',
                                'notes': prescription_request.additional_notes or ''
                            }]
                        
                        logger.info(f"Parsed medications data: {medications_data}")
                        
                        # Create the prescription detail record
                        prescription_number = f"RX-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
                        
                        prescription_detail = Prescription.objects.create(
                            document=medical_doc,
                            prescription_number=prescription_number,
                            prescribing_physician=doctor,
                            medications=json_module.dumps(medications_data),
                            general_instructions=prescription_request.doctor_notes or '',
                            pharmacy_notes='',
                            valid_until=timezone.now().date() + timedelta(days=90),  # Valid for 3 months
                            refills_allowed=0,
                            refills_remaining=0
                        )
                        
                        logger.info(f"Created E-Prescription {prescription_number} for patient {patient.name if hasattr(patient, 'name') else f'{patient.first_name} {patient.last_name}'}")
                    else:
                        logger.error("No doctor found to create prescription")
                else:
                    logger.error(f"Patient not found for name: {prescription_request.patient_name}")
                    # Let's also try to list all patients to see what names exist
                    all_patients = Patient.objects.all()[:10]  # Get first 10 patients
                    patient_names = [f"{p.first_name} {p.last_name}" if hasattr(p, 'first_name') else str(p) for p in all_patients]
                    logger.error(f"Available patient names: {patient_names}")
                    
            except Exception as e:
                logger.error(f"Error creating E-Prescription: {str(e)}")
                import traceback
                logger.error(f"Full traceback: {traceback.format_exc()}")
                # Continue with email sending even if E-Prescription creation fails
            
            # Send email to patient using lazy import to avoid circular import
            try:
                logger.info("Starting email sending process")
                send_medical_certificate_email, send_prescription_email = get_email_functions()
                logger.info(f"Email functions loaded: send_prescription_email={send_prescription_email is not None}")
                
                if send_prescription_email is None:
                    logger.error("Email functions not available")
                    email_result = False
                else:
                    # Get HTML content if provided, otherwise format as table
                    html_content = data.get('prescription_html')
                    logger.info(f"HTML content provided: {html_content is not None}")
                    
                    if not html_content:
                        # Format prescription content as HTML table
                        logger.info("Formatting prescription content as HTML table")
                        html_content = format_prescription_as_table(prescription_request.prescription_content, 
                                                                   prescription_request.patient_name,
                                                                   prescription_request.doctor_notes)
                        logger.info(f"Generated HTML content length: {len(html_content) if html_content else 0}")
                    
                    # Get doctor name
                    doctor_name = data.get('doctor_name', 'Health Nexus Medical Team')
                    logger.info(f"Sending email to: {prescription_request.email}, Patient: {prescription_request.patient_name}, Doctor: {doctor_name}")
                    
                    # Send the prescription email with complete prescription data
                    email_result = send_prescription_email(
                        patient_email=prescription_request.email,
                        patient_name=prescription_request.patient_name,
                        prescription_html=html_content,
                        doctor_name=doctor_name,
                        patient_dob=prescription_request.date_of_birth,
                        prescription_request=prescription_request
                    )
                    
                    logger.info(f"Email sending result: {email_result}")
                
                if email_result:
                    prescription_request.status = 'completed'
                    prescription_request.completed_at = timezone.now()
                    logger.info(f"Prescription email sent successfully to {prescription_request.email}")
                else:
                    logger.error(f"Failed to send prescription email to {prescription_request.email}")
            except Exception as e:
                logger.error(f"Error sending prescription email: {str(e)}")
                import traceback
                logger.error(f"Email error traceback: {traceback.format_exc()}")
            
            # Send SMS notification if phone number is provided
            try:
                if prescription_request.phone:
                    from accounts.iprog_sms_service import IProgSMSService
                    sms_service = IProgSMSService()
                    
                    # Determine the message based on delivery method (if available)
                    sms_message = f"Hello {prescription_request.patient_name},\n\nYour prescription has been approved and is ready for pickup at our clinic. Please check your email for details.\n\nHealthNexus Medical Center"
                    
                    success, message, message_id = sms_service.send_sms(
                        phone_number=prescription_request.phone,
                        message=sms_message
                    )
                    
                    if success:
                        logger.info(f"SMS notification sent to {prescription_request.phone} for prescription approval")
                    else:
                        logger.error(f"Failed to send SMS notification: {message}")
            except Exception as e:
                logger.error(f"Error sending SMS notification: {str(e)}")
            
        elif action == 'reject':
            prescription_request.status = 'rejected'
            prescription_request.rejection_reason = data.get('rejection_reason', '')
            
            # Send email notification about rejection
            try:
                from django.core.mail import send_mail
                from clinic.models import ClinicSettings
                
                clinic_settings = ClinicSettings.objects.first()
                clinic_name = clinic_settings.clinic_name if clinic_settings else "HealthNexus Medical Center"
                
                subject = f"Prescription Request - Status Update"
                message = f"""Dear {prescription_request.patient_name},

We regret to inform you that your prescription request has been declined.

Reason: {prescription_request.rejection_reason}

If you have any questions or would like to discuss this further, please contact our clinic directly.

Best regards,
{clinic_name}"""
                
                send_mail(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    [prescription_request.email],
                    fail_silently=True,
                )
                logger.info(f"Rejection email sent to {prescription_request.email}")
            except Exception as e:
                logger.error(f"Error sending rejection email: {str(e)}")
            
            # Send SMS notification about rejection
            try:
                if prescription_request.phone:
                    from accounts.iprog_sms_service import IProgSMSService
                    sms_service = IProgSMSService()
                    
                    sms_message = f"Hello {prescription_request.patient_name},\n\nYour prescription request has been declined. Please check your email for details or contact us.\n\nHealthNexus Medical Center"
                    
                    success, message, message_id = sms_service.send_sms(
                        phone_number=prescription_request.phone,
                        message=sms_message
                    )
                    
                    if success:
                        logger.info(f"Rejection SMS sent to {prescription_request.phone}")
                    else:
                        logger.error(f"Failed to send rejection SMS: {message}")
            except Exception as e:
                logger.error(f"Error sending rejection SMS: {str(e)}")
            
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
@csrf_exempt
@require_http_methods(["POST"])
def send_medical_certificate_email_endpoint(request):
    """
    Endpoint to send a medical certificate as an HTML email
    """
    try:
        # Add logging to help debug
        logger.info(f"Received email request from {request.META.get('REMOTE_ADDR')}")
        logger.info(f"Request content type: {request.content_type}")
        logger.info(f"Request body length: {len(request.body)}")
        
        data = json.loads(request.body)
        
        patient_name = data.get('patient_name')
        patient_email = data.get('patient_email')
        certificate_html = data.get('certificate_html')
        doctor_name = data.get('doctor_name', 'Health Nexus Medical Team')
        hospital_name = data.get('hospital_name', 'HealthNexus Medical Center')
        
        logger.info(f"Sending medical certificate email to: {patient_email} for patient: {patient_name}")
        
        if not patient_name or not patient_email or not certificate_html:
            logger.error("Missing required fields for medical certificate email")
            return JsonResponse({'error': 'Missing required fields'}, status=400)
        
        # Use the email utility function with lazy import to avoid circular import
        send_medical_certificate_email, send_prescription_email = get_email_functions()
        if send_medical_certificate_email is None:
            logger.error("Email functions not available")
            return JsonResponse({'error': 'Email service not available'}, status=500)
        
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


@csrf_exempt
@require_http_methods(["GET"])
def get_latest_prescription(request, patient_name):
    """
    Get the latest prescription for a patient by name from the medical documents system
    """
    try:
        # Import the medical documents models
        from medical_documents.models import MedicalDocument, Prescription
        from patients.models import Patient
        
        # First, find the patient by name
        try:
            patient = Patient.objects.get(name=patient_name)
        except Patient.DoesNotExist:
            return JsonResponse({'error': 'Patient not found'}, status=404)
        
        # Find the latest prescription document for this patient
        latest_prescription_doc = MedicalDocument.objects.filter(
            patient=patient,
            document_type='prescription'
        ).order_by('-document_date').first()
        
        if not latest_prescription_doc:
            return JsonResponse({'error': 'No prescription found for this patient'}, status=404)
        
        # Get the prescription details
        try:
            prescription_detail = latest_prescription_doc.prescription_detail
        except:
            return JsonResponse({'error': 'Prescription details not found'}, status=404)
        
        # Extract medications from the prescription
        medications_data = []
        if prescription_detail.medications:
            try:
                import json
                if isinstance(prescription_detail.medications, str):
                    medications = json.loads(prescription_detail.medications)
                else:
                    medications = prescription_detail.medications
                
                for med in medications:
                    medications_data.append({
                        'name': med.get('name', 'Not specified'),
                        'dose': med.get('dose') or med.get('dosage', ''),
                        'quantity': med.get('quantity', ''),
                        'frequency': med.get('frequency', ''),
                        'notes': med.get('notes', ''),
                        'startDate': med.get('startDate', ''),
                        'endDate': med.get('endDate', ''),
                    })
            except:
                # Fallback for old format
                medications_data = [{
                    'name': prescription_detail.medication_name or 'Not specified',
                    'dose': prescription_detail.dosage or '',
                    'quantity': '',
                    'frequency': prescription_detail.frequency or '',
                    'notes': '',
                    'startDate': '',
                    'endDate': '',
                }]
        
        data = {
            'id': latest_prescription_doc.id,
            'prescription_number': prescription_detail.prescription_number,
            'medications': medications_data,
            'prescription_content': prescription_detail.instructions,
            'doctor_notes': prescription_detail.instructions,
            'doctor_name': prescription_detail.prescribing_physician.get_full_name() if prescription_detail.prescribing_physician else None,
            'created_at': latest_prescription_doc.document_date.isoformat() if latest_prescription_doc.document_date else None,
            'notes': prescription_detail.instructions,
        }
        
        return JsonResponse(data)
        
    except Exception as e:
        logger.error(f"Error fetching latest prescription for {patient_name}: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET", "POST"])
def test_endpoint(request):
    """
    Test endpoint to verify URL routing is working
    """
    return JsonResponse({
        'message': 'URL routing is working',
        'method': request.method,
        'path': request.path
    })
