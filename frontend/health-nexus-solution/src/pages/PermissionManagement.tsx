import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserPermissions {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: {
    can_manage_appointments: boolean;
    can_manage_patients: boolean;
    can_manage_staff: boolean;
    can_view_reports: boolean;
    can_manage_clinic_settings: boolean;
    can_manage_permissions: boolean;
    can_access_integrations: boolean;
    can_view_audit_logs: boolean;
    can_view_usage_reports: boolean;
    can_access_security_testing: boolean;
  };
}

const PermissionManagement = () => {
  const { currentUser, setCurrentUser } = useClinic();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    // Refresh current user data to get permissions
    refreshCurrentUser();
  }, []);

  const refreshCurrentUser = async () => {
    try {
      const response = await api.auth.getCurrentUser();
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
        
        console.log('Refreshed user data:', updatedUser);
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.permissions.getAll();
      setUsers(response.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (userId: number, permissionKey: string, value: boolean) => {
    try {
      setSaving(true);
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const updatedPermissions = {
        ...user.permissions,
        [permissionKey]: value
      };

      await api.permissions.update(userId, updatedPermissions);
      
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, permissions: updatedPermissions }
          : u
      ));

      toast({
        title: "Permission Updated",
        description: `Permission ${permissionKey} updated successfully`,
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  console.log('PermissionManagement - currentUser:', currentUser);
  console.log('PermissionManagement - can_manage_permissions:', currentUser?.can_manage_permissions);

  if (!currentUser?.can_manage_permissions) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to manage user permissions.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'doctor':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'receptionist':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const permissionLabels = {
    can_manage_appointments: 'Manage Appointments',
    can_manage_patients: 'Manage Patients',
    can_manage_staff: 'Manage Staff',
    can_view_reports: 'View Reports',
    can_manage_clinic_settings: 'Manage Clinic Settings',
    can_manage_permissions: 'Manage Permissions',
    can_access_integrations: 'Access Integrations',
    can_view_audit_logs: 'View Audit Logs',
    can_view_usage_reports: 'View Usage Reports',
    can_access_security_testing: 'Access Security Testing',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permission Management
          </h1>
          <p className="text-muted-foreground">
            Manage user permissions and access controls
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Permissions
          </CardTitle>
          <CardDescription>
            Configure permissions for each user role and individual users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  {Object.values(permissionLabels).map(label => (
                    <TableHead key={label} className="text-center min-w-[120px]">
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <TableCell key={key} className="text-center">
                        <Switch
                          checked={user.permissions[key as keyof typeof user.permissions]}
                          onCheckedChange={(checked) => updatePermission(user.id, key, checked)}
                          disabled={saving || (user.role === 'superadmin' && currentUser?.role !== 'superadmin')}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionManagement;
