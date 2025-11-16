from django.shortcuts import get_object_or_404
from django.http import HttpResponse, JsonResponse
from medical_documents.models import MedicalDocument
import json

# Public prescription detail view with styled HTML
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
        prescription_number = prescription.prescription_number if prescription.prescription_number else f'RX-{doc.id}'
        
        # Format date
        try:
            doc_date = doc.document_date.strftime('%B %d, %Y') if doc.document_date else 'N/A'
        except:
            doc_date = str(doc.document_date) if doc.document_date else 'N/A'
            
    except Exception as e:
        print(f"Error fetching prescription details: {e}")
        meds = []
        patient_name = 'N/A'
        doctor_name = 'N/A'
        prescription_number = f'RX-{doc.id}'
        doc_date = 'N/A'
        
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prescription #{prescription_number}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
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
            max-width: 800px;
            width: 100%;
            padding: 40px;
            animation: fadeIn 0.5s ease-out;
        }}
        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(20px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        .header {{
            border-bottom: 4px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        h1 {{
            color: #2d3748;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }}
        .prescription-number {{
            color: #667eea;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
        }}
        .date {{
            color: #718096;
            font-size: 14px;
        }}
        .info-box {{
            background: linear-gradient(135deg, #667eea15, #764ba215);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            border-left: 5px solid #667eea;
        }}
        .info-row {{
            display: flex;
            margin-bottom: 15px;
        }}
        .info-row:last-child {{
            margin-bottom: 0;
        }}
        .info-label {{
            font-weight: 700;
            color: #4a5568;
            min-width: 160px;
            font-size: 15px;
        }}
        .info-value {{
            color: #2d3748;
            font-size: 15px;
            font-weight: 500;
        }}
        .rx-symbol {{
            text-align: center;
            margin: 30px 0;
        }}
        .rx-symbol span {{
            font-size: 72px;
            font-weight: 700;
            color: #667eea;
            font-family: serif;
        }}
        h2 {{
            color: #2d3748;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .meds-list {{
            list-style: none;
        }}
        .med-item {{
            background: linear-gradient(135deg, #48bb7815, #38a16915);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 5px solid #48bb78;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .med-item:hover {{
            transform: translateX(5px);
            box-shadow: 0 4px 12px rgba(72, 187, 120, 0.2);
        }}
        .no-meds {{
            background: linear-gradient(135deg, #fc818115, #f5656515);
            border-left-color: #fc8181;
        }}
        .med-name {{
            font-weight: 700;
            color: #2d3748;
            font-size: 18px;
            margin-bottom: 8px;
        }}
        .med-details {{
            color: #4a5568;
            font-size: 15px;
            line-height: 1.6;
        }}
        .med-detail {{
            display: inline-block;
            margin-right: 15px;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 13px;
        }}
        .footer p {{
            margin-bottom: 8px;
        }}
        @media (max-width: 600px) {{
            .container {{
                padding: 25px;
            }}
            h1 {{
                font-size: 24px;
            }}
            .rx-symbol span {{
                font-size: 56px;
            }}
            .info-label {{
                min-width: 120px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Prescription</h1>
            <div class="prescription-number">#{prescription_number}</div>
            <div class="date">Prescribed on: {doc_date}</div>
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
        </div>
        
        <div class="rx-symbol">
            <span>Rx</span>
        </div>
        
        <h2>💊 Medications</h2>
        <ul class="meds-list">
            {''.join(f'''<li class="med-item">
                <div class="med-name">{i+1}. {m.get("name", "Unknown medication")}</div>
                <div class="med-details">
                    {f'<span class="med-detail"><strong>Dosage:</strong> {m.get("dose", "N/A")}</span>' if m.get("dose") else ''}
                    {f'<span class="med-detail"><strong>Quantity:</strong> {m.get("quantity", "N/A")}</span>' if m.get("quantity") else ''}
                    {f'<span class="med-detail"><strong>Frequency:</strong> {m.get("frequency", "N/A")}</span>' if m.get("frequency") else ''}
                    {f'<br><span class="med-detail"><strong>Duration:</strong> {m.get("duration", "N/A")}</span>' if m.get("duration") else ''}
                    {f'<br><span class="med-detail"><strong>Notes:</strong> {m.get("notes", "")}</span>' if m.get("notes") else ''}
                </div>
            </li>''' for i, m in enumerate(meds)) if meds else '<li class="med-item no-meds"><div class="med-name">No medications listed</div></li>'}
        </ul>
        
        <div class="footer">
            <p>This is an electronic prescription. For verification, please contact the prescribing clinic.</p>
            <p><strong>LunaSync Health Management System</strong></p>
        </div>
    </div>
</body>
</html>"""
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
