from django.urls import path
from . import views

app_name = 'systemlogs'

urlpatterns = [
    path('audit-logs/', views.AuditLogsView.as_view(), name='audit-logs'),
]
