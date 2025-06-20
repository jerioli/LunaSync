import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, Edit } from 'lucide-react';
import PatientPersonalInfo from '@/components/patients/PatientPersonalInfo';
import PatientMedicalInfo from '@/components/patients/PatientMedicalInfo';
import { Patient } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const PatientManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patients, updatePatient, deletePatient } = useClinic();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'medical'>('personal'); // Track active tab
  const [patientData, setPatientData] = useState<Patient | null>(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        // First try to get from context
        if (patients && patients.length > 0) {
          const patient = patients.find((p) => String(p.id) === String(id));
          if (patient) {
            setPatientData(patient);
            return;
          }
        }

        // If not in context, try localStorage
        const stored = localStorage.getItem('patientsList');
        if (stored) {
          const storedPatients = JSON.parse(stored);
          const patient = storedPatients.find((p: Patient) => String(p.id) === String(id));
          if (patient) {
            setPatientData(patient);
            return;
          }
        }

        // If still not found, try API
        const response = await axios.get(`/patients/${id}/`);
        if (response.data) {
          setPatientData(response.data as Patient);
          // Update localStorage with the fetched data
          const stored = localStorage.getItem('patientsList');
          let updated = [];
          if (stored) {
            updated = JSON.parse(stored);
            const existingIndex = updated.findIndex((p: Patient) => String(p.id) === String(id));
            if (existingIndex >= 0) {
              updated[existingIndex] = response.data;
            } else {
              updated.push(response.data);
            }
          } else {
            updated = [response.data];
          }
          localStorage.setItem('patientsList', JSON.stringify(updated));
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load patient data. Please try again.',
          variant: 'destructive',
        });
      }
    };

    fetchPatientData();
  }, [id, patients, toast]);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (patientData) {
      setIsLoading(false);
    }
  }, [patientData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-xl">Loading patient data...</div>
      </div>
    );
  }

  if (!patientData) {
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

  const handleSave = async () => {
    if (!patientData) return;
    try {
      const response = await axios.put(`/patients/${patientData.id}/`, patientData);
      // Optionally update localStorage
      const stored = localStorage.getItem('patientsList');
      let updated = [];
      if (stored) {
        updated = JSON.parse(stored).map((p: Patient) => String(p.id) === String(patientData.id) ? response.data : p);
        localStorage.setItem('patientsList', JSON.stringify(updated));
      }
      setIsEditing(false);
      toast({
        title: 'Patient record updated',
        description: 'Patient information has been successfully updated.',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to update patient. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    const originalPatient = patients.find((p) => p.id === id);
    if (originalPatient) {
      setPatientData(originalPatient);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!patientData) return;
    try {
      await axios.delete(`/patients/${patientData.id}/`); // Use leading slash for correct baseURL
      // Remove from localStorage
      const stored = localStorage.getItem('patientsList');
      let updated = [];
      if (stored) {
        updated = JSON.parse(stored).filter((p: Patient) => String(p.id) !== String(patientData.id));
        localStorage.setItem('patientsList', JSON.stringify(updated));
      }
      setPatientData(null);
      toast({
        title: 'Patient record deleted',
        description: 'Patient information has been successfully deleted.',
        variant: 'destructive',
      });
      navigate('/patients');
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to delete patient. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleNext = () => {
    setActiveTab('medical'); // Switch to the medical information tab
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/patients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{patientData.name}</h1>
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'personal' | 'medical')}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Personal Information</TabsTrigger>
          <TabsTrigger value="medical">Medical Information</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <PatientPersonalInfo
            patient={patientData}
            isEditing={isEditing}
            onUpdate={(updatedData) => setPatientData({ ...patientData, ...updatedData })}
          />
          {isEditing && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleNext}>
                Next: Medical Information
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="medical">
          <PatientMedicalInfo
            patient={patientData}
            isEditing={isEditing}
            onUpdate={(updatedData) => setPatientData({ ...patientData, ...updatedData })}
          />
          {/* Display medical info summary as in PatientsList */}
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <h2 className="text-lg font-semibold mb-2">Medical Information</h2>
            {patientData.medical_info ? (
              <div className="space-y-1">
                <div><span className="font-medium">Blood Type:</span> {patientData.medical_info.bloodType || 'N/A'}</div>
                <div><span className="font-medium">Allergies:</span> {patientData.medical_info.allergies?.join(', ') || 'None'}</div>
                <div><span className="font-medium">History:</span> {patientData.medical_info.medicalHistory || 'None'}</div>
              </div>
            ) : (
              <div className="text-muted-foreground">No medical info available.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    
  );
  
};

export default PatientManagement;