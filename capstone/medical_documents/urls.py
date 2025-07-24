from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MedicalDocumentViewSet, LabResultViewSet, SOAPNoteViewSet,
    PrescriptionViewSet, ClinicalNoteViewSet, MedicalCertificateViewSet,
    PhysicalExaminationViewSet
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
    path('api/medical-documents/', include(router.urls)),
]
