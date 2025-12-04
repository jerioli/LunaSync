from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Patient
from .serializer import PatientSerializer
from django.http import Http404
from systemlogs.audit_logger import AuditLogger
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from capstone.settings import CsrfExemptSessionAuthentication

@method_decorator(csrf_exempt, name='dispatch')
class PatientListCreateView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        print(f"[DEBUG] PatientListCreateView GET - User: {request.user}")
        print(f"[DEBUG] User authenticated: {request.user.is_authenticated}")
        print(f"[DEBUG] User type: {type(request.user)}")
        print(f"[DEBUG] Session: {dict(request.session)}")
        
        # Check if user has permission to view patients
        if not request.user.is_authenticated:
            print("[DEBUG] User not authenticated - returning 401")
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to view patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_patients or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        search_term = request.GET.get('search', '').strip()
        ordering = request.GET.get('ordering', 'name')
        limit = request.GET.get('limit')
        
        # Start with all patients
        patients = Patient.objects.all()
        
        # Apply search filter if search term provided
        if search_term:
            from django.db.models import Q
            
            # Get all patients first (for encrypted field searching)
            all_patients = Patient.objects.all()
            matching_ids = []
            
            # Search term splitting for multi-word searches
            search_terms = [term.lower().strip() for term in search_term.split()]
            
            for patient in all_patients:
                # Get decrypted values
                name = (patient.name or '').lower()
                first_name = (patient.first_name or '').lower()
                last_name = (patient.last_name or '').lower()
                email = (patient.email or '').lower()
                phone = (patient.phone or '').lower()
                
                # Check if all search terms match in any field
                matches_all = True
                for term in search_terms:
                    term_matches = (
                        term in name or 
                        term in first_name or 
                        term in last_name or 
                        term in email or 
                        term in phone
                    )
                    if not term_matches:
                        matches_all = False
                        break
                
                if matches_all:
                    matching_ids.append(patient.id)
            
            # Filter patients by matching IDs
            patients = patients.filter(id__in=matching_ids)
        
        # Apply ordering
        if ordering == 'name':
            patients = patients.order_by('name')
        elif ordering == '-name':
            patients = patients.order_by('-name')
        elif ordering == 'email':
            patients = patients.order_by('email')
        else:
            patients = patients.order_by('name')  # Default to name ordering
        
        # Apply limit if provided
        if limit:
            try:
                limit_int = int(limit)
                patients = patients[:limit_int]
            except (ValueError, TypeError):
                pass  # Ignore invalid limit values
        
        serializer = PatientSerializer(patients, many=True, context={'request': request})
        
        # Log read action
        AuditLogger.log_action(
            user=request.user if request.user.is_authenticated else None,
            action='READ',
            resource_type='PATIENT',
            description='Viewed patient list',
            details={'count': len(patients)},
            request=request
        )
        
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        # Check if user has permission to create patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to create patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_patients or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to create patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PatientSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            patient = serializer.save()
            
            # Log patient creation
            AuditLogger.log_patient_action(
                user=request.user if request.user.is_authenticated else None,
                action='CREATE',
                patient_id=patient.id,
                patient_name=patient.name,
                description=f"Created new patient: {patient.name}",
                details={'patient_data': serializer.data},
                request=request
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  # Return validation errors
    
 
@method_decorator(csrf_exempt, name='dispatch')
class PatientListView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check if user has permission to view patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to view patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_patients or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        search_term = request.GET.get('search', '').strip()
        ordering = request.GET.get('ordering', 'name')
        limit = request.GET.get('limit')
        
        # Start with all patients
        patients = Patient.objects.all()
        
        # Apply search filter if search term provided
        if search_term:
            from django.db.models import Q
            
            # Get all patients first (for encrypted field searching)
            all_patients = Patient.objects.all()
            matching_ids = []
            
            # Search term splitting for multi-word searches
            search_terms = [term.lower().strip() for term in search_term.split()]
            
            for patient in all_patients:
                # Get decrypted values
                name = (patient.name or '').lower()
                first_name = (patient.first_name or '').lower()
                last_name = (patient.last_name or '').lower()
                email = (patient.email or '').lower()
                phone = (patient.phone or '').lower()
                
                # Check if all search terms match in any field
                matches_all = True
                for term in search_terms:
                    term_matches = (
                        term in name or 
                        term in first_name or 
                        term in last_name or 
                        term in email or 
                        term in phone
                    )
                    if not term_matches:
                        matches_all = False
                        break
                
                if matches_all:
                    matching_ids.append(patient.id)
            
            # Filter patients by matching IDs
            patients = patients.filter(id__in=matching_ids)
        
        # Apply ordering
        if ordering == 'name':
            patients = patients.order_by('name')
        elif ordering == '-name':
            patients = patients.order_by('-name')
        elif ordering == 'email':
            patients = patients.order_by('email')
        else:
            patients = patients.order_by('name')  # Default to name ordering
        
        # Apply limit if provided
        if limit:
            try:
                limit_int = int(limit)
                patients = patients[:limit_int]
            except (ValueError, TypeError):
                pass  # Ignore invalid limit values
        
        serializer = PatientSerializer(patients, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class PatientDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        try:
            # Use the custom manager to exclude deleted patients
            return Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        # Check if user has permission to view patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to view patient details'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_patients or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view patient details'
            }, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_object(pk)
        serializer = PatientSerializer(patient, context={'request': request})
        
        # Log patient view
        AuditLogger.log_patient_action(
            user=request.user if request.user.is_authenticated else None,
            action='READ',
            patient_id=patient.id,
            patient_name=patient.name,
            description=f"Viewed patient details: {patient.name}",
            request=request
        )
        
        return Response(serializer.data)

    def put(self, request, pk):
        # Check if user has permission to update patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to update patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_patients or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to update patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_object(pk)
        
        # Store old values for audit log
        old_serializer = PatientSerializer(patient)
        old_values = old_serializer.data
        
        # Debug logging for the update request
        print(f"[DEBUG] Patient UPDATE - ID: {pk}")
        print(f"[DEBUG] Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'No keys'}")
        print(f"[DEBUG] Medical info type: {type(request.data.get('medical_info'))} - Value: {request.data.get('medical_info')}")
        print(f"[DEBUG] Physical exam type: {type(request.data.get('physical_examination'))} - Value: {request.data.get('physical_examination')}")
        
        serializer = PatientSerializer(patient, data=request.data, context={'request': request})
        if serializer.is_valid():
            updated_patient = serializer.save()
            
            # Log patient update
            AuditLogger.log_patient_action(
                user=request.user if request.user.is_authenticated else None,
                action='UPDATE',
                patient_id=patient.id,
                patient_name=updated_patient.name,
                description=f"Updated patient: {updated_patient.name}",
                old_values=old_values,
                new_values=serializer.data,
                request=request
            )
            
            return Response(serializer.data)
        else:
            # Enhanced error logging
            print(f"[DEBUG] Patient UPDATE validation errors: {serializer.errors}")
            for field, errors in serializer.errors.items():
                print(f"[DEBUG] Field '{field}' errors: {errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        # Check if user has permission to delete patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to delete patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_patients or request.user.role in ['admin', 'superadmin']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to delete patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_object(pk)
        patient_name = patient.name
        
        # Perform soft delete instead of hard delete
        patient.soft_delete()
        
        # Log patient soft deletion
        AuditLogger.log_patient_action(
            user=request.user if request.user.is_authenticated else None,
            action='SOFT_DELETE',
            patient_id=patient.id,
            patient_name=patient_name,
            description=f"Soft deleted patient: {patient_name}",
            details={'deleted_at': patient.deleted_at.isoformat() if patient.deleted_at else None},
            request=request
        )
        
        return Response({
            'success': True,
            'message': f'Patient {patient_name} has been deleted successfully'
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class CheckPatientByEmailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    """
    Check if a patient exists by email address.
    Used by chatbot to recognize returning patients.
    """
    
    def get(self, request):
        email = request.query_params.get('email')
        
        if not email:
            return Response({
                'error': 'Email parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            patient = Patient.objects.get(email=email)
            serializer = PatientSerializer(patient)
            
            # Log the lookup action
            AuditLogger.log_action(
                user=request.user if request.user.is_authenticated else None,
                action='READ',
                resource_type='PATIENT',
                description=f'Checked existing patient by email: {email}',
                details={'patient_id': patient.id, 'patient_name': patient.name},
                request=request
            )
            
            return Response({
                'exists': True,
                'patient': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Patient.DoesNotExist:
            # Log the lookup attempt
            AuditLogger.log_action(
                user=request.user if request.user.is_authenticated else None,
                action='READ',
                resource_type='PATIENT',
                description=f'Checked for non-existing patient by email: {email}',
                details={'email': email},
                request=request
            )
            
            return Response({
                'exists': False,
                'patient': None
            }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class CheckPatientByPatientIdView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]  # Allow public access for chatbot patient lookup
    """
    Check if a patient exists by Patient ID.
    Used by chatbot to recognize returning patients.
    """
    
    def get(self, request):
        patient_id = request.query_params.get('patient_id')
        
        if not patient_id:
            return Response({
                'error': 'Patient ID parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            patient = Patient.objects.get(patient_id=patient_id)
            
            # Create a special context that allows patient data to be decrypted 
            # when patient_id is provided (treat patient_id as authentication for that patient)
            special_context = {'request': request, 'allow_patient_id_auth': True, 'patient_id_lookup': patient_id}
            serializer = PatientSerializer(patient, context=special_context)
            
            # Log the lookup action
            AuditLogger.log_action(
                user=request.user if request.user.is_authenticated else None,
                action='READ',
                resource_type='PATIENT',
                description=f'Checked existing patient by Patient ID: {patient_id}',
                details={'patient_id': patient.id, 'patient_name': patient.name, 'patient_unique_id': patient_id},
                request=request
            )
            
            return Response({
                'exists': True,
                'patient': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Patient.DoesNotExist:
            # Log the lookup attempt
            AuditLogger.log_action(
                user=request.user if request.user.is_authenticated else None,
                action='READ',
                resource_type='PATIENT',
                description=f'Checked for non-existing patient by Patient ID: {patient_id}',
                details={'patient_id': patient_id},
                request=request
            )
            
            return Response({
                'exists': False,
                'patient': None
            }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class PatientDetailByPatientIdView(APIView):
    """Get patient details by patient_id instead of database ID"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_object(self, patient_id):
        try:
            return Patient.objects.get(patient_id=patient_id)
        except Patient.DoesNotExist:
            raise Http404

    def get(self, request, patient_id):
        # Check if user has permission to view patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to view patient details'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.can_manage_patients or request.user.role in ['admin', 'superadmin', 'doctor', 'receptionist']):
            return Response({
                'error': 'Permission denied',
                'message': 'You do not have permission to view patient details'
            }, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_object(patient_id)
        serializer = PatientSerializer(patient, context={'request': request})
        
        # Log patient view
        AuditLogger.log_patient_action(
            user=request.user if request.user.is_authenticated else None,
            action='READ',
            patient_id=patient.id,
            patient_name=patient.name,
            description=f"Viewed patient details by patient_id: {patient_id}",
            request=request
        )
        
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class DeletedPatientsView(APIView):
    """View for administrators to see and restore deleted patients"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Only allow admin/superadmin to view deleted patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to view deleted patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.role in ['admin', 'superadmin']):
            return Response({
                'error': 'Permission denied',
                'message': 'Only administrators can view deleted patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get all deleted patients
        deleted_patients = Patient.objects.deleted_only()
        serializer = PatientSerializer(deleted_patients, many=True, context={'request': request})
        
        # Log the action
        AuditLogger.log_action(
            user=request.user,
            action='READ',
            resource_type='PATIENT',
            description='Viewed deleted patients list',
            details={'count': len(deleted_patients)},
            request=request
        )
        
        return Response(serializer.data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch') 
class RestorePatientView(APIView):
    """View to restore a soft-deleted patient"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        # Only allow admin/superadmin to restore patients
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to restore patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.role in ['admin', 'superadmin']):
            return Response({
                'error': 'Permission denied',
                'message': 'Only administrators can restore patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get the deleted patient using the all_including_deleted manager
            patient = Patient.objects.all_including_deleted().get(pk=pk, is_deleted=True)
        except Patient.DoesNotExist:
            return Response({
                'error': 'Patient not found',
                'message': 'Deleted patient with this ID does not exist'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Restore the patient
        patient.restore()
        
        # Log the restoration
        AuditLogger.log_patient_action(
            user=request.user,
            action='RESTORE',
            patient_id=patient.id,
            patient_name=patient.name,
            description=f"Restored patient: {patient.name}",
            details={'restored_at': timezone.now().isoformat()},
            request=request
        )
        
        serializer = PatientSerializer(patient, context={'request': request})
        return Response({
            'success': True,
            'message': f'Patient {patient.name} has been restored successfully',
            'patient': serializer.data
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class PatientLookupView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]  # Allow anonymous access for patient lookup
    
    def post(self, request):
        try:
            from difflib import SequenceMatcher
            from django.db import models
            
            full_name = request.data.get('full_name', '').strip()
            date_of_birth = request.data.get('date_of_birth', '').strip()
            email = request.data.get('email', '').strip()
            phone = request.data.get('phone', '').strip()
            
            # Validate required fields
            if not all([full_name, date_of_birth, email, phone]):
                return Response({
                    'status': 'error',
                    'message': 'All fields are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Try to construct the full name from separate fields if needed
            # Split the full name for more flexible matching
            name_parts = full_name.lower().split()
            
            # Since email, phone, and name fields are encrypted, we need to check all patients
            # with the matching date_of_birth first, then compare decrypted values
            potential_matches = Patient.objects.filter(
                date_of_birth=date_of_birth,
                is_deleted=False  # Only check non-deleted patients
            )
            
            print(f"[DEBUG] Found {potential_matches.count()} patients with date_of_birth: {date_of_birth}")
            
            # Check each potential match for exact email and phone match
            for patient in potential_matches:
                try:
                    # Compare decrypted email and phone
                    patient_email = str(patient.email).lower().strip() if patient.email else ''
                    patient_phone = str(patient.phone).strip() if patient.phone else ''
                    
                    print(f"[DEBUG] Checking patient {patient.patient_id}: email='{patient_email}', phone='{patient_phone}'")
                    
                    # Check for exact match on email and phone
                    if patient_email == email.lower().strip() and patient_phone == phone.strip():
                        # Also check name match
                        patient_first = str(patient.first_name).strip() if patient.first_name else ''
                        patient_middle = str(patient.middle_initial).strip() if patient.middle_initial else ''
                        patient_last = str(patient.last_name).strip() if patient.last_name else ''
                        patient_suffix = str(patient.suffix).strip() if patient.suffix else ''
                        
                        patient_full_name = f"{patient_first} {patient_middle} {patient_last} {patient_suffix}".strip()
                        patient_full_name = ' '.join(patient_full_name.split())  # Remove extra spaces
                        
                        print(f"[DEBUG] Patient full name: '{patient_full_name}' vs lookup: '{full_name}'")
                        
                        if patient_full_name.lower() == full_name.lower():
                            print(f"[DEBUG] EXACT MATCH found for patient {patient.patient_id}")
                            return Response({
                                'status': 'match',
                                'patient_id': patient.patient_id,
                                'message': 'Patient found successfully'
                            })
                except Exception as decrypt_error:
                    print(f"[DEBUG] Error decrypting patient {patient.patient_id}: {decrypt_error}")
                    continue
            
            # Partial match search - check all patients with same date_of_birth
            # and look for similar email, phone, or name
            partial_candidates = []
            
            for patient in potential_matches:
                try:
                    patient_email = str(patient.email).lower().strip() if patient.email else ''
                    patient_phone = str(patient.phone).strip() if patient.phone else ''
                    patient_first = str(patient.first_name).strip() if patient.first_name else ''
                    patient_last = str(patient.last_name).strip() if patient.last_name else ''
                    patient_middle = str(patient.middle_initial).strip() if patient.middle_initial else ''
                    patient_suffix = str(patient.suffix).strip() if patient.suffix else ''
                    
                    patient_full_name = f"{patient_first} {patient_middle} {patient_last} {patient_suffix}".strip()
                    patient_full_name = ' '.join(patient_full_name.split())  # Remove extra spaces
                    
                    # Check for partial matches
                    email_match = patient_email == email.lower().strip()
                    phone_match = patient_phone == phone.strip()
                    
                    # Calculate name similarity
                    name_similarity = SequenceMatcher(None, full_name.lower(), patient_full_name.lower()).ratio()
                    
                    # If email OR phone matches, or name similarity is high
                    if email_match or phone_match or name_similarity > 0.7:
                        partial_candidates.append({
                            'patient': patient,
                            'similarity': name_similarity,
                            'email_match': email_match,
                            'phone_match': phone_match,
                            'full_name': patient_full_name
                        })
                        
                except Exception as decrypt_error:
                    print(f"[DEBUG] Error processing patient {patient.patient_id}: {decrypt_error}")
                    continue
            
            print(f"[DEBUG] Found {len(partial_candidates)} partial match candidates")
            
            # If exactly one partial match, suggest it
            if len(partial_candidates) == 1:
                candidate = partial_candidates[0]
                patient = candidate['patient']
                suggestion = f"Name: {candidate['full_name']}, Email: {patient.email}"
                
                return Response({
                    'status': 'partial_match',
                    'patient_id': patient.patient_id,
                    'suggestion': suggestion,
                    'message': 'Similar patient found'
                })
            
            # Multiple partial matches found
            elif len(partial_candidates) > 1:
                return Response({
                    'status': 'multiple_match',
                    'message': 'Multiple patients found with similar details'
                })
            
            # No matches found
            return Response({
                'status': 'no_match',
                'message': 'No patient found with the provided details'
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'An error occurred during lookup: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PatientRedFlagView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        try:
            return Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            raise Http404

    def post(self, request, pk):
        """Set red flag for a patient"""
        # Check if user has permission (only doctors can flag patients)
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to flag patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.role in ['doctor', 'admin', 'superadmin']):
            return Response({
                'error': 'Permission denied',
                'message': 'Only doctors can flag patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_object(pk)
        reason = request.data.get('reason', '').strip()
        
        if not reason:
            return Response({
                'error': 'Reason required',
                'message': 'A reason must be provided when flagging a patient'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set red flag
        patient.set_red_flag(reason, request.user)
        
        # Log the action
        AuditLogger.log_patient_action(
            user=request.user,
            action='FLAG',
            patient_id=patient.id,
            patient_name=patient.name,
            description=f"Red flagged patient: {patient.name}. Reason: {reason}",
            request=request
        )
        
        # Return updated patient data
        serializer = PatientSerializer(patient, context={'request': request})
        return Response({
            'success': True,
            'message': 'Patient flagged successfully',
            'patient': serializer.data
        })

    def delete(self, request, pk):
        """Clear red flag for a patient"""
        # Check if user has permission (only doctors can unflag patients)
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'You must be logged in to unflag patients'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if not (request.user.role in ['doctor', 'admin', 'superadmin']):
            return Response({
                'error': 'Permission denied',
                'message': 'Only doctors can unflag patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_object(pk)
        
        if not patient.is_red_flagged:
            return Response({
                'error': 'Not flagged',
                'message': 'Patient is not currently flagged'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Store reason for audit log
        old_reason = patient.red_flag_reason
        
        # Clear red flag
        patient.clear_red_flag()
        
        # Log the action
        AuditLogger.log_patient_action(
            user=request.user,
            action='UNFLAG',
            patient_id=patient.id,
            patient_name=patient.name,
            description=f"Cleared red flag for patient: {patient.name}. Previous reason: {old_reason}",
            request=request
        )
        
        # Return updated patient data
        serializer = PatientSerializer(patient, context={'request': request})
        return Response({
            'success': True,
            'message': 'Patient flag cleared successfully',
            'patient': serializer.data
        })
