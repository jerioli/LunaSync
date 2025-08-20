from django.urls import path
from .views import PatientListCreateView, PatientListView, PatientDetailView, CheckPatientByEmailView

urlpatterns = [
    path('patients/', PatientListCreateView.as_view(), name='patient-list-create'),  # GET/POST
    path('patients/<int:pk>/', PatientDetailView.as_view(), name='patient-detail'),  # GET/PUT/DELETE
    path('patients/list/', PatientListView.as_view(), name='patient-list'),          # Custom GET
    path('patients/check-email/', CheckPatientByEmailView.as_view(), name='patient-check-email'),  # Check if patient exists by email
]
