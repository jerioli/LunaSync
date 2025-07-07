import React from 'react';
import { Patient } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface PatientPersonalInfoProps {
  patient: Patient;
  isEditing: boolean;
  onUpdate: (data: Partial<Patient>) => void;
}

const PatientPersonalInfo: React.FC<PatientPersonalInfoProps> = ({ 
  patient, 
  isEditing,
  onUpdate 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Patient's personal and contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            {isEditing ? (
              <Input 
                id="name" 
                value={patient.name || ''} 
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/20">{patient.name}</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            {isEditing ? (
              <Input 
                id="dateOfBirth" 
                type="date" 
                value={patient.date_of_birth || ''}
                onChange={(e) => onUpdate({ date_of_birth: e.target.value })}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/20">
                {patient.date_of_birth && !isNaN(new Date(patient.date_of_birth).getTime())
                  ? format(new Date(patient.date_of_birth), 'PPP')
                  : 'N/A'}
              </div>
            )}
          </div>
            <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            {isEditing ? (
              <select 
                id="gender" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                value={patient.gender || 'male'}
                onChange={(e) => onUpdate({ gender: e.target.value as 'male' | 'female' | 'other' })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <div className="p-2 border rounded-md bg-muted/20 capitalize">{patient.gender}</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            {isEditing ? (
              <Input 
                id="email" 
                type="email" 
                value={patient.email || ''} 
                onChange={(e) => onUpdate({ email: e.target.value })}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/20">{patient.email}</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            {isEditing ? (
              <Input 
                id="phone" 
                value={patient.phone || ''} 
                onChange={(e) => onUpdate({ phone: e.target.value })}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/20">{patient.phone}</div>
            )}
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            {isEditing ? (
              <Textarea 
                id="address" 
                value={patient.address || ''} 
                onChange={(e) => onUpdate({ address: e.target.value })}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/20">{patient.address}</div>
            )}
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Registration Date</Label>
            <div className="text-sm text-muted-foreground">
              {patient.registrationDate && !isNaN(new Date(patient.registrationDate).getTime())
                ? format(new Date(patient.registrationDate), 'PPP')
                : 'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientPersonalInfo;
