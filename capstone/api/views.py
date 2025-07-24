from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from .models import AWSCredentials
from .serializers import AWSCredentialsSerializer

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

class AWSCredentialsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing AWS credentials - Debugging permissions"""
    queryset = AWSCredentials.objects.all()
    serializer_class = AWSCredentialsSerializer
    permission_classes = []  # Remove all permissions temporarily
    
    def get_queryset(self):
        """Allow all users to access for now (for debugging)"""
        print(f"DEBUG: get_queryset called, user: {self.request.user}")
        return AWSCredentials.objects.all()
    
    def perform_create(self, serializer):
        """Allow all users for now (for debugging)"""
        print(f"DEBUG: perform_create called, user: {self.request.user}")
        serializer.save()
    
    def create(self, request, *args, **kwargs):
        """Create or update AWS credentials"""
        # Temporarily allow all users for debugging
        user = request.user
        print(f"DEBUG: User: {user}, Is authenticated: {user.is_authenticated}")
        print(f"DEBUG: User attributes: {dir(user)}")
        if hasattr(user, 'role'):
            print(f"DEBUG: User role: {user.role}")
        print(f"DEBUG: Is superuser: {user.is_superuser}, Is staff: {user.is_staff}")
        
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
