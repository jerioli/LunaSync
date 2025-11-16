from django.shortcuts import get_object_or_404
from django.http import HttpResponse, JsonResponse
from medical_documents.models import MedicalDocument
import json
import logging

logger = logging.getLogger(__name__)

# Minimal public prescription detail view
def prescription_detail(request, prescription_id):
    try:
        doc = get_object_or_404(MedicalDocument, id=prescription_id, document_type='prescription')
        
        # Initialize default values
        meds = []
        patient_name = 'N/A'
        doctor_name = 'N/A'
        prescription_number = 'N/A'
        
        # Fetch the related Prescription object
        try:
            prescription = doc.prescription_detail
            if prescription:
                # Get medications safely
                if hasattr(prescription, 'medications') and prescription.medications:
                    meds = prescription.medications if isinstance(prescription.medications, list) else []
                
                # Get prescription number
                if hasattr(prescription, 'prescription_number'):
                    prescription_number = prescription.prescription_number
                
                # Get doctor name
                if hasattr(prescription, 'prescribing_physician') and prescription.prescribing_physician:
                    doctor = prescription.prescribing_physician
                    if hasattr(doctor, 'first_name') and hasattr(doctor, 'last_name'):
                        doctor_name = f"{doctor.first_name} {doctor.last_name}".strip()
                    elif hasattr(doctor, 'username'):
                        doctor_name = doctor.username
        except AttributeError as e:
            logger.warning(f"AttributeError accessing prescription_detail for {prescription_id}: {e}")
        except Exception as e:
            logger.error(f"Error accessing prescription details for {prescription_id}: {e}")
        
        # Get patient name safely
        try:
            if doc.patient and hasattr(doc.patient, 'name'):
                patient_name = doc.patient.name
        except Exception as e:
            logger.error(f"Error accessing patient name for {prescription_id}: {e}")
        
        # Format date safely
        try:
            doc_date = doc.document_date.strftime('%B %d, %Y') if doc.document_date else 'N/A'
        except:
            doc_date = str(doc.document_date) if doc.document_date else 'N/A'
        
        # Build HTML response
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prescription #{prescription_number}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 20px auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                h2 {{
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                }}
                .info {{
                    margin: 15px 0;
                    padding: 10px;
                    background-color: #f8f9fa;
                    border-radius: 4px;
                }}
                .info b {{
                    color: #34495e;
                }}
                h3 {{
                    color: #2980b9;
                    margin-top: 25px;
                }}
                ul {{
                    list-style-type: none;
                    padding: 0;
                }}
                li {{
                    padding: 10px;
                    margin: 5px 0;
                    background-color: #ecf0f1;
                    border-left: 4px solid #3498db;
                    border-radius: 4px;
                }}
                .no-meds {{
                    color: #7f8c8d;
                    font-style: italic;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>📋 Prescription #{prescription_number}</h2>
                <div class="info">
                    <p><b>Patient:</b> {patient_name}</p>
                    <p><b>Prescribing Doctor:</b> {doctor_name}</p>
                    <p><b>Date:</b> {doc_date}</p>
                </div>
                <h3>💊 Medications:</h3>
                <ul>
                {''.join(f'<li><b>{m.get("name", "Unknown")}</b> - {m.get("dose", "")} {m.get("quantity", "")} {m.get("frequency", "")}</li>' for m in meds) if meds else '<li class="no-meds">No medications listed.</li>'}
                </ul>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html)
        
    except Exception as e:
        logger.error(f"Error in prescription_detail view for {prescription_id}: {e}", exc_info=True)
        return HttpResponse(
            f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: 50px auto;
                        padding: 20px;
                        text-align: center;
                    }}
                    .error {{
                        background-color: #fee;
                        border: 1px solid #fcc;
                        padding: 20px;
                        border-radius: 8px;
                        color: #c00;
                    }}
                </style>
            </head>
            <body>
                <div class="error">
                    <h2>⚠️ Error Loading Prescription</h2>
                    <p>Unable to load prescription details.</p>
                    <p>Please contact the clinic for assistance.</p>
                </div>
            </body>
            </html>
            """,
            status=500
        )
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import os

class IsAdminUser(BasePermission):
    """
    Custom permission to only allow admin users to access this view.
    """
    def has_permission(self, request, view):
        print(f"DEBUG: Permission check - User: {request.user}")
        print(f"DEBUG: Is authenticated: {request.user.is_authenticated}")
        if hasattr(request.user, 'role'):
            print(f"DEBUG: User role: {request.user.role}")
        else:
            print("DEBUG: User has no role attribute")
        
        result = (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'admin'
        )
        print(f"DEBUG: Permission result: {result}")
        return result

@api_view(['GET'])
@permission_classes([IsAdminUser])
def aws_credentials_status(request):
    """Check AWS credentials status from environment variables"""
    aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_REGION', 'us-east-1')
    
    status_data = {
        'configured': bool(aws_access_key_id and aws_secret_access_key),
        'region': aws_region,
        'access_key_preview': aws_access_key_id[:8] + '...' if aws_access_key_id else None,
        'message': 'AWS credentials are configured via environment variables' if aws_access_key_id and aws_secret_access_key else 'AWS credentials not configured'
    }
    
    return Response(status_data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def test_aws_connection(request):
    """Test the AWS credentials by making a simple API call"""
    try:
        import boto3
        aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        
        if not aws_access_key_id or not aws_secret_access_key:
            return Response({
                'success': False,
                'message': 'AWS credentials not configured in environment variables'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        client = boto3.client(
            'textract',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=aws_region
        )
        
        # Test connection with a simple call
        response = client.list_adapters()  # Simple API call to test credentials
        
        return Response({
            'success': True,
            'message': 'AWS credentials are valid and working',
            'region': aws_region
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'AWS connection test failed: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
