import { api } from '@/services/api';

export const refreshCurrentUserPermissions = async (
  currentUser: any,
  setCurrentUser: (user: any) => void
) => {
  try {
    console.log('Calling api.auth.getCurrentUser()...');
    const response = await api.auth.getCurrentUser();
    console.log('getCurrentUser API response:', response);
    
    if (response.success) {
      const updatedUser = {
        id: String(response.user.id),
        name: response.user.name,
        username: response.user.username,
        email: response.user.email,
        role: response.user.role,
        force_password_change: response.user.force_password_change,
        // Include all permission fields
        can_manage_appointments: response.user.can_manage_appointments,
        can_manage_patients: response.user.can_manage_patients,
        can_manage_staff: response.user.can_manage_staff,
        can_view_reports: response.user.can_view_reports,
        can_manage_clinic_settings: response.user.can_manage_clinic_settings,
        can_manage_permissions: response.user.can_manage_permissions,
        can_access_integrations: response.user.can_access_integrations,
        can_view_audit_logs: response.user.can_view_audit_logs,
        can_view_usage_reports: response.user.can_view_usage_reports,
        can_access_security_testing: response.user.can_access_security_testing,
      };
      
      console.log('Setting updated user:', updatedUser);
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('Refreshed user permissions successfully');
      return updatedUser;
    } else {
      console.log('getCurrentUser response not successful:', response);
    }
  } catch (error) {
    console.error('Error refreshing user permissions:', error);
    return null;
  }
};

export const updateCurrentUserPermission = (
  currentUser: any,
  setCurrentUser: (user: any) => void,
  permissionKey: string,
  value: boolean
) => {
  if (currentUser) {
    const updatedCurrentUser = {
      ...currentUser,
      [permissionKey]: value
    };
    setCurrentUser(updatedCurrentUser);
    localStorage.setItem('user', JSON.stringify(updatedCurrentUser));
    console.log('Updated current user permission:', { [permissionKey]: value });
    return updatedCurrentUser;
  }
  return currentUser;
};
