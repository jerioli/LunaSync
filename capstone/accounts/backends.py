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
        user = None
        
        # Try email first (prioritize email)
        if email:
            # Since email is encrypted, we need to check all users
            for u in CustomUser.objects.all():
                if str(u.email) == email:  # EncryptedCharField automatically decrypts
                    user = u
                    break
        elif username:
            # First try to find by email (username could be an email)
            for u in CustomUser.objects.all():
                if str(u.email) == username:  # EncryptedCharField automatically decrypts
                    user = u
                    break
            
            # If not found by email, try by username
            if not user:
                try:
                    user = CustomUser.objects.get(username=username)
                except CustomUser.DoesNotExist:
                    return None
        else:
            return None

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None