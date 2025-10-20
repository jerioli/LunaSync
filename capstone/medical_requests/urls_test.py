from django.urls import path
from django.http import JsonResponse

def test_view(request):
    return JsonResponse({'message': 'Test endpoint working'})

def placeholder_view(request, *args, **kwargs):
    """Placeholder view for medical requests endpoints"""
    return JsonResponse({
        'message': 'Medical requests endpoint - temporarily disabled due to circular import',
        'endpoint': request.path,
        'method': request.method
    })

urlpatterns = [
    path('test/', test_view, name='test'),
    path('medical-certificates/', placeholder_view, name='medical_certificates'),
    path('medical-certificates/<int:request_id>/approve/', placeholder_view, name='approve_medical_certificate'),
    path('prescription-requests/', placeholder_view, name='prescription_requests'),
    path('prescription-requests/<int:request_id>/approve/', placeholder_view, name='approve_prescription'),
]
