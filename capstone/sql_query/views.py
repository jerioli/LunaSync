from django.http import JsonResponse
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json
from functools import wraps
from datetime import datetime, date

def admin_only(view_func):
    """Decorator to ensure only admin users can access the view"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        # Check if user is authenticated and is admin
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        
        # Check if user is admin (you may need to adjust this based on your user model)
        if request.user.role not in ['admin', 'superadmin']:
            return JsonResponse({'success': False, 'error': 'Admin access required'}, status=403)
        
        return view_func(request, *args, **kwargs)
    return wrapper

@csrf_exempt
@admin_only
def execute_sql_query(request):
    """
    Execute SQL query and return results
    WARNING: This endpoint should only be accessible to admins
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'}, status=405)
    
    try:
        data = json.loads(request.body)
        query = data.get('query', '').strip()
        
        if not query:
            return JsonResponse({'success': False, 'error': 'Query cannot be empty'}, status=400)
        
        # Security: Block dangerous keywords in non-SELECT queries
        dangerous_keywords = ['DROP DATABASE', 'DROP SCHEMA', 'TRUNCATE DATABASE']
        query_upper = query.upper()
        
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return JsonResponse({
                    'success': False,
                    'error': f'Dangerous operation detected: {keyword} is not allowed'
                }, status=400)
        
        # Execute the query
        with connection.cursor() as cursor:
            start_time = timezone.now()
            cursor.execute(query)
            
            # Determine if it's a SELECT query or modification query
            is_select = query_upper.startswith('SELECT')
            
            if is_select:
                # Fetch results for SELECT queries
                columns = [col[0] for col in cursor.description] if cursor.description else []
                results = cursor.fetchall()
                rows_affected = len(results)
                
                # Convert results to list of dicts
                result_list = []
                for row in results:
                    result_dict = {}
                    for i, value in enumerate(row):
                        # Handle special types
                        if isinstance(value, (datetime, date)):
                            result_dict[columns[i]] = str(value)
                        else:
                            result_dict[columns[i]] = value
                    result_list.append(result_dict)
                
                response_data = {
                    'success': True,
                    'type': 'SELECT',
                    'columns': columns,
                    'results': result_list,
                    'rows_affected': rows_affected,
                    'executed_at': start_time.isoformat(),
                    'executed_by': request.user.username if hasattr(request.user, 'username') else str(request.user)
                }
            else:
                # For INSERT, UPDATE, DELETE queries
                connection.commit()
                rows_affected = cursor.rowcount
                
                response_data = {
                    'success': True,
                    'type': 'MODIFICATION',
                    'rows_affected': rows_affected,
                    'executed_at': start_time.isoformat(),
                    'executed_by': request.user.username if hasattr(request.user, 'username') else str(request.user),
                    'message': f'Query executed successfully. {rows_affected} row(s) affected.'
                }
        
        # Log the query execution
        log_query_execution(
            user=request.user,
            query=query,
            success=True,
            rows_affected=rows_affected,
            executed_at=start_time
        )
        
        return JsonResponse(response_data)
        
    except Exception as e:
        error_message = str(e)
        
        # Log the failed query
        try:
            log_query_execution(
                user=request.user,
                query=query,
                success=False,
                error=error_message,
                executed_at=timezone.now()
            )
        except:
            pass
        
        return JsonResponse({
            'success': False,
            'error': error_message,
            'executed_at': timezone.now().isoformat(),
            'executed_by': request.user.username if hasattr(request.user, 'username') else str(request.user)
        }, status=400)

def log_query_execution(user, query, success, rows_affected=0, error=None, executed_at=None):
    """Log SQL query execution to database"""
    try:
        from .models import SQLQueryLog
        
        SQLQueryLog.objects.create(
            user=user,
            query=query,
            success=success,
            rows_affected=rows_affected,
            error=error,
            executed_at=executed_at or timezone.now()
        )
    except Exception as e:
        # Silently fail if logging fails
        print(f"Failed to log query: {e}")

@admin_only
def get_query_logs(request):
    """Get SQL query execution logs"""
    try:
        from .models import SQLQueryLog
        
        # Get limit from query params (default 50)
        limit = int(request.GET.get('limit', 50))
        
        logs = SQLQueryLog.objects.all().order_by('-executed_at')[:limit]
        
        log_list = []
        for log in logs:
            log_list.append({
                'id': log.id,
                'user': log.user.username if hasattr(log.user, 'username') else str(log.user),
                'query': log.query,
                'success': log.success,
                'rows_affected': log.rows_affected,
                'error': log.error,
                'executed_at': log.executed_at.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'logs': log_list
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
