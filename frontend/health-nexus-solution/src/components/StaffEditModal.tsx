import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Shield, Mail, Settings } from 'lucide-react';
import { StaffMember, api } from '@/services/api';

interface StaffEditModalProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const StaffEditModal: React.FC<StaffEditModalProps> = ({ staff, isOpen, onClose, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StaffMember>>({});
  const [permissions, setPermissions] = useState<Partial<StaffMember>>({});

  useEffect(() => {
    if (staff) {
      setFormData({
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        username: staff.username,
        is_active: staff.is_active,
      });
      setPermissions({
        can_manage_appointments: staff.can_manage_appointments,
        can_manage_patients: staff.can_manage_patients,
        can_manage_staff: staff.can_manage_staff,
        can_view_reports: staff.can_view_reports,
        can_manage_clinic_settings: staff.can_manage_clinic_settings,
      });
    }
  }, [staff]);

  if (!staff) return null;

  const handleInputChange = (field: keyof StaffMember, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (permission: keyof StaffMember, value: boolean) => {
    setPermissions(prev => ({ ...prev, [permission]: value }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await api.staff.update(staff.id, formData);
      onUpdate();
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    setIsLoading(true);
    try {
      await api.staff.updatePermissions(staff.id, permissions);
      onUpdate();
      alert('Permissions updated successfully!');
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Failed to update permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
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
      default:
        return permission;
    }
  };

  const permissionList = [
    { key: 'can_manage_appointments', label: 'Manage Appointments', description: 'Create, view, and modify appointments' },
    { key: 'can_manage_patients', label: 'Manage Patients', description: 'Add, view, and edit patient records' },
    { key: 'can_manage_staff', label: 'Manage Staff', description: 'Add, edit, and remove staff members' },
    { key: 'can_view_reports', label: 'View Reports', description: 'Access system reports and analytics' },
    { key: 'can_manage_clinic_settings', label: 'Manage Clinic Settings', description: 'Configure clinic-wide settings' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Staff Header */}
          <div className="flex items-center space-x-4 pb-4 border-b">
            <Avatar className="h-12 w-12">
              <AvatarImage src={staff.image} alt={`${staff.first_name} ${staff.last_name}`} />
              <AvatarFallback>
                {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{staff.first_name} {staff.last_name}</h3>
              <Badge className={getRoleBadgeColor(staff.role)}>
                {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name || ''}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username || ''}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active || false}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active Account</Label>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4 mt-6">
              <div className="space-y-4">
                {permissionList.map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      {getPermissionIcon(key)}
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-sm text-muted-foreground">{description}</div>
                      </div>
                    </div>
                    <Switch
                      checked={permissions[key as keyof StaffMember] as boolean || false}
                      onCheckedChange={(checked) => handlePermissionChange(key as keyof StaffMember, checked)}
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePermissions} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffEditModal;
