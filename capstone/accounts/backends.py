from django.contrib.auth.backends import ModelBackend
from accounts.models import CustomUser

class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, username=None, password=None, **kwargs):
        try:
            user = CustomUser.objects.get(email=username)  # Try logging in with email
        except CustomUser.DoesNotExist:
            try:
                user = CustomUser.objects.get(username=username)  # Fallback to username
            except CustomUser.DoesNotExist:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None