from django.urls import path
from .views import PatientListCreateView, PatientListView, PatientDetailView

urlpatterns = [
    path('patients/', PatientListCreateView.as_view(), name='patient-list-create'),  # GET/POST
    path('patients/<int:pk>/', PatientDetailView.as_view(), name='patient-detail'),  # GET/PUT/DELETE
    path('patients/list/', PatientListView.as_view(), name='patient-list'),          # Custom GET
]
