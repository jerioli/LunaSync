from django.urls import path
from . import views

urlpatterns = [
    path('medical-certificates/', views.medical_certificates, name='medical_certificates'),
    path('medical-certificates/<int:request_id>/approve/', views.approve_medical_certificate, name='approve_medical_certificate'),
    path('send-medical-certificate-email/', views.send_medical_certificate_email_endpoint, name='send_medical_certificate_email'),
    path('prescription-requests/', views.prescription_requests, name='prescription_requests'),
    path('prescription-requests/<int:request_id>/approve/', views.approve_prescription, name='approve_prescription'),
]
