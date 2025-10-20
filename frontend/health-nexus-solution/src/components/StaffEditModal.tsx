import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { StaffMember, api } from '@/services/api';
import React, { useEffect, useState } from 'react';

interface StaffEditModalProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const StaffEditModal: React.FC<StaffEditModalProps> = ({ staff, isOpen, onClose, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StaffMember>>({});
  const [fullName, setFullName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (staff) {
      setFormData({
        email: staff.email,
        username: staff.username,
        phone: staff.phone,
        is_active: staff.is_active,
      });
      setFullName(`${staff.first_name} ${staff.last_name}`);
    }
  }, [staff]);

  if (!staff) return null;

  const handleInputChange = (field: keyof StaffMember, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Split full name into first_name and last_name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const updateData = {
        ...formData,
        first_name: firstName,
        last_name: lastName,
      };
      
      await api.staff.update(staff.id, updateData);
      onUpdate();
      toast({
        title: "Profile Updated",
        description: "Staff member profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
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

          {/* Profile Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
              />
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
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="e.g., +639123456789"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffEditModal;
