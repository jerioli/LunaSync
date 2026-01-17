from django.urls import path
from . import views

urlpatterns = [
    path('execute/', views.execute_sql_query, name='execute_sql_query'),
    path('logs/', views.get_query_logs, name='get_query_logs'),
]
