from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.db import transaction
from accounts.models import CustomUser
from patients.models import Patient
import json
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

# For CSV/Excel processing - handle import errors gracefully
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

@method_decorator(csrf_exempt, name='dispatch')
class BulkPatientUploadView(APIView):
    # Remove authentication requirement for direct database posting
    permission_classes = []
    
    def post(self, request):
        """
        Handle bulk patient upload via CSV/Excel file or JSON data
        Direct posting to database without authentication
        """
        print(f"DEBUG: Bulk patient upload request received")
        print(f"DEBUG: Content Type: {request.content_type}")
        
        # Handle file upload
        if 'file' in request.FILES:
            return self._handle_file_upload(request.FILES['file'])
        
        # Handle JSON data (manual entry)
        elif 'data' in request.data:
            return self._handle_json_data(request.data['data'])
        
        else:
            return Response({'error': 'No file or data provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_file_upload(self, file):
        """Process CSV/Excel file upload"""
        if not PANDAS_AVAILABLE:
            return Response({
                'error': 'File upload not supported. Please use manual entry instead.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Determine file type and read accordingly
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            elif file.name.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            else:
                return Response({'error': 'Unsupported file format. Use CSV or Excel.'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Convert DataFrame to list of dictionaries
            data = df.to_dict('records')
            return self._process_patient_data(data)
            
        except Exception as e:
            return Response({'error': f'File processing error: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_json_data(self, data):
        """Process JSON data from manual entry"""
        return self._process_patient_data(data)
    
    def _process_patient_data(self, data):
        """Process and create patient records"""
        created_patients = []
        errors = []
        
        # Required fields for Patient model
        required_fields = ['name', 'email', 'phone', 'date_of_birth']
        
        with transaction.atomic():
            try:
                for i, patient_data in enumerate(data):
                    try:
                        # Validate required fields
                        missing_fields = [field for field in required_fields if not patient_data.get(field)]
                        if missing_fields:
                            errors.append(f"Row {i+1}: Missing required fields: {', '.join(missing_fields)}")
                            continue
                        
                        # Clean and prepare data
                        clean_data = {
                            'name': str(patient_data.get('name', '')).strip(),
                            'email': str(patient_data.get('email', '')).strip().lower(),
                            'phone': str(patient_data.get('phone', '')).strip(),
                            'date_of_birth': patient_data.get('date_of_birth'),
                            'gender': patient_data.get('gender', 'other'),
                            'address': str(patient_data.get('address', '')).strip(),
                            'marital_status': patient_data.get('marital_status', 'single'),
                        }
                        
                        # Validate date format
                        if isinstance(clean_data['date_of_birth'], str):
                            try:
                                clean_data['date_of_birth'] = datetime.strptime(clean_data['date_of_birth'], '%Y-%m-%d').date()
                            except ValueError:
                                errors.append(f"Row {i+1}: Invalid date format for date_of_birth. Use YYYY-MM-DD")
                                continue
                        
                        # Handle optional JSON fields
                        if patient_data.get('medical_info'):
                            clean_data['medical_info'] = patient_data.get('medical_info')
                        if patient_data.get('physical_examination'):
                            clean_data['physical_examination'] = patient_data.get('physical_examination')
                        
                        # Check if patient already exists
                        if Patient.objects.filter(email=clean_data['email']).exists():
                            errors.append(f"Row {i+1}: Patient with email {clean_data['email']} already exists")
                            continue
                        
                        # Create patient
                        patient = Patient.objects.create(**clean_data)
                        created_patients.append({
                            'id': patient.id,
                            'name': patient.name,
                            'email': patient.email
                        })
                        
                    except ValidationError as e:
                        errors.append(f"Row {i+1}: Validation error - {str(e)}")
                    except Exception as e:
                        errors.append(f"Row {i+1}: {str(e)}")
                
            except Exception as e:
                return Response({'error': f'Transaction failed: {str(e)}'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': f'Bulk patient upload completed',
            'created_count': len(created_patients),
            'error_count': len(errors),
            'created_patients': created_patients[:10],  # Limit response size
            'errors': errors[:10] if errors else []  # Limit error list
        }, status=status.HTTP_201_CREATED if created_patients else status.HTTP_400_BAD_REQUEST)


class BulkStaffUploadView(APIView):
    # Remove authentication requirement for direct database posting
    permission_classes = []
    
    def post(self, request):
        """
        Handle bulk staff upload via CSV/Excel file or JSON data
        Direct posting to database without authentication
        """
        print(f"DEBUG: Bulk staff upload request received")
        
        # Handle file upload
        if 'file' in request.FILES:
            return self._handle_file_upload(request.FILES['file'])
        
        # Handle JSON data (manual entry)
        elif 'data' in request.data:
            return self._handle_json_data(request.data['data'])
        
        else:
            return Response({'error': 'No file or data provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_file_upload(self, file):
        """Process CSV/Excel file upload"""
        if not PANDAS_AVAILABLE:
            return Response({
                'error': 'File upload not supported. Please use manual entry instead.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Determine file type and read accordingly
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            elif file.name.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            else:
                return Response({'error': 'Unsupported file format. Use CSV or Excel.'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Convert DataFrame to list of dictionaries
            data = df.to_dict('records')
            return self._process_staff_data(data)
            
        except Exception as e:
            return Response({'error': f'File processing error: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_json_data(self, data):
        """Process JSON data from manual entry"""
        return self._process_staff_data(data)
    
    def _process_staff_data(self, data):
        """Process and create staff records"""
        created_staff = []
        errors = []
        
        # Required fields for staff
        required_fields = ['first_name', 'last_name', 'email', 'phone', 'role']
        valid_roles = ['admin', 'doctor', 'receptionist']
        
        with transaction.atomic():
            try:
                for i, staff_data in enumerate(data):
                    try:
                        # Validate required fields
                        missing_fields = [field for field in required_fields if not staff_data.get(field)]
                        if missing_fields:
                            errors.append(f"Row {i+1}: Missing required fields: {', '.join(missing_fields)}")
                            continue
                        
                        # Clean and prepare data
                        clean_data = {
                            'first_name': str(staff_data.get('first_name', '')).strip(),
                            'last_name': str(staff_data.get('last_name', '')).strip(),
                            'email': str(staff_data.get('email', '')).strip().lower(),
                            'phone': str(staff_data.get('phone', '')).strip(),
                            'role': str(staff_data.get('role', '')).strip().lower(),
                            'username': str(staff_data.get('email', '')).strip().lower(),
                            'password': 'TempPass123!',  # Default password
                            'force_password_change': True
                        }
                        
                        # Add optional fields
                        if staff_data.get('department'):
                            clean_data['department'] = str(staff_data.get('department', '')).strip()
                        if staff_data.get('license_number'):
                            clean_data['license_number'] = str(staff_data.get('license_number', '')).strip()
                        
                        # Validate role
                        if clean_data['role'] not in valid_roles:
                            errors.append(f"Row {i+1}: Invalid role '{clean_data['role']}'. Must be one of: {', '.join(valid_roles)}")
                            continue
                        
                        # Check if user already exists
                        if CustomUser.objects.filter(email=clean_data['email']).exists():
                            errors.append(f"Row {i+1}: User with email {clean_data['email']} already exists")
                            continue
                        
                        # Create staff user
                        staff_user = CustomUser.objects.create_user(**clean_data)
                        created_staff.append({
                            'id': staff_user.id,
                            'name': f"{staff_user.first_name} {staff_user.last_name}",
                            'email': staff_user.email,
                            'role': staff_user.role
                        })
                        
                    except ValidationError as e:
                        errors.append(f"Row {i+1}: Validation error - {str(e)}")
                    except Exception as e:
                        errors.append(f"Row {i+1}: {str(e)}")
                
            except Exception as e:
                return Response({'error': f'Transaction failed: {str(e)}'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': f'Bulk staff upload completed',
            'created_count': len(created_staff),
            'error_count': len(errors),
            'created_staff': created_staff[:10],  # Limit response size
            'errors': errors[:10] if errors else []  # Limit error list
        }, status=status.HTTP_201_CREATED if created_staff else status.HTTP_400_BAD_REQUEST)


class BulkImportTemplateView(APIView):
    """
    Download CSV templates for bulk import
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, template_type):
        """Return CSV template for patients or staff"""
        
        if template_type == 'patients':
            if not request.user.role in ['admin', 'receptionist']:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
            template_data = {
                'headers': ['name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'marital_status'],
                'sample': ['John Doe', 'john.doe@email.com', '+1234567890', '1990-01-01', 'male', '123 Main St', 'single']
            }
            
        elif template_type == 'staff':
            if not request.user.role == 'admin':
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
            template_data = {
                'headers': ['first_name', 'last_name', 'email', 'phone', 'role', 'department', 'license_number'],
                'sample': ['Jane', 'Smith', 'jane.smith@hospital.com', '+1234567890', 'doctor', 'cardiology', 'MD12345']
            }
            
        else:
            return Response({'error': 'Invalid template type'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(template_data, status=status.HTTP_200_OK)
