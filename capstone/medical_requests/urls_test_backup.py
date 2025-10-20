from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import logging

logger = logging.getLogger(__name__)

def test_view(request):
    return JsonResponse({'message': 'test'})

def placeholder_view(request, *args, **kwargs):
    """Placeholder view for medical requests endpoints"""
    return JsonResponse({
        'message': 'Medical requests endpoint - temporarily disabled due to circular import',
        'endpoint': request.path,
        'method': request.method
    })

@csrf_exempt
@require_http_methods(["POST"])
def send_medical_certificate_email_endpoint(request, certificate_id):
    """
    Endpoint to send medical certificate as PDF via email
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        import logging
        logger = logging.getLogger('health_nexus')
        logger.info(f"Processing email request for certificate ID: {certificate_id}")
        
        # Get the medical certificate document
        try:
            from medical_documents.models import MedicalCertificate
            certificate_document = MedicalCertificate.objects.get(id=certificate_id)
            logger.info(f"Found certificate document: {certificate_document.id}")
        except MedicalCertificate.DoesNotExist:
            logger.error(f"Medical certificate with ID {certificate_id} not found")
            return JsonResponse({'error': f'Medical certificate with ID {certificate_id} not found'}, status=404)
        except Exception as e:
            logger.error(f"Error retrieving certificate: {e}")
            return JsonResponse({'error': f'Error retrieving certificate: {str(e)}'}, status=500)
        
        # Get patient information - access through document field
        patient = certificate_document.document.patient
        patient_name = patient.name if hasattr(patient, 'name') else f"{patient.first_name} {patient.last_name}"
        patient_email = patient.email
        
        # Get doctor and hospital information - access through document field
        doctor = certificate_document.document.doctor
        doctor_name = doctor.name if hasattr(doctor, 'name') else f"Dr. {doctor.first_name} {doctor.last_name}"
        hospital_name = "Health Nexus Medical Center"  # Default hospital name
        
        logger.info(f"Sending email to patient: {patient_name} ({patient_email})")
        
        # Email configuration
        try:
            from django.core.mail import EmailMultiAlternatives
            from django.conf import settings
            import os
            
            subject = f"Medical Certificate - {patient_name}"
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = [patient_email]
            
            # Basic text content
            text_content = f"""
            Dear {patient_name},
            
            Please find your medical certificate attached to this email.
            
            If you have any questions, please contact us.
            
            Best regards,
            {doctor_name}
            {hospital_name}
            """
            
            # Create email message
            msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
            
            # Try to attach PDF if available
            pdf_attached = False
            
            # Check for processed PDF file first
            if certificate_document.processed_file:
                try:
                    file_path = certificate_document.processed_file.path
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as f:
                            file_content = f.read()
                        filename = os.path.basename(file_path)
                        msg.attach(filename, file_content, 'application/pdf')
                        logger.info(f"Attached processed PDF file: {filename} (size: {len(file_content)} bytes)")
                        pdf_attached = True
                    else:
                        logger.warning(f"Processed file path does not exist: {file_path}")
                except Exception as e:
                    logger.error(f"Error attaching processed PDF file: {e}")
            
            # If no processed file, try original file
            if not pdf_attached and certificate_document.original_file:
                try:
                    file_path = certificate_document.original_file.path
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as f:
                            file_content = f.read()
                        filename = os.path.basename(file_path)
                        msg.attach(filename, file_content, 'application/pdf')
                        logger.info(f"Attached original PDF file: {filename} (size: {len(file_content)} bytes)")
                        pdf_attached = True
                    else:
                        logger.warning(f"Original file path does not exist: {file_path}")
                except Exception as e:
                    logger.error(f"Error attaching original PDF file: {e}")
            
            if not pdf_attached:
                logger.warning("No PDF file found to attach")
                
                # If there's HTML content, try to convert it to PDF
                if certificate_document.document.content:
                    logger.info("Found HTML content, converting to PDF")
                    logger.info(f"HTML content preview: {certificate_document.document.content[:200]}...")
                    
                    # Convert HTML content to PDF using ReportLab
                    try:
                        from reportlab.lib.pagesizes import A4
                        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
                        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                        from reportlab.lib import colors
                        from io import BytesIO
                        import re
                        import html
                        
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
                        
                        # Create custom styles for medical certificate
                        header_style = ParagraphStyle('HeaderStyle',
                                                    parent=styles['Heading1'],
                                                    fontSize=18,
                                                    spaceAfter=30,
                                                    alignment=1,  # Center
                                                    textColor=colors.black)
                        
                        clinic_style = ParagraphStyle('ClinicStyle',
                                                    parent=styles['Normal'],
                                                    fontSize=12,
                                                    spaceAfter=20,
                                                    alignment=1,  # Center
                                                    textColor=colors.blue)
                        
                        content_style = ParagraphStyle('ContentStyle',
                                                     parent=styles['Normal'],
                                                     fontSize=11,
                                                     spaceAfter=12)
                        
                        signature_style = ParagraphStyle('SignatureStyle',
                                                        parent=styles['Normal'],
                                                        fontSize=10,
                                                        spaceAfter=6,
                                                        alignment=2)  # Right align
                        
                        # Extract and clean content from HTML
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
                        
                        # Add content in paragraphs
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
                        logger.info(f"Generated and attached PDF from HTML content: {filename} (size: {len(pdf_content)} bytes)")
                        pdf_attached = True
                        
                    except ImportError as e:
                        logger.error(f"ReportLab not available for PDF generation: {e}")
                    except Exception as e:
                        logger.error(f"Error generating PDF from HTML content: {e}")
                    
            # Always create HTML email content for alternative format
            html_email_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 20px;">
                <div style="max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ccc;">
                    <h2 style="text-align: center; color: #333;">Medical Certificate</h2>
                    <p>Dear {patient_name},</p>
                    <p>Please find your medical certificate below:</p>
                    <div style="border: 2px solid #333; padding: 20px; margin: 20px 0; background-color: #f9f9f9;">
                        {certificate_document.document.content}
                    </div>
                    <p>Best regards,<br>
                    {doctor_name}<br>
                    {hospital_name}</p>
                    {"<p><em>Note: This certificate was sent as HTML content. Please contact us if you need a PDF version.</em></p>" if not pdf_attached else ""}
                </div>
            </body>
            </html>
            """
            
            # Always attach HTML alternative content
            msg.attach_alternative(html_email_content, "text/html")
            logger.info("Added HTML certificate content to email body as alternative format")
            
            # Send the email
            try:
                msg.send()
                logger.info(f"Medical certificate email sent successfully to {patient_email}")
                return JsonResponse({
                    'message': 'Medical certificate PDF sent successfully via email',
                    'status': 'sent',
                    'certificate_id': str(certificate_document.id),
                    'pdf_attached': pdf_attached,
                    'attachment_type': 'processed_file' if certificate_document.processed_file else 'original_file' if certificate_document.original_file else 'generated_from_html'
                })
            except Exception as e:
                logger.error(f"Error sending email: {e}")
                return JsonResponse({'error': f'Failed to send email: {str(e)}'}, status=500)
            
        except ImportError as e:
            logger.error(f"Could not import required modules: {e}")
            return JsonResponse({'error': 'Email service not available'}, status=500)
        except Exception as e:
            logger.error(f"Error processing email request: {e}")
            return JsonResponse({'error': f'Failed to process request: {str(e)}'}, status=500)
        
    except Exception as e:
        logger.error(f"Error in email endpoint: {str(e)}")
        return JsonResponse({'error': f'Failed to send email: {str(e)}'}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def send_medical_certificate_email_fallback(request):
    """
    Fallback endpoint for backward compatibility - gets certificate ID from request body or uses latest
    """
    import logging
    logger = logging.getLogger('health_nexus')
    
    try:
        certificate_id = None
        
        # Try to get certificate_id from request body
        if request.body:
            try:
                data = json.loads(request.body)
                certificate_id = data.get('certificate_id')
                logger.info(f"Received certificate_id from request body: {certificate_id}")
            except json.JSONDecodeError:
                logger.warning("Could not parse JSON from request body")
        
        # If no certificate_id provided, use the most recent one
        if not certificate_id:
            try:
                from medical_documents.models import MedicalCertificate
                latest_cert = MedicalCertificate.objects.latest('created_at')
                certificate_id = latest_cert.id
                logger.info(f"Using latest certificate ID: {certificate_id}")
            except Exception as e:
                logger.error(f"Could not find latest certificate: {e}")
                return JsonResponse({'error': 'No certificate_id provided and could not find latest certificate'}, status=400)
        
        # Call the main email function with the certificate ID
        return send_medical_certificate_email_endpoint(request, certificate_id)
        
    except Exception as e:
        logger.error(f"Error in fallback endpoint: {e}")
        return JsonResponse({'error': f'Failed to process request: {str(e)}'}, status=500)

urlpatterns = [
    path('test/', test_view, name='test'),
    path('medical-certificates/', placeholder_view, name='medical_certificates'),
    path('medical-certificates/<int:request_id>/approve/', placeholder_view, name='approve_medical_certificate'),
    # Support both URL patterns for backward compatibility
    path('send-medical-certificate-email/', send_medical_certificate_email_fallback, name='send_medical_certificate_email'),
    path('send-medical-certificate-email/<int:certificate_id>/', send_medical_certificate_email_endpoint, name='send_medical_certificate_email_with_id'),
    path('prescription-requests/', placeholder_view, name='prescription_requests'),
    path('prescription-requests/<int:request_id>/approve/', placeholder_view, name='approve_prescription'),
]
