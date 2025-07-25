from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class TestAuthView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Simple test endpoint to verify JWT authentication is working
        """
        return Response({
            'message': 'Authentication working!',
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'role': getattr(request.user, 'role', 'No role'),
                'is_authenticated': request.user.is_authenticated
            }
        }, status=status.HTTP_200_OK)
