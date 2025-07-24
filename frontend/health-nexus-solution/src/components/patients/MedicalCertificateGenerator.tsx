import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Download, Save, Eye, FileCheck, X, Trash2, Printer, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Patient } from '@/lib/mock-data';
import { useClinic } from '@/contexts/ClinicContext';
import axios from 'axios';

// Set axios base URL for API calls
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

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
  diagnosis: string;
  recommendations: string;
  restFromDate: string;
  restToDate: string;
  fitForWork: 'fit' | 'unfit' | 'limited';
  limitations: string;
  followUpDate: string;
  dateIssued: string;
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
    diagnosis: '',
    recommendations: '',
    restFromDate: format(new Date(), 'yyyy-MM-dd'),
    restToDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 7 days from now
    fitForWork: 'unfit',
    limitations: '',
    followUpDate: '',
    dateIssued: format(new Date(), 'yyyy-MM-dd')
  });  // Fetch clinic information
  const fetchClinicInfo = async () => {
    try {
      const response = await axios.get('/clinic/');
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
        const response = await axios.get('/doctors/');
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
          doctorName: `Dr. ${currentUser.name || 'Doctor Name'}`
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

  const generateCertificate = () => {
    const certificate = {
      id: Date.now(), // Simple ID generation
      type: 'Medical Certificate',
      dateCreated: new Date().toISOString(),
      patientId: patient.id,
      data: certificateData,
      content: generateCertificateHTML()
    };

    onSaveCertificate(certificate);
    setShowForm(false);
    setShowPreview(false);
  };

  const saveAndSendEmail = async () => {
    try {
      setLoading(true);
      
      // Generate certificate first
      const certificate = {
        id: Date.now(),
        type: 'Medical Certificate',
        dateCreated: new Date().toISOString(),
        patientId: patient.id,
        data: certificateData,
        content: generateCertificateHTML()
      };

      // Save the certificate
      onSaveCertificate(certificate);

      // Send email with the certificate
      const emailData = {
        patient_email: patient.email,
        patient_name: patient.name,
        certificate_html: generateCertificateHTML(),
        certificate_type: certificateData.fitForWork === 'unfit' ? 'Sick Leave Certificate' : 
                         certificateData.fitForWork === 'limited' ? 'Fitness Certificate (Limited)' : 'Fitness Certificate',
        doctor_name: certificateData.doctorName,
        hospital_name: certificateData.hospitalName,
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

      await axios.post('/send-medical-certificate-email/', emailData);
      
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
      toast.error('Failed to send email', {
        description: 'Certificate was saved but email sending failed. Please try sending manually.'
      });
    } finally {
      setLoading(false);
    }
  };
  const generateCertificateHTML = () => {
    return `
      <div style="font-family: 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 0; background: white; border: 3px solid #1e40af; position: relative;">
        <!-- Medical Symbol Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center; position: relative;">
          <div style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); font-size: 40px;">⚕️</div>
          <div style="position: absolute; right: 30px; top: 50%; transform: translateY(-50%); font-size: 40px;">⚕️</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">${certificateData.hospitalName}</h1>
          <div style="width: 100px; height: 2px; background: white; margin: 10px auto;"></div>
          <p style="margin: 8px 0; font-size: 14px; opacity: 0.9;">${certificateData.hospitalAddress}</p>
          <p style="margin: 5px 0; font-size: 13px; opacity: 0.9;">${certificateData.hospitalContact}</p>
          ${certificateData.hospitalLicense ? `<p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">License No: ${certificateData.hospitalLicense}</p>` : ''}
        </div>

        <!-- Certificate Title -->
        <div style="text-align: center; padding: 30px 0 20px 0; background: #f8fafc;">
          <h2 style="margin: 0; color: #1e40af; font-size: 36px; font-weight: bold; letter-spacing: 3px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">MEDICAL CERTIFICATE</h2>
          <div style="width: 200px; height: 3px; background: linear-gradient(to right, #1e40af, #3b82f6, #1e40af); margin: 15px auto;"></div>
          <p style="margin: 10px 0; font-size: 14px; color: #64748b; font-style: italic;">Official Medical Document</p>
        </div>

        <!-- Certificate Content -->
        <div style="padding: 40px; background: white;">
          <!-- Date and Reference -->
          <div style="margin-bottom: 30px; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
            <div>
              <p style="margin: 0; font-size: 16px; color: #374151;"><strong>Certificate No:</strong> MC-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 16px; color: #374151;"><strong>Date Issued:</strong> ${format(new Date(certificateData.dateIssued), 'MMMM dd, yyyy')}</p>
            </div>
          </div>

          <!-- Formal Address -->
          <div style="margin-bottom: 30px;">
            <p style="margin-bottom: 20px; font-size: 18px; font-weight: 600; color: #1f2937;">To Whom It May Concern:</p>
          </div>

          <!-- Patient Information Card -->
          <div style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-left: 5px solid #1e40af; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 20px; font-weight: bold;">PATIENT INFORMATION</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 8px 0; font-size: 16px; color: #374151;"><strong>Name:</strong> ${certificateData.patientName}</p>
                <p style="margin: 8px 0; font-size: 16px; color: #374151;"><strong>Age:</strong> ${certificateData.patientAge} years</p>
              </div>
              <div>
                <p style="margin: 8px 0; font-size: 16px; color: #374151;"><strong>Date of Examination:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          <!-- Medical Findings -->
          <div style="margin-bottom: 30px;">
            <p style="margin-bottom: 20px; font-size: 18px; line-height: 1.6; color: #374151; text-align: justify;">
              This is to certify that the above-named patient has been under my professional medical care and examination.
            </p>
            
            <div style="margin: 25px 0; padding: 25px; background: #fefefe; border: 2px solid #e2e8f0; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="margin-bottom: 20px; padding: 15px; background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 5px;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #dc2626;">DIAGNOSIS:</p>
                <p style="margin: 8px 0 0 0; font-size: 16px; color: #374151;">${certificateData.diagnosis}</p>
              </div>
              
              <div style="margin-bottom: 20px; padding: 15px; background: #dbeafe; border-left: 4px solid #2563eb; border-radius: 5px;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #2563eb;">MEDICAL RECOMMENDATIONS:</p>
                <p style="margin: 8px 0 0 0; font-size: 16px; color: #374151;">${certificateData.recommendations}</p>
              </div>
            </div>
          </div>

          <!-- Work Status Section -->
          <div style="margin-bottom: 30px; padding: 25px; background: ${
            certificateData.fitForWork === 'unfit' ? '#fef2f2' : 
            certificateData.fitForWork === 'limited' ? '#fffbeb' : '#f0fdf4'
          }; border: 2px solid ${
            certificateData.fitForWork === 'unfit' ? '#fecaca' : 
            certificateData.fitForWork === 'limited' ? '#fed7aa' : '#bbf7d0'
          }; border-radius: 10px;">
            <h3 style="margin: 0 0 15px 0; color: ${
              certificateData.fitForWork === 'unfit' ? '#dc2626' : 
              certificateData.fitForWork === 'limited' ? '#d97706' : '#059669'
            }; font-size: 20px; font-weight: bold;">WORK FITNESS ASSESSMENT</h3>
            
            ${certificateData.fitForWork === 'unfit' ? `
              <div style="padding: 15px; background: #fee2e2; border-radius: 8px; border-left: 4px solid #dc2626;">
                <p style="margin: 0; font-size: 18px; color: #dc2626; font-weight: bold;">⚠️ UNFIT FOR WORK</p>
                <p style="margin: 10px 0; font-size: 16px; color: #374151;">
                  The patient is medically advised to rest from work from 
                  <strong style="color: #dc2626;">${format(new Date(certificateData.restFromDate), 'MMMM dd, yyyy')}</strong> 
                  to <strong style="color: #dc2626;">${format(new Date(certificateData.restToDate), 'MMMM dd, yyyy')}</strong>.
                </p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280; font-style: italic;">
                  Total rest period: ${Math.ceil((new Date(certificateData.restToDate).getTime() - new Date(certificateData.restFromDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            ` : certificateData.fitForWork === 'limited' ? `
              <div style="padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #d97706;">
                <p style="margin: 0; font-size: 18px; color: #d97706; font-weight: bold;">⚡ FIT FOR WORK WITH LIMITATIONS</p>
                <p style="margin: 10px 0; font-size: 16px; color: #374151;">
                  <strong>Limitations:</strong> ${certificateData.limitations}
                </p>
              </div>
            ` : `
              <div style="padding: 15px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #059669;">
                <p style="margin: 0; font-size: 18px; color: #059669; font-weight: bold;">✅ FIT FOR WORK</p>
                <p style="margin: 10px 0; font-size: 16px; color: #374151;">
                  The patient is medically cleared to return to work without restrictions.
                </p>
              </div>
            `}
          </div>

          ${certificateData.followUpDate ? `
            <div style="margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p style="margin: 0; font-size: 16px; color: #374151;">
                <strong style="color: #1e40af;">📅 Follow-up Appointment:</strong> ${format(new Date(certificateData.followUpDate), 'MMMM dd, yyyy')}
              </p>
            </div>
          ` : ''}

          <!-- Legal Notice -->
          <div style="margin-bottom: 40px; padding: 15px; background: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">
              This medical certificate is issued based on my professional medical examination and is valid for the purposes stated above. 
              Any alteration or misuse of this document is strictly prohibited and may constitute a criminal offense.
            </p>
          </div>

          <!-- Doctor Signature Section -->
          <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                This certificate was generated electronically and is valid without physical signature as per digital medical records policy.
              </p>
            </div>
            <div style="text-align: center; width: 350px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 10px; background: #fafafa;">
              <div style="border-bottom: 3px solid #1e40af; margin-bottom: 15px; height: 60px; position: relative;">
                <div style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); background: #1e40af; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  DIGITAL SIGNATURE
                </div>
              </div>
              <p style="margin: 20px 0 8px 0; font-weight: bold; font-size: 18px; color: #1e40af;">${certificateData.doctorName}</p>
              <p style="margin: 5px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Attending Physician</p>
              <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
                ${certificateData.doctorLicense ? `<p style="margin: 3px 0; font-size: 12px; color: #6b7280;">License No: ${certificateData.doctorLicense}</p>` : ''}
                ${certificateData.doctorPRC ? `<p style="margin: 3px 0; font-size: 12px; color: #6b7280;">PRC No: ${certificateData.doctorPRC}</p>` : ''}
                ${certificateData.doctorPTR ? `<p style="margin: 3px 0; font-size: 12px; color: #6b7280;">PTR No: ${certificateData.doctorPTR}</p>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1e40af; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0; opacity: 0.8;">
            This is an official medical document issued by ${certificateData.hospitalName} • Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}
          </p>
        </div>
      </div>
    `;
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
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea
                    id="diagnosis"
                    value={certificateData.diagnosis}
                    onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                    placeholder="Enter diagnosis"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommendations">Medical Recommendations</Label>
                  <Textarea
                    id="recommendations"
                    value={certificateData.recommendations}
                    onChange={(e) => handleInputChange('recommendations', e.target.value)}
                    placeholder="Enter medical recommendations"
                    rows={3}
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
                disabled={!certificateData.diagnosis}
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
