from django.urls import path
from .views import PatientListCreateView, PatientListView, PatientDetailView, CheckPatientByEmailView, CheckPatientByPatientIdView, DeletedPatientsView, RestorePatientView, PatientLookupView, PatientDetailByPatientIdView, PatientRedFlagView

urlpatterns = [
    path('patients/', PatientListCreateView.as_view(), name='patient-list-create'),  # GET/POST
    path('patients/<int:pk>/', PatientDetailView.as_view(), name='patient-detail'),  # GET/PUT/DELETE
    path('patients/<int:pk>/red-flag/', PatientRedFlagView.as_view(), name='patient-red-flag'),  # POST/DELETE for red flag management
    path('patients/by-patient-id/<str:patient_id>/', PatientDetailByPatientIdView.as_view(), name='patient-detail-by-patient-id'),  # GET patient by patient_id
    path('patients/list/', PatientListView.as_view(), name='patient-list'),          # Custom GET
    path('patients/check-email/', CheckPatientByEmailView.as_view(), name='patient-check-email'),  # Check if patient exists by email
    path('patients/check-patient-id/', CheckPatientByPatientIdView.as_view(), name='patient-check-patient-id'),  # Check if patient exists by Patient ID
    path('patients/lookup-patient/', PatientLookupView.as_view(), name='patient-lookup'),  # Patient lookup by details
    path('patients/deleted/', DeletedPatientsView.as_view(), name='deleted-patients'),  # View deleted patients (admin only)
    path('patients/<int:pk>/restore/', RestorePatientView.as_view(), name='restore-patient'),  # Restore deleted patient (admin only)
]
