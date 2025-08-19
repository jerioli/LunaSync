import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StaffMember } from '@/services/api';
import { BarChart, Calendar, FileText, Key, Mail, Plug, Settings, Shield, ShieldCheck, User } from 'lucide-react';
import React from 'react';

interface StaffDetailModalProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
}

const StaffDetailModal: React.FC<StaffDetailModalProps> = ({ staff, isOpen, onClose }) => {
  if (!staff) return null;

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

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'can_manage_appointments':
        return <Calendar className="h-4 w-4" />;
      case 'can_manage_patients':
        return <User className="h-4 w-4" />;
      case 'can_manage_staff':
        return <Shield className="h-4 w-4" />;
      case 'can_view_reports':
        return <Mail className="h-4 w-4" />;
      case 'can_manage_clinic_settings':
        return <Settings className="h-4 w-4" />;
      case 'can_manage_permissions':
        return <Key className="h-4 w-4" />;
      case 'can_access_integrations':
        return <Plug className="h-4 w-4" />;
      case 'can_view_audit_logs':
        return <FileText className="h-4 w-4" />;
      case 'can_view_usage_reports':
        return <BarChart className="h-4 w-4" />;
      case 'can_access_security_testing':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'can_manage_appointments':
        return 'Manage Appointments';
      case 'can_manage_patients':
        return 'Manage Patients';
      case 'can_manage_staff':
        return 'Manage Staff';
      case 'can_view_reports':
        return 'View Reports';
      case 'can_manage_clinic_settings':
        return 'Manage Clinic Settings';
      case 'can_manage_permissions':
        return 'Manage Permissions';
      case 'can_access_integrations':
        return 'Access Integrations';
      case 'can_view_audit_logs':
        return 'View Audit Logs';
      case 'can_view_usage_reports':
        return 'View Usage Reports';
      case 'can_access_security_testing':
        return 'Access Security Testing';
      default:
        return permission;
    }
  };

  // Define all possible permissions
  const allPermissions = [
    { key: 'can_manage_appointments', value: staff.can_manage_appointments },
    { key: 'can_manage_patients', value: staff.can_manage_patients },
    { key: 'can_manage_staff', value: staff.can_manage_staff },
    { key: 'can_view_reports', value: staff.can_view_reports },
    { key: 'can_manage_clinic_settings', value: staff.can_manage_clinic_settings },
    { key: 'can_manage_permissions', value: staff.can_manage_permissions },
    { key: 'can_access_integrations', value: staff.can_access_integrations },
    { key: 'can_view_audit_logs', value: staff.can_view_audit_logs },
    { key: 'can_view_usage_reports', value: staff.can_view_usage_reports },
    { key: 'can_access_security_testing', value: staff.can_access_security_testing },
  ];

  // Filter permissions to only show ones that are defined (not undefined)
  const permissions = allPermissions.filter(permission => permission.value !== undefined);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Staff Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={staff.image} alt={`${staff.first_name} ${staff.last_name}`} />
              <AvatarFallback className="text-lg">
                {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{staff.first_name} {staff.last_name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={getRoleBadgeColor(staff.role)}>
                  {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                </Badge>
                <Badge variant={staff.is_active ? "secondary" : "destructive"}>
                  {staff.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{staff.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">@{staff.username}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Permissions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {permissions.map(({ key, value }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getPermissionIcon(key)}
                    <span className="text-sm font-medium">{getPermissionLabel(key)}</span>
                  </div>
                  <Badge variant={value ? "secondary" : "outline"} className={value ? "bg-green-50 text-green-700 border-green-200" : ""}>
                    {value ? "Granted" : "Denied"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffDetailModal;
