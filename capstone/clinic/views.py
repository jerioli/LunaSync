from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import ClinicSettings
from .serializers import ClinicSettingsSerializer

class ClinicBrandingView(APIView):
    def get(self, request):
        settings = ClinicSettings.objects.first()
        serializer = ClinicSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = ClinicSettings.objects.first()
        serializer = ClinicSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 