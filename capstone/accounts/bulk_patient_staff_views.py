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
        print(f"DEBUG: Request FILES: {list(request.FILES.keys())}")
        print(f"DEBUG: Request DATA keys: {list(request.data.keys())}")
        print(f"DEBUG: Request method: {request.method}")
        
        try:
            # Handle file upload
            if 'file' in request.FILES:
                print(f"DEBUG: Processing file upload")
                return self._handle_file_upload(request.FILES['file'])
            
            # Handle JSON data (manual entry)
            elif 'data' in request.data:
                print(f"DEBUG: Processing JSON data")
                return self._handle_json_data(request.data['data'])
            
            else:
                print(f"DEBUG: No file or data found in request")
                return Response({'error': 'No file or data provided'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"DEBUG: Exception in post method: {str(e)}")
            return Response({'error': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _handle_file_upload(self, file):
        """Process CSV/Excel file upload"""
        print(f"DEBUG: _handle_file_upload called with file: {file.name}")
        print(f"DEBUG: PANDAS_AVAILABLE: {PANDAS_AVAILABLE}")
        
        if not PANDAS_AVAILABLE:
            return Response({
                'error': 'File upload not supported. Please use manual entry instead.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            print(f"DEBUG: File extension check for: {file.name}")
            # Determine file type and read accordingly
            if file.name.endswith('.csv'):
                print(f"DEBUG: Reading CSV file")
                df = pd.read_csv(file)
            elif file.name.endswith(('.xlsx', '.xls')):
                print(f"DEBUG: Reading Excel file")
                df = pd.read_excel(file)
            else:
                print(f"DEBUG: Unsupported file format: {file.name}")
                return Response({'error': 'Unsupported file format. Use CSV or Excel.'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            print(f"DEBUG: DataFrame shape: {df.shape}")
            print(f"DEBUG: DataFrame columns: {list(df.columns)}")
            
            # Replace NaN values with empty strings to prevent 'nan' strings
            df = df.fillna('')
            print(f"DEBUG: NaN values replaced with empty strings")
            
            # Convert DataFrame to list of dictionaries
            data = df.to_dict('records')
            print(f"DEBUG: Converted to {len(data)} records")
            
            return self._process_patient_data(data)
            
        except Exception as e:
            print(f"DEBUG: Exception in _handle_file_upload: {str(e)}")
            return Response({'error': f'File processing error: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
    
    def _handle_json_data(self, data):
        """Process JSON data from manual entry"""
        return self._process_patient_data(data)
    
    def _process_patient_data(self, data):
        """Process and create patient records"""
        print(f"DEBUG: _process_patient_data called with {len(data)} records")
        
        created_patients = []
        errors = []
        
        # Required fields for Patient model (updated to support new structure)
        required_fields = ['email', 'phone', 'date_of_birth']
        
        try:
            with transaction.atomic():
                for i, patient_data in enumerate(data):
                    try:
                        print(f"DEBUG: Processing patient {i+1}: {patient_data}")
                        
                        # Handle name construction - support both old and new formats
                        name = ""
                        if 'name' in patient_data and patient_data['name']:
                            # Old format - use existing name
                            name = str(patient_data['name']).strip() if patient_data['name'] else ""
                        else:
                            # New format - construct name from components
                            name_parts = []
                            if patient_data.get('first_name') and patient_data.get('first_name').strip():
                                name_parts.append(str(patient_data['first_name']).strip())
                            if patient_data.get('middle_initial') and patient_data.get('middle_initial').strip():
                                middle = str(patient_data['middle_initial']).strip()
                                if middle and not middle.endswith('.'):
                                    middle += '.'
                                name_parts.append(middle)
                            if patient_data.get('last_name') and patient_data.get('last_name').strip():
                                name_parts.append(str(patient_data['last_name']).strip())
                            if patient_data.get('suffix') and patient_data.get('suffix').strip():
                                name_parts.append(str(patient_data['suffix']).strip())
                            
                            name = ' '.join(filter(None, name_parts))
                        
                        # Validate that we have a name (either from old format or constructed)
                        if not name:
                            if not patient_data.get('first_name') or not patient_data.get('last_name'):
                                error_msg = f"Row {i+1}: Missing required fields: first_name and last_name (or name)"
                                print(f"DEBUG: {error_msg}")
                                errors.append(error_msg)
                                continue
                        
                        # Validate other required fields
                        missing_fields = [field for field in required_fields if not patient_data.get(field)]
                        if missing_fields:
                            error_msg = f"Row {i+1}: Missing required fields: {', '.join(missing_fields)}"
                            print(f"DEBUG: {error_msg}")
                            errors.append(error_msg)
                            continue
                        
                        # Clean and prepare data with proper empty value handling
                        def clean_field(value):
                            """Clean field value, returning None for empty values"""
                            if not value or str(value).strip() == '':
                                return None
                            return str(value).strip()
                        
                        clean_data = {
                            'name': name,
                            'first_name': clean_field(patient_data.get('first_name')),
                            'last_name': clean_field(patient_data.get('last_name')),
                            'middle_initial': clean_field(patient_data.get('middle_initial')),
                            'suffix': clean_field(patient_data.get('suffix')),
                            'email': clean_field(patient_data.get('email')),
                            'phone': clean_field(patient_data.get('phone')),
                            'date_of_birth': patient_data.get('date_of_birth'),
                            'gender': clean_field(patient_data.get('gender')) or 'other',
                            'address': clean_field(patient_data.get('address')),
                            'marital_status': clean_field(patient_data.get('marital_status')) or 'single',
                        }
                        
                        # Ensure email is lowercase if present
                        if clean_data['email']:
                            clean_data['email'] = clean_data['email'].lower()
                        
                        # Remove None values to avoid issues
                        clean_data = {k: v for k, v in clean_data.items() if v is not None}
                        
                        print(f"DEBUG: Clean data prepared: {clean_data}")
                        
                        # Validate date format
                        if isinstance(clean_data['date_of_birth'], str):
                            try:
                                clean_data['date_of_birth'] = datetime.strptime(clean_data['date_of_birth'], '%Y-%m-%d').date()
                            except ValueError:
                                error_msg = f"Row {i+1}: Invalid date format for date_of_birth. Use YYYY-MM-DD"
                                print(f"DEBUG: {error_msg}")
                                errors.append(error_msg)
                                continue
                        
                        # Handle optional JSON fields
                        if patient_data.get('medical_info'):
                            clean_data['medical_info'] = patient_data.get('medical_info')
                        if patient_data.get('physical_examination'):
                            clean_data['physical_examination'] = patient_data.get('physical_examination')
                        
                        # Check if patient already exists
                        if Patient.objects.filter(email=clean_data['email']).exists():
                            error_msg = f"Row {i+1}: Patient with email {clean_data['email']} already exists"
                            print(f"DEBUG: {error_msg}")
                            errors.append(error_msg)
                            continue
                        
                        # Create patient
                        print(f"DEBUG: Creating patient with data: {clean_data}")
                        patient = Patient.objects.create(**clean_data)
                        created_patients.append({
                            'id': patient.id,
                            'name': patient.name,
                            'email': patient.email
                        })
                        print(f"DEBUG: Successfully created patient {patient.id}")
                        
                    except ValidationError as e:
                        error_msg = f"Row {i+1}: Validation error - {str(e)}"
                        print(f"DEBUG: {error_msg}")
                        errors.append(error_msg)
                    except Exception as e:
                        error_msg = f"Row {i+1}: {str(e)}"
                        print(f"DEBUG: {error_msg}")
                        errors.append(error_msg)
                
        except Exception as e:
            print(f"DEBUG: Transaction failed: {str(e)}")
            return Response({'error': f'Transaction failed: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        print(f"DEBUG: Completed processing. Created: {len(created_patients)}, Errors: {len(errors)}")
        
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
            
            # Replace NaN values with empty strings to prevent 'nan' strings
            df = df.fillna('')
            
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
                        
                        # Clean and prepare data with proper empty value handling
                        def clean_field(value):
                            """Clean field value, returning empty string for empty values"""
                            if not value or str(value).strip() == '':
                                return ''
                            return str(value).strip()
                        
                        clean_data = {
                            'first_name': clean_field(staff_data.get('first_name')),
                            'last_name': clean_field(staff_data.get('last_name')),
                            'email': clean_field(staff_data.get('email')).lower(),
                            'phone': clean_field(staff_data.get('phone')),
                            'role': clean_field(staff_data.get('role')).lower(),
                            'username': clean_field(staff_data.get('email')).lower(),
                            'password': 'TempPass123!',  # Default password
                            'force_password_change': True
                        }
                        
                        # Add optional fields with empty value handling
                        department = clean_field(staff_data.get('department'))
                        if department:
                            clean_data['department'] = department
                            
                        license_number = clean_field(staff_data.get('license_number'))
                        if license_number:
                            clean_data['license_number'] = license_number
                        
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


class BulkPatientDeleteView(APIView):
    """
    Bulk delete patients with select all functionality
    """
    # Remove authentication requirement to match normal deletion pattern
    permission_classes = []
    
    def post(self, request):
        """
        Handle bulk patient deletion
        Expected data: {"patient_ids": [1, 2, 3, ...]} or {"select_all": true}
        """
        print(f"DEBUG: Bulk patient delete request received")
        print(f"DEBUG: Request data: {request.data}")
        
        # Remove permission check to match normal deletion pattern
        # if not request.user.role in ['admin', 'doctor']:
        #     return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            patient_ids = []
            
            # Handle select all
            if request.data.get('select_all'):
                print("DEBUG: Select all patients for deletion")
                patient_ids = list(Patient.objects.values_list('id', flat=True))
                print(f"DEBUG: Found {len(patient_ids)} patients to delete")
            
            # Handle specific patient IDs
            elif 'patient_ids' in request.data:
                patient_ids = request.data['patient_ids']
                print(f"DEBUG: Specific patient IDs for deletion: {patient_ids}")
            
            else:
                return Response({
                    'error': 'No patient IDs provided. Send either "patient_ids" array or "select_all": true'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not patient_ids:
                return Response({
                    'error': 'No patients found to delete'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate patient IDs exist
            existing_patients = Patient.objects.filter(id__in=patient_ids)
            existing_ids = list(existing_patients.values_list('id', flat=True))
            invalid_ids = [pid for pid in patient_ids if pid not in existing_ids]
            
            if invalid_ids:
                return Response({
                    'error': f'Invalid patient IDs: {invalid_ids}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get patient details before deletion for response
            patients_to_delete = list(existing_patients.values('id', 'name', 'email'))
            
            # Perform bulk deletion
            with transaction.atomic():
                deleted_count, deletion_details = Patient.objects.filter(id__in=patient_ids).delete()
                
                print(f"DEBUG: Deleted {deleted_count} patients")
                print(f"DEBUG: Deletion details: {deletion_details}")
            
            return Response({
                'success': True,
                'message': f'Successfully deleted {deleted_count} patients',
                'deleted_count': deleted_count,
                'deleted_patients': patients_to_delete[:10],  # Limit response size
                'deletion_details': deletion_details
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Error in bulk patient delete: {str(e)}")
            return Response({
                'error': f'Bulk deletion failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BulkStaffDeleteView(APIView):
    """
    Bulk delete staff with select all functionality
    """
    # Remove authentication requirement to match normal staff deletion
    permission_classes = []
    
    def post(self, request):
        """
        Handle bulk staff deletion
        Expected data: {"staff_ids": [1, 2, 3, ...]} or {"select_all": true}
        """
        print(f"DEBUG: Bulk staff delete request received")
        print(f"DEBUG: Request data: {request.data}")
        
        # Simplified permission check - remove user role check since normal delete doesn't have it
        # if not request.user.role == 'admin':
        #     return Response({'error': 'Permission denied. Only admins can delete staff.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            staff_ids = []
            
            # Handle select all
            if request.data.get('select_all'):
                print("DEBUG: Select all staff for deletion")
                # Get all staff IDs without excluding current user or admins (like normal delete)
                staff_ids = list(CustomUser.objects.values_list('id', flat=True))
                print(f"DEBUG: Found {len(staff_ids)} staff members to delete")
            
            # Handle specific staff IDs
            elif 'staff_ids' in request.data:
                staff_ids = request.data['staff_ids']
                print(f"DEBUG: Specific staff IDs for deletion: {staff_ids}")
                
                # Remove safety checks to match normal delete behavior
                # Safety check: don't allow deletion of current user or other admins
                # if request.user.id in staff_ids:
                #     return Response({
                #         'error': 'Cannot delete your own account'
                #     }, status=status.HTTP_400_BAD_REQUEST)
                
                # admin_ids = list(CustomUser.objects.filter(id__in=staff_ids, role='admin').values_list('id', flat=True))
                # if admin_ids:
                #     return Response({
                #         'error': f'Cannot delete admin accounts: {admin_ids}'
                #     }, status=status.HTTP_400_BAD_REQUEST)
            
            else:
                return Response({
                    'error': 'No staff IDs provided. Send either "staff_ids" array or "select_all": true'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not staff_ids:
                return Response({
                    'error': 'No staff members found to delete'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate staff IDs exist
            existing_staff = CustomUser.objects.filter(id__in=staff_ids)
            existing_ids = list(existing_staff.values_list('id', flat=True))
            invalid_ids = [sid for sid in staff_ids if sid not in existing_ids]
            
            if invalid_ids:
                return Response({
                    'error': f'Invalid staff IDs: {invalid_ids}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get staff details before deletion for response
            staff_to_delete = list(existing_staff.values('id', 'first_name', 'last_name', 'email', 'role'))
            
            # Perform bulk deletion
            with transaction.atomic():
                deleted_count, deletion_details = CustomUser.objects.filter(id__in=staff_ids).delete()
                
                print(f"DEBUG: Deleted {deleted_count} staff members")
                print(f"DEBUG: Deletion details: {deletion_details}")
            
            return Response({
                'success': True,
                'message': f'Successfully deleted {deleted_count} staff members',
                'deleted_count': deleted_count,
                'deleted_staff': staff_to_delete[:10],  # Limit response size
                'deletion_details': deletion_details
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Error in bulk staff delete: {str(e)}")
            return Response({
                'error': f'Bulk deletion failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
