class DebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Debug authentication for API requests
        if request.path.startswith('/api/'):
            print(f"\n=== AUTH DEBUG for {request.path} ===")
            print(f"Session key: {request.session.session_key}")
            print(f"Session data: {dict(request.session) if hasattr(request, 'session') else 'No session'}")
            print(f"User: {request.user}")
            print(f"User authenticated: {request.user.is_authenticated}")
            print(f"User ID: {getattr(request.user, 'id', 'No ID')}")
            print(f"User role: {getattr(request.user, 'role', 'No role')}")
            print(f"Cookies received: {list(request.COOKIES.keys())}")
            print(f"SessionID cookie: {request.COOKIES.get('sessionid', 'NOT FOUND')}")
            print(f"CSRF cookie: {request.COOKIES.get('csrftoken', 'NOT FOUND')}")
            print(f"=== END AUTH DEBUG ===\n")

        response = self.get_response(request)
        return response
