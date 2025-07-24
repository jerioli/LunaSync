from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .textract_lab_analysis import textract_lab_analysis, health_check

# Create router and register viewsets
router = DefaultRouter()
router.register(r'aws-credentials', views.AWSCredentialsViewSet, basename='aws-credentials')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Simple test endpoint for AWS credentials
    path('aws-credentials-test/', views.aws_credentials_test, name='aws_credentials_test'),
    
    # Textract endpoints
    path('textract/upload/', textract_lab_analysis, name='textract_upload'),
    path('textract/health/', health_check, name='textract_health_check'),
]
