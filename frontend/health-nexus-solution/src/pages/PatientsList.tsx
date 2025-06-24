import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserPlus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Patient } from '@/lib/mock-data';
import { useClinic } from '@/contexts/ClinicContext';
import axios from 'axios';

// Set the base URL for axios
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

const PatientsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patients, fetchPatients, currentUser } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Role-based access control
  const isDoctor = currentUser?.role === 'doctor';
  const isReceptionist = currentUser?.role === 'receptionist';
  const canAddPatients = isDoctor || isReceptionist;
  
  // Redirect unauthorized users
  React.useEffect(() => {
    if (currentUser && !isDoctor && !isReceptionist) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to view patient records.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [currentUser, isDoctor, isReceptionist, navigate, toast]);
  
  // Fetch patients when component mounts
  useEffect(() => {
    if (fetchPatients && (isDoctor || isReceptionist)) {
      fetchPatients();
    }
  }, [fetchPatients, isDoctor, isReceptionist]);

  // Filter patients based on search query
  const filteredPatients = patients?.filter(patient => 
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery) ||
    (patient.marital_status || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Don't render anything if user doesn't have permission
  if (currentUser && !isDoctor && !isReceptionist) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
        {canAddPatients && (
          <Button onClick={() => navigate('/patients/add')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Patient
          </Button>
        )}
      </div>

      {/* Role-based information banner */}
      {isReceptionist && !isDoctor && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> As a receptionist, you can add and edit personal information. Medical data can only be modified by doctors.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient Records</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Civil Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {patient.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{patient.gender}</TableCell>
                    <TableCell>
                      {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>{patient.email}</div>
                      <div className="text-sm text-muted-foreground">{patient.phone}</div>
                    </TableCell>
                    <TableCell className="capitalize">{patient.marital_status || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Record
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {patients?.length === 0 ? 'No patients found.' : 'No patients match your search criteria.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientsList;