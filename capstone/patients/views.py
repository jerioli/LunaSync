from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Patient
from .serializer import PatientSerializer
from django.http import Http404
from systemlogs.audit_logger import AuditLogger
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class PatientListCreateView(APIView):
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
        
        patients = Patient.objects.all()
        serializer = PatientSerializer(patients, many=True)
        
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
        
        serializer = PatientSerializer(data=request.data)
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
        
        patients = Patient.objects.all()
        serializer = PatientSerializer(patients, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class PatientDetailView(APIView):
    permission_classes = [IsAuthenticated]
    def get_object(self, pk):
        try:
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
        serializer = PatientSerializer(patient)
        
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
        
        serializer = PatientSerializer(patient, data=request.data)
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
        
        # Log patient deletion
        AuditLogger.log_patient_action(
            user=request.user if request.user.is_authenticated else None,
            action='DELETE',
            patient_id=patient.id,
            patient_name=patient_name,
            description=f"Deleted patient: {patient_name}",
            request=request
        )
        
        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name='dispatch')
class CheckPatientByEmailView(APIView):
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
