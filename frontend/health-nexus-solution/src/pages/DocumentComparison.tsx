import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, ArrowLeft, CheckCircle, Download, Eye, FileText, RefreshCw, Save, Stethoscope, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface DocumentComparisonState {
  originalFile: File;
  extractedText: string;
  visualizationData?: any;
  patientId?: string;
  patientName?: string;
  returnPath?: string;
}

// Auto-detection functions
const detectPatientName = (text: string): string | null => {
  const patterns = [
    /(?:patient|name)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /name[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /patient[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+(?:DOB|Age|ID))/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

const detectDoctorName = (text: string): string | null => {
  const patterns = [
    /(?:Dr\.?|Doctor|Physician)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:Authorized by|Signed by|Attending)[\s:]*(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:Referring|Primary|Consulting)\s+(?:Dr\.?|Doctor|Physician)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,]*M\.?D\.?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return `Dr. ${match[1].trim()}`;
    }
  }
  return null;
};

const DocumentComparison: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as DocumentComparisonState;
  const { patients, users } = useClinic();

  // Text editing states
  const [editableText, setEditableText] = useState('');
  const [originalImageUrl, setOriginalImageUrl] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [resultType, setResultType] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [isSaving, setSaving] = useState(false);

  // Auto-detection states
  const [detectedPatientName, setDetectedPatientName] = useState<string | null>(null);
  const [detectedDoctorName, setDetectedDoctorName] = useState<string | null>(null);
  const [autoDetectionResults, setAutoDetectionResults] = useState<{
    patient: boolean;
    doctor: boolean;
  }>({ patient: false, doctor: false });

  useEffect(() => {
    // Check if we have the required data
    if (!state?.originalFile || !state?.extractedText) {
      toast({
        title: "Missing Data",
        description: "No document data found. Redirecting back to Lab Results.",
        variant: "destructive",
      });
      navigate('/lab-results');
      return;
    }

    // Set the editable text
    setEditableText(state.extractedText);

    // Auto-detect patient and doctor from extracted text
    const detectedPatient = detectPatientName(state.extractedText);
    const detectedDoctor = detectDoctorName(state.extractedText);

    if (detectedPatient) {
      setDetectedPatientName(detectedPatient);
      // Try to match with existing patients
      const matchingPatient = patients.find(p => 
        p.name.toLowerCase().includes(detectedPatient.toLowerCase()) ||
        detectedPatient.toLowerCase().includes(p.name.toLowerCase())
      );
      if (matchingPatient) {
        setSelectedPatientId(matchingPatient.id.toString());
        setSelectedPatient(matchingPatient);
        setAutoDetectionResults(prev => ({ ...prev, patient: true }));
      }
    }

    if (detectedDoctor) {
      setDetectedDoctorName(detectedDoctor);
      setAuthorizedBy(detectedDoctor);
      setAutoDetectionResults(prev => ({ ...prev, doctor: true }));
    }

    // Pre-fill patient if provided in state
    if (state.patientId && !detectedPatient) {
      setSelectedPatientId(state.patientId);
      const patient = patients.find(p => p.id === state.patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }

    // Set today's date as default collection date
    setCollectionDate(new Date().toISOString().split('T')[0]);

    // Create object URL for the uploaded image
    const imageUrl = URL.createObjectURL(state.originalFile);
    setOriginalImageUrl(imageUrl);

    // Cleanup function to revoke object URL
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [state, navigate, patients]);

  const handleTextChange = (newText: string) => {
    setEditableText(newText);
    setHasChanges(newText !== state.extractedText);

    // Re-run auto-detection on text changes
    const detectedPatient = detectPatientName(newText);
    const detectedDoctor = detectDoctorName(newText);

    if (detectedPatient && detectedPatient !== detectedPatientName) {
      setDetectedPatientName(detectedPatient);
      const matchingPatient = patients.find(p => 
        p.name.toLowerCase().includes(detectedPatient.toLowerCase()) ||
        detectedPatient.toLowerCase().includes(p.name.toLowerCase())
      );
      if (matchingPatient) {
        setSelectedPatientId(matchingPatient.id.toString());
        setSelectedPatient(matchingPatient);
        setAutoDetectionResults(prev => ({ ...prev, patient: true }));
      }
    }

    if (detectedDoctor && detectedDoctor !== detectedDoctorName) {
      setDetectedDoctorName(detectedDoctor);
      setAuthorizedBy(detectedDoctor);
      setAutoDetectionResults(prev => ({ ...prev, doctor: true }));
    }
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
  };

  const handleResetText = () => {
    setEditableText(state.extractedText);
    setHasChanges(false);
    toast({
      title: "Text Reset",
      description: "Extracted text has been reset to original.",
    });
  };

  const handleSaveLabResult = async () => {
    // Validation
    if (!selectedPatientId) {
      toast({
        title: "Validation Error",
        description: "Please select a patient.",
        variant: "destructive",
      });
      return;
    }

    if (!resultType) {
      toast({
        title: "Validation Error",
        description: "Please select a result type.",
        variant: "destructive",
      });
      return;
    }

    if (!authorizedBy) {
      toast({
        title: "Validation Error",
        description: "Please enter the authorizing doctor.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Use the old lab results endpoint with simplified structure
      const formData = new FormData();
      formData.append('patient', selectedPatientId);
      formData.append('title', `${resultType} - ${selectedPatient?.name}`);
      formData.append('content', editableText);
      formData.append('document_date', collectionDate);
      formData.append('status', 'completed');
      formData.append('test_name', resultType);
      formData.append('test_category', resultType);
      formData.append('specimen_type', 'Lab Sample');
      formData.append('laboratory_name', laboratoryName || 'Lab Analysis');
      formData.append('collection_date', collectionDate);
      formData.append('authorized_by', authorizedBy);
      formData.append('processing_notes', `Processed via AWS Textract Document Scanner with manual review and correction. Original file: ${state.originalFile.name} (${(state.originalFile.size / 1024).toFixed(1)} KB). Extraction method: AWS Textract + Manual Review. Auto-detected: Patient=${autoDetectionResults.patient ? 'Yes' : 'No'}, Doctor=${autoDetectionResults.doctor ? 'Yes' : 'No'}.`);
      
      // Include the original file
      formData.append('document', state.originalFile);

      const response = await fetch('http://localhost:8000/api/medical-documents/lab-results/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const savedLabResult = await response.json();
      
      toast({
        title: "Lab Result Saved",
        description: `Lab result for ${selectedPatient?.name} has been saved successfully.`,
      });

      // Navigate back to lab results
      navigate('/lab-results', {
        state: {
          savedLabResult: savedLabResult,
          message: "Lab result saved successfully with manual corrections",
          autoDetected: autoDetectionResults
        }
      });

    } catch (error) {
      console.error('Error saving lab result:', error);
      toast({
        title: "Save Error",
        description: `Failed to save lab result: ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    // Open a preview of the corrected text
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lab Result Preview</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              line-height: 1.6;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .content {
              white-space: pre-wrap;
              font-size: 14px;
              color: #374151;
            }
            .info-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #1f2937; margin: 0;">Lab Result Preview</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="info-section">
              <h3>Patient Information</h3>
              <p><strong>Patient:</strong> ${selectedPatient?.name || 'Not selected'}</p>
              <p><strong>Test Type:</strong> ${resultType || 'Not specified'}</p>
              <p><strong>Collection Date:</strong> ${collectionDate}</p>
              <p><strong>Authorized By:</strong> ${authorizedBy || 'Not specified'}</p>
              <p><strong>Laboratory:</strong> ${laboratoryName || 'Not specified'}</p>
            </div>
            <div class="content">
              <h3>Test Results</h3>
              ${editableText}
            </div>
          </div>
        </body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  const downloadCorrectedText = () => {
    const content = `Lab Result Report
Patient: ${selectedPatient?.name || 'Not selected'}
Test Type: ${resultType || 'Not specified'}
Collection Date: ${collectionDate}
Authorized By: ${authorizedBy || 'Not specified'}
Laboratory: ${laboratoryName || 'Not specified'}

Results:
${editableText}
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab_result_${selectedPatient?.name || 'patient'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Lab result file has been downloaded.",
    });
  };

  if (!state) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-muted-foreground">Preparing document comparison...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review & Complete Lab Result</h1>
            <p className="text-muted-foreground">
              Review extracted text, complete the form, and save the lab result
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedPatient && (
            <Badge variant="secondary">
              Patient: {selectedPatient.name}
            </Badge>
          )}
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Text Modified
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Original Document */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Original Document
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              File: {state.originalFile.name} ({(state.originalFile.size / 1024).toFixed(1)} KB)
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <img
                src={originalImageUrl}
                alt="Original Document"
                className="w-full h-auto border rounded-lg shadow-sm max-h-[500px] object-contain"
                style={{ backgroundColor: '#f8f9fa' }}
              />
              <div className="absolute top-2 right-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(originalImageUrl, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extracted Text */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Extracted Text
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleResetText}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCorrectedText}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editableText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Extracted text will appear here..."
              className="min-h-[300px] font-mono text-sm"
              style={{ resize: 'vertical' }}
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
              <span>Characters: {editableText.length}</span>
              <span>Lines: {editableText.split('\n').length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Lab Result Form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lab Result Information
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete the form to save the lab result
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auto-Detection Results */}
            {(detectedPatientName || detectedDoctorName) && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Auto-detected information:</strong>
                    {detectedPatientName && (
                      <div className="flex items-center gap-2">
                        <Badge variant={autoDetectionResults.patient ? "default" : "secondary"} className="text-xs">
                          Patient: {detectedPatientName}
                          {autoDetectionResults.patient && <CheckCircle className="h-3 w-3 ml-1" />}
                        </Badge>
                      </div>
                    )}
                    {detectedDoctorName && (
                      <div className="flex items-center gap-2">
                        <Badge variant={autoDetectionResults.doctor ? "default" : "secondary"} className="text-xs">
                          Doctor: {detectedDoctorName}
                          {autoDetectionResults.doctor && <CheckCircle className="h-3 w-3 ml-1" />}
                        </Badge>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Patient Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient *
                {autoDetectionResults.patient && <CheckCircle className="h-4 w-4 text-green-600" />}
              </Label>
              <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.name} - {patient.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {detectedPatientName && !autoDetectionResults.patient && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Detected "{detectedPatientName}" but no matching patient found. Please select manually.
                </p>
              )}
            </div>

            {/* Result Type */}
            <div className="space-y-2">
              <Label>Test Type *</Label>
              <Select value={resultType} onValueChange={setResultType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blood Chemistry">Blood Chemistry</SelectItem>
                  <SelectItem value="Complete Blood Count">Complete Blood Count</SelectItem>
                  <SelectItem value="Lipid Profile">Lipid Profile</SelectItem>
                  <SelectItem value="Liver Function Test">Liver Function Test</SelectItem>
                  <SelectItem value="Kidney Function Test">Kidney Function Test</SelectItem>
                  <SelectItem value="Thyroid Function Test">Thyroid Function Test</SelectItem>
                  <SelectItem value="Urinalysis">Urinalysis</SelectItem>
                  <SelectItem value="X-Ray">X-Ray</SelectItem>
                  <SelectItem value="CT Scan">CT Scan</SelectItem>
                  <SelectItem value="MRI">MRI</SelectItem>
                  <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                  <SelectItem value="ECG">ECG</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Authorized By */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Authorized By *
                {autoDetectionResults.doctor && <CheckCircle className="h-4 w-4 text-green-600" />}
              </Label>
              <Select value={authorizedBy} onValueChange={setAuthorizedBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {detectedDoctorName && (
                    <SelectItem value={detectedDoctorName}>
                      {detectedDoctorName} (Auto-detected)
                    </SelectItem>
                  )}
                  {users.filter(user => user.role === 'doctor').map((doctor) => (
                    <SelectItem key={doctor.id} value={`Dr. ${doctor.first_name} ${doctor.last_name}`}>
                      Dr. {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Enter custom name</SelectItem>
                </SelectContent>
              </Select>
              {authorizedBy === 'custom' && (
                <Input
                  placeholder="Enter doctor name"
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                />
              )}
            </div>

            {/* Laboratory Name */}
            <div className="space-y-2">
              <Label>Laboratory Name</Label>
              <Input
                value={laboratoryName}
                onChange={(e) => setLaboratoryName(e.target.value)}
                placeholder="e.g., Central Laboratory"
              />
            </div>

            {/* Collection Date */}
            <div className="space-y-2">
              <Label>Collection Date</Label>
              <Input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        
        <Button
          onClick={handleSaveLabResult}
          disabled={isSaving || !selectedPatientId || !resultType || !authorizedBy}
          className="min-w-[140px]"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Lab Result
            </>
          )}
        </Button>
      </div>

      {/* Tips Section */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2 text-blue-900">🤖 Auto-Detection & Review Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Smart Detection:</strong> Patient and doctor names are automatically detected from extracted text</li>
            <li>• <strong>Text Review:</strong> Carefully check extracted text for OCR errors and medical accuracy</li>
            <li>• <strong>Auto-Mapping:</strong> Detected patients are automatically matched with existing records</li>
            <li>• <strong>Verification:</strong> Verify that auto-detected information is correct before saving</li>
            <li>• <strong>Manual Override:</strong> You can manually select different patient/doctor if auto-detection is incorrect</li>
            <li>• <strong>Data Completeness:</strong> Ensure all required fields (*) are completed before saving</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentComparison;
