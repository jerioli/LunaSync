import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Mail, FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

interface CertificateFormData {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientDob: string;
  certificateType: string;
  content: string;
  doctorNotes: string;
  requestId?: number;
}

interface LocationState {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientDob: string;
  certificateType: string;
  requestId?: number;
  additionalInfo?: string;
  returnPath?: string;
}

const MedicalCertificateGeneration: React.FC = () => {
  const { currentUser } = useClinic();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [formData, setFormData] = useState<CertificateFormData>({
    patientName: state?.patientName || '',
    patientEmail: state?.patientEmail || '',
    patientPhone: state?.patientPhone || '',
    patientDob: state?.patientDob || '',
    certificateType: state?.certificateType || 'general',
    content: '',
    doctorNotes: '',
    requestId: state?.requestId
  });

  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const certificateTypes = {
    'sick_leave': 'Sick Leave Certificate',
    'fitness': 'Medical Fitness Certificate',
    'vaccination': 'Vaccination Certificate',
    'general': 'General Medical Certificate'
  };

  // Generate template content based on certificate type
  const generateTemplateContent = () => {
    const currentDate = new Date().toLocaleDateString();
    const doctorName = currentUser?.name || 'Dr. [Doctor Name]';
    
    const templates = {
      'sick_leave': `MEDICAL CERTIFICATE - SICK LEAVE

This is to certify that ${formData.patientName} (DOB: ${formData.patientDob}) has been examined by me and is suffering from a medical condition that requires rest and recovery.

The patient is advised to take sick leave from work/school for a period of [X] days, starting from ${currentDate}.

During this period, the patient should:
- Take adequate rest
- Follow prescribed medication
- Avoid strenuous activities
- Return for follow-up as advised

This certificate is issued for official purposes.

Date: ${currentDate}
Doctor: ${doctorName}
Medical License: [License Number]`,

      'fitness': `MEDICAL FITNESS CERTIFICATE

This is to certify that ${formData.patientName} (DOB: ${formData.patientDob}) has been examined by me and is found to be medically fit for:

☐ Employment
☐ Physical activities
☐ Sports participation
☐ Travel
☐ Other: ________________

The patient shows no signs of any medical condition that would prevent them from the above activities.

This certificate is valid for a period of [X] months from the date of issue.

Date: ${currentDate}
Doctor: ${doctorName}
Medical License: [License Number]`,

      'vaccination': `VACCINATION CERTIFICATE

This is to certify that ${formData.patientName} (DOB: ${formData.patientDob}) has received the following vaccination(s):

Vaccine Name: [Vaccine Name]
Batch Number: [Batch Number]
Date of Administration: ${currentDate}
Next Dose Due: [Date if applicable]

The patient has been observed for any immediate adverse reactions and is cleared for normal activities.

Date: ${currentDate}
Doctor: ${doctorName}
Medical License: [License Number]`,

      'general': `MEDICAL CERTIFICATE

This is to certify that ${formData.patientName} (DOB: ${formData.patientDob}) has been examined by me on ${currentDate}.

Clinical Findings:
[Clinical findings and observations]

Diagnosis:
[Diagnosis]

Recommendations:
[Medical recommendations and advice]

This certificate is issued for official purposes as requested by the patient.

Date: ${currentDate}
Doctor: ${doctorName}
Medical License: [License Number]`
    };

    return templates[formData.certificateType] || templates['general'];
  };

  const handleUseTemplate = () => {
    setFormData(prev => ({
      ...prev,
      content: generateTemplateContent()
    }));
  };

  const handleSaveAndSend = async () => {
    if (!formData.content.trim()) {
      toast.error('Please enter certificate content');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        action: 'doctor_approve',
        certificate_content: formData.content,
        doctor_notes: formData.doctorNotes
      };

      const response = await axios.post(`/medical-certificates/${formData.requestId}/approve/`, payload);
      
      toast.success('Medical certificate has been saved and sent via email!');
      
      // Navigate back to the return path or medical certificates page
      navigate(state?.returnPath || '/medical-certificates');
    } catch (error) {
      console.error('Error saving and sending certificate:', error);
      toast.error('Failed to save and send certificate');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!formData.content.trim()) {
      toast.error('Please enter certificate content');
      return;
    }

    setIsSaving(true);
    try {
      // Save as draft or update without sending
      toast.success('Medical certificate has been saved as draft!');
    } catch (error) {
      console.error('Error saving certificate:', error);
      toast.error('Failed to save certificate');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    setIsPreview(true);
  };

  const handleBack = () => {
    navigate(state?.returnPath || '/medical-certificates');
  };

  if (isPreview) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => setIsPreview(false)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Edit
          </Button>
          <div className="flex space-x-2">
            <Button
              onClick={handleSaveOnly}
              disabled={isSaving}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handleSaveAndSend}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : 'Save & Send via Email'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Medical Certificate Preview</CardTitle>
            <CardDescription>
              {certificateTypes[formData.certificateType]} for {formData.patientName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-8 border rounded-lg shadow-lg">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">MEDICAL CERTIFICATE</h1>
                <p className="text-sm text-gray-600">
                  {certificateTypes[formData.certificateType]}
                </p>
              </div>
              
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {formData.content}
              </div>
              
              {formData.doctorNotes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Doctor's Notes:</h3>
                  <p className="text-sm">{formData.doctorNotes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Medical Certificates
        </Button>
        <div className="flex space-x-2">
          <Button
            onClick={handleUseTemplate}
            variant="outline"
          >
            <FileText className="h-4 w-4 mr-2" />
            Use Template
          </Button>
          <Button
            onClick={handlePreview}
            disabled={!formData.content.trim()}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Medical Certificate</CardTitle>
          <CardDescription>
            Create a medical certificate for {formData.patientName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                value={formData.patientName}
                onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="patientEmail">Patient Email</Label>
              <Input
                id="patientEmail"
                value={formData.patientEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, patientEmail: e.target.value }))}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="patientPhone">Patient Phone</Label>
              <Input
                id="patientPhone"
                value={formData.patientPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="patientDob">Date of Birth</Label>
              <Input
                id="patientDob"
                value={formData.patientDob}
                onChange={(e) => setFormData(prev => ({ ...prev, patientDob: e.target.value }))}
                disabled
              />
            </div>
          </div>

          <div>
            <Label htmlFor="certificateType">Certificate Type</Label>
            <Select
              value={formData.certificateType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, certificateType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sick_leave">Sick Leave Certificate</SelectItem>
                <SelectItem value="fitness">Medical Fitness Certificate</SelectItem>
                <SelectItem value="vaccination">Vaccination Certificate</SelectItem>
                <SelectItem value="general">General Medical Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state?.additionalInfo && (
            <div>
              <Label>Additional Information from Patient</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border">
                {state.additionalInfo}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="content">Certificate Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter the medical certificate content..."
              rows={15}
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="doctorNotes">Doctor's Notes (Optional)</Label>
            <Textarea
              id="doctorNotes"
              value={formData.doctorNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, doctorNotes: e.target.value }))}
              placeholder="Enter any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleSaveOnly}
              disabled={isSaving || !formData.content.trim()}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handlePreview}
              disabled={!formData.content.trim()}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Certificate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalCertificateGeneration;
