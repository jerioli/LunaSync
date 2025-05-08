import React, { useState } from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserPlus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import AddPatientModal from '@/components/patients/AddPatientModal';
import { Patient } from '@/lib/mock-data';

const PatientsList = () => {
  const { patients, updatePatient, addPatient } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  
  // Filter patients based on search query
  const filteredPatients = patients.filter(patient => 
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery) ||
    (patient.maritalStatus || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPatient = (patient: Patient) => {
    const newPatient = {
      ...patient,
      id: Date.now().toString(), // Generate a unique ID
    };
  
    if (addPatient) {
      addPatient(newPatient);
    } else {
      updatePatient(newPatient.id, newPatient);
    }
  
    toast({
      title: "Patient Added",
      description: `${newPatient.name} has been successfully added.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patients</h1>
        <Button onClick={() => setIsAddPatientModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add New Patient
        </Button>
      </div>
      
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
                    <TableCell>{format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div>{patient.email}</div>
                      <div className="text-sm text-muted-foreground">{patient.phone}</div>
                    </TableCell>
                    <TableCell className="capitalize">{patient.maritalStatus || 'N/A'}</TableCell>
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
                    No patients found. Try a different search term.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Patient Modal */}
      <AddPatientModal 
        open={isAddPatientModalOpen}
        onOpenChange={setIsAddPatientModalOpen}
        onAddPatient={handleAddPatient}
      />
    </div>
  );
};

export default PatientsList;