
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Settings = () => {
  const { currentUser } = useClinic();
  const [generalSettings, setGeneralSettings] = useState({
    clinicName: 'HealthNexus Medical Center',
    address: '123 Health Avenue, Medical District',
    city: 'Cityville',
    state: 'California',
    zip: '12345',
    phone: '(123) 456-7890',
    email: 'info@healthnexus.com',
    website: 'www.healthnexus.com'
  });
  
  const [appointmentSettings, setAppointmentSettings] = useState({
    defaultDuration: '30',
    bufferTime: '10',
    startTime: '09:00',
    endTime: '17:00',
    allowWeekends: false,
    autoConfirm: false,
    sendReminders: true,
    reminderTime: '24'
  });
  
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can access clinic settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings Saved",
      description: "Your general clinic settings have been updated successfully."
    });
  };
  
  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings Saved",
      description: "Your appointment settings have been updated successfully."
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clinic Settings</h1>
        <p className="text-muted-foreground">
          Manage your clinic's settings and configurations
        </p>
      </div>
      
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <form onSubmit={handleGeneralSubmit}>
              <CardHeader>
                <CardTitle>Clinic Information</CardTitle>
                <CardDescription>
                  Manage your clinic's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="clinicName">Clinic Name</Label>
                    <Input 
                      id="clinicName" 
                      value={generalSettings.clinicName}
                      onChange={(e) => setGeneralSettings({...generalSettings, clinicName: e.target.value})}
                    />
                  </div>
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({...generalSettings, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({...generalSettings, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input 
                    id="website" 
                    value={generalSettings.website}
                    onChange={(e) => setGeneralSettings({...generalSettings, website: e.target.value})}
                  />
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Address</h3>
                
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input 
                    id="address" 
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({...generalSettings, address: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={generalSettings.city}
                      onChange={(e) => setGeneralSettings({...generalSettings, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input 
                      id="state" 
                      value={generalSettings.state}
                      onChange={(e) => setGeneralSettings({...generalSettings, state: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">Zip Code</Label>
                    <Input 
                      id="zip" 
                      value={generalSettings.zip}
                      onChange={(e) => setGeneralSettings({...generalSettings, zip: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>Save Changes</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="appointments">
          <Card>
            <form onSubmit={handleAppointmentSubmit}>
              <CardHeader>
                <CardTitle>Appointment Settings</CardTitle>
                <CardDescription>
                  Configure how appointments are scheduled and managed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-medium">Time Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Business Hours Start</Label>
                    <Input 
                      id="startTime" 
                      type="time"
                      value={appointmentSettings.startTime}
                      onChange={(e) => setAppointmentSettings({...appointmentSettings, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Business Hours End</Label>
                    <Input 
                      id="endTime" 
                      type="time"
                      value={appointmentSettings.endTime}
                      onChange={(e) => setAppointmentSettings({...appointmentSettings, endTime: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultDuration">Default Appointment Duration (minutes)</Label>
                    <Select 
                      value={appointmentSettings.defaultDuration}
                      onValueChange={(value) => setAppointmentSettings({...appointmentSettings, defaultDuration: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bufferTime">Buffer Time Between Appointments (minutes)</Label>
                    <Select 
                      value={appointmentSettings.bufferTime}
                      onValueChange={(value) => setAppointmentSettings({...appointmentSettings, bufferTime: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select buffer time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No buffer</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Scheduling Rules</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="allowWeekends">Allow Weekend Appointments</Label>
                    <p className="text-sm text-muted-foreground">Enable scheduling on Saturdays and Sundays</p>
                  </div>
                  <Switch 
                    id="allowWeekends" 
                    checked={appointmentSettings.allowWeekends}
                    onCheckedChange={(checked) => setAppointmentSettings({...appointmentSettings, allowWeekends: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoConfirm">Auto-Confirm Appointments</Label>
                    <p className="text-sm text-muted-foreground">Automatically confirm new appointment requests</p>
                  </div>
                  <Switch 
                    id="autoConfirm" 
                    checked={appointmentSettings.autoConfirm}
                    onCheckedChange={(checked) => setAppointmentSettings({...appointmentSettings, autoConfirm: checked})}
                  />
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Reminders</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sendReminders">Send Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send email/SMS reminders to patients</p>
                  </div>
                  <Switch 
                    id="sendReminders" 
                    checked={appointmentSettings.sendReminders}
                    onCheckedChange={(checked) => setAppointmentSettings({...appointmentSettings, sendReminders: checked})}
                  />
                </div>
                
                {appointmentSettings.sendReminders && (
                  <div>
                    <Label htmlFor="reminderTime">Send Reminders (hours before appointment)</Label>
                    <Select 
                      value={appointmentSettings.reminderTime}
                      onValueChange={(value) => setAppointmentSettings({...appointmentSettings, reminderTime: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reminder time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>Save Changes</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure email and SMS notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-10 text-muted-foreground">
                Notification settings will be implemented in the future.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect with third-party services and applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-10 text-muted-foreground">
                Integration settings will be implemented in the future.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
