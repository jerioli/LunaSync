# Bulk Import Views for Django Backend
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.db import transaction
import pandas as pd
import io
import csv
from .models import CustomUser
from .serializers import CustomUserSerializer

class BulkUserImportView(APIView):
    """
    Bulk import users from CSV/Excel file
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'error': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        file_extension = file.name.split('.')[-1].lower()
        
        try:
            # Read file based on extension
            if file_extension == 'csv':
                df = pd.read_csv(file)
            elif file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file)
            else:
                return Response({
                    'success': False,
                    'error': 'Unsupported file format. Please use CSV or Excel (.xlsx, .xls)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate required columns
            required_columns = ['email', 'first_name', 'last_name', 'role']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return Response({
                    'success': False,
                    'error': f'Missing required columns: {", ".join(missing_columns)}',
                    'required_columns': required_columns,
                    'found_columns': list(df.columns)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process data
            results = {
                'total_rows': len(df),
                'successful_imports': 0,
                'failed_imports': 0,
                'errors': [],
                'imported_users': []
            }
            
            with transaction.atomic():
                for index, row in df.iterrows():
                    try:
                        # Prepare user data
                        user_data = {
                            'email': str(row['email']).strip(),
                            'first_name': str(row['first_name']).strip(),
                            'last_name': str(row['last_name']).strip(),
                            'role': str(row['role']).strip().lower(),
                            'username': str(row['email']).strip(),  # Use email as username
                            'phone': str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else '',
                            'password': 'TempPass123!',  # Default password
                            'force_password_change': True
                        }
                        
                        # Validate role
                        valid_roles = ['admin', 'doctor', 'receptionist']
                        if user_data['role'] not in valid_roles:
                            raise ValidationError(f"Invalid role: {user_data['role']}. Must be one of: {', '.join(valid_roles)}")
                        
                        # Check if user already exists
                        if CustomUser.objects.filter(email=user_data['email']).exists():
                            raise ValidationError(f"User with email {user_data['email']} already exists")
                        
                        # Create user
                        serializer = CustomUserSerializer(data=user_data)
                        if serializer.is_valid():
                            user = serializer.save()
                            results['successful_imports'] += 1
                            results['imported_users'].append({
                                'row': index + 1,
                                'email': user.email,
                                'name': f"{user.first_name} {user.last_name}",
                                'role': user.role
                            })
                        else:
                            raise ValidationError(f"Validation error: {serializer.errors}")
                            
                    except Exception as e:
                        results['failed_imports'] += 1
                        results['errors'].append({
                            'row': index + 1,
                            'email': row.get('email', 'Unknown'),
                            'error': str(e)
                        })
            
            return Response({
                'success': True,
                'message': f'Bulk import completed. {results["successful_imports"]} users imported, {results["failed_imports"]} failed.',
                'results': results
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'File processing error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BulkUserManualView(APIView):
    """
    Bulk create users from manual form data
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        users_data = request.data.get('users', [])
        
        if not users_data or not isinstance(users_data, list):
            return Response({
                'success': False,
                'error': 'No users data provided or invalid format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        results = {
            'total_users': len(users_data),
            'successful_imports': 0,
            'failed_imports': 0,
            'errors': [],
            'imported_users': []
        }
        
        try:
            with transaction.atomic():
                for index, user_data in enumerate(users_data):
                    try:
                        # Set defaults
                        user_data['username'] = user_data.get('email', '')
                        user_data['password'] = user_data.get('password', 'TempPass123!')
                        user_data['force_password_change'] = True
                        
                        # Validate required fields
                        required_fields = ['email', 'first_name', 'last_name', 'role']
                        for field in required_fields:
                            if not user_data.get(field):
                                raise ValidationError(f"Missing required field: {field}")
                        
                        # Check if user exists
                        if CustomUser.objects.filter(email=user_data['email']).exists():
                            raise ValidationError(f"User with email {user_data['email']} already exists")
                        
                        # Create user
                        serializer = CustomUserSerializer(data=user_data)
                        if serializer.is_valid():
                            user = serializer.save()
                            results['successful_imports'] += 1
                            results['imported_users'].append({
                                'index': index,
                                'email': user.email,
                                'name': f"{user.first_name} {user.last_name}",
                                'role': user.role
                            })
                        else:
                            raise ValidationError(f"Validation error: {serializer.errors}")
                            
                    except Exception as e:
                        results['failed_imports'] += 1
                        results['errors'].append({
                            'index': index,
                            'email': user_data.get('email', 'Unknown'),
                            'error': str(e)
                        })
            
            return Response({
                'success': True,
                'message': f'Bulk creation completed. {results["successful_imports"]} users created, {results["failed_imports"]} failed.',
                'results': results
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Bulk creation error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BulkTemplateDownloadView(APIView):
    """
    Download CSV template for bulk import
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from django.http import HttpResponse
        
        # Create CSV template
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="bulk_import_template.csv"'
        
        writer = csv.writer(response)
        
        # Write headers
        writer.writerow([
            'email',
            'first_name', 
            'last_name',
            'role',
            'phone'
        ])
        
        # Write sample data
        writer.writerow([
            'doctor1@clinic.com',
            'John',
            'Doe',
            'doctor',
            '09123456789'
        ])
        writer.writerow([
            'receptionist1@clinic.com',
            'Jane',
            'Smith',
            'receptionist',
            '09987654321'
        ])
        writer.writerow([
            'admin1@clinic.com',
            'Admin',
            'User',
            'admin',
            '09555123456'
        ])
        
        return response
