"""
URL configuration for capstone project    path('api/medical-documents/', include('medical_documents.urls')),  # Medical documents API
    # path('api/', include('medical_requests.urls_test')),  # Test URLs to debug circular import - DISABLED
    # Note: medical_requests app email functionality is now available through medical_documents API endpoints
The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# Remove admin import since we're not using Django admin
# from django.contrib import admin
from django.urls import path
from appointments.views import AppointmentCreateView
from .api.views import login_view
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from medical_documents.views import (
    prescription_requests_endpoint, medical_certificates_endpoint,
    approve_prescription_endpoint, approve_medical_certificate_endpoint
)

urlpatterns = [
    # Remove admin URL since we're using custom frontend
    # path('admin/', admin.site.urls),
    
    path('api/login/', login_view),
    path('api/', include('accounts.urls')),
    path('api/appointments/', include('appointments.urls')),  # Include appointments URLs
    path('api/', include('patients.urls')),
    path('api/availability/', include('doctor_availability.urls')),
    path('api/clinic/', include('clinic.urls')),
    path('api/clinics/', include('clinic.urls')),  # Add plural version for frontend compatibility
    path('api/', include('api.urls')),  # API endpoints including AWS credentials and textract
    path('api/ocr/', include('api.urls_ocr')),  # OCR API endpoints
    # path('api/textract/', include('api.textract_urls')),  # DISABLED - Conflicts with api.urls textract endpoint
    path('api/medical-documents/', include('medical_documents.urls')),  # Medical documents API
    # path('api/', include('medical_requests.urls_test')),  # Test URLs to debug circular import
    # Note: medical_requests app email functionality is now available through medical_documents API endpoints
    
    # Add the prescription and medical certificate endpoints directly
    path('api/prescription-requests/', prescription_requests_endpoint, name='prescription_requests'),
    path('api/prescription-requests/<int:request_id>/approve/', approve_prescription_endpoint, name='approve_prescription'),
    path('api/medical-certificates/', medical_certificates_endpoint, name='medical_certificates_direct'),
    path('api/medical-certificates/<int:request_id>/approve/', approve_medical_certificate_endpoint, name='approve_medical_certificate_direct'),
    
    path('', include('security_app.urls')),  # Security API endpoints
    path('api/', include('systemlogs.urls')),  # Audit logging system
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
