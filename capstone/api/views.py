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
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prescription #{doc.id}</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .container {{
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 600px;
                width: 100%;
                padding: 30px;
                animation: slideUp 0.5s ease-out;
            }}
            @keyframes slideUp {{
                from {{
                    opacity: 0;
                    transform: translateY(30px);
                }}
                to {{
                    opacity: 1;
                    transform: translateY(0);
                }}
            }}
            .header {{
                border-bottom: 3px solid #667eea;
                padding-bottom: 20px;
                margin-bottom: 25px;
            }}
            h2 {{
                color: #2d3748;
                font-size: 24px;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            .info-box {{
                background: #f7fafc;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
                border-left: 4px solid #667eea;
            }}
            .info-row {{
                margin-bottom: 12px;
                display: flex;
                flex-wrap: wrap;
            }}
            .info-row:last-child {{
                margin-bottom: 0;
            }}
            .info-label {{
                font-weight: 600;
                color: #4a5568;
                min-width: 140px;
            }}
            .info-value {{
                color: #2d3748;
            }}
            h3 {{
                color: #2d3748;
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .meds-list {{
                list-style: none;
            }}
            .med-item {{
                background: #edf2f7;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                border-left: 4px solid #48bb78;
                transition: transform 0.2s;
            }}
            .med-item:hover {{
                transform: translateX(5px);
            }}
            .no-meds {{
                background: #fed7d7;
                border-left-color: #fc8181;
                color: #742a2a;
                font-style: italic;
            }}
            .med-name {{
                font-weight: 600;
                color: #2d3748;
                font-size: 16px;
                margin-bottom: 5px;
            }}
            .med-details {{
                color: #4a5568;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>📋 Prescription #{doc.id}</h2>
            </div>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Patient:</span>
                    <span class="info-value">{patient_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Prescribing Doctor:</span>
                    <span class="info-value">{doctor_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">{doc.document_date}</span>
                </div>
            </div>
            
            <h3>💊 Medications:</h3>
            <ul class="meds-list">
                {''.join(f'<li class="med-item"><div class="med-name">{m.get("name", "Unknown medication")}</div><div class="med-details">{m.get("dose", "")} • {m.get("quantity", "")} • {m.get("frequency", "")}</div></li>' for m in meds) if meds else '<li class="med-item no-meds">No medications listed.</li>'}
            </ul>
        </div>
    </body>
    </html>
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
