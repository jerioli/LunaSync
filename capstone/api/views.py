from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import AWSCredentials
from .serializers import AWSCredentialsSerializer

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

@api_view(['GET', 'POST'])
@permission_classes([])  # No permissions for testing
def aws_credentials_test(request):
    """Simple test view for AWS credentials"""
    if request.method == 'GET':
        credentials = AWSCredentials.objects.all()
        serializer = AWSCredentialsSerializer(credentials, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        print(f"DEBUG: POST request received, user: {request.user}")
        serializer = AWSCredentialsSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class AWSCredentialsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing AWS credentials - Admin access only"""
    queryset = AWSCredentials.objects.all()
    serializer_class = AWSCredentialsSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        """Get all AWS credentials for admin users"""
        return AWSCredentials.objects.all()
    
    def perform_create(self, serializer):
        """Create AWS credentials"""
        serializer.save()
    
    def create(self, request, *args, **kwargs):
        """Create or update AWS credentials"""
        # Check if active credentials already exist
        active_credentials = AWSCredentials.objects.filter(is_active=True).first()
        
        if active_credentials:
            # Update existing active credentials
            serializer = self.get_serializer(active_credentials, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Create new credentials
            return super().create(request, *args, **kwargs)
    
    def list(self, request, *args, **kwargs):
        """List AWS credentials (without secret keys)"""
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active AWS configuration"""
        active_config = AWSCredentials.get_active_credentials()
        if active_config:
            serializer = self.get_serializer(active_config)
            return Response(serializer.data)
        return Response({'detail': 'No active AWS configuration found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test the AWS credentials by making a simple API call"""
        credentials = self.get_object()
        try:
            import boto3
            client = boto3.client(
                'textract',
                aws_access_key_id=credentials.aws_access_key_id,
                aws_secret_access_key=credentials.aws_secret_access_key,
                region_name=credentials.aws_region
            )
            # Test by accessing client properties
            region = client.meta.region_name
            return Response({
                'status': 'success',
                'message': f'Successfully connected to AWS Textract in region {region}',
                'region': region
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Failed to connect to AWS: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
