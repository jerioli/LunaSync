import MedicalCertificateGenerator from '@/components/patients/MedicalCertificateGenerator';
import PatientMedicalInfo from '@/components/patients/PatientMedicalInfo';
import PatientPersonalInfo from '@/components/patients/PatientPersonalInfo';
import PatientPhysicalExamination from '@/components/patients/PatientPhysicalExamination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { Patient } from '@/lib/mock-data';
import { medicalDocumentsAPI, type LabResult as APILabResult } from '@/services/medicalDocumentsAPI';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Eye, File, FileText, Heart, Plus, Save, Stethoscope, TestTube, Trash2, Upload, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Set the base URL for axios
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

const PatientManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patients, updatePatient, deletePatient, currentUser, fetchPatients, clinicCustomization } = useClinic();
  
  // Helper function to get logo URL
  const getLogoUrl = (logo: string) => {
    if (!logo) return null;
    if (logo.startsWith('http')) return logo;
    if (logo.startsWith('/media/')) return `http://127.0.0.1:8000${logo}`;
    if (logo.startsWith('branding/')) return `http://127.0.0.1:8000/media/${logo}`;
    return `http://127.0.0.1:8000${logo}`;
  };
  
  // Role-based access control
  const isDoctor = currentUser?.role === 'doctor';
  const isReceptionist = currentUser?.role === 'receptionist';
  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isDoctor || isReceptionist || isAdmin; // Admins can edit
  const canDelete = isDoctor || isAdmin; // Doctors and admins can delete patient records
  
  // Document management state
  const [certificates, setCertificates] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [soapNotes, setSoapNotes] = useState<any[]>([]);
  const [blankNotes, setBlankNotes] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<APILabResult[]>([]);
  
  // Document creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDocumentType, setCreateDocumentType] = useState<'prescription' | 'soap' | 'blank' | null>(null);
  const [documentData, setDocumentData] = useState<any>({});
  const [prescriptionTab, setPrescriptionTab] = useState('New');
  
  // Redirect unauthorized users
  React.useEffect(() => {
    if (currentUser && !isDoctor && !isReceptionist && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to view patient records.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [currentUser, isDoctor, isReceptionist, isAdmin, navigate, toast]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'physical' | 'medical' | 'documents'>('overview'); // Updated tab types
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Initial load effect - only runs once per patient ID
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        // First ensure we have fresh data from backend
        if (fetchPatients) {
          await fetchPatients();
        }
        
        // Then try to get from context
        if (patients && patients.length > 0) {
          const patient = patients.find((p) => String(p.id) === String(id));
          if (patient) {
            setPatientData(patient);
            setInitialLoadComplete(true);
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
            setInitialLoadComplete(true);
            return;
          }
        }

        // If still not found, try API directly
        const response = await axios.get(`patients/${id}/`);
        if (response.data) {

          setPatientData(response.data);
          setInitialLoadComplete(true);



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
        setInitialLoadComplete(true);
        toast({
          title: 'Error',
          description: 'Failed to load patient data. Please try again.',
          variant: 'destructive',
        });
      }
    };

    // Only fetch if we haven't completed initial load and we're not editing
    if (!initialLoadComplete && !isEditing) {
      fetchPatientData();
    }
  }, [id, toast, fetchPatients, initialLoadComplete, isEditing, patients]);

  // Reset initial load flag when patient ID changes
  useEffect(() => {
    setInitialLoadComplete(false);
    setPatientData(null);
  }, [id]);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (patientData && initialLoadComplete) {
      setIsLoading(false);
    }
  }, [patientData, initialLoadComplete]);

  // Certificate management functions
  const handleSaveCertificate = (certificate: any) => {
    setCertificates(prev => [...prev, certificate]);
    
    // Also save to localStorage for persistence
    const storageKey = `certificates_patient_${id}`;
    const existingCertificates = localStorage.getItem(storageKey);
    const certificates = existingCertificates ? JSON.parse(existingCertificates) : [];
    certificates.push(certificate);
    localStorage.setItem(storageKey, JSON.stringify(certificates));
    
    toast({
      title: 'Certificate saved',
      description: 'Medical certificate has been generated and saved successfully.',
    });
  };

  const handleDeleteCertificate = (certificateId: number) => {
    setCertificates(prev => prev.filter(cert => cert.id !== certificateId));
    
    // Also remove from localStorage
    const storageKey = `certificates_patient_${id}`;
    const existingCertificates = localStorage.getItem(storageKey);
    if (existingCertificates) {
      const certificates = JSON.parse(existingCertificates);
      const updatedCertificates = certificates.filter((cert: any) => cert.id !== certificateId);
      localStorage.setItem(storageKey, JSON.stringify(updatedCertificates));
    }
    
    toast({
      title: 'Certificate deleted',
      description: 'Medical certificate has been deleted successfully.',
    });
  };

  const handleDeleteLabResult = async (labResultId: string) => {
    if (!window.confirm('Are you sure you want to delete this lab result? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from backend
      await medicalDocumentsAPI.deleteLabResult(labResultId);
      
      // Update local state
      setLabResults(prev => prev.filter(result => result.id !== labResultId));
      
      toast({
        title: 'Lab result deleted',
        description: 'Lab result has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting lab result:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lab result. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Document creation functions
  const handleCreateDocument = (type: 'prescription' | 'soap' | 'blank') => {
    setCreateDocumentType(type);
    setDocumentData({});
    if (type === 'prescription') {
      setPrescriptionTab('New');
      setDocumentData({
        nameType: '',
        name: '',
        dose: '',
        quantity: '',
        frequency: '',
        customFrequency: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        notes: ''
      });
    } else if (type === 'soap') {
      setDocumentData({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
    } else if (type === 'blank') {
      setDocumentData({
        title: '',
        content: ''
      });
    }
    setShowCreateDialog(true);
  };

  const handleSaveDocument = () => {
    if (!createDocumentType) return;

    const document = {
      id: Date.now(),
      type: createDocumentType,
      patientId: patientData?.id,
      patientName: patientData?.name,
      dateCreated: new Date().toISOString(),                                                                                                                                                                                                                                                                                                                      
      data: documentData,
      createdBy: currentUser?.name || 'Unknown'
    };

    // Save to appropriate state
    if (createDocumentType === 'prescription') {
      setPrescriptions(prev => [...prev, document]);
      const storageKey = `prescriptions_patient_${id}`;
      const existing = localStorage.getItem(storageKey);
      const docs = existing ? JSON.parse(existing) : [];
      docs.push(document);
      localStorage.setItem(storageKey, JSON.stringify(docs));
    } else if (createDocumentType === 'soap') {
      setSoapNotes(prev => [...prev, document]);
      const storageKey = `soapnotes_patient_${id}`;
      const existing = localStorage.getItem(storageKey);
      const docs = existing ? JSON.parse(existing) : [];
      docs.push(document);
      localStorage.setItem(storageKey, JSON.stringify(docs));
    } else if (createDocumentType === 'blank') {
      setBlankNotes(prev => [...prev, document]);
      const storageKey = `blanknotes_patient_${id}`;
      const existing = localStorage.getItem(storageKey);
      const docs = existing ? JSON.parse(existing) : [];
      docs.push(document);
      localStorage.setItem(storageKey, JSON.stringify(docs));
    }

    toast({
      title: 'Document saved',
      description: `${createDocumentType === 'prescription' ? 'E-Prescription' : createDocumentType === 'soap' ? 'SOAP Note' : 'Blank Note'} has been saved successfully.`,
    });

    setShowCreateDialog(false);
    setCreateDocumentType(null);
    setDocumentData({});
  };

  const handleDeleteDocument = (docId: number, type: 'prescription' | 'soap' | 'blank') => {
    if (type === 'prescription') {
      setPrescriptions(prev => prev.filter(doc => doc.id !== docId));
      const storageKey = `prescriptions_patient_${id}`;
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const docs = JSON.parse(existing);
        const updated = docs.filter((doc: any) => doc.id !== docId);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } else if (type === 'soap') {
      setSoapNotes(prev => prev.filter(doc => doc.id !== docId));
      const storageKey = `soapnotes_patient_${id}`;
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const docs = JSON.parse(existing);
        const updated = docs.filter((doc: any) => doc.id !== docId);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } else if (type === 'blank') {
      setBlankNotes(prev => prev.filter(doc => doc.id !== docId));
      const storageKey = `blanknotes_patient_${id}`;
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const docs = JSON.parse(existing);
        const updated = docs.filter((doc: any) => doc.id !== docId);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    }

    toast({
      title: 'Document deleted',
      description: 'Document has been deleted successfully.',
    });
  };

  const handleDocumentInputChange = (field: string, value: string) => {
    setDocumentData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleViewCertificate = (certificate: any) => {
    // Open certificate in a new window for viewing/printing
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Medical Certificate</title>
          <style>
            body { margin: 0; padding: 20px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${certificate.content}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleDownloadCertificate = (certificate: any) => {
    // Create a downloadable HTML file
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Certificate - ${certificate.data.patientName}</title>
        <meta charset="utf-8">
      </head>
      <body>
        ${certificate.content}
      </body>
      </html>
    `], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Medical_Certificate_${certificate.data.patientName}_${format(new Date(certificate.dateCreated), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load certificates from localStorage on component mount
  useEffect(() => {
    if (id) {
      // Load certificates
      const certificatesKey = `certificates_patient_${id}`;
      const existingCertificates = localStorage.getItem(certificatesKey);
      if (existingCertificates) {
        setCertificates(JSON.parse(existingCertificates));
      }

      // Load prescriptions
      const prescriptionsKey = `prescriptions_patient_${id}`;
      const existingPrescriptions = localStorage.getItem(prescriptionsKey);
      if (existingPrescriptions) {
        setPrescriptions(JSON.parse(existingPrescriptions));
      }

      // Load SOAP notes
      const soapKey = `soapnotes_patient_${id}`;
      const existingSoap = localStorage.getItem(soapKey);
      if (existingSoap) {
        setSoapNotes(JSON.parse(existingSoap));
      }

      // Load blank notes
      const blankKey = `blanknotes_patient_${id}`;
      const existingBlank = localStorage.getItem(blankKey);
      if (existingBlank) {
        setBlankNotes(JSON.parse(existingBlank));
      }

      // Load lab results from database
      loadLabResults();
    }
  }, [id]);

  // Function to load lab results from database
  const loadLabResults = async () => {
    if (!id) return;
    
    try {
      const results = await medicalDocumentsAPI.getLabResultsByPatient(id);
      setLabResults(results.lab_results || []);
    } catch (error) {
      console.error('Failed to load lab results:', error);
      // Fallback to localStorage for backward compatibility
      const labKey = `labresults_patient_${id}`;
      const existingLab = localStorage.getItem(labKey);
      if (existingLab) {
        try {
          const parsedLab = JSON.parse(existingLab);
          setLabResults(Array.isArray(parsedLab) ? parsedLab : []);
        } catch (parseError) {
          console.error('Error parsing localStorage lab results:', parseError);
          setLabResults([]);
        }
      } else {
        setLabResults([]);
      }
    }
  };

  // Listen for lab results updates when returning from Lab Results page
  useEffect(() => {
    const handleFocus = () => {
      // Reload lab results when window regains focus (when returning from Lab Results page)
      if (id) {
        loadLabResults();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

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
    
    // Check permissions
    if (!canEdit) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to edit patient records.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Filter data based on role - receptionists can only update personal info
      let dataToSend = { ...patientData };
      if (isReceptionist && !isDoctor) {
        // Keep original medical_info and physical_examination for receptionists - don't send modified medical data
        const originalPatient = patients.find((p) => String(p.id) === String(patientData.id));
        if (originalPatient) {
          dataToSend.medical_info = originalPatient.medical_info;
          dataToSend.physical_examination = originalPatient.physical_examination;
        }
      }
      
      // Ensure medical_info has the correct structure
      if (dataToSend.medical_info) {
        dataToSend.medical_info = {
          bloodType: dataToSend.medical_info.bloodType || '',
          allergies: dataToSend.medical_info.allergies || [],
          medicalHistory: dataToSend.medical_info.medicalHistory || ''
        };
      }
      
      console.log('Sending data:', dataToSend); // Debug log
      
      const response = await axios.put(`patients/${patientData.id}/`, dataToSend);
      
      // Update the context state
      updatePatient(patientData.id, response.data);
      
      // Update local state with the response data
      setPatientData(response.data);
      
      // Update localStorage
      const stored = localStorage.getItem('patientsList');
      if (stored) {
        const storedPatients = JSON.parse(stored);
        const updatedPatients = storedPatients.map((p: Patient) => 
          String(p.id) === String(patientData.id) ? response.data : p
        );
        localStorage.setItem('patientsList', JSON.stringify(updatedPatients));
      }
      
      setIsEditing(false);
      toast({
        title: 'Patient record updated',
        description: 'Patient information has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating patient:', error);
      let errorMessage = 'Failed to update patient. Please try again later.';
      
      if (error.response?.data) {
        // Show specific validation errors if available
        errorMessage = JSON.stringify(error.response.data);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data from context or localStorage
    const originalPatient = patients.find((p) => String(p.id) === String(id));
    if (originalPatient) {
      setPatientData(originalPatient);
    } else {
      // Try localStorage as fallback
      const stored = localStorage.getItem('patientsList');
      if (stored) {
        const storedPatients = JSON.parse(stored);
        const patient = storedPatients.find((p: Patient) => String(p.id) === String(id));
        if (patient) {
          setPatientData(patient);
        }
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!patientData) return;
    
    // Check permissions
    if (!canDelete) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to delete patient records.',
        variant: 'destructive',
      });
      return;
    }
    
    // Add confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${patientData.name}'s record? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    setIsDeleting(true);
    
    try {
      await axios.delete(`patients/${patientData.id}/`);
      
      // Update the context state
      deletePatient(patientData.id);
      
      // Remove from localStorage
      const stored = localStorage.getItem('patientsList');
      if (stored) {
        const storedPatients = JSON.parse(stored);
        const updatedPatients = storedPatients.filter((p: Patient) => 
          String(p.id) !== String(patientData.id)
        );
        localStorage.setItem('patientsList', JSON.stringify(updatedPatients));
      }
      
      toast({
        title: 'Patient record deleted',
        description: 'Patient information has been successfully deleted.',
      });
      
      navigate('/patients');
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete patient. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNext = () => {
    if (activeTab === 'overview') setActiveTab('personal');
    else if (activeTab === 'personal') setActiveTab('physical');
    else if (activeTab === 'physical') setActiveTab('medical');
    else if (activeTab === 'medical') setActiveTab('documents');
  };

  const renderPatientOverview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Patient Overview
        </CardTitle>
        <CardDescription>
          Complete patient information summary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="space-y-1">
              <div><span className="font-medium">Name:</span> {patientData.name}</div>
              <div><span className="font-medium">Age:</span> {patientData.date_of_birth ? 
                new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear() : 'N/A'} years</div>
              <div><span className="font-medium">Gender:</span> <span className="capitalize">{patientData.gender}</span></div>
              <div><span className="font-medium">Phone:</span> {patientData.phone}</div>
              <div><span className="font-medium">Email:</span> {patientData.email}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Medical Summary</h3>
            <div className="space-y-1">
              <div><span className="font-medium">Blood Type:</span> {patientData.medical_info?.bloodType || 'N/A'}</div>
              <div><span className="font-medium">Known Allergies:</span> {patientData.medical_info?.allergies?.length ? patientData.medical_info.allergies.length : 'None'}</div>
              <div><span className="font-medium">Registration:</span> {patientData.registrationDate ? 
                format(new Date(patientData.registrationDate), 'MMM dd, yyyy') : 'N/A'}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Physical Examination</h3>
            <div className="space-y-1">
              <div><span className="font-medium">Height:</span> {patientData.physical_examination?.height || 'Not recorded'}</div>
              <div><span className="font-medium">Weight:</span> {patientData.physical_examination?.weight || 'Not recorded'}</div>
              <div><span className="font-medium">Blood Pressure:</span> {patientData.physical_examination?.bloodPressure || 'Not recorded'}</div>
              <div><span className="font-medium">Temperature:</span> {patientData.physical_examination?.temperature || 'Not recorded'}</div>
              <div><span className="font-medium">Pulse Rate:</span> {patientData.physical_examination?.pulseRate || 'Not recorded'}</div>
              <div><span className="font-medium">Respiratory Rate:</span> {patientData.physical_examination?.respiratoryRate || 'Not recorded'}</div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Recent Activity */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Recent Activity</h3>
          <div className="text-sm text-muted-foreground">
            Last updated: {patientData.registrationDate ? 
              format(new Date(patientData.registrationDate), 'PPP') : 'N/A'}
          </div>
        </div>
      </CardContent>
    </Card>
  );



  const renderDocuments = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents & Records
        </CardTitle>
        <CardDescription>
          E-Prescriptions, SOAP Notes, Lab Results, and Medical Certificates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* E-Prescriptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  Rx
                </div>
                <h3 className="font-semibold">E-Prescriptions</h3>
              </div>
              {isDoctor && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCreateDocument('prescription')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {prescriptions.length > 0 ? (
                prescriptions.map((prescription, index) => (
                  <div key={prescription.id || index} className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          Rx
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{prescription.data.name}</div>
                          <div className="text-xs text-blue-600">
                            {prescription.data.dose} | {prescription.data.frequency}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {new Date(prescription.dateCreated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Helper function to get proper logo URL
                            const getFullLogoUrl = (logo: string) => {
                              if (!logo) return null;
                              // If it's already a full URL, return as-is
                              if (logo.startsWith('http')) return logo;
                              // If it starts with /media/, add the base URL
                              if (logo.startsWith('/media/')) return `http://127.0.0.1:8000${logo}`;
                              // If it starts with branding/, add the full path
                              if (logo.startsWith('branding/')) return `http://127.0.0.1:8000/media/${logo}`;
                              // If it's just a filename, assume it's in branding folder
                              if (!logo.includes('/')) return `http://127.0.0.1:8000/media/branding/${logo}`;
                              // Otherwise, add base URL
                              return `http://127.0.0.1:8000${logo.startsWith('/') ? logo : '/' + logo}`;
                            };
                            
                            const logoUrl = getFullLogoUrl(clinicCustomization?.logo);
                            const content = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>E-Prescription</title>
                                <style>
                                  body { 
                                    font-family: Arial, sans-serif; 
                                    padding: 20px; 
                                    margin: 0;
                                    background-color: #f8fafc;
                                  }
                                  .prescription-container {
                                    max-width: 800px;
                                    margin: 0 auto;
                                    background: white;
                                    border-radius: 10px;
                                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                    overflow: hidden;
                                  }
                                  .logo-header {
                                    background: white;
                                    padding: 30px 20px 20px 20px;
                                    text-align: center;
                                    border-bottom: 3px solid #3b82f6;
                                  }
                                  .logo-header img {
                                    max-height: 100px;
                                    max-width: 400px;
                                    margin-bottom: 15px;
                                    object-fit: contain;
                                  }
                                  .clinic-info {
                                    color: #6b7280;
                                    font-size: 14px;
                                    line-height: 1.5;
                                  }
                                  .clinic-info .clinic-name {
                                    font-size: 24px;
                                    font-weight: bold;
                                    color: #3b82f6;
                                    margin-bottom: 10px;
                                  }
                                  .header {
                                    background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
                                    color: white;
                                    padding: 20px;
                                    text-align: center;
                                  }
                                  .rx-symbol {
                                    display: inline-block;
                                    background: rgba(255,255,255,0.2);
                                    color: white;
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                    line-height: 40px;
                                    text-align: center;
                                    font-weight: bold;
                                    font-size: 18px;
                                    margin-right: 10px;
                                    border: 2px solid rgba(255,255,255,0.3);
                                  }
                                  .content {
                                    padding: 30px;
                                  }
                                  .prescription-details {
                                    background: #f8fafc;
                                    border-left: 4px solid #3b82f6;
                                    padding: 20px;
                                    margin: 20px 0;
                                    border-radius: 0 8px 8px 0;
                                  }
                                  .detail-row {
                                    margin: 10px 0;
                                    display: flex;
                                    align-items: center;
                                  }
                                  .detail-label {
                                    font-weight: bold;
                                    min-width: 120px;
                                    color: #374151;
                                  }
                                  .detail-value {
                                    color: #1f2937;
                                  }
                                  .footer {
                                    background: #f1f5f9;
                                    padding: 20px;
                                    text-align: center;
                                    border-top: 1px solid #e2e8f0;
                                    font-size: 12px;
                                    color: #6b7280;
                                  }
                                  @media print {
                                    body { background: white; }
                                    .prescription-container { box-shadow: none; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="prescription-container">
                                  <div class="logo-header">
                                    ${logoUrl ? `
                                      <img src="${logoUrl}" alt="${clinicCustomization?.name || 'Clinic'} Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                                      <div class="clinic-name" style="display: none;">${clinicCustomization?.name || 'Medical Clinic'}</div>
                                    ` : `
                                      <div class="clinic-name">${clinicCustomization?.name || 'Medical Clinic'}</div>
                                    `}
                                    <div class="clinic-info">
                                      <div>${clinicCustomization?.address || ''}</div>
                                      <div>${clinicCustomization?.phone || ''}</div>
                                    </div>
                                  </div>
                                  
                                  <div class="header">
                                    <span class="rx-symbol">Rx</span>
                                    <h1 style="margin: 0; display: inline-block; vertical-align: middle;">Electronic Prescription</h1>
                                  </div>
                                  
                                  <div class="content">
                                    <div class="prescription-details">
                                      <div class="detail-row">
                                        <span class="detail-label">Patient:</span>
                                        <span class="detail-value">${prescription.patientName}</span>
                                      </div>
                                      <div class="detail-row">
                                        <span class="detail-label">Date:</span>
                                        <span class="detail-value">${new Date(prescription.dateCreated).toLocaleDateString()}</span>
                                      </div>
                                      <div class="detail-row">
                                        <span class="detail-label">Medication:</span>
                                        <span class="detail-value"><strong>${prescription.data.name}</strong> (${prescription.data.nameType})</span>
                                      </div>
                                      <div class="detail-row">
                                        <span class="detail-label">Dose:</span>
                                        <span class="detail-value">${prescription.data.dose}</span>
                                      </div>
                                      <div class="detail-row">
                                        <span class="detail-label">Quantity:</span>
                                        <span class="detail-value">${prescription.data.quantity}</span>
                                      </div>
                                      <div class="detail-row">
                                        <span class="detail-label">Frequency:</span>
                                        <span class="detail-value">${prescription.data.frequency === 'custom' ? prescription.data.customFrequency : prescription.data.frequency}</span>
                                      </div>
                                      <div class="detail-row">
                                        <span class="detail-label">Duration:</span>
                                        <span class="detail-value">${prescription.data.startDate} to ${prescription.data.endDate}</span>
                                      </div>
                                      ${prescription.data.notes ? `
                                        <div class="detail-row">
                                          <span class="detail-label">Notes:</span>
                                          <span class="detail-value">${prescription.data.notes}</span>
                                        </div>
                                      ` : ''}
                                      <div class="detail-row">
                                        <span class="detail-label">Prescribed by:</span>
                                        <span class="detail-value">${prescription.createdBy}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div class="footer">
                                    <p>This is an electronically generated prescription. Please present this document to your pharmacist.</p>
                                    <p>For verification, contact ${clinicCustomization?.name || 'our clinic'} at ${clinicCustomization?.phone || ''}</p>
                                  </div>
                                </div>
                              </body>
                              </html>
                            `;
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(content);
                              newWindow.document.close();
                            }
                          }}
                          title="View Prescription"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {isDoctor && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDocument(prescription.id, 'prescription')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Prescription"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      Rx
                    </div>
                    <div>
                      <div className="text-sm font-medium">No prescriptions available</div>
                      <div className="text-xs text-muted-foreground">
                        {isDoctor ? 'Click "Add" to create prescriptions' : 'Prescriptions will appear here when created by doctors'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* SOAP Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <h3 className="font-semibold">SOAP Notes</h3>
              </div>
              {isDoctor && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCreateDocument('soap')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {soapNotes.length > 0 ? (
                soapNotes.map((note, index) => (
                  <div key={note.id || index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">SOAP Note</div>
                        <div className="text-xs text-muted-foreground">
                          {note.data.assessment.substring(0, 50)}
                          {note.data.assessment.length > 50 ? '...' : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(note.dateCreated).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const content = `
                              <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>SOAP Note</h2>
                                <p><strong>Patient:</strong> ${note.patientName}</p>
                                <p><strong>Date:</strong> ${new Date(note.dateCreated).toLocaleDateString()}</p>
                                <h3>Subjective:</h3>
                                <p>${note.data.subjective}</p>
                                <h3>Objective:</h3>
                                <p>${note.data.objective}</p>
                                <h3>Assessment:</h3>
                                <p>${note.data.assessment}</p>
                                <h3>Plan:</h3>
                                <p>${note.data.plan}</p>
                                <p><strong>Created by:</strong> ${note.createdBy}</p>
                              </div>
                            `;
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(content);
                              newWindow.document.close();
                            }
                          }}
                          title="View SOAP Note"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {isDoctor && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDocument(note.id, 'soap')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete SOAP Note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">No SOAP notes available</div>
                  <div className="text-xs text-muted-foreground">
                    {isDoctor ? 'Click "Add" to create SOAP notes' : 'SOAP notes will appear here when created by doctors'}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Blank Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <h3 className="font-semibold">Clinical Notes</h3>
              </div>
              {isDoctor && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCreateDocument('blank')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {blankNotes.length > 0 ? (
                blankNotes.map((note, index) => (
                  <div key={note.id || index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{note.data.title || 'Clinical Note'}</div>
                        <div className="text-xs text-muted-foreground">
                          {note.data.content.substring(0, 50)}
                          {note.data.content.length > 50 ? '...' : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(note.dateCreated).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const content = `
                              <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>${note.data.title || 'Clinical Note'}</h2>
                                <p><strong>Patient:</strong> ${note.patientName}</p>
                                <p><strong>Date:</strong> ${new Date(note.dateCreated).toLocaleDateString()}</p>
                                <div style="margin-top: 20px; white-space: pre-wrap;">${note.data.content}</div>
                                <p><strong>Created by:</strong> ${note.createdBy}</p>
                              </div>
                            `;
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(content);
                              newWindow.document.close();
                            }
                          }}
                          title="View Note"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {isDoctor && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteDocument(note.id, 'blank')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">No clinical notes available</div>
                  <div className="text-xs text-muted-foreground">
                    {isDoctor ? 'Click "Add" to create clinical notes' : 'Clinical notes will appear here when created by doctors'}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Lab Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                <h3 className="font-semibold">Lab Results</h3>
              </div>
              {isDoctor && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/lab-results?patientId=${patientData?.id}&patientName=${encodeURIComponent(patientData?.name || '')}&returnTo=patient`)}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {labResults.length > 0 ? (
                labResults.map((result, index) => (
                  <div key={result.id || index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{result.test_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {result.test_category} | {result.document?.status || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Date: {result.document?.document_date ? new Date(result.document.document_date).toLocaleDateString() : 'Date not available'}
                        </div>
                        {result.laboratory_name && (
                          <div className="text-xs text-muted-foreground">
                            Lab: {result.laboratory_name}
                          </div>
                        )}
                        {(result.critical_values && result.critical_values.length > 0) && (
                          <div className="text-xs text-red-600 font-medium">
                            🚨 {result.critical_values.length} critical value(s)
                          </div>
                        )}
                        {(result.abnormal_values && result.abnormal_values.length > 0) && (
                          <div className="text-xs text-yellow-600 font-medium">
                            ⚠️ {result.abnormal_values.length} abnormal value(s)
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const content = `
                              <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>Lab Result</h2>
                                <p><strong>Patient:</strong> ${patientData.name}</p>
                                <p><strong>Test Name:</strong> ${result.test_name}</p>
                                <p><strong>Test Category:</strong> ${result.test_category}</p>
                                <p><strong>Specimen Type:</strong> ${result.specimen_type}</p>
                                <p><strong>Laboratory:</strong> ${result.laboratory_name || 'N/A'}</p>
                                <p><strong>Collection Date:</strong> ${result.collection_date ? new Date(result.collection_date).toLocaleDateString() : 'N/A'}</p>
                                <p><strong>Document Date:</strong> ${result.document?.document_date ? new Date(result.document.document_date).toLocaleDateString() : 'N/A'}</p>
                                <p><strong>Status:</strong> ${result.document?.status || 'Unknown'}</p>
                                
                                ${(result.test_results && result.test_results.length > 0) ? `
                                  <h3 style="margin-top: 20px;">Test Results:</h3>
                                  <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
                                    <thead>
                                      <tr style="background-color: #f5f5f5;">
                                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Test</th>
                                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Result</th>
                                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unit</th>
                                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Reference Range</th>
                                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${(result.test_results || []).map(test => `
                                        <tr>
                                          <td style="border: 1px solid #ddd; padding: 8px;">${test.test_name}</td>
                                          <td style="border: 1px solid #ddd; padding: 8px;">${test.result_value}</td>
                                          <td style="border: 1px solid #ddd; padding: 8px;">${test.unit}</td>
                                          <td style="border: 1px solid #ddd; padding: 8px;">${test.reference_range}</td>
                                          <td style="border: 1px solid #ddd; padding: 8px; ${test.status === 'critical' ? 'color: red; font-weight: bold;' : test.status === 'abnormal' ? 'color: orange; font-weight: bold;' : ''}">${test.status || 'normal'}</td>
                                        </tr>
                                      `).join('')}
                                    </tbody>
                                  </table>
                                ` : ''}
                                
                                ${result.interpretation ? `<p><strong>Interpretation:</strong></p><div style="margin-top: 10px; white-space: pre-wrap;">${result.interpretation}</div>` : ''}
                                ${result.clinical_significance ? `<p><strong>Clinical Significance:</strong></p><div style="margin-top: 10px; white-space: pre-wrap;">${result.clinical_significance}</div>` : ''}
                                ${result.recommendations ? `<p><strong>Recommendations:</strong></p><div style="margin-top: 10px; white-space: pre-wrap;">${result.recommendations}</div>` : ''}
                                ${result.document?.content ? `<p><strong>Document Content:</strong></p><div style="margin-top: 10px; white-space: pre-wrap;">${result.document.content}</div>` : ''}
                              </div>
                            `;
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(content);
                              newWindow.document.close();
                            }
                          }}
                          title="View Lab Result"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {isDoctor && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteLabResult(result.id)}
                            title="Delete Lab Result"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">No lab results available</div>
                  <div className="text-xs text-muted-foreground">
                    {isDoctor ? 'Click "Upload" to add lab results' : 'Lab results will appear here when uploaded by doctors'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Medical Certificates */}
        <div className="space-y-3">
          <MedicalCertificateGenerator 
            patient={patientData} 
            onSaveCertificate={handleSaveCertificate}
            onDeleteCertificate={handleDeleteCertificate}
            savedCertificates={certificates}
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/patients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{patientData.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="secondary">
                  {patientData.date_of_birth ? 
                    new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear() : 'N/A'} years old
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {patientData.gender}
                </Badge>
                <Badge variant="outline">
                  ID: {patientData.id}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                {canDelete && (
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                )}
                {canEdit && (
                  <Button onClick={() => setIsEditing(true)} disabled={isDeleting}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Record
                  </Button>
                )}
                {!canEdit && !canDelete && (
                  <div className="text-sm text-muted-foreground">
                    View only - Contact a doctor or receptionist to make changes
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'overview' | 'personal' | 'physical' | 'medical' | 'documents')}
        className="w-full"
      >
        <TabsList className="mb-4 grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="physical" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Physical Exam
          </TabsTrigger>
          <TabsTrigger value="medical" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Medical Info
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>
        
        {/* Role-based information banner */}
        {isEditing && isReceptionist && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> As a receptionist, you can only edit personal information. Medical and physical examination data can only be modified by doctors.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <TabsContent value="overview">
          {renderPatientOverview()}
        </TabsContent>
        
        <TabsContent value="personal">
          <PatientPersonalInfo
            patient={patientData}
            isEditing={isEditing}
            onUpdate={(updatedData) => setPatientData(prev => ({ ...prev, ...updatedData }))}
          />
          {isEditing && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleNext}>
                Next: Physical Examination
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="physical">
          <PatientPhysicalExamination
            patient={patientData}
            isEditing={isEditing && (isDoctor || isAdmin)} // Doctors and admins can edit physical exam data
            onUpdate={(updatedData) => setPatientData(prev => ({ ...prev, ...updatedData }))}
          />
          {isEditing && (isDoctor || isAdmin) && (
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
            isEditing={isEditing && (isDoctor || isAdmin)} // Doctors and admins can edit medical info
            onUpdate={(updatedData) => setPatientData(prev => ({ ...prev, ...updatedData }))}
          />
          {isEditing && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleNext}>
                Next: Documents
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="documents">
          {renderDocuments()}
        </TabsContent>
      </Tabs>

      {/* Document Creation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create {createDocumentType === 'prescription' ? 'E-Prescription' : 
                     createDocumentType === 'soap' ? 'SOAP Note' : 'Clinical Note'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {createDocumentType === 'prescription' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medication Type</Label>
                    <Select value={documentData.nameType} onValueChange={(value) => handleDocumentInputChange('nameType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Generic">Generic</SelectItem>
                        <SelectItem value="Brand">Brand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Medication Name</Label>
                    <Input 
                      value={documentData.name || ''} 
                      onChange={(e) => handleDocumentInputChange('name', e.target.value)}
                      placeholder="Enter medication name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dose</Label>
                    <Input 
                      value={documentData.dose || ''} 
                      onChange={(e) => handleDocumentInputChange('dose', e.target.value)}
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      value={documentData.quantity || ''} 
                      onChange={(e) => handleDocumentInputChange('quantity', e.target.value)}
                      placeholder="e.g., 30 tablets"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={documentData.frequency} onValueChange={(value) => handleDocumentInputChange('frequency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Once daily">Once daily</SelectItem>
                      <SelectItem value="Twice daily">Twice daily</SelectItem>
                      <SelectItem value="Three times daily">Three times daily</SelectItem>
                      <SelectItem value="Four times daily">Four times daily</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {documentData.frequency === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom Frequency</Label>
                    <Input 
                      value={documentData.customFrequency || ''} 
                      onChange={(e) => handleDocumentInputChange('customFrequency', e.target.value)}
                      placeholder="Enter custom frequency"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date"
                      value={documentData.startDate || ''} 
                      onChange={(e) => handleDocumentInputChange('startDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input 
                      type="date"
                      value={documentData.endDate || ''} 
                      onChange={(e) => handleDocumentInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={documentData.notes || ''} 
                    onChange={(e) => handleDocumentInputChange('notes', e.target.value)}
                    placeholder="Additional instructions or notes"
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            {createDocumentType === 'soap' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subjective</Label>
                  <Textarea 
                    value={documentData.subjective || ''} 
                    onChange={(e) => handleDocumentInputChange('subjective', e.target.value)}
                    placeholder="Patient's symptoms, complaints, and history in their own words"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Textarea 
                    value={documentData.objective || ''} 
                    onChange={(e) => handleDocumentInputChange('objective', e.target.value)}
                    placeholder="Measurable or observed findings"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assessment</Label>
                  <Textarea 
                    value={documentData.assessment || ''} 
                    onChange={(e) => handleDocumentInputChange('assessment', e.target.value)}
                    placeholder="Clinical assessment or diagnosis"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Textarea 
                    value={documentData.plan || ''} 
                    onChange={(e) => handleDocumentInputChange('plan', e.target.value)}
                    placeholder="Treatment plan, follow-up, or next steps"
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            {createDocumentType === 'blank' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input 
                    value={documentData.title || ''} 
                    onChange={(e) => handleDocumentInputChange('title', e.target.value)}
                    placeholder="Enter note title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea 
                    value={documentData.content || ''} 
                    onChange={(e) => handleDocumentInputChange('content', e.target.value)}
                    placeholder="Enter your clinical notes here..."
                    rows={10}
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDocument}>
              Save {createDocumentType === 'prescription' ? 'Prescription' : 
                   createDocumentType === 'soap' ? 'SOAP Note' : 'Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
};

export default PatientManagement;