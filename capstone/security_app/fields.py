from django.db import models

def get_encryption_functions():
    """Lazy load encryption functions to avoid import issues"""
    try:
        from .encryption_utils import encrypt, decrypt
        return encrypt, decrypt
    except ImportError as e:
        raise ImportError(f"Encryption utilities not available: {e}")

# Cache the functions
_encrypt_func = None
_decrypt_func = None

def get_encrypt_func():
    global _encrypt_func
    if _encrypt_func is None:
        _encrypt_func, _ = get_encryption_functions()
    return _encrypt_func

def get_decrypt_func():
    global _decrypt_func
    if _decrypt_func is None:
        _, _decrypt_func = get_encryption_functions()
    return _decrypt_func

class EncryptedCharField(models.CharField):
    def get_prep_value(self, value):
        if value is None:
            return value
        encrypt_func = get_encrypt_func()
        return encrypt_func(value)

    def from_db_value(self, value, expression, connection):
        if value is None or value == '':
            return value
        try:
            decrypt_func = get_decrypt_func()
            return decrypt_func(value)
        except Exception:
            # If decryption fails, return the original value (might be plaintext)
            return value

    def to_python(self, value):
        if value is None or isinstance(value, str) and not value:
            return value
        try:
            # Try to decrypt, fallback to raw if not encrypted
            decrypt_func = get_decrypt_func()
            return decrypt_func(value)
        except Exception:
            return value

class EncryptedTextField(models.TextField):
    def get_prep_value(self, value):
        if value is None:
            return value
        encrypt_func = get_encrypt_func()
        return encrypt_func(value)

    def from_db_value(self, value, expression, connection):
        if value is None or value == '':
            return value
        try:
            decrypt_func = get_decrypt_func()
            return decrypt_func(value)
        except Exception:
            # If decryption fails, return the original value (might be plaintext)
            return value

    def to_python(self, value):
        if value is None or isinstance(value, str) and not value:
            return value
        try:
            decrypt_func = get_decrypt_func()
            return decrypt_func(value)
        except Exception:
            return value
