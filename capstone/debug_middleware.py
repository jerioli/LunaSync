class DebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print(f"[MIDDLEWARE DEBUG] Request: {request.method} {request.path}")
        print(f"[MIDDLEWARE DEBUG] User: {request.user}")
        
        response = self.get_response(request)
        
        print(f"[MIDDLEWARE DEBUG] Response status: {response.status_code}")
        return response
