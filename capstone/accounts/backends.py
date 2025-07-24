from django.contrib.auth.backends import ModelBackend
from accounts.models import CustomUser

class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        # Try email first (prioritize email)
        if email:
            try:
                user = CustomUser.objects.get(email=email)
            except CustomUser.DoesNotExist:
                return None
        elif username:
            try:
                # Try email first
                user = CustomUser.objects.get(email=username)
            except CustomUser.DoesNotExist:
                try:
                    # Fallback to username
                    user = CustomUser.objects.get(username=username)
                except CustomUser.DoesNotExist:
                    return None
        else:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None