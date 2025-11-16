from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from medical_documents.models import MedicalDocument
import json

# Minimal public prescription detail view
def prescription_detail(request, prescription_id):
    doc = get_object_or_404(MedicalDocument, id=prescription_id, document_type='prescription')
    # Fetch the related Prescription object
    try:
        prescription = doc.prescription_detail
        # Parse medications - handle both JSON string and list
        meds_raw = prescription.medications if prescription.medications else []
        if isinstance(meds_raw, str):
            try:
                meds = json.loads(meds_raw)
            except json.JSONDecodeError:
                meds = []
        elif isinstance(meds_raw, list):
            meds = meds_raw
        else:
            meds = []
        
        patient_name = doc.patient.name if doc.patient else 'N/A'
        doctor = prescription.prescribing_physician
        doctor_name = f"{doctor.first_name} {doctor.last_name}".strip() if doctor else 'N/A'
    except Exception as e:
        print(f"Error fetching prescription details: {e}")
        meds = []
        patient_name = 'N/A'
        doctor_name = 'N/A'
    html = f"""
    <html><head><title>Prescription #{doc.id}</title></head><body>
    <h2>Prescription #{doc.id}</h2>
    <p><b>Patient:</b> {patient_name}</p>
    <p><b>Prescribing Doctor:</b> {doctor_name}</p>
    <p><b>Date:</b> {doc.document_date}</p>
    <h3>Medications:</h3>
    <ul>
    {''.join(f'<li>{m.get("name","")} - {m.get("dose","")} {m.get("quantity","")} {m.get("frequency","")}</li>' for m in meds) if meds else '<li>No medications listed.</li>'}
    </ul>
    </body></html>
    """
    return HttpResponse(html)
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
