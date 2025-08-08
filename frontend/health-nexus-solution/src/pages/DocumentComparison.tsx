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
import { AlertCircle, ArrowLeft, CheckCircle, Download, Eye, FileText, RefreshCw, RotateCcw, Save, Stethoscope, User } from 'lucide-react';
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
  const [isSaving, setSaving] = useState(false);

  // Auto-detection states
  const [detectedPatientName, setDetectedPatientName] = useState<string | null>(null);
  const [detectedDoctorName, setDetectedDoctorName] = useState<string | null>(null);
  const [autoDetectionResults, setAutoDetectionResults] = useState<{
    patient: boolean;
    doctor: boolean;
  }>({ patient: false, doctor: false });

  // Enhanced patient matching function from LabResults.tsx (moved inside component)
  const findPatientFromText = (text: string, detectedName?: string): any | undefined => {
    if (!patients || patients.length === 0) {
      console.log('No patients available for matching');
      return undefined;
    }
    
    const textUpper = text.toUpperCase();
    const lines = text.split('\n');
    
    console.log('Searching for patient in text...');
    console.log('Text length:', text.length);
    console.log('Available patients:', patients.map(p => ({ id: p.id, name: p.name })));
    
    // Extract potential patient names from structured lines
    const potentialNames: string[] = [];
    
    // Add the detected name if provided
    if (detectedName) {
      potentialNames.push(detectedName.toUpperCase());
    }
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for patient name patterns
      const patterns = [
        /(?:patient|name)\s*:?\s*([^\n\r]+)/i,
        /^(mr|mrs|ms|dr)\.?\s+([a-z\s]+)/i,
        /name\s*:\s*([^,\n\r]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
          let extractedName = match[1] || match[2];
          if (extractedName) {
            extractedName = extractedName.trim();
            
            // Filter out lab/medical terms
            const excludeTerms = ['pathology', 'medical', 'centre', 'center', 'laboratory', 'lab', 'dr.', 'doctor', 'adithya', 'health', 'clinic'];
            
            if (!excludeTerms.some(term => extractedName.toLowerCase().includes(term)) && 
                extractedName.length > 2 && 
                extractedName.length < 50) {
              potentialNames.push(extractedName.toUpperCase());
              console.log('Extracted potential name:', extractedName);
            }
          }
        }
      }
    }
    
    // Remove duplicates
    const uniqueNames = [...new Set(potentialNames)];
    console.log('Potential patient names found:', uniqueNames);
    
    // Match against available patients
    for (const potentialName of uniqueNames) {
      for (const patient of patients) {
        const patientNameUpper = patient.name.toUpperCase();
        
        // Exact match
        if (potentialName === patientNameUpper) {
          console.log(`Found exact match: ${patient.name} (ID: ${patient.id})`);
          return patient;
        }
        
        // Contains match (both ways)
        if (potentialName.includes(patientNameUpper) || patientNameUpper.includes(potentialName)) {
          console.log(`Found contains match: ${patient.name} (ID: ${patient.id}) with "${potentialName}"`);
          return patient;
        }
      }
    }
    
    // Fallback: search for any patient name directly in text
    for (const patient of patients) {
      const nameUpper = patient.name.toUpperCase();
      if (textUpper.includes(nameUpper)) {
        console.log(`Found direct text match: ${patient.name} (ID: ${patient.id})`);
        return patient;
      }
    }
    
    // Word-by-word matching for partial names
    for (const patient of patients) {
      const nameParts = patient.name.toUpperCase().split(' ');
      let matchCount = 0;
      
      for (const part of nameParts) {
        if (part.length > 2 && textUpper.includes(part)) {
          matchCount++;
        }
      }
      
      // Require at least 2 parts to match or 1 long part
      if (matchCount >= 2 || (matchCount >= 1 && nameParts.some(part => part.length > 5))) {
        console.log(`Found partial match: ${patient.name} (ID: ${patient.id}) with ${matchCount} matching parts`);
        return patient;
      }
    }
    
    console.log('No patient match found');
    return undefined;
  };

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

    // Auto-detect patient and doctor from extracted text with enhanced matching
    const detectedPatient = detectPatientName(state.extractedText);
    const detectedDoctor = detectDoctorName(state.extractedText);

    if (detectedPatient) {
      setDetectedPatientName(detectedPatient);
      // Enhanced patient matching logic from LabResults.tsx
      const matchingPatient = findPatientFromText(state.extractedText, detectedPatient);
      if (matchingPatient) {
        setSelectedPatientId(matchingPatient.id.toString());
        setSelectedPatient(matchingPatient);
        setAutoDetectionResults(prev => ({ ...prev, patient: true }));
        console.log('Auto-selected patient:', matchingPatient.name, 'ID:', matchingPatient.id);
      }
    }

    if (detectedDoctor) {
      setDetectedDoctorName(detectedDoctor);
      setAuthorizedBy(detectedDoctor);
      setAutoDetectionResults(prev => ({ ...prev, doctor: true }));
      console.log('Auto-extracted doctor:', detectedDoctor);
    }

    // Enhanced result type detection from LabResults.tsx
    const resultTypePatterns = [
      /(HEMATOLOGY|BIOCHEMISTRY|RADIOLOGY|MICROBIOLOGY|URINE\s*ANALYSIS|BLOOD\s*TEST|LAB\s*TEST)/i,
      /(COMPLETE\s*BLOOD\s*COUNT|CBC|LIVER\s*FUNCTION|KIDNEY\s*FUNCTION)/i
    ];
    
    for (const pattern of resultTypePatterns) {
      const match = state.extractedText.match(pattern);
      if (match && match[1]) {
        let type = match[1].toUpperCase();
        if (type.includes('URINE')) type = 'Microbiology';
        else if (type.includes('BLOOD') || type.includes('HEMATOLOGY')) type = 'Hematology';
        else if (type.includes('BIOCHEMISTRY') || type.includes('CHEMISTRY')) type = 'Chemistry';
        else if (type.includes('RADIOLOGY')) type = 'Radiology';
        else if (type.includes('MICROBIOLOGY')) type = 'Microbiology';
        else type = 'Other';
        
        setResultType(type);
        console.log('Auto-detected result type:', type);
        break;
      }
    }

    // Pre-fill patient if provided in state
    if (state.patientId && !detectedPatient) {
      setSelectedPatientId(state.patientId);
      const patient = patients.find(p => p.id === state.patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }

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

    // Re-run auto-detection on text changes with enhanced matching
    const detectedPatient = detectPatientName(newText);
    const detectedDoctor = detectDoctorName(newText);

    if (detectedPatient && detectedPatient !== detectedPatientName) {
      setDetectedPatientName(detectedPatient);
      const matchingPatient = findPatientFromText(newText, detectedPatient);
      if (matchingPatient) {
        setSelectedPatientId(matchingPatient.id.toString());
        setSelectedPatient(matchingPatient);
        setAutoDetectionResults(prev => ({ ...prev, patient: true }));
        console.log('Re-detected patient:', matchingPatient.name, 'ID:', matchingPatient.id);
      }
    }

    if (detectedDoctor && detectedDoctor !== detectedDoctorName) {
      setDetectedDoctorName(detectedDoctor);
      setAuthorizedBy(detectedDoctor);
      setAutoDetectionResults(prev => ({ ...prev, doctor: true }));
      console.log('Re-detected doctor:', detectedDoctor);
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
    // Validation - match LabResults.tsx required fields
    if (!selectedPatientId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!resultType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      console.log('=== LAB RESULT SAVE DEBUG START ===');
      console.log('Saving lab result...');
      console.log('Selected patient ID:', selectedPatientId);
      console.log('Selected patient object:', selectedPatient);
      console.log('Result type:', resultType);
      console.log('Authorized by:', authorizedBy);
      console.log('Editable text length:', editableText?.length);
      console.log('Original file:', state.originalFile?.name, state.originalFile?.size, 'bytes');

      // Validate required fields before creating FormData
      const requiredFields = {
        patient: selectedPatientId,
        test_name: resultType,
        test_category: resultType.toLowerCase(),
        specimen_type: resultType.includes('Urine') || resultType.includes('Microbiology') ? 'urine' : 'blood',
        laboratory_name: 'Health Nexus Lab',
        lab_reference_number: `LAB-${Date.now()}`,
        collection_date: new Date().toISOString().split('T')[0],
        received_date: new Date().toISOString().split('T')[0],
        reported_date: new Date().toISOString().split('T')[0],
        test_results: JSON.stringify([]),
        interpretation: 'Automated extraction from Google Colab algorithms',
        processing_notes: 'Processed via Google Colab algorithms with AWS Textract OCR system'
      };
      
      console.log('Required fields validation:', requiredFields);

      // Use the exact same FormData structure as LabResults.tsx
      const formData = new FormData();
      formData.append('patient', selectedPatientId);
      formData.append('title', `${resultType} Lab Result`);
      formData.append('description', `${resultType} test results processed via Google Colab algorithms`);
      formData.append('content', editableText);
      formData.append('document_date', new Date().toISOString().split('T')[0]);
      formData.append('status', 'completed');
      formData.append('urgency', 'normal');
      
      // Lab result specific fields - required (matching LabResults.tsx exactly)
      formData.append('test_name', resultType);
      formData.append('test_category', resultType.toLowerCase());
      formData.append('specimen_type', resultType.includes('Urine') || resultType.includes('Microbiology') ? 'urine' : 'blood');
      formData.append('laboratory_name', 'Health Nexus Lab'); // documentDetails?.laboratoryName || 'Health Nexus Lab' - keeping simple for now
      formData.append('lab_reference_number', `LAB-${Date.now()}`);
      formData.append('collection_date', new Date().toISOString().split('T')[0]); // documentDetails?.testDate logic could be added later
      formData.append('received_date', new Date().toISOString().split('T')[0]);
      formData.append('reported_date', new Date().toISOString().split('T')[0]);
      formData.append('test_results', JSON.stringify([])); // extractedTestResults.length > 0 ? extractedTestResults : [] - keeping simple for now
      formData.append('interpretation', 'Automated extraction from Google Colab algorithms'); // matches LabResults.tsx when no test results
      formData.append('processing_notes', 'Processed via Google Colab algorithms with AWS Textract OCR system');
      
      // Only add authorized_by if we have a value
      if (authorizedBy && authorizedBy.trim()) {
        formData.append('authorized_by', authorizedBy.trim());
      }
      
      // Include the original file
      formData.append('document', state.originalFile);

      // Log FormData contents for debugging
      console.log('=== DETAILED FORMDATA DEBUG ===');
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      console.log('=== END FORMDATA DEBUG ===');

      console.log('Making request to:', 'http://localhost:8000/api/medical-documents/lab-results/');
      
      const response = await fetch('http://localhost:8000/api/medical-documents/lab-results/', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Get the actual error response from the server
        console.log('=== SERVER ERROR RESPONSE DEBUG ===');
        console.log('Response status:', response.status);
        console.log('Response statusText:', response.statusText);
        
        let errorData;
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            console.log('Server JSON error response:', JSON.stringify(errorData, null, 2));
          } else {
            errorData = await response.text();
            console.log('Server text error response:', errorData);
          }
        } catch (parseError) {
          console.log('Error parsing server response:', parseError);
          errorData = `Failed to parse server response. Status: ${response.status}`;
        }
        console.log('=== END SERVER ERROR DEBUG ===');
        
        throw new Error(errorData?.error || errorData || `HTTP ${response.status}: ${response.statusText}`);
      }

      const savedLabResult = await response.json();
      console.log('Lab result saved successfully:', savedLabResult);
      console.log('=== LAB RESULT SAVE DEBUG END ===');
      
      toast({
        title: "Success",
        description: `Lab result saved to ${selectedPatient?.name}'s medical record successfully!`,
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
      console.log('=== ERROR DEBUG START ===');
      console.error('Error saving lab result:', error);
      
      if (error instanceof Error) {
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
      }
      
      console.log('Current form state:');
      console.log('- selectedPatientId:', selectedPatientId);
      console.log('- resultType:', resultType);
      console.log('- authorizedBy:', authorizedBy);
      console.log('- editableText length:', editableText?.length);
      console.log('=== ERROR DEBUG END ===');
      
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
             
              <p><strong>Authorized By:</strong> ${authorizedBy || 'Not specified'}</p>
            
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

Authorized By: ${authorizedBy || 'Not specified'}


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

      {/* Enhanced Original Document and Extracted Text Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Original Document - Enlarged */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Original Document</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              File: {state.originalFile.name} ({(state.originalFile.size / 1024).toFixed(1)} KB)
            </p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <img
                src={originalImageUrl}
                alt="Original Document"
                className="w-full h-auto border rounded-lg shadow-sm max-h-[700px] object-contain"
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

        {/* Extracted Text - Enlarged */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm font-medium">Extracted Text</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleResetText} disabled={!hasChanges}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCorrectedText}>
                  <Download className="h-3 w-3 mr-1" />
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
              className="min-h-[600px] font-mono text-sm leading-relaxed overflow-x-auto whitespace-nowrap"
              style={{ resize: 'vertical', overflowX: 'auto', whiteSpace: 'pre' }}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>Characters: {editableText.length}</span>
              <span>Lines: {editableText.split('\n').length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lab Result Information Form - Moved to Bottom */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lab Result Information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete the form to save the lab result
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto-Detection Results */}
            {(detectedPatientName || detectedDoctorName) && (
              <div className="col-span-full">
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
              </div>
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
                      {patient.name}
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
              <Label className="flex items-center gap-2">
                Test Type *
                {resultType && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                    Auto-detected
                  </span>
                )}
              </Label>
              <Select value={resultType} onValueChange={setResultType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hematology">Hematology</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Radiology">Radiology</SelectItem>
                  <SelectItem value="Microbiology">Microbiology</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Authorized By */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Authorized By *
                {authorizedBy && autoDetectionResults.doctor && (
                  <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                    Auto-extracted
                  </span>
                )}
              </Label>
              <Input
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                placeholder="Enter doctor name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        
        <Button
          onClick={handleSaveLabResult}
          disabled={isSaving || !selectedPatientId || !resultType}
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
