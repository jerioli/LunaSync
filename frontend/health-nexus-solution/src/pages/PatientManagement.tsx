import MedicalCertificateGenerator from '@/components/patients/MedicalCertificateGenerator';
import PatientMedicalInfo from '@/components/patients/PatientMedicalInfo';
import PatientPersonalInfo from '@/components/patients/PatientPersonalInfo';
import PatientPhysicalExamination from '@/components/patients/PatientPhysicalExamination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { Patient } from '@/lib/mock-data';
import { axiosInstance } from '@/services/api';
import { medicalDocumentsAPI, type LabResult as APILabResult } from '@/services/medicalDocumentsAPI';
import { parseApiError } from '@/utils/errorHandler';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Eye, File, FileText, Heart, Plus, Printer, Save, Stethoscope, TestTube, Trash2, Upload, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PatientManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { patients, updatePatient, deletePatient, currentUser, fetchPatients, clinicCustomization } = useClinic();
  
  // Helper function to construct full name from name parts
  const getFullName = (patient: Patient) => {
    if (patient.first_name || patient.last_name) {
      const nameParts = [];
      if (patient.first_name) nameParts.push(patient.first_name);
      if (patient.middle_initial) {
        const initial = patient.middle_initial.endsWith('.') ? patient.middle_initial : patient.middle_initial + '.';
        nameParts.push(initial);
      }
      if (patient.last_name) nameParts.push(patient.last_name);
      if (patient.suffix) nameParts.push(patient.suffix);
      return nameParts.join(' ');
    }
    return patient.name || 'Unknown Patient';
  };
  
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
  
  // Clinic settings state
  const [clinicSettings, setClinicSettings] = useState<any>(null);
  
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
  
  // Print functionality state
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    includePrescriptions: false,
    includeSoapNotes: false,
    includeClinicalNotes: false,
    includeLabResults: false,
    includeMedicalCertificates: false
  });
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
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
        const response = await axiosInstance.get(`patients/${id}/`);
        if (response.data) {
          // Map backend response fields to frontend camelCase
          const mappedPatient = {
            ...response.data,
            registrationDate: response.data.registration_date
          };
          
          setPatientData(mappedPatient);
          setInitialLoadComplete(true);



          // Update localStorage with the fetched data
          const stored = localStorage.getItem('patientsList');
          let updated = [];
          if (stored) {
            updated = JSON.parse(stored);
            const existingIndex = updated.findIndex((p: Patient) => String(p.id) === String(id));
            if (existingIndex >= 0) {
              updated[existingIndex] = mappedPatient;
            } else {
              updated.push(mappedPatient);
            }
          } else {
            updated = [mappedPatient];
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

  // Fetch clinic settings function
  const fetchClinicSettings = async () => {
    try {
      const response = await axiosInstance.get('/clinic/');
      setClinicSettings(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching clinic settings:', error);
      return {};
    }
  };

  // Fetch clinic settings on component mount
  useEffect(() => {
    fetchClinicSettings();
  }, []);

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

  // Print functionality
  const handlePrintRecord = () => {
    setShowPrintDialog(true);
  };

  const handlePrintSettingsChange = (setting: keyof typeof printSettings, value: boolean) => {
    setPrintSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const generatePrintContent = () => {
    if (!patientData) return '';

    const clinicInfo = clinicSettings || {};
    const logoUrl = getLogoUrl(clinicInfo?.logo || '');
    
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient Record - ${patientData.name}</title>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 1in;
            size: A4;
          }
          
          @media print {
            .page-break {
              page-break-before: always;
            }
            .no-print {
              display: none;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .logo {
            max-height: 80px;
            margin-bottom: 10px;
          }
          
          .clinic-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .clinic-info {
            font-size: 14px;
            color: #666;
          }
          
          .patient-header {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
          }
          
          .patient-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .patient-details {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .info-item {
            display: flex;
            gap: 5px;
          }
          
          .info-label {
            font-weight: bold;
            min-width: 120px;
          }
          
          .document {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
          }
          
          .document-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          .document-date {
            color: #666;
            font-size: 12px;
            margin-bottom: 10px;
          }
          
          .prescription-details {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 3px;
          }
          
          .soap-section {
            margin-bottom: 10px;
          }
          
          .soap-label {
            font-weight: bold;
            color: #444;
            margin-bottom: 5px;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
    `;

    // Header with clinic info
    content += `
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Clinic Logo" class="logo">` : ''}
        <div class="clinic-name">${clinicInfo?.clinic_name || 'Medical Clinic'}</div>
        <div class="clinic-info">
          ${clinicInfo?.address || ''}<br>
          ${clinicInfo?.phone || ''} | ${clinicInfo?.email || ''}
        </div>
      </div>
    `;

    // Patient header
    content += `
      <div class="patient-header">
        <div class="patient-name">${patientData.name}</div>
        <div class="patient-details">
         
          <span><strong>Age:</strong> ${patientData.date_of_birth ? 
            new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear() : 'N/A'} years</span>
          <span><strong>Gender:</strong> ${patientData.gender}</span>
          <span><strong>Date:</strong> ${format(new Date(), 'PPP')}</span>
        </div>
      </div>
    `;

    // Personal Information
    content += `
      <div class="section">
        <div class="section-title">Personal Information</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Full Name:</span>
            <span>${patientData.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date of Birth:</span>
            <span>${patientData.date_of_birth ? format(new Date(patientData.date_of_birth), 'PPP') : 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Gender:</span>
            <span class="capitalize">${patientData.gender}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone:</span>
            <span>${patientData.phone}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email:</span>
            <span>${patientData.email}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Address:</span>
            <span>${patientData.address || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Emergency Contact:</span>
            <span>${(patientData as any)?.emergency_contact || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;

    // Physical Examination
    content += `
      <div class="section">
        <div class="section-title">Physical Examination</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Height:</span>
            <span>${patientData.physical_examination?.height || 'Not recorded'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Weight:</span>
            <span>${patientData.physical_examination?.weight || 'Not recorded'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Blood Pressure:</span>
            <span>${patientData.physical_examination?.bloodPressure || 'Not recorded'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Temperature:</span>
            <span>${patientData.physical_examination?.temperature || 'Not recorded'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Pulse Rate:</span>
            <span>${patientData.physical_examination?.pulseRate || 'Not recorded'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Respiratory Rate:</span>
            <span>${patientData.physical_examination?.respiratoryRate || 'Not recorded'}</span>
          </div>
        </div>
      </div>
    `;

    // Medical Information
    content += `
      <div class="section">
        <div class="section-title">Medical Information</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Blood Type:</span>
            <span>${patientData.medical_info?.bloodType || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Known Allergies:</span>
            <span>${patientData.medical_info?.allergies?.join(', ') || 'None recorded'}</span>
          </div>
        </div>
        ${patientData.medical_info?.medicalHistory ? `
          <div class="info-item">
            <span class="info-label">Medical History:</span>
            <div style="margin-top: 5px;">${patientData.medical_info.medicalHistory}</div>
          </div>
        ` : ''}
      </div>
    `;

    // Documents sections
    if (printSettings.includePrescriptions && prescriptions.length > 0) {
      content += `<div class="page-break"></div>`;
      prescriptions.forEach((prescription, index) => {
        const prescriptionId = `${Date.now().toString().slice(-8).toUpperCase()}`;
        const clinicData = clinicSettings || {};
        content += `
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif;">
            <!-- Header with Logo and QR -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
              <div>
                ${clinicData.logo ? 
                  `<img src="${getLogoUrl(clinicData.logo)}" alt="Clinic Logo" style="height: 50px; width: auto; margin-bottom: 10px;">` : 
                  `<div style="width: 50px; height: 50px; background: #f0f0f0; margin-bottom: 10px;"></div>`
                }
                <div style="font-size: 14px; color: #333;">${clinicData.clinic_name || 'Medical Center'}</div>
              </div>
              <div style="text-align: center;">
                <div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
                  QR CODE
                </div>
              </div>
            </div>

            <!-- Prescription ID -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 14px;">PRESCRIPTION ID: ${prescriptionId}</div>
            </div>

            <!-- Location and Date -->
            <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
              <div>${clinicData.address || 'Clinic Address'}</div>
              <div style="margin-top: 10px;">
                Prescribed on: ${format(new Date(prescription.dateCreated), 'MMMM dd, yyyy')}
              </div>
              <div>${format(new Date(prescription.dateCreated), 'hh:mm a')} PHT</div>
            </div>

            <!-- Patient Info -->
            <div style="margin-bottom: 20px; font-size: 12px;">
              <div><strong>Patient:</strong> ${patientData?.name}</div>
              <div><strong>Age:</strong> ${patientData?.date_of_birth ? Math.floor((new Date().getTime() - new Date(patientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'} years old</div>
              <div><strong>Gender:</strong> ${patientData?.gender || 'Not specified'}</div>
            </div>

            <!-- Rx Symbol -->
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">Rx</div>

            <!-- Prescription Details -->
            <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.6;">
              <div style="font-weight: bold; margin-bottom: 5px;">${prescription.data.name}</div>
              <div style="margin-bottom: 10px;">${prescription.data.dosage} ${prescription.data.quantity}</div>
              ${prescription.data.description ? `<div style="margin-left: 20px; color: #555;">${prescription.data.description}</div>` : ''}
            </div>

            <!-- Doctor Signature Area -->
            <div style="text-align: right; margin-top: 60px;">
              <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
              <div style="font-size: 12px;">Dr. ${currentUser?.first_name || currentUser?.name} ${currentUser?.last_name || ''}</div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
              <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
            </div>
          </div>
        `;
      });
    }

    if (printSettings.includeSoapNotes && soapNotes.length > 0) {
      content += `<div class="page-break"></div>`;
      content += `
        <div class="section">
          <div class="section-title">SOAP Notes</div>
      `;
      soapNotes.forEach((note, index) => {
        content += `
          <div class="document">
            <div class="document-title">SOAP Note #${index + 1}</div>
            <div class="document-date">Created: ${format(new Date(note.dateCreated), 'PPP')}</div>
            <div class="soap-section">
              <div class="soap-label">Subjective:</div>
              <div>${note.data.subjective}</div>
            </div>
            <div class="soap-section">
              <div class="soap-label">Objective:</div>
              <div>${note.data.objective}</div>
            </div>
            <div class="soap-section">
              <div class="soap-label">Assessment:</div>
              <div>${note.data.assessment}</div>
            </div>
            <div class="soap-section">
              <div class="soap-label">Plan:</div>
              <div>${note.data.plan}</div>
            </div>
          </div>
        `;
      });
      content += `</div>`;
    }

    if (printSettings.includeClinicalNotes && blankNotes.length > 0) {
      content += `<div class="page-break"></div>`;
      content += `
        <div class="section">
          <div class="section-title">Clinical Notes</div>
      `;
      blankNotes.forEach((note, index) => {
        content += `
          <div class="document">
            <div class="document-title">${note.data.title}</div>
            <div class="document-date">Created: ${format(new Date(note.dateCreated), 'PPP')}</div>
            <div>${note.data.content}</div>
          </div>
        `;
      });
      content += `</div>`;
    }

    if (printSettings.includeLabResults && labResults.length > 0) {
      content += `<div class="page-break"></div>`;
      content += `
        <div class="section">
          <div class="section-title">Lab Results</div>
      `;
      labResults.forEach((result, index) => {
        content += `
          <div class="document">
            <div class="document-title">Lab Result #${index + 1}</div>
            <div class="document-date">Date: ${format(new Date((result as any)?.test_date || (result as any)?.date || new Date()), 'PPP')}</div>
            <div><strong>Test Type:</strong> ${(result as any)?.test_type || (result as any)?.type || 'N/A'}</div>
            ${(result as any)?.laboratory_name ? `<div><strong>Laboratory:</strong> ${(result as any).laboratory_name}</div>` : ''}
            ${(result as any)?.doctor_notes ? `<div><strong>Doctor's Notes:</strong> ${(result as any).doctor_notes}</div>` : ''}
          </div>
        `;
      });
      content += `</div>`;
    }

    if (printSettings.includeMedicalCertificates && certificates.length > 0) {
      certificates.forEach((cert, index) => {
        content += `<div class="page-break"></div>`;
        
        // Extract just the certificate content without the full HTML wrapper
        let certificateContent = cert.content;
        
        // Remove HTML, HEAD, and BODY tags if present
        certificateContent = certificateContent.replace(/<html[^>]*>/gi, '');
        certificateContent = certificateContent.replace(/<\/html>/gi, '');
        certificateContent = certificateContent.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
        certificateContent = certificateContent.replace(/<body[^>]*>/gi, '');
        certificateContent = certificateContent.replace(/<\/body>/gi, '');
        
        // Add the clean certificate content
        content += certificateContent;
      });
    }

    content += `
        <div class="footer">
          <div>Generated on ${format(new Date(), 'PPP')} by ${currentUser?.name || 'Medical Staff'}</div>
          <div>This is a computer-generated document.</div>
        </div>
      </body>
      </html>
    `;

    return content;
  };

  const handlePreviewPrint = () => {
    const content = generatePrintContent();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      setShowPrintPreview(true);
    }
  };

  const handleConfirmPrint = () => {
    const content = generatePrintContent();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      newWindow.onload = () => {
        newWindow.print();
        newWindow.close();
      };
    }
    setShowPrintDialog(false);
    setShowPrintPreview(false);
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
      
      
      
      const response = await axiosInstance.put(`patients/${patientData.id}/`, dataToSend);
      
      // Map backend response fields to frontend camelCase
      const updatedPatient = {
        ...response.data,
        registrationDate: response.data.registration_date
      };
      
      // Update the context state
      updatePatient(patientData.id, updatedPatient);
      
      // Update local state with the mapped data
      setPatientData(updatedPatient);
      
      // Update localStorage
      const stored = localStorage.getItem('patientsList');
      if (stored) {
        const storedPatients = JSON.parse(stored);
        const updatedPatients = storedPatients.map((p: Patient) => 
          String(p.id) === String(patientData.id) ? updatedPatient : p
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
      
      // Use the error handler utility to get a better error message
      const parsedError = parseApiError(error, 'Failed to update patient. Please try again later.');
      
      toast({
        title: parsedError.title,
        description: parsedError.message,
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
      `Are you sure you want to delete ${getFullName(patientData)}'s record? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    setIsDeleting(true);
    
    try {
      await axiosInstance.delete(`patients/${patientData.id}/`);
      
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
      
      // Use the error handler utility to get a better error message
      const parsedError = parseApiError(error, 'Failed to delete patient. Please try again later.');
      
      toast({
        title: parsedError.title,
        description: parsedError.message,
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
                            {prescription.data.dosage}
                          </div>
                          <div className="text-xs text-gray-500">
                            Qty: {prescription.data.quantity} | Created: {new Date(prescription.dateCreated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            // Fetch current clinic settings
                            let currentClinicSettings = clinicSettings;
                            if (!currentClinicSettings) {
                              try {
                                currentClinicSettings = await fetchClinicSettings();
                              } catch (error) {
                                console.error('Failed to fetch clinic settings:', error);
                                currentClinicSettings = {};
                              }
                            }
                            
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
                            
                            const logoUrl = getFullLogoUrl(currentClinicSettings?.logo);
                            const content = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>E-Prescription</title>
                                <style>
                                  body { 
                                    font-family: Arial, sans-serif; 
                                    margin: 0;
                                    padding: 20px;
                                    background: white;
                                  }
                                  @media print {
                                    body { margin: 0; padding: 0; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif;">
                                  <!-- Header with Logo and QR -->
                                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                                    <div>
                                      ${currentClinicSettings?.logo ? 
                                        `<img src="${getFullLogoUrl(currentClinicSettings.logo)}" alt="Clinic Logo" style="height: 50px; width: auto; margin-bottom: 10px;">` : 
                                        `<div style="width: 50px; height: 50px; background: #f0f0f0; margin-bottom: 10px;"></div>`
                                      }
                                      <div style="font-size: 14px; color: #333;">${currentClinicSettings?.clinic_name || 'Medical Center'}</div>
                                    </div>
                                    <div style="text-align: center;">
                                      <div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
                                        QR CODE
                                      </div>
                                    </div>
                                  </div>

                                  <!-- Prescription ID -->
                                  <div style="text-align: center; margin-bottom: 20px;">
                                    <div style="font-weight: bold; font-size: 14px;">PRESCRIPTION ID: ${Date.now().toString().slice(-8).toUpperCase()}</div>
                                  </div>

                                  <!-- Location and Date -->
                                  <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
                                    <div>${currentClinicSettings?.address || 'Clinic Address'}</div>
                                    <div style="margin-top: 10px;">
                                      Prescribed on: ${format(new Date(prescription.dateCreated), 'MMMM dd, yyyy')}
                                    </div>
                                    <div>${format(new Date(prescription.dateCreated), 'hh:mm a')} PHT</div>
                                  </div>

                                  <!-- Patient Info -->
                                  <div style="margin-bottom: 20px; font-size: 12px;">
                                    <div><strong>Patient:</strong> ${patientData?.name}</div>
                                    <div><strong>Age:</strong> ${patientData?.date_of_birth ? Math.floor((new Date().getTime() - new Date(patientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'} years old</div>
                                    <div><strong>Gender:</strong> ${patientData?.gender || 'Not specified'}</div>
                                  </div>

                                  <!-- Rx Symbol -->
                                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">Rx</div>

                                  <!-- Prescription Details -->
                                  <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.6;">
                                    <div style="font-weight: bold; margin-bottom: 5px;">${prescription.data.name}</div>
                                    <div style="margin-bottom: 10px;">${prescription.data.dosage} ${prescription.data.quantity}</div>
                                    ${prescription.data.description ? `<div style="margin-left: 20px; color: #555;">${prescription.data.description}</div>` : ''}
                                  </div>

                                  <!-- Doctor Signature Area -->
                                  <div style="text-align: right; margin-top: 60px;">
                                    <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
                                    <div style="font-size: 12px;">Dr. ${currentUser?.first_name || currentUser?.name} ${currentUser?.last_name || ''}</div>
                                  </div>

                                  <!-- Footer -->
                                  <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
                                    <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">{getFullName(patientData)}</h1>
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
                <Button variant="outline" onClick={handlePrintRecord}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Record
                </Button>
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
                <div className="space-y-2">
                  <Label>Medication Name</Label>
                  <Input 
                    value={documentData.name || ''} 
                    onChange={(e) => handleDocumentInputChange('name', e.target.value)}
                    placeholder="Enter medication name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dosage</Label>
                    <Input 
                      value={documentData.dosage || ''} 
                      onChange={(e) => handleDocumentInputChange('dosage', e.target.value)}
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      value={documentData.quantity || ''} 
                      onChange={(e) => handleDocumentInputChange('quantity', e.target.value)}
                      placeholder="e.g., Capsule #21"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={documentData.description || ''} 
                    onChange={(e) => handleDocumentInputChange('description', e.target.value)}
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

      {/* Print Settings Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Patient Record</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Personal information, physical examination, and medical information will always be included.
              Select additional documents to include:
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prescriptions"
                  checked={printSettings.includePrescriptions}
                  onCheckedChange={(checked) => handlePrintSettingsChange('includePrescriptions', !!checked)}
                  disabled={prescriptions.length === 0}
                />
                <label htmlFor="prescriptions" className={prescriptions.length === 0 ? 'text-muted-foreground' : ''}>
                  E-Prescriptions ({prescriptions.length})
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soapNotes"
                  checked={printSettings.includeSoapNotes}
                  onCheckedChange={(checked) => handlePrintSettingsChange('includeSoapNotes', !!checked)}
                  disabled={soapNotes.length === 0}
                />
                <label htmlFor="soapNotes" className={soapNotes.length === 0 ? 'text-muted-foreground' : ''}>
                  SOAP Notes ({soapNotes.length})
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clinicalNotes"
                  checked={printSettings.includeClinicalNotes}
                  onCheckedChange={(checked) => handlePrintSettingsChange('includeClinicalNotes', !!checked)}
                  disabled={blankNotes.length === 0}
                />
                <label htmlFor="clinicalNotes" className={blankNotes.length === 0 ? 'text-muted-foreground' : ''}>
                  Clinical Notes ({blankNotes.length})
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="labResults"
                  checked={printSettings.includeLabResults}
                  onCheckedChange={(checked) => handlePrintSettingsChange('includeLabResults', !!checked)}
                  disabled={labResults.length === 0}
                />
                <label htmlFor="labResults" className={labResults.length === 0 ? 'text-muted-foreground' : ''}>
                  Lab Results ({labResults.length})
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="certificates"
                  checked={printSettings.includeMedicalCertificates}
                  onCheckedChange={(checked) => handlePrintSettingsChange('includeMedicalCertificates', !!checked)}
                  disabled={certificates.length === 0}
                />
                <label htmlFor="certificates" className={certificates.length === 0 ? 'text-muted-foreground' : ''}>
                  Medical Certificates ({certificates.length})
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePreviewPrint}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleConfirmPrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
};

export default PatientManagement;