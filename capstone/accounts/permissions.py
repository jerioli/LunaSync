from rest_framework import permissions

class IsReceptionist(permissions.BasePermission):
    """
    Custom permission to only allow receptionists to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'receptionist' 