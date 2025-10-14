
import React, { useState, JSX } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClinic } from '@/contexts/ClinicContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Calendar, User } from 'lucide-react';

const Prescriptions = () => {
  const { currentUser, patients, prescriptions } = useClinic();
  const [searchTerm, setSearchTerm] = useState("");
  
  const isDoctor = currentUser?.role === 'doctor';
  
  // Filter prescriptions based on doctor ID if current user is a doctor
  const filteredPrescriptions = prescriptions.filter(prescription => {
    if (isDoctor && prescription.doctorId !== currentUser?.id) {
      return false;
    }
    
    const patient = patients.find(p => p.id === prescription.patientId);
    
    // Check medications array for search term
    const hasMatchingMedication = prescription.medications.some(med => 
      med.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return patient && (
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hasMatchingMedication ||
      (prescription.instructions && prescription.instructions.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  
  // Group prescriptions by patient
  const prescriptionsByPatient: Record<string, typeof prescriptions> = {};
  
  filteredPrescriptions.forEach(prescription => {
    if (!prescriptionsByPatient[prescription.patientId]) {
      prescriptionsByPatient[prescription.patientId] = [];
    }
    prescriptionsByPatient[prescription.patientId].push(prescription);
  });
  
  // Get patient name by ID
  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : "Unknown Patient";
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-muted-foreground">
            {isDoctor ? "Manage prescriptions for your patients" : "View all patient prescriptions"}
          </p>
        </div>
        
        {isDoctor && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Prescription</DialogTitle>
                <DialogDescription>
                  Add a new prescription for a patient
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="patient" className="text-right">
                    Patient
                  </Label>
                  <div className="col-span-3">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="medication" className="text-right">
                    Medication
                  </Label>
                  <Input id="medication" placeholder="Medication name" className="col-span-3" />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dosage" className="text-right">
                    Dosage
                  </Label>
                  <Input id="dosage" placeholder="e.g., 10mg" className="col-span-3" />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="frequency" className="text-right">
                    Frequency
                  </Label>
                  <Input id="frequency" placeholder="e.g., Twice daily" className="col-span-3" />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="text-right">
                    Duration
                  </Label>
                  <Input id="duration" placeholder="e.g., 7 days" className="col-span-3" />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">
                    Quantity
                  </Label>
                  <Input id="quantity" placeholder="e.g., 20 tablets" className="col-span-3" />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="refillsInput" className="text-right">
                    Refills
                  </Label>
                  <Input id="refillsInput" placeholder="e.g., 3" className="col-span-3" />
                </div>
                
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="instructions" className="text-right pt-2">
                    Instructions
                  </Label>
                  <Textarea id="instructions" placeholder="Special instructions for the patient" className="col-span-3" />
                </div>
              </div>
              
              <DialogFooter>
                <Button>Create Prescription</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="flex items-center px-4 border rounded-md">
        <Search className="w-4 h-4 mr-2 text-muted-foreground" />
        <Input 
          placeholder="Search prescriptions by patient name or medication..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0"
        />
      </div>
      
      {Object.entries(prescriptionsByPatient).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No prescriptions found</h3>
            <p className="text-muted-foreground mt-2">
              {searchTerm
                ? "No prescriptions match your search criteria."
                : isDoctor
                ? "You haven't created any prescriptions yet."
                : "There are no prescriptions in the system."
              }
            </p>
            {isDoctor && (
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Prescription
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(prescriptionsByPatient).map(([patientId, patientPrescriptions]) => (
            <Card key={patientId} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-2">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{getPatientName(patientId).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <CardTitle>{getPatientName(patientId)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="divide-y">
                {patientPrescriptions.map(prescription => (
                  <div key={prescription.id} className="py-4 first:pt-6 last:pb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                      <div className="font-medium">
                        {prescription.medications.map(med => med.name).join(", ")}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 md:mt-0">
                        Prescribed on {new Date(prescription.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      {prescription.medications.map((med, index) => (
                        <div key={index}>
                          <span className="font-medium">{med.name}:</span> {med.dosage}, {med.frequency}, for {med.duration}
                        </div>
                      ))}
                      {prescription.instructions && (
                        <div>
                          <span className="font-medium">Instructions:</span> {prescription.instructions}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
