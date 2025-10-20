from django.http import JsonResponse
from django.views import View
from django.conf import settings
import sys

class HealthCheckView(View):
    """Simple health check endpoint for monitoring"""
    
    def get(self, request):
        try:
            # Basic system checks
            health_data = {
                'status': 'healthy',
                'debug': settings.DEBUG,
                'python_version': sys.version,
                'environment': 'production' if getattr(settings, 'PRODUCTION', False) else 'development'
            }
            
            # Check database connectivity
            from django.db import connection
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                health_data['database'] = 'connected'
            except Exception as e:
                health_data['database'] = f'error: {str(e)}'
                health_data['status'] = 'unhealthy'
            
            return JsonResponse(health_data)
            
        except Exception as e:
            return JsonResponse({
                'status': 'unhealthy',
                'error': str(e)
            }, status=500)