from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from accounts.models import CustomUser

class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    """
    Strategy object used to generate and check tokens for account activation.
    """
    def _make_hash_value(self, user, timestamp):
        """
        Hash the user's PK, email (if available), and some user state that's
        sure to change after an account activation to produce a token that is
        invalidated when it's used.
        """
        email = getattr(user, 'email', '') or ''
        return f"{user.pk}{user.password}{timestamp}{email}{user.force_password_change}"

# Create an instance of the token generator
account_activation_token = AccountActivationTokenGenerator()

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