
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, Edit } from 'lucide-react';
import PatientPersonalInfo from '@/components/patients/PatientPersonalInfo';
import PatientMedicalInfo from '@/components/patients/PatientMedicalInfo';
import { Patient } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

const PatientManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patients, updatePatient } = useClinic();
  const [isEditing, setIsEditing] = useState(false);
  
  // Find the patient from the context
  const patient = patients.find(p => p.id === id);
  
  // Create a state to track changes to the patient data
  const [patientData, setPatientData] = useState<Patient | null>(patient || null);
  
  if (!patient || !patientData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-xl font-bold">Patient not found</div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate('/patients')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Patient List
        </Button>
      </div>
    );
  }
  
  const handleSave = () => {
    if (!patientData) return;
    
    updatePatient(patientData.id, patientData);
    setIsEditing(false);
    toast({
      title: "Patient record updated",
      description: "Patient information has been successfully updated.",
    });
  };
  
  const handleCancel = () => {
    setPatientData(patient);
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    // Implement delete functionality here
    toast({
      title: "Patient record deleted",
      description: "Patient information has been successfully deleted.",
      variant: "destructive"
    });
    navigate('/patients');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/patients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{patient.name}</h1>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Record
              </Button>
            </>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="medical">Medical Information</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <PatientPersonalInfo 
            patient={patientData} 
            isEditing={isEditing}
            onUpdate={(updatedData) => setPatientData({...patientData, ...updatedData})}
          />
        </TabsContent>
        <TabsContent value="medical">
          <PatientMedicalInfo 
            patient={patientData} 
            isEditing={isEditing}
            onUpdate={(updatedData) => setPatientData({...patientData, ...updatedData})}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientManagement;
