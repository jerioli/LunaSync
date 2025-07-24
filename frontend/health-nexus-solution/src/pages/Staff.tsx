import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClinic } from '@/contexts/ClinicContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, UserPlus, Mail, Phone, MoreHorizontal, Shield, Eye, Edit } from 'lucide-react';
import axios from 'axios';
import { api, Doctor, Receptionist, Admin, StaffMember } from '@/services/api';
import StaffDetailModal from '@/components/StaffDetailModal';
import StaffEditModal from '@/components/StaffEditModal';

const StaffPage = () => {
  const { currentUser } = useClinic();
  const [staff, setStaff] = useState([]);
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [receptionistsList, setReceptionistsList] = useState<Receptionist[]>([]);
  const [isLoadingReceptionists, setIsLoadingReceptionists] = useState(false);
  const [adminsList, setAdminsList] = useState<Admin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  
  // Modal states
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch staff from backend
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await axios.get('/staff/list/');
        setStaff(response.data);
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      try {
        const response = await api.doctors.getAll();
        setDoctorsList(response);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    const fetchReceptionists = async () => {
      setIsLoadingReceptionists(true);
      try {
        const response = await api.receptionists.getAll();
        setReceptionistsList(response);
      } catch (error) {
        console.error('Error fetching receptionists:', error);
      } finally {
        setIsLoadingReceptionists(false);
      }
    };
    fetchReceptionists();
  }, []);

  useEffect(() => {
    const fetchAdmins = async () => {
      setIsLoadingAdmins(true);
      try {
        const response = await api.admins.getAll();
        setAdminsList(response);
      } catch (error) {
        console.error('Error fetching admins:', error);
      } finally {
        setIsLoadingAdmins(false);
      }
    };
    fetchAdmins();
  }, []);

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

  // Function to refresh all staff lists
  const refreshStaffLists = async () => {
    // Refresh doctors
    setIsLoadingDoctors(true);
    try {
      const doctorsResponse = await api.doctors.getAll();
      setDoctorsList(doctorsResponse);
    } catch (error) {
      console.error('Error refreshing doctors:', error);
    } finally {
      setIsLoadingDoctors(false);
    }

    // Refresh receptionists
    setIsLoadingReceptionists(true);
    try {
      const receptionistsResponse = await api.receptionists.getAll();
      setReceptionistsList(receptionistsResponse);
    } catch (error) {
      console.error('Error refreshing receptionists:', error);
    } finally {
      setIsLoadingReceptionists(false);
    }

    // Refresh admins
    setIsLoadingAdmins(true);
    try {
      const adminsResponse = await api.admins.getAll();
      setAdminsList(adminsResponse);
    } catch (error) {
      console.error('Error refreshing admins:', error);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  // Filter staff by role and search term
  const filterStaff = (role: string) => {
    return staff.filter(user => 
      user.role === role && 
      ((user.first_name + ' ' + user.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Filter doctors by search term
  const filterDoctors = () => {
    return doctorsList.filter(doctor => 
      ((doctor.first_name + ' ' + doctor.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
       doctor.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Filter receptionists by search term
  const filterReceptionists = () => {
    return receptionistsList.filter(receptionist => 
      ((receptionist.first_name + ' ' + receptionist.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
       receptionist.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Filter admins by search term
  const filterAdmins = () => {
    return adminsList.filter(admin => 
      ((admin.first_name + ' ' + admin.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
       admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const doctors = filterStaff('doctor');
  const filteredDoctors = filterDoctors();
  const receptionists = filterStaff('receptionist');
  const filteredReceptionists = filterReceptionists();
  const admins = filterStaff('admin');
  const filteredAdmins = filterAdmins();

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
      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      const response = await axios.post('http://127.0.0.1:8000/api/staff/', {
        username: newStaff.username || newStaff.email, // Use username or fallback to email
        email: newStaff.email,
        password: tempPassword, // Use auto-generated password
        first_name: newStaff.name.split(' ')[0], // Extract first name
        last_name: newStaff.name.split(' ').slice(1).join(' '), // Extract last name
        role: newStaff.role,
        is_active: newStaff.status === 'active',
        is_staff: newStaff.role !== 'doctor', // Doctors are not Django staff by default
        is_superuser: newStaff.role === 'admin', // Only admins are superusers
        send_email: true, // Flag to send email with credentials
        temp_password: tempPassword, // Send temp password for email
      });
      console.log('Staff added successfully:', response.data);
  
      alert('Staff member added successfully! Login credentials have been sent to their email.');
      setNewStaff({ name: "", username: "", email: "", phone: "", role: "", status: "active", password: ""});
      setIsDialogOpen(false); // Close the dialog
      
      // Refresh the staff lists without reloading the page
      await refreshStaffLists();
    } catch (error) {
      console.error('Error adding staff:', error.response?.data || error.message);
      alert(`Failed to add staff member: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle viewing staff details
  const handleViewDetails = async (staffMember: Doctor | Receptionist | Admin) => {
    try {
      const details = await api.staff.getDetails(staffMember.id);
      setSelectedStaff(details);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error fetching staff details:', error);
      alert('Failed to fetch staff details');
    }
  };

  // Handle editing staff
  const handleEditStaff = async (staffMember: Doctor | Receptionist | Admin) => {
    try {
      const details = await api.staff.getDetails(staffMember.id);
      setSelectedStaff(details);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching staff details:', error);
      alert('Failed to fetch staff details');
    }
  };

  // Handle staff update
  const handleStaffUpdate = () => {
    setIsDetailModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedStaff(null);
    refreshStaffLists();
  };

  // Get permission summary for a staff member
  const getPermissionSummary = (staffMember: Doctor | Receptionist | Admin) => {
    const permissions = [
      staffMember.can_manage_appointments && 'Appointments',
      staffMember.can_manage_patients && 'Patients',
      staffMember.can_manage_staff && 'Staff',
      staffMember.can_view_reports && 'Reports',
      staffMember.can_manage_clinic_settings && 'Settings',
    ].filter(Boolean);
    
    return permissions.length > 0 ? permissions.join(', ') : 'No permissions assigned';
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  Create a new account for a staff member. A temporary password will be sent to their email.
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
          {isLoadingDoctors ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                Loading doctors...
              </CardContent>
            </Card>
          ) : filteredDoctors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                No doctors match your search criteria.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map(doctor => (
                    <TableRow key={doctor.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={doctor.image} alt={`${doctor.first_name} ${doctor.last_name}`} />
                            <AvatarFallback>{doctor.first_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{`${doctor.first_name} ${doctor.last_name}`}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {doctor.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate max-w-[150px]" title={getPermissionSummary(doctor)}>
                            {getPermissionSummary(doctor)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={doctor.is_active !== false ? "secondary" : "destructive"} 
                          className={doctor.is_active !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                        >
                          {doctor.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(doctor)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditStaff(doctor)} title="Edit Staff">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="receptionists" className="space-y-4 mt-6">
          {isLoadingReceptionists ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                Loading receptionists...
              </CardContent>
            </Card>
          ) : filteredReceptionists.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                No receptionists match your search criteria.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receptionist</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceptionists.map(receptionist => (
                    <TableRow key={receptionist.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={receptionist.image} alt={`${receptionist.first_name} ${receptionist.last_name}`} />
                            <AvatarFallback>{receptionist.first_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{`${receptionist.first_name} ${receptionist.last_name}`}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {receptionist.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate max-w-[150px]" title={getPermissionSummary(receptionist)}>
                            {getPermissionSummary(receptionist)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={receptionist.is_active !== false ? "secondary" : "destructive"} 
                          className={receptionist.is_active !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                        >
                          {receptionist.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(receptionist)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditStaff(receptionist)} title="Edit Staff">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="admins" className="space-y-4 mt-6">
          {isLoadingAdmins ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                Loading administrators...
              </CardContent>
            </Card>
          ) : filteredAdmins.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground">
                No administrators match your search criteria.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrator</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map(admin => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={admin.image} alt={`${admin.first_name} ${admin.last_name}`} />
                            <AvatarFallback>{admin.first_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{`${admin.first_name} ${admin.last_name}`}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate max-w-[150px]" title={getPermissionSummary(admin)}>
                            {getPermissionSummary(admin)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={admin.is_active !== false ? "secondary" : "destructive"} 
                          className={admin.is_active !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                        >
                          {admin.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(admin)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditStaff(admin)} title="Edit Staff">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Staff Detail Modal */}
      <StaffDetailModal 
        staff={selectedStaff}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* Staff Edit Modal */}
      <StaffEditModal 
        staff={selectedStaff}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleStaffUpdate}
      />
    </div>
  );
};

export default StaffPage;
