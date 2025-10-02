import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/contexts/ClinicContext';
import { Patient } from '@/lib/mock-data';
import {
  generateMedicalCertificateHTML,
  MedicalCertificateTemplateData
} from '@/utils/medicalCertificateTemplate';
import { axiosInstance } from "@/services/api";
import { format } from 'date-fns';
import { Download, Eye, FileCheck, FileText, Mail, Printer, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Set axios base URL for API calls
// Remove this line since we're using axiosInstance
// axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

interface MedicalCertificateData {
  hospitalName: string;
  hospitalAddress: string;
  hospitalContact: string;
  hospitalLicense: string;
  doctorName: string;
  doctorLicense: string;
  doctorPRC: string;
  doctorPTR: string;
  patientName: string;
  patientAge: string;
  patientAddress: string;
  patientSex: string;
  diagnosis: string;
  recommendations: string;
  restFromDate: string;
  restToDate: string;
  fitForWork: 'fit' | 'unfit' | 'limited';
  limitations: string;
  followUpDate: string;
  dateIssued: string;
  certificateType: string;
}

interface ClinicInfo {
  clinic_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website?: string;
}

interface DoctorInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  license?: string;
  prc?: string;
  ptr?: string;
}

interface MedicalCertificateGeneratorProps {
  patient: Patient;
  onSaveCertificate: (certificate: any) => void;
  onDeleteCertificate?: (certificateId: number) => void;
  savedCertificates?: any[];
}

const MedicalCertificateGenerator: React.FC<MedicalCertificateGeneratorProps> = ({
  patient,
  onSaveCertificate,
  onDeleteCertificate,
  savedCertificates = []
}) => {  // Debug log to check what certificates are being passed
  console.log('MedicalCertificateGenerator - savedCertificates:', savedCertificates);
  console.log('MedicalCertificateGenerator - patient:', patient);
  console.log('MedicalCertificateGenerator - onSaveCertificate function:', typeof onSaveCertificate);
  console.log('MedicalCertificateGenerator - onDeleteCertificate function:', typeof onDeleteCertificate);const { currentUser } = useClinic();
  
  // Debug current user authentication
  console.log('Current user:', currentUser);
  console.log('Current user role:', currentUser?.role);
  console.log('Current user authenticated:', !!currentUser);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);
    const [certificateData, setCertificateData] = useState<MedicalCertificateData>({
    hospitalName: 'HealthNexus Medical Center',
    hospitalAddress: '123 Medical Plaza, City, State 12345',
    hospitalContact: '',
    hospitalLicense: '',
    doctorName: '',
    doctorLicense: '',
    doctorPRC: '',
    doctorPTR: '',
    patientName: patient.name,
    patientAge: patient.date_of_birth ? 
      String(new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()) : '',
    patientAddress: patient.address || '',
    patientSex: patient.gender || '',
    diagnosis: '',
    recommendations: '',
    restFromDate: format(new Date(), 'yyyy-MM-dd'),
    restToDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 7 days from now
    fitForWork: 'unfit',
    limitations: '',
    followUpDate: '',
    dateIssued: format(new Date(), 'yyyy-MM-dd'),
    certificateType: 'general'
  });  // Fetch clinic information
  const fetchClinicInfo = async () => {
    try {
      const response = await axiosInstance.get('/clinic/');
      if (response.data) {
        setClinicInfo(response.data);
        // Update certificate data with clinic info
        setCertificateData(prev => ({
          ...prev,
          hospitalName: response.data.clinic_name || 'HealthNexus Medical Center',
          hospitalAddress: `${response.data.address || '123 Medical Plaza'}, ${response.data.city || 'City'}, ${response.data.state || 'State'} ${response.data.zip || '12345'}`,
          hospitalContact: `Phone: ${response.data.phone || '(123) 456-7890'} | Email: ${response.data.email || 'info@healthnexus.com'}`
        }));
      }
    } catch (error) {
      console.error('Error fetching clinic info:', error);
      // If fetching fails, use default values
      setCertificateData(prev => ({
        ...prev,
        hospitalName: 'HealthNexus Medical Center',
        hospitalAddress: '123 Medical Plaza, City, State 12345',
        hospitalContact: 'Phone: (123) 456-7890 | Email: info@healthnexus.com'
      }));
    }
  };// Fetch doctor information
  const fetchDoctorInfo = async () => {
    try {
      console.log('Fetching doctor info for currentUser:', currentUser);
      
      if (currentUser && currentUser.role === 'doctor') {
        const response = await axiosInstance.get('/doctors/');
        console.log('Doctor API response:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          // Try different ways to match the doctor
          let doctor = response.data.find((d: DoctorInfo) => d.id === parseInt(currentUser.id));
          
          // If not found by ID, try to match by email
          if (!doctor && currentUser.email) {
            doctor = response.data.find((d: DoctorInfo) => d.email === currentUser.email);
          }
          
          // If not found by email, try to match by name
          if (!doctor && currentUser.name) {
            doctor = response.data.find((d: DoctorInfo) => 
              `${d.first_name} ${d.last_name}`.toLowerCase() === currentUser.name.toLowerCase()
            );
          }
          
          // If still not found, use the first doctor (for demo purposes)
          if (!doctor && response.data.length > 0) {
            console.warn('No matching doctor found, using first doctor from the list');
            doctor = response.data[0];
          }
          
          console.log('Selected doctor:', doctor);
            if (doctor) {
            setDoctorInfo(doctor);
            // Update certificate data with doctor info
            setCertificateData(prev => ({
              ...prev,
              doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`,
              doctorPRC: doctor.prc || '',
              doctorPTR: doctor.ptr || ''
            }));
          } else {
            console.warn('No doctor found in the response data');
          }
        } else {
          console.warn('Invalid response data format:', response.data);
        }
      } else {
        console.log('Current user is not a doctor or currentUser is null');
      }
    } catch (error) {
      console.error('Error fetching doctor info:', error);
        // If fetching fails, set default values based on user if available
      if (currentUser && currentUser.role === 'doctor') {
        setCertificateData(prev => ({
          ...prev,
          doctorName: `Dr. ${currentUser.name || currentUser.first_name || 'Doctor Name'}`
        }));
      }
    }
  };  // Fetch data when component mounts or form is opened
  useEffect(() => {
    if (showForm) {
      setLoading(true);
      Promise.all([fetchClinicInfo(), fetchDoctorInfo()])
        .finally(() => setLoading(false));
    }
  }, [showForm, currentUser]);

  const handleInputChange = (field: keyof MedicalCertificateData, value: string) => {
    setCertificateData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSelectChange = (field: keyof MedicalCertificateData, value: string) => {
    setCertificateData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleDeleteCertificate = (certificateId: number | string) => {
    if (onDeleteCertificate) {
      // Convert to number if it's a string
      const id = typeof certificateId === 'string' ? parseInt(certificateId) : certificateId;
      onDeleteCertificate(id);
    }
    setDeleteConfirmId(null);
  };

  // Helper function to validate required fields
  const validateCertificateData = () => {
    const errors: string[] = [];
    
    // Diagnosis is now required for all certificates to match backend expectations
    if (!certificateData.diagnosis.trim()) {
      errors.push('Diagnosis is required for medical certificates');
    }
    
    if (!certificateData.recommendations.trim() && (certificateData.fitForWork === 'unfit' || certificateData.fitForWork === 'limited')) {
      errors.push('Medical recommendations are required when patient is unfit or has limited fitness for work');
    }
    
    if (!certificateData.dateIssued) {
      errors.push('Date issued is required');
    }
    
    if (!patient.id) {
      errors.push('Patient ID is missing');
    }
    
    return errors;
  };

  // Helper function to map frontend certificate types to backend values
  const mapCertificateType = (frontendType: string) => {
    const typeMap: { [key: string]: string } = {
      'general': 'fitness',
      'sick_leave': 'sick_leave', 
      'fitness': 'fitness',
      'vaccination': 'vaccination'
    };
    return typeMap[frontendType] || 'fitness';
  };

  // Helper function to get certificate purpose based on type and fitness
  const getCertificatePurpose = () => {
    if (certificateData.fitForWork === 'unfit') {
      return 'Sick leave - Patient is unfit for work';
    } else if (certificateData.fitForWork === 'limited') {
      return 'Fitness with limitations - Patient has restricted work capacity';
    } else {
      return 'Medical fitness certificate - Patient is fit for work';
    }
  };

  const generateCertificate = async () => {
    try {
      // Validate required fields
      const validationErrors = validateCertificateData();
      if (validationErrors.length > 0) {
        const { toast } = await import('sonner');
        toast.error('Validation Error', {
          description: validationErrors[0]
        });
        return;
      }
      
      setLoading(true);
      
      // Prepare data for backend API
      const certificateApiData = {
        patient: patient.id,
        title: `Medical Certificate - ${certificateData.certificateType.replace('_', ' ')}`,
        description: `Medical certificate for ${patient.name}`,
        certificate_type: mapCertificateType(certificateData.certificateType),
        purpose: (getCertificatePurpose() || 'General medical certificate').trim() || 'General medical certificate',
        medical_opinion: (certificateData.diagnosis || 'Medical examination completed').trim() || 'Medical examination completed',
        valid_from: certificateData.dateIssued,
        valid_until: certificateData.followUpDate || null,
        restrictions: certificateData.fitForWork === 'limited' ? certificateData.limitations : '',
        examination_findings: certificateData.recommendations || ''
      };

      console.log('Sending certificate data to backend:', certificateApiData);
      console.log('Purpose value:', certificateApiData.purpose);
      console.log('Medical opinion value:', certificateApiData.medical_opinion);
      console.log('Diagnosis from form:', certificateData.diagnosis);
      console.log('FitForWork status:', certificateData.fitForWork);

      // Save to backend API
      const response = await axiosInstance.post('/medical-documents/medical-certificates/', certificateApiData);
      
      console.log('Backend response:', response.data);

      // Create local certificate object for immediate display
      const certificate = {
        id: response.data.id || Date.now(),
        type: 'Medical Certificate',
        dateCreated: new Date().toISOString(),
        patientId: patient.id,
        data: certificateData,
        content: generateCertificateHTML(),
        backendId: response.data.id // Store backend ID for future reference
      };

      onSaveCertificate(certificate);
      setShowForm(false);
      setShowPreview(false);
      
      const { toast } = await import('sonner');
      toast.success('Medical certificate saved successfully!');
      
    } catch (error) {
      console.error('Error saving certificate:', error);
      const { toast } = await import('sonner');
      
      if (error.response?.data) {
        console.error('Backend error details:', error.response.data);
        toast.error('Failed to save certificate', {
          description: error.response.data.message || 'Please check the form and try again.'
        });
      } else {
        toast.error('Failed to save certificate', {
          description: 'Please check your connection and try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };



  // Helper function to generate purpose from certificate data
  const generatePurpose = (data: any): string => {
    const type = mapCertificateType(data.certificateType);
    if (type === 'sick_leave') {
      return `Medical leave from ${data.restFromDate} to ${data.restToDate}`;
    } else if (type === 'fitness') {
      return data.fitForWork === 'fit' ? 'Employment fitness certification' : 'Medical assessment for work limitations';
    } else if (type === 'work_clearance') {
      return 'Return to work clearance';
    } else {
      return `${type.replace('_', ' ')} certification`;
    }
  };

  // Helper function to generate medical opinion from certificate data
  const generateMedicalOpinion = (data: any): string => {
    let opinion = '';
    
    if (data.diagnosis) {
      opinion += `Diagnosis: ${data.diagnosis}. `;
    }
    
    if (data.fitForWork === 'fit') {
      opinion += 'Patient is medically fit for work with no restrictions.';
    } else if (data.fitForWork === 'unfit') {
      opinion += 'Patient is temporarily unfit for work.';
      if (data.limitations) {
        opinion += ` Limitations: ${data.limitations}.`;
      }
    } else if (data.fitForWork === 'limited') {
      opinion += 'Patient is fit for work with limitations.';
      if (data.limitations) {
        opinion += ` Limitations: ${data.limitations}.`;
      }
    }
    
    if (data.recommendations) {
      opinion += ` Recommendations: ${data.recommendations}.`;
    }
    
    return opinion || 'Medical assessment completed.';
  };



  // Helper function to save certificate to backend
  const saveCertificateToBackend = async (certificateData: any) => {
    try {
      console.log('Saving certificate to backend:', certificateData);
      
      // First check if session authentication is working
      try {
        const currentUserResponse = await axiosInstance.get('/auth/current-user/');
        console.log('Current user from backend:', currentUserResponse.data);
      } catch (authError) {
        console.error('Auth check failed:', authError);
        console.log('Auth error response:', authError.response?.data);
      }
      
      // First check user permissions - call debug endpoint
      try {
        const debugResponse = await axiosInstance.get('/medical-documents/medical-certificates/debug_user_permissions/');
        console.log('User permissions debug:', debugResponse.data);
      } catch (debugError) {
        console.error('Debug endpoint error:', debugError);
      }
      try {
        const permissionsResponse = await axiosInstance.get('/medical-documents/medical-certificates/debug_user_permissions/');
        console.log('User permissions:', permissionsResponse.data);
        
        // If user doesn't have proper role, show warning but continue with test endpoint
        const allowedRoles = ['receptionist', 'doctor', 'admin', 'superadmin'];
        const userRole = permissionsResponse.data.role;
        
        if (!allowedRoles.includes(userRole)) {
          console.warn(`User role '${userRole}' not in allowed roles. Using test endpoint.`);
          toast.warning(`Your role (${userRole}) has limited permissions. Using test mode.`);
          
          // Use test endpoint
          const response = await axiosInstance.post('/medical-documents/medical-certificates/test_create/', certificateData);
          console.log('Certificate saved via test endpoint:', response.data);
          toast.success('Medical certificate saved successfully (test mode)!');
          return response.data;
        }
      } catch (permError) {
        console.warn('Could not check permissions, proceeding with normal endpoint:', permError);
      }

      // Use normal endpoint if permissions are OK
      const response = await axiosInstance.post('/medical-documents/medical-certificates/', certificateData);
      console.log('Certificate saved successfully:', response.data);
      toast.success('Medical certificate saved successfully!');
      return response.data;
      
    } catch (error: any) {
      console.error('Error saving certificate:', error);
      
      if (error.response?.status === 403) {
        console.log('403 Forbidden error, trying test endpoint...');
        try {
          const response = await axiosInstance.post('/medical-documents/medical-certificates/test_create/', certificateData);
          console.log('Certificate saved via test endpoint after 403:', response.data);
          toast.success('Medical certificate saved successfully (fallback mode)!');
          return response.data;
        } catch (testError) {
          console.error('Test endpoint also failed:', testError);
          toast.error('Failed to save medical certificate. Please check your permissions.');
          throw testError;
        }
      }
      
      if (error.response?.data?.details) {
        console.error('Validation errors:', error.response.data.details);
        toast.error(`Validation error: ${JSON.stringify(error.response.data.details)}`);
      } else {
        toast.error('Failed to save medical certificate. Please try again.');
      }
      throw error;
    }
  };

  const saveAndSendEmail = async () => {
    try {
      // Validate required fields
      const validationErrors = validateCertificateData();
      if (validationErrors.length > 0) {
        const { toast } = await import('sonner');
        toast.error('Validation Error', {
          description: validationErrors[0]
        });
        return;
      }

      setLoading(true);
      
      // First save to backend API
      const certificateApiData = {
        patient: patient.id,
        title: `Medical Certificate - ${certificateData.certificateType.replace('_', ' ')}`,
        description: `Medical certificate for ${patient.name}`,
        certificate_type: mapCertificateType(certificateData.certificateType),
        purpose: getCertificatePurpose() || 'General medical certificate',
        medical_opinion: certificateData.diagnosis || 'Medical examination completed',
        valid_from: certificateData.dateIssued,
        valid_until: certificateData.followUpDate || null,
        restrictions: certificateData.fitForWork === 'limited' ? certificateData.limitations : '',
        examination_findings: certificateData.recommendations || ''
      };

      console.log('Saving certificate to backend:', certificateApiData);
      const backendResponse = await axiosInstance.post('/medical-documents/medical-certificates/', certificateApiData);
      console.log('Certificate saved to backend:', backendResponse.data);
      
      // Generate certificate for local display and email
      const certificate = {
        id: backendResponse.data.id || Date.now(),
        type: 'Medical Certificate',
        dateCreated: new Date().toISOString(),
        patientId: patient.id,
        data: certificateData,
        content: generateCertificateHTML(),
        backendId: backendResponse.data.id
      };

      // Save the certificate locally
      onSaveCertificate(certificate);

      // Send email with the certificate
      const emailData = {
        patient_email: patient.email,
        patient_name: patient.name,
        certificate_html: generateCertificateHTML(),
        certificate_type: mapCertificateType(certificateData.certificateType),
        doctor_name: certificateData.doctorName,
        hospital_name: certificateData.hospitalName,
        // Enhanced data for better PDF generation
        patient_dob: patient.date_of_birth,
        diagnosis: certificateData.diagnosis,
        medical_opinion: certificateData.diagnosis || 'Medical examination completed',
        fitness_status: certificateData.fitForWork === 'fit' ? 'Fit for work' : 
                       certificateData.fitForWork === 'unfit' ? 'Unfit for work' : 'Fit with limitations',
        purpose: getCertificatePurpose() || 'General medical certificate',
        valid_from: certificateData.dateIssued,
        valid_until: certificateData.followUpDate || null,
        restrictions: certificateData.fitForWork === 'limited' ? certificateData.limitations : '',
        examination_findings: certificateData.recommendations || '',
        date_issued: format(new Date(certificateData.dateIssued), 'MMMM dd, yyyy'),
        subject: `Medical Certificate - ${certificateData.fitForWork === 'unfit' ? 'Sick Leave Certificate' : 
                 certificateData.fitForWork === 'limited' ? 'Fitness Certificate (Limited)' : 'Fitness Certificate'}`,
        email_body: `Dear ${patient.name},

Please find attached your medical certificate as requested.

Certificate Details:
- Type: ${certificateData.fitForWork === 'unfit' ? 'Sick Leave Certificate' : 
          certificateData.fitForWork === 'limited' ? 'Fitness Certificate (Limited)' : 'Fitness Certificate'}
- Date Issued: ${format(new Date(certificateData.dateIssued), 'MMMM dd, yyyy')}
- Issued by: ${certificateData.doctorName}

If you have any questions, please contact our clinic.

Best regards,
${certificateData.hospitalName}`
      };

      await axiosInstance.post('/send-medical-certificate-email/', emailData);
      
      setShowForm(false);
      setShowPreview(false);
      
      // Show success message using dynamic import to avoid SSR issues
      const { toast } = await import('sonner');
      toast.success('Medical certificate saved and sent via email successfully!', {
        description: `Email sent to ${patient.email}`
      });
      
    } catch (error) {
      console.error('Error saving and sending certificate:', error);
      const { toast } = await import('sonner');
      
      if (error.response?.data) {
        console.error('Backend error details:', error.response.data);
        toast.error('Failed to save certificate', {
          description: error.response.data.message || 'Please check the form and try again.'
        });
      } else {
        toast.error('Failed to send email', {
          description: 'Certificate was saved but email sending failed. Please try sending manually.'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const generateCertificateHTML = () => {
    const templateData: MedicalCertificateTemplateData = {
      hospitalName: certificateData.hospitalName,
      hospitalAddress: certificateData.hospitalAddress,
      hospitalContact: certificateData.hospitalContact,
      hospitalLicense: certificateData.hospitalLicense,
      doctorName: certificateData.doctorName,
      doctorLicense: certificateData.doctorLicense,
      doctorPRC: certificateData.doctorPRC,
      doctorPTR: certificateData.doctorPTR,
      patientName: certificateData.patientName,
      patientAge: certificateData.patientAge,
      patientAddress: certificateData.patientAddress,
      patientSex: certificateData.patientSex,
      diagnosis: certificateData.diagnosis,
      recommendations: certificateData.recommendations,
      restFromDate: certificateData.restFromDate,
      restToDate: certificateData.restToDate,
      fitForWork: certificateData.fitForWork,
      limitations: certificateData.limitations,
      followUpDate: certificateData.followUpDate,
      dateIssued: certificateData.dateIssued,
      certificateType: certificateData.certificateType
    };

    return generateMedicalCertificateHTML(templateData);
  };

  if (showPreview) {
    return (
      <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Certificate Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className="border rounded-lg p-6 bg-white min-h-[600px] max-h-[70vh] overflow-auto"
              style={{ 
                maxWidth: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: generateCertificateHTML() }} />
            </div>            <div className="flex gap-2">
              <Button onClick={generateCertificate} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Save Certificate
              </Button>
              <Button 
                onClick={saveAndSendEmail} 
                disabled={loading || !patient.email}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Mail className="mr-2 h-4 w-4" />
                {loading ? 'Sending...' : 'Save & Send Email'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const printContent = generateCertificateHTML();
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Medical Certificate</title>
                          <style>
                            @media print {
                              body { margin: 0; }
                              @page { margin: 0.5in; }
                            }
                          </style>
                        </head>
                        <body>
                          ${printContent}
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (showForm) {
    return (
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Medical Certificate
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Fill out the details to generate a medical certificate for {patient.name}
            </p>
          </DialogHeader>
          
          {loading && (
            <div className="flex items-center justify-center p-4">
              <div className="text-sm text-muted-foreground">
                Loading clinic and doctor information from database...
              </div>
            </div>
          )}
          
          <div className="space-y-6">            {/* Hospital Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Hospital Information</h3>
              <p className="text-sm text-muted-foreground">Name, address, and contact are auto-populated from database. License number is editable.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hospitalName">Hospital/Clinic Name</Label>
                  <Input
                    id="hospitalName"
                    value={certificateData.hospitalName}
                    readOnly
                    disabled={!!clinicInfo}
                    className="bg-gray-50"
                    placeholder="Loading from database..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalAddress">Address</Label>
                  <Input
                    id="hospitalAddress"
                    value={certificateData.hospitalAddress}
                    readOnly
                    disabled={!!clinicInfo}
                    className="bg-gray-50"
                    placeholder="Loading from database..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalContact">Contact Information</Label>
                  <Input
                    id="hospitalContact"
                    value={certificateData.hospitalContact}
                    readOnly
                    disabled={!!clinicInfo}
                    className="bg-gray-50"
                    placeholder="Loading from database..."
                  />
                </div>                <div className="space-y-2">
                  <Label htmlFor="hospitalLicense">License Number (Optional)</Label>
                  <Input
                    id="hospitalLicense"
                    value={certificateData.hospitalLicense}
                    onChange={(e) => handleInputChange('hospitalLicense', e.target.value)}
                    placeholder="Enter hospital license number"
                  />
                </div>
              </div>
            </div>

            <Separator />            {/* Doctor Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Doctor Information</h3>
              <p className="text-sm text-muted-foreground">Name, PRC, and PTR are auto-populated from database. License number is editable.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">                <div className="space-y-2">
                  <Label htmlFor="doctorName">Doctor Name</Label>
                  <Input
                    id="doctorName"
                    value={certificateData.doctorName}
                    readOnly
                    disabled={!!doctorInfo || (currentUser?.role === 'doctor')}
                    className="bg-gray-50"
                    placeholder="Loading from database..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorLicense">License Number</Label>
                  <Input
                    id="doctorLicense"
                    value={certificateData.doctorLicense}
                    onChange={(e) => handleInputChange('doctorLicense', e.target.value)}
                    placeholder="Enter license number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorPRC">PRC Number (Optional)</Label>
                  <Input
                    id="doctorPRC"
                    value={certificateData.doctorPRC}
                    readOnly
                    disabled={!!doctorInfo || (currentUser?.role === 'doctor')}
                    className="bg-gray-50"
                    placeholder="Loading from database..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorPTR">PTR Number (Optional)</Label>
                  <Input
                    id="doctorPTR"
                    value={certificateData.doctorPTR}
                    readOnly
                    disabled={!!doctorInfo || (currentUser?.role === 'doctor')}
                    className="bg-gray-50"
                    placeholder="Loading from database..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Patient Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input
                    id="patientName"
                    value={certificateData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input
                    id="patientAge"
                    value={certificateData.patientAge}
                    onChange={(e) => handleInputChange('patientAge', e.target.value)}
                    placeholder="Enter age"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Medical Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certificateType">Certificate Type</Label>
                  <Select 
                    value={certificateData.certificateType} 
                    onValueChange={(value) => handleInputChange('certificateType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Medical Certificate</SelectItem>
                      <SelectItem value="sick_leave">Sick Leave Certificate</SelectItem>
                      <SelectItem value="fitness">Medical Fitness Certificate</SelectItem>
                      <SelectItem value="vaccination">Vaccination Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">
                    Diagnosis (Required) <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="diagnosis"
                    value={certificateData.diagnosis}
                    onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                    placeholder="Enter diagnosis"
                    rows={3}
                    className={!certificateData.diagnosis ? 'border-red-300' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommendations">
                    Medical Recommendations {(certificateData.fitForWork === 'unfit' || certificateData.fitForWork === 'limited') ? '(Required)' : '(Optional)'}
                    {(certificateData.fitForWork === 'unfit' || certificateData.fitForWork === 'limited') && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id="recommendations"
                    value={certificateData.recommendations}
                    onChange={(e) => handleInputChange('recommendations', e.target.value)}
                    placeholder="Enter medical recommendations"
                    rows={3}
                    className={(certificateData.fitForWork === 'unfit' || certificateData.fitForWork === 'limited') && !certificateData.recommendations ? 'border-red-300' : ''}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Work Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Work Status</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fitForWork">Fitness for Work</Label>
                  <Select 
                    value={certificateData.fitForWork} 
                    onValueChange={(value) => handleInputChange('fitForWork', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work fitness status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Fit for Work</SelectItem>
                      <SelectItem value="unfit">Unfit for Work</SelectItem>
                      <SelectItem value="limited">Fit with Limitations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {certificateData.fitForWork === 'unfit' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="restFromDate">Rest From Date</Label>
                      <Input
                        id="restFromDate"
                        type="date"
                        value={certificateData.restFromDate}
                        onChange={(e) => handleInputChange('restFromDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restToDate">Rest To Date</Label>
                      <Input
                        id="restToDate"
                        type="date"
                        value={certificateData.restToDate}
                        onChange={(e) => handleInputChange('restToDate', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {certificateData.fitForWork === 'limited' && (
                  <div className="space-y-2">
                    <Label htmlFor="limitations">Work Limitations</Label>
                    <Textarea
                      id="limitations"
                      value={certificateData.limitations}
                      onChange={(e) => handleInputChange('limitations', e.target.value)}
                      placeholder="Describe work limitations"
                      rows={2}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={certificateData.followUpDate}
                    onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateIssued">Date Issued</Label>
                  <Input
                    id="dateIssued"
                    type="date"
                    value={certificateData.dateIssued}
                    onChange={(e) => handleInputChange('dateIssued', e.target.value)}
                  />
                </div>
              </div>
            </div>            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => setShowPreview(true)}
                className="flex-1"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview Certificate
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileCheck className="h-4 w-4" />
        <h3 className="font-semibold">Medical Certificates</h3>
      </div>      <div className="space-y-2">        
        {savedCertificates && savedCertificates.length > 0 ? (
          <>
            {savedCertificates.map((certificate, index) => (
              <div key={certificate.id || index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{certificate.type || 'Medical Certificate'}</div>
                    <div className="text-xs text-muted-foreground">
                      Created: {certificate.dateCreated ? new Date(certificate.dateCreated).toLocaleDateString() : 'Unknown date'}
                    </div>
                    {certificate.data?.diagnosis && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Diagnosis: {certificate.data.diagnosis.substring(0, 50)}
                        {certificate.data.diagnosis.length > 50 ? '...' : ''}
                      </div>
                    )}
                  </div>                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (certificate.content) {
                          const newWindow = window.open();
                          if (newWindow) {
                            newWindow.document.write(certificate.content);
                            newWindow.document.close();
                          }
                        } else {
                          console.error('No certificate content available');
                        }
                      }}
                      title="View Certificate"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (certificate.content) {
                          const blob = new Blob([certificate.content], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `medical-certificate-${certificate.data?.patientName || 'patient'}-${new Date(certificate.dateCreated).toISOString().split('T')[0]}.html`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } else {
                          console.error('No certificate content available for download');
                        }
                      }}
                      title="Download Certificate"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    {onDeleteCertificate && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDeleteConfirmId(certificate.id || index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete Certificate"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="p-3 border rounded-lg">
            <div className="text-sm font-medium">No certificates available</div>
            <div className="text-xs text-muted-foreground">Generate certificates as needed</div>
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowForm(true)}
          className="w-full"
        >
          <FileText className="mr-2 h-4 w-4" />
          Generate Medical Certificate
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId !== null && (
        <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Delete Certificate
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this medical certificate? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteCertificate(deleteConfirmId)}
                  className="flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MedicalCertificateGenerator;
