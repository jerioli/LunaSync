from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CustomUserSerializer
from .models import CustomUser
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
import random
import string
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

class StaffCreateView(APIView):
    def post(self, request):
        serializer = CustomUserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Staff member created successfully!'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class DoctorListView(APIView):
    def get(self, request):
        doctors = CustomUser.objects.filter(role='doctor')
        serializer = CustomUserSerializer(doctors, many=True)
        return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user:
        return Response({
            'success': True,
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': user.role if hasattr(user, 'role') else 'doctor'
        })
    
    return Response({
        'success': False,
        'error': 'Invalid credentials'
    }, status=status.HTTP_401_UNAUTHORIZED)

class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:8080/reset-password/{uid}/{token}/"
            send_mail(
                'Password Reset - MedSync',
                f'Click the link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({'success': True, 'message': 'Password reset link sent.'})
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'No user found with this email address.'}, status=404)

class PasswordResetConfirmView(APIView):
    def post(self, request, uidb64, token):
        User = get_user_model()
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            if PasswordResetTokenGenerator().check_token(user, token):
                new_password = request.data.get('new_password')
                user.set_password(new_password)
                user.save()
                return Response({'success': True, 'message': 'Password has been reset.'})
            else:
                return Response({'success': False, 'message': 'Invalid or expired token.'}, status=400)
        except Exception:
            return Response({'success': False, 'message': 'Invalid request.'}, status=400)

class StaffLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({
                'error': 'Please provide both email and password'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
            return Response({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.name,
                    'role': user.role
                }
            })
        
        return Response({
            'success': False,
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)