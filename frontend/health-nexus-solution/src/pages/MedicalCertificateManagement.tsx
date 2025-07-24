import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Eye, Mail, FileText, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useClinic } from '@/contexts/ClinicContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { generateMedicalCertificateHTML, MedicalCertificateTemplateData } from '@/utils/medicalCertificateTemplate';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

interface MedicalCertificateRequest {
  id: number;
  request_type: string;
  patient_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  additional_info: string;
  status: 'pending' | 'receptionist_approved' | 'doctor_approved' | 'completed' | 'rejected';
  requested_at: string;
  receptionist_approved_at?: string;
  doctor_approved_at?: string;
  certificate_content?: string;
  doctor_notes?: string;
  rejection_reason?: string;
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

interface CertificateFormData {
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
  certificateType: string;
}

const MedicalCertificateManagement: React.FC = () => {
  const { currentUser } = useClinic();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MedicalCertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MedicalCertificateRequest | null>(null);
  const [certificateContent, setCertificateContent] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCertificateForm, setShowCertificateForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [certificateFormData, setCertificateFormData] = useState<CertificateFormData>({
    hospitalName: 'HealthNexus Medical Center',
    hospitalAddress: '123 Medical Plaza, City, State 12345',
    hospitalContact: '',
    hospitalLicense: '',
    doctorName: '',
    doctorLicense: '',
    doctorPRC: '',
    doctorPTR: '',
    patientName: '',
    patientAge: '',
    diagnosis: '',
    recommendations: '',
    restFromDate: format(new Date(), 'yyyy-MM-dd'),
    restToDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    fitForWork: 'unfit',
    limitations: '',
    followUpDate: '',
    dateIssued: format(new Date(), 'yyyy-MM-dd'),
    certificateType: ''
  });

  useEffect(() => {
    fetchRequests();
    fetchClinicInfo();
    fetchDoctorInfo();
  }, []);

  const fetchClinicInfo = async () => {
    try {
      const response = await axios.get('/clinics/current/');
      setClinicInfo(response.data);
      
      // Update certificate form data with clinic info
      setCertificateFormData(prev => ({
        ...prev,
        hospitalName: response.data.clinic_name,
        hospitalAddress: `${response.data.address}, ${response.data.city}, ${response.data.state} ${response.data.zip}`,
        hospitalContact: `Phone: ${response.data.phone} | Email: ${response.data.email}${response.data.website ? ` | ${response.data.website}` : ''}`
      }));
    } catch (error) {
      console.error('Error fetching clinic info:', error);
    }
  };

  const fetchDoctorInfo = async () => {
    try {
      const response = await axios.get('/doctors/current/');
      setDoctorInfo(response.data);
      
      // Update certificate form data with doctor info
      setCertificateFormData(prev => ({
        ...prev,
        doctorName: `Dr. ${response.data.first_name} ${response.data.last_name}`,
        doctorLicense: response.data.license || '',
        doctorPRC: response.data.prc || '',
        doctorPTR: response.data.ptr || ''
      }));
    } catch (error) {
      console.error('Error fetching doctor info:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/medical-certificates/');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching medical certificate requests:', error);
      toast.error('Failed to load medical certificate requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCertificate = (request: MedicalCertificateRequest) => {
    // Calculate patient age
    const patientAge = request.date_of_birth ? 
      String(new Date().getFullYear() - new Date(request.date_of_birth).getFullYear()) : '';
    
    // Set up certificate form data with request information
    setCertificateFormData(prev => ({
      ...prev,
      patientName: request.patient_name,
      patientAge: patientAge,
      certificateType: request.request_type,
      // Pre-fill with any existing certificate content
      diagnosis: request.certificate_content || '',
      recommendations: request.additional_info || ''
    }));
    
    setSelectedRequest(request);
    setShowCertificateForm(true);
  };

  const handlePreviewCertificate = () => {
    if (!certificateFormData.diagnosis || !certificateFormData.recommendations) {
      toast.error('Please fill in diagnosis and recommendations');
      return;
    }
    setShowPreview(true);
  };

  const handleSaveCertificate = async () => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);
      const templateData: MedicalCertificateTemplateData = {
        ...certificateFormData,
        certificateType: selectedRequest.request_type
      };
      
      const certificateHTML = generateMedicalCertificateHTML(templateData);
      
      // Update the request with certificate content
      const response = await axios.post(`/medical-certificates/${selectedRequest.id}/approve/`, {
        action: 'doctor_approve',
        certificate_content: certificateHTML,
        certificate_html: certificateHTML, // Add HTML version for email
        doctor_notes: doctorNotes
      });
      
      toast.success('Certificate generated and sent successfully');
      setShowCertificateForm(false);
      setShowPreview(false);
      fetchRequests();
    } catch (error) {
      console.error('Error saving certificate:', error);
      toast.error('Failed to save certificate');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCertificate = () => {
    if (!selectedRequest) return;
    
    const templateData: MedicalCertificateTemplateData = {
      ...certificateFormData,
      certificateType: selectedRequest.request_type
    };
    
    const certificateHTML = generateMedicalCertificateHTML(templateData);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medical Certificate - ${certificateFormData.patientName}</title>
            <style>
              body { margin: 0; padding: 20px; }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${certificateHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadCertificate = () => {
    if (!selectedRequest) return;
    
    const templateData: MedicalCertificateTemplateData = {
      ...certificateFormData,
      certificateType: selectedRequest.request_type
    };
    
    const certificateHTML = generateMedicalCertificateHTML(templateData);
    
    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-certificate-${certificateFormData.patientName}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = async (requestId: number, action: string) => {
    try {
      let payload: any = { action };
      
      if (action === 'doctor_approve') {
        payload.certificate_content = certificateContent;
        payload.doctor_notes = doctorNotes;
      } else if (action === 'reject') {
        payload.rejection_reason = rejectionReason;
      }

      const response = await axios.post(`/medical-certificates/${requestId}/approve/`, payload);
      
      toast.success(response.data.message);
      fetchRequests();
      setSelectedRequest(null);
      setCertificateContent('');
      setDoctorNotes('');
      setRejectionReason('');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      receptionist_approved: { color: 'bg-blue-100 text-blue-800', label: 'Receptionist Approved' },
      doctor_approved: { color: 'bg-green-100 text-green-800', label: 'Doctor Approved' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getRequestTypeLabel = (type: string) => {
    const types = {
      sick_leave: 'Sick Leave Certificate',
      fitness: 'Medical Fitness Certificate',
      vaccination: 'Vaccination Certificate',
      general: 'General Medical Certificate'
    };
    return types[type] || type;
  };

  const filteredRequests = requests.filter(request => 
    filterStatus === 'all' || request.status === filterStatus
  );

  const currentUserRole = currentUser?.role;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Medical Certificate Management</h1>
          <p className="text-gray-600">Manage medical certificate requests from patients</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="receptionist_approved">Receptionist Approved</SelectItem>
              <SelectItem value="doctor_approved">Doctor Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical Certificate Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.patient_name}</TableCell>
                    <TableCell>{getRequestTypeLabel(request.request_type)}</TableCell>
                    <TableCell>{request.date_of_birth}</TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>{request.phone}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Medical Certificate Request Details</DialogTitle>
                            </DialogHeader>
                            {selectedRequest && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="font-semibold">Patient Name</Label>
                                    <p>{selectedRequest.patient_name}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Request Type</Label>
                                    <p>{getRequestTypeLabel(selectedRequest.request_type)}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Date of Birth</Label>
                                    <p>{selectedRequest.date_of_birth}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Email</Label>
                                    <p>{selectedRequest.email}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Phone</Label>
                                    <p>{selectedRequest.phone}</p>
                                  </div>
                                  <div>
                                    <Label className="font-semibold">Status</Label>
                                    <p>{getStatusBadge(selectedRequest.status)}</p>
                                  </div>
                                </div>
                                
                                {selectedRequest.additional_info && (
                                  <div>
                                    <Label className="font-semibold">Additional Information</Label>
                                    <p className="mt-1 p-2 bg-gray-50 rounded">{selectedRequest.additional_info}</p>
                                  </div>
                                )}

                                {/* Action buttons based on role and status */}
                                <div className="flex justify-end space-x-2 pt-4 border-t">
                                  {currentUserRole === 'receptionist' && selectedRequest.status === 'pending' && (
                                    <>
                                      <Button
                                        onClick={() => handleApprove(selectedRequest.id, 'receptionist_approve')}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve (Receptionist)
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          if (rejectionReason.trim()) {
                                            handleApprove(selectedRequest.id, 'reject');
                                          } else {
                                            toast.error('Please provide a rejection reason');
                                          }
                                        }}
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                    </>
                                  )}

                                  {currentUserRole === 'doctor' && selectedRequest.status === 'receptionist_approved' && (
                                    <div className="space-y-4 w-full">
                                      <div className="flex space-x-2">
                                        <Button
                                          onClick={() => handleCreateCertificate(selectedRequest)}
                                          className="bg-blue-600 hover:bg-blue-700"
                                        >
                                          <FileText className="h-4 w-4 mr-2" />
                                          Generate Medical Certificate
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => {
                                            if (rejectionReason.trim()) {
                                              handleApprove(selectedRequest.id, 'reject');
                                            } else {
                                              toast.error('Please provide a rejection reason');
                                            }
                                          }}
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {selectedRequest.status === 'rejected' && (
                                    <div className="w-full">
                                      <Label className="font-semibold text-red-600">Rejection Reason</Label>
                                      <p className="mt-1 p-2 bg-red-50 rounded text-red-800">
                                        {selectedRequest.rejection_reason}
                                      </p>
                                    </div>
                                  )}

                                  {selectedRequest.status === 'completed' && selectedRequest.certificate_content && (
                                    <div className="w-full">
                                      <Label className="font-semibold text-green-600">Certificate Content</Label>
                                      <p className="mt-1 p-2 bg-green-50 rounded text-green-800">
                                        {selectedRequest.certificate_content}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Rejection reason input */}
                                {(selectedRequest.status === 'pending' || selectedRequest.status === 'receptionist_approved') && (
                                  <div className="pt-4 border-t">
                                    <Label htmlFor="rejection-reason">Rejection Reason (if rejecting)</Label>
                                    <Textarea
                                      id="rejection-reason"
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Enter reason for rejection..."
                                      rows={3}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Form Modal */}
      <Dialog open={showCertificateForm} onOpenChange={setShowCertificateForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Medical Certificate</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient-name">Patient Name</Label>
                <Input
                  id="patient-name"
                  value={certificateFormData.patientName}
                  onChange={(e) => setCertificateFormData(prev => ({ ...prev, patientName: e.target.value }))}
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <Label htmlFor="patient-age">Patient Age</Label>
                <Input
                  id="patient-age"
                  value={certificateFormData.patientAge}
                  onChange={(e) => setCertificateFormData(prev => ({ ...prev, patientAge: e.target.value }))}
                  placeholder="Enter patient age"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={certificateFormData.diagnosis}
                onChange={(e) => setCertificateFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Enter diagnosis"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="recommendations">Medical Recommendations</Label>
              <Textarea
                id="recommendations"
                value={certificateFormData.recommendations}
                onChange={(e) => setCertificateFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                placeholder="Enter medical recommendations"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rest-from">Rest From</Label>
                <Input
                  id="rest-from"
                  type="date"
                  value={certificateFormData.restFromDate}
                  onChange={(e) => setCertificateFormData(prev => ({ ...prev, restFromDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="rest-to">Rest To</Label>
                <Input
                  id="rest-to"
                  type="date"
                  value={certificateFormData.restToDate}
                  onChange={(e) => setCertificateFormData(prev => ({ ...prev, restToDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fit-for-work">Fitness for Work</Label>
              <Select
                value={certificateFormData.fitForWork}
                onValueChange={(value: 'fit' | 'unfit' | 'limited') => 
                  setCertificateFormData(prev => ({ ...prev, fitForWork: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit for Work</SelectItem>
                  <SelectItem value="unfit">Unfit for Work</SelectItem>
                  <SelectItem value="limited">Limited Work Capacity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {certificateFormData.fitForWork === 'limited' && (
              <div>
                <Label htmlFor="limitations">Work Limitations</Label>
                <Textarea
                  id="limitations"
                  value={certificateFormData.limitations}
                  onChange={(e) => setCertificateFormData(prev => ({ ...prev, limitations: e.target.value }))}
                  placeholder="Specify work limitations"
                  rows={3}
                />
              </div>
            )}

            <div>
              <Label htmlFor="follow-up">Follow-up Date (Optional)</Label>
              <Input
                id="follow-up"
                type="date"
                value={certificateFormData.followUpDate}
                onChange={(e) => setCertificateFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="doctor-notes">Doctor Notes (Optional)</Label>
              <Textarea
                id="doctor-notes"
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter any additional notes..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCertificateForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePreviewCertificate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Certificate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div 
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ 
                __html: generateMedicalCertificateHTML({
                  ...certificateFormData,
                  certificateType: selectedRequest?.request_type || ''
                })
              }}
            />
            
            <div className="flex space-x-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintCertificate}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadCertificate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleSaveCertificate}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                <Mail className="h-4 w-4 mr-2" />
                {loading ? 'Sending...' : 'Save and Send via Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalCertificateManagement;
