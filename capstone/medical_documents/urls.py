from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MedicalDocumentViewSet, LabResultViewSet, SOAPNoteViewSet,
    PrescriptionViewSet, ClinicalNoteViewSet, MedicalCertificateViewSet,
    PhysicalExaminationViewSet, send_medical_certificate_email_endpoint,
    prescription_requests_endpoint, medical_certificates_endpoint,
    approve_prescription_endpoint, approve_medical_certificate_endpoint,
    create_prescription_endpoint
)

router = DefaultRouter()
router.register(r'documents', MedicalDocumentViewSet)
router.register(r'lab-results', LabResultViewSet)
router.register(r'soap-notes', SOAPNoteViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'clinical-notes', ClinicalNoteViewSet)
router.register(r'medical-certificates', MedicalCertificateViewSet)
router.register(r'physical-examinations', PhysicalExaminationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('send-medical-certificate-email/', send_medical_certificate_email_endpoint, name='send-medical-certificate-email'),
    path('prescription-requests/', prescription_requests_endpoint, name='prescription-requests'),
    path('medical-certificates/', medical_certificates_endpoint, name='medical-certificates'), 
    path('prescription-requests/<int:request_id>/approve/', approve_prescription_endpoint, name='approve-prescription'),
    path('medical-certificates/<int:request_id>/approve/', approve_medical_certificate_endpoint, name='approve-medical-certificate'),
    path('create-prescription/', create_prescription_endpoint, name='create-prescription'),
]
