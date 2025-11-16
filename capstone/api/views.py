from django.shortcuts import get_object_or_404
from django.http import HttpResponse, JsonResponse
from medical_documents.models import MedicalDocument
from clinic.models import ClinicSettings
import json

# Public prescription detail view with styled HTML
def prescription_detail(request, prescription_id):
    doc = get_object_or_404(MedicalDocument, id=prescription_id, document_type='prescription')
    
    # Fetch clinic settings
    try:
        clinic = ClinicSettings.objects.first()
        clinic_name = clinic.clinic_name if clinic and clinic.clinic_name else 'LunaSync Health Management System'
        clinic_address = f"{clinic.address}, {clinic.city}, {clinic.state} {clinic.zip}" if clinic and clinic.address else ''
        clinic_phone = clinic.phone if clinic and clinic.phone else ''
        clinic_email = clinic.email if clinic and clinic.email else ''
        clinic_logo_url = clinic.logo.url if clinic and clinic.logo else None
    except Exception as e:
        print(f"Error fetching clinic: {e}")
        clinic_name = 'LunaSync Health Management System'
        clinic_address = ''
        clinic_phone = ''
        clinic_email = ''
        clinic_logo_url = None
    
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
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: #f5f5f5;
            padding: 10px;
            color: #000;
        }}
        .container {{
            background: #fff;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }}
        .logo {{
            width: 80px;
            height: 80px;
            margin: 0 auto 10px;
            background: #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 32px;
            font-weight: bold;
        }}
        .logo-img {{
            width: 80px;
            height: 80px;
            margin: 0 auto 10px;
            object-fit: contain;
            display: block;
        }}
        h1 {{
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .clinic-name {{
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 3px;
        }}
        .clinic-info {{
            font-size: 11px;
            color: #666;
            margin-bottom: 2px;
        }}
        .prescription-number {{
            font-size: 14px;
            font-weight: 600;
            margin-top: 8px;
        }}
        .date {{
            font-size: 12px;
            color: #666;
            margin-top: 3px;
        }}
        .info-section {{
            margin: 20px 0;
            border: 1px solid #000;
            padding: 15px;
        }}
        .info-row {{
            display: flex;
            padding: 6px 0;
            border-bottom: 1px solid #e0e0e0;
        }}
        .info-row:last-child {{
            border-bottom: none;
        }}
        .info-label {{
            font-weight: 700;
            width: 150px;
            flex-shrink: 0;
            font-size: 13px;
        }}
        .info-value {{
            font-size: 13px;
            flex: 1;
        }}
        .rx-symbol {{
            text-align: center;
            margin: 20px 0;
            font-size: 48px;
            font-weight: 700;
            font-family: serif;
            color: #000;
        }}
        .medications-section {{
            margin-top: 20px;
        }}
        .section-title {{
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
        }}
        .med-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            border: 2px solid #000;
            table-layout: fixed;
        }}
        .med-table th {{
            background: #000;
            color: #fff;
            padding: 10px 6px;
            text-align: left;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border-right: 1px solid #fff;
            word-wrap: break-word;
        }}
        .med-table th:last-child {{
            border-right: none;
        }}
        .med-table td {{
            padding: 10px 6px;
            border-bottom: 1px solid #ddd;
            border-right: 1px solid #ddd;
            font-size: 11px;
            vertical-align: top;
            line-height: 1.4;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }}
        .med-table td:last-child {{
            border-right: none;
        }}
        .med-table tr:last-child td {{
            border-bottom: none;
        }}
        .med-table tbody tr:nth-child(odd) {{
            background: #fafafa;
        }}
        .med-table tbody tr:hover {{
            background: #f0f0f0;
        }}
        .med-name {{
            font-weight: 700;
            font-size: 12px;
            color: #000;
            display: block;
            word-wrap: break-word;
        }}
        .med-number {{
            font-weight: 700;
            text-align: center;
        }}
        .no-meds {{
            text-align: center;
            padding: 20px;
            color: #666;
            font-style: italic;
            border: 1px dashed #999;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #000;
            text-align: center;
            font-size: 10px;
            color: #666;
            line-height: 1.5;
        }}
        .footer strong {{
            color: #000;
            display: block;
            margin-top: 6px;
            font-size: 11px;
        }}
        @media print {{
            body {{
                background: #fff;
                padding: 0;
            }}
            .container {{
                box-shadow: none;
            }}
        }}
        @media (max-width: 600px) {{
            body {{
                padding: 5px;
            }}
            .container {{
                padding: 15px;
            }}
            .info-label {{
                width: 120px;
                font-size: 12px;
            }}
            .info-value {{
                font-size: 12px;
            }}
            .med-table {{
                font-size: 10px;
            }}
            .med-table th,
            .med-table td {{
                padding: 6px 4px;
                font-size: 9px;
            }}
            .med-name {{
                font-size: 10px;
            }}
            h1 {{
                font-size: 18px;
            }}
            .rx-symbol {{
                font-size: 36px;
                margin: 15px 0;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with Logo -->
        <div class="header">
            {'<img src="' + request.build_absolute_uri(clinic_logo_url) + '" alt="Clinic Logo" class="logo-img">' if clinic_logo_url else '<div class="logo">LS</div>'}
            <h1>Medical Prescription</h1>
            <div class="clinic-name">{clinic_name}</div>
            {f'<div class="clinic-info">{clinic_address}</div>' if clinic_address else ''}
            {f'<div class="clinic-info">{clinic_phone}{" | " + clinic_email if clinic_email else ""}</div>' if clinic_phone or clinic_email else ''}
            <div class="prescription-number">Prescription No: {prescription_number}</div>
            <div class="date">Date Issued: {doc_date}</div>
        </div>
        
        <!-- Patient & Doctor Information -->
        <div class="info-section">
            <div class="info-row">
                <div class="info-label">Patient Name:</div>
                <div class="info-value">{patient_name}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Prescribing Physician:</div>
                <div class="info-value">Dr. {doctor_name}</div>
            </div>
        </div>
        
        <!-- Rx Symbol -->
        <div class="rx-symbol">℞</div>
        
        <!-- Medications Section -->
        <div class="medications-section">
            <div class="section-title">Prescribed Medications</div>
            
            {''.join(f'''<table class="med-table">
                <thead>
                    <tr>
                        <th style="width: 8%; text-align: center;">#</th>
                        <th style="width: 32%;">Medication</th>
                        <th style="width: 28%;">Dosage</th>
                        <th style="width: 12%;">Qty</th>
                        <th style="width: 20%;">Frequency</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(f'''<tr>
                        <td class="med-number">{i+1}</td>
                        <td><span class="med-name">{m.get("name", "Unknown")}</span></td>
                        <td>{m.get("dose", "—")}</td>
                        <td style="text-align: center;">{m.get("quantity", "—")}</td>
                        <td>{m.get("frequency", "—")}</td>
                    </tr>''' for i, m in enumerate(meds))}
                </tbody>
            </table>''') if meds else '<div class="no-meds">No medications prescribed</div>'}
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>This is an electronically generated prescription.</p>
            <p>For verification or inquiries, please contact the prescribing clinic.</p>
            <strong>LunaSync Health Management System</strong>
            <p>Secure • Reliable • Professional</p>
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
