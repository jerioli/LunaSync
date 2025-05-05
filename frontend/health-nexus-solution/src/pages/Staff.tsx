
import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useClinic } from '@/contexts/ClinicContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, UserPlus, Mail, Phone } from 'lucide-react';
import axios from 'axios';
import { PassThrough } from 'stream';
const StaffPage = () => {
  const { users, currentUser } = useClinic();
  const [searchTerm, setSearchTerm] = useState("");
  const [newStaff, setNewStaff] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    role: "",
    password:"",
    status: "active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can access the staff management page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Filter users by role and search term
  const filterUsers = (role: string) => {
    return users.filter(user => 
      user.role === role && 
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const doctors = filterUsers('doctor');
  const receptionists = filterUsers('receptionist');
  const admins = filterUsers('admin');

  // Handle input changes for the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setNewStaff(prev => ({ ...prev, [id]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/staff/', {
        username: newStaff.email, // Use email as username
        email: newStaff.email,
        password: 'defaultpassword123', // Default password
        first_name: newStaff.name.split(' ')[0], // Extract first name
        last_name: newStaff.name.split(' ').slice(1).join(' '), // Extract last name
        role: newStaff.role,
        is_active: true,
        is_staff: newStaff.role !== 'doctor', // Example logic: doctors are not staff
        is_superuser: newStaff.role === 'admin', // Example logic: only admins are superusers
      });
      console.log('Staff added successfully:', response.data);
  
      alert('Staff member added successfully!');
      setNewStaff({ name: "", username: "", email: "", phone: "", role: "", status: "active", password:""});
    } catch (error) {
      console.error('Error adding staff:', error.response?.data || error.message);
      alert('Failed to add staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage clinic staff members, including doctors, receptionists, and administrators
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new account for a staff member. They'll receive an email with login instructions.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                {/* Full Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., John Doe"
                    className="col-span-3"
                    value={newStaff.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                  
                  {/* Username */}
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  placeholder="e.g., johndoe"
                  className="col-span-3"
                  value={newStaff.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
                {/* Email */}
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor="email" className="text-right">
        Email
      </Label>
      <Input
        id="email"
        type="email"
        placeholder="e.g., johndoe@example.com"
        className="col-span-3"
        value={newStaff.email}
        onChange={handleInputChange}
        required
      />
    </div>

                {/* Phone */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., (555) 123-4567"
                    className="col-span-3"
                    value={newStaff.phone}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Role */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <select
                    id="role"
                    className="col-span-3 border rounded-md p-2"
                    value={newStaff.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {/* Status */}
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Status</Label>
                  <RadioGroup
                    defaultValue="active"
                    className="col-span-3"
                    onValueChange={(value) => setNewStaff((prev) => ({ ...prev, status: value }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id="active" />
                      <Label htmlFor="active">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="inactive" id="inactive" />
                      <Label htmlFor="inactive">Inactive</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Password */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Set a default password"
                    className="col-span-3"
                    value={newStaff.password || ''}
                    onChange={(e) => setNewStaff((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                {/* Submit Button */}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Staff Member'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>  
          </Dialog>
        </div>
      </div>
      
      <div className="flex items-center px-4 border rounded-md">
        <Search className="w-4 h-4 mr-2 text-muted-foreground" />
        <Input 
          placeholder="Search staff by name or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0"
        />
      </div>
      
      <Tabs defaultValue="doctors">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="receptionists">Receptionists</TabsTrigger>
          <TabsTrigger value="admins">Administrators</TabsTrigger>
        </TabsList>
        
        <TabsContent value="doctors" className="space-y-4 mt-6">
          {doctors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                No doctors match your search criteria.
              </CardContent>
            </Card>
          ) : (
            doctors.map(doctor => (
              <Card key={doctor.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage src={doctor.image} alt={doctor.name} />
                      <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <CardTitle className="text-lg">{doctor.name}</CardTitle>
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">Doctor</Badge>
                      </div>
                      <CardDescription>{doctor.speciality || 'General Physician'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{doctor.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{doctor.phone || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex justify-end w-full space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="receptionists" className="space-y-4 mt-6">
          {receptionists.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                No receptionists match your search criteria.
              </CardContent>
            </Card>
          ) : (
            receptionists.map(receptionist => (
              <Card key={receptionist.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage src={receptionist.image} alt={receptionist.name} />
                      <AvatarFallback>{receptionist.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <CardTitle className="text-lg">{receptionist.name}</CardTitle>
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">Receptionist</Badge>
                      </div>
                      <CardDescription>Front Office</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{receptionist.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{receptionist.phone || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex justify-end w-full space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="admins" className="space-y-4 mt-6">
          {admins.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                No administrators match your search criteria.
              </CardContent>
            </Card>
          ) : (
            admins.map(admin => (
              <Card key={admin.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage src={admin.image} alt={admin.name} />
                      <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center">
                        <CardTitle className="text-lg">{admin.name}</CardTitle>
                        <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">Administrator</Badge>
                      </div>
                      <CardDescription>System Administrator</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{admin.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{admin.phone || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex justify-end w-full space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffPage;
