from django.http import JsonResponse
from django.views import View
from django.core.paginator import Paginator
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json
from .models import AuditLog


class AuditLogsView(View):
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get(self, request):
        try:
            print(f"=== AUDIT LOGS DEBUG ===")
            print(f"User: {request.user}")
            print(f"User authenticated: {request.user.is_authenticated}")
            print(f"Session ID: {request.headers.get('X-Session-ID')}")
            print(f"=== END AUDIT LOGS DEBUG ===")
            
            # Check if user is authenticated and has permission to view audit logs
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return JsonResponse({
                    'error': 'Authentication required'
                }, status=401)
            
            # Check if user has permission to view audit logs (superadmin only)
            if not (hasattr(request.user, 'can_view_audit_logs') and request.user.can_view_audit_logs):
                return JsonResponse({
                    'error': 'Permission denied',
                    'message': 'You do not have permission to view audit logs'
                }, status=403)
            
            # Get query parameters
            page = int(request.GET.get('page', 1))
            action_filter = request.GET.get('action', '')
            resource_filter = request.GET.get('resource_type', '')
            user_filter = request.GET.get('user', '')
            
            # Start with all audit logs
            queryset = AuditLog.objects.all().order_by('-timestamp')
            
            # Apply filters
            if action_filter:
                queryset = queryset.filter(action=action_filter)
            if resource_filter:
                queryset = queryset.filter(resource_type=resource_filter)
            if user_filter:
                queryset = queryset.filter(user__icontains=user_filter)
            
            # Paginate results
            paginator = Paginator(queryset, 20)  # 20 logs per page
            page_obj = paginator.get_page(page)
            
            # Serialize data
            audit_logs = []
            for log in page_obj:
                audit_logs.append({
                    'id': log.id,
                    'timestamp': log.timestamp.isoformat(),
                    'user': log.user or 'System',
                    'action': log.action,
                    'resource_type': log.resource_type,
                    'resource_id': log.resource_id,
                    'details': log.details,
                    'ip_address': log.ip_address,
                    'session_id': log.session_id,
                    'changes': log.changes or {}
                })
            
            return JsonResponse({
                'audit_logs': audit_logs,
                'pagination': {
                    'current_page': page_obj.number,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous()
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'error': f'Failed to fetch audit logs: {str(e)}'
            }, status=500)
