"""
Custom Password Validators for Health Nexus
Enhanced password security for healthcare applications
"""

import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class CustomPasswordValidator:
    """
    Custom password validator for healthcare applications
    Ensures passwords meet healthcare security standards
    """
    
    def validate(self, password, user=None):
        """
        Validate password according to healthcare security standards
        """
        errors = []
        
        # Minimum length check (12 characters)
        if len(password) < 12:
            errors.append(_('Password must be at least 12 characters long.'))
        
        # Must contain uppercase letter
        if not re.search(r'[A-Z]', password):
            errors.append(_('Password must contain at least one uppercase letter.'))
        
        # Must contain lowercase letter
        if not re.search(r'[a-z]', password):
            errors.append(_('Password must contain at least one lowercase letter.'))
        
        # Must contain digit
        if not re.search(r'\d', password):
            errors.append(_('Password must contain at least one digit.'))
        
        # Must contain special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append(_('Password must contain at least one special character.'))
        
        # Check for common patterns
        if self.contains_common_patterns(password):
            errors.append(_('Password contains common patterns that are not allowed.'))
        
        # Check for sequential characters
        if self.contains_sequential_chars(password):
            errors.append(_('Password cannot contain sequential characters (e.g., 123, abc).'))
        
        # Check for repeated characters
        if self.contains_repeated_chars(password):
            errors.append(_('Password cannot contain more than 2 repeated characters.'))
        
        # Check against user information
        if user and self.contains_user_info(password, user):
            errors.append(_('Password cannot contain user information.'))
        
        if errors:
            raise ValidationError(errors)
    
    def contains_common_patterns(self, password):
        """Check for common password patterns"""
        common_patterns = [
            r'password',
            r'123456',
            r'qwerty',
            r'admin',
            r'welcome',
            r'letmein',
            r'monkey',
            r'dragon',
            r'master',
            r'health',
            r'medical',
            r'doctor',
            r'patient',
        ]
        
        password_lower = password.lower()
        return any(re.search(pattern, password_lower) for pattern in common_patterns)
    
    def contains_sequential_chars(self, password):
        """Check for sequential characters"""
        # Check for ascending sequences
        for i in range(len(password) - 2):
            if (ord(password[i]) + 1 == ord(password[i+1]) and 
                ord(password[i+1]) + 1 == ord(password[i+2])):
                return True
        
        # Check for descending sequences
        for i in range(len(password) - 2):
            if (ord(password[i]) - 1 == ord(password[i+1]) and 
                ord(password[i+1]) - 1 == ord(password[i+2])):
                return True
        
        return False
    
    def contains_repeated_chars(self, password):
        """Check for repeated characters"""
        for i in range(len(password) - 2):
            if password[i] == password[i+1] == password[i+2]:
                return True
        return False
    
    def contains_user_info(self, password, user):
        """Check if password contains user information"""
        if not user:
            return False
        
        password_lower = password.lower()
        user_info = [
            user.username.lower() if hasattr(user, 'username') else '',
            user.email.lower().split('@')[0] if hasattr(user, 'email') else '',
            user.first_name.lower() if hasattr(user, 'first_name') else '',
            user.last_name.lower() if hasattr(user, 'last_name') else '',
        ]
        
        return any(info and len(info) > 2 and info in password_lower for info in user_info)
    
    def get_help_text(self):
        """Return help text for password requirements"""
        return _(
            "Your password must be at least 12 characters long and contain "
            "at least one uppercase letter, one lowercase letter, one digit, "
            "and one special character. It cannot contain common patterns, "
            "sequential characters, or repeated characters."
        )


class PasswordHistoryValidator:
    """
    Validator to prevent password reuse
    """
    
    def __init__(self, history_count=5):
        self.history_count = history_count
    
    def validate(self, password, user=None):
        """
        Validate that password hasn't been used recently
        """
        if not user or not hasattr(user, 'password_history'):
            return
        
        from django.contrib.auth.hashers import check_password
        
        # Check against password history
        for old_password in user.password_history.all()[:self.history_count]:
            if check_password(password, old_password.password):
                raise ValidationError(
                    _('Password has been used recently. Please choose a different password.')
                )
    
    def get_help_text(self):
        """Return help text for password history"""
        return _(
            f"Your password cannot be the same as your last {self.history_count} passwords."
        )


class PasswordExpirationValidator:
    """
    Validator to check password age
    """
    
    def __init__(self, max_age_days=90):
        self.max_age_days = max_age_days
    
    def validate(self, password, user=None):
        """
        Check if password has expired
        """
        if not user or not hasattr(user, 'password_changed_date'):
            return
        
        from django.utils import timezone
        from datetime import timedelta
        
        if user.password_changed_date:
            expiry_date = user.password_changed_date + timedelta(days=self.max_age_days)
            if timezone.now() > expiry_date:
                raise ValidationError(
                    _('Your password has expired. Please choose a new password.')
                )
    
    def get_help_text(self):
        """Return help text for password expiration"""
        return _(
            f"Passwords must be changed every {self.max_age_days} days."
        )
