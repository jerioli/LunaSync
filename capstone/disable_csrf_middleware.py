"""
Custom middleware to completely disable CSRF for development
"""

class DisableCSRFMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Set the CSRF processing done flag to skip CSRF checks
        setattr(request, '_dont_enforce_csrf_checks', True)
        response = self.get_response(request)
        return response
