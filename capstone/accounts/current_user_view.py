from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import CustomUserSerializer

class CurrentUserView(APIView):
    """Get current user with all permissions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = CustomUserSerializer(request.user, context={'request': request})
        return Response({
            'success': True,
            'user': serializer.data
        })
