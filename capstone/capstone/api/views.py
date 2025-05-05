from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from rest_framework.decorators import api_view
from rest_framework.response import Response
@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    role = request.data.get('role') 
    user = authenticate(username=email, password=password, role=role)  # ✅ use the actual model field

    if user is not None:
        return Response({
            "success": True,
            "name": user.get_full_name(),
            "email": user.email,
            "role": user.role  # ✅ use the actual model field
        })

    return Response({"success": False, "error": "Invalid credentials"}, status=401)
