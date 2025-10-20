from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import qr
from .textract_lab_analysis import textract_lab_analysis, health_check
from .health import HealthCheckView

# Create router and register viewsets
router = DefaultRouter()

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # AWS credentials management endpoints
    path('aws-credentials/status/', views.aws_credentials_status, name='aws_credentials_status'),
    path('aws-credentials/test/', views.test_aws_connection, name='test_aws_connection'),
    
    # Textract endpoints
    path('textract/upload/', textract_lab_analysis, name='textract_upload'),
    path('textract/health/', health_check, name='textract_health_check'),
    
    # System health check endpoint
    path('health/', HealthCheckView.as_view(), name='system_health_check'),

    # QR code for prescription
    path('prescriptions/<uuid:prescription_id>/qr/', qr.prescription_qr, name='prescription_qr'),

    # Minimal public prescription detail page
    path('prescriptions/<uuid:prescription_id>/', views.prescription_detail, name='prescription_detail'),
]
