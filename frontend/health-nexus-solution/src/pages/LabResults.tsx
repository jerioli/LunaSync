import { processLabResult } from '@/api/labResultProcessor';
import { checkBackendHealth } from '@/api/textract';
import ExportButton from '@/components/ExportButton';
import OCRVisualizer from '@/components/OCRVisualizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from '@/hooks/use-toast';
import { medicalDocumentsAPI, type CreateLabResultRequest, type LabTestResult } from '@/services/medicalDocumentsAPI';
import { Edit, FileText, Image, Loader2, PlusCircle, Search, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// AWS Textract configuration is now handled by environment variables
// or backend configuration

// Textract block types and interfaces
interface TextractBlock {
  BlockType: string;
  Id: string;
  Text?: string;
  Geometry: {
    BoundingBox: {
      Left: number;
      Top: number;
      Width: number;
      Height: number;
    };
  };
  Relationships?: Array<{
    Type: string;
    Ids: string[];
  }>;
}

interface ExtractedWord {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

// Local interfaces for this component - updated to match API structure
interface LocalLabTestResult {
  test_name: string;
  result_value: string;
  unit?: string;
  reference_range?: string;
  status?: 'normal' | 'abnormal' | 'critical';
}

interface LocalCreateLabResultRequest {
  patient: string;
  authorized_by?: string;
  title: string;
  description: string;
  content: string;
  document_date: string;
  status: string;
  urgency: string;
  test_name: string;
  test_category: string;
  specimen_type: string;
  laboratory_name: string;
  collection_date: string;
  received_date: string;
  reported_date: string;
  test_results: LabTestResult[];
  interpretation: string;
  processing_notes: string;
}

const LabResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patients, labResults, users, addLabResult, fetchPatients, currentUser } = useClinic();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [ocrExtractedText, setOcrExtractedText] = useState<string | null>(null);
  const [matchedPatientId, setMatchedPatientId] = useState<string | undefined>(undefined);
  const [authorizedBy, setAuthorizedBy] = useState<string | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [resultType, setResultType] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [resultAuthorizedBy, setResultAuthorizedBy] = useState('');
  const [extractedTestResults, setExtractedTestResults] = useState<LabTestResult[]>([]);
  const [documentDetails, setDocumentDetails] = useState<any>(null);
  
  // Textract specific states
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processedBlocks, setProcessedBlocks] = useState<TextractBlock[]>([]);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [editableText, setEditableText] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendType, setBackendType] = useState<string>('None');
  // Add state for visualization data
  const [visualizationData, setVisualizationData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check backend connectivity
  React.useEffect(() => {
    if (fetchPatients) {
      fetchPatients();
    }
    
    // Check backend connectivity
    checkBackendHealth().then((result) => {
      setBackendConnected(result.connected);
      setBackendType(result.backend);
    });
  }, [fetchPatients]);

  // Handle return from DocumentComparison page
  React.useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.processCompleted && state.correctedText) {
        // Set the corrected text
        setOcrExtractedText(state.correctedText);
        setEditableText(state.correctedText);
        
        // Set the original file if available
        if (state.originalFile) {
          setUploadedFile(state.originalFile);
        }
        
        // Set patient if available
        if (state.patientId) {
          setMatchedPatientId(state.patientId);
        }
        
        toast({
          title: "Document Updated",
          description: "Corrected text has been loaded successfully.",
        });
        
        // Clear the state to prevent re-triggering
        navigate('/lab-results', { replace: true });
      }
    }
  }, [location.state, navigate]);

  // Handle file upload and processing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      // Process with our new lab result processor
      const result = await processLabResult(file);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Set the extracted text
      const extractedText = result.text;
      setOcrExtractedText(extractedText);
      setEditableText(extractedText);
      
      // Set visualization data if available
      if (result.visualizationData) {
        setProcessedBlocks(result.visualizationData.blocks);
        setVisualizationData(result.visualizationData);
      }

      // Extract patient and doctor information
      const patientId = findPatientFromText(extractedText);
      if (patientId) {
        setMatchedPatientId(patientId);
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
          toast({
            title: "Patient Identified",
            description: `Automatically identified: ${patient.name}`,
          });
        }
      }

      // Extract doctor information
      const doctorName = extractDoctorName(extractedText);
      if (doctorName) {
        setAuthorizedBy(doctorName);
      }

      // Extract test results
      const testResults = extractTestResults(extractedText);
      setExtractedTestResults(testResults);

      toast({
        title: "Document Processed",
        description: "Text extracted successfully using AWS Textract",
      });

      // Navigate to document comparison page
      setTimeout(() => {
        navigate('/document-comparison', {
          state: {
            originalFile: file,
            extractedText: extractedText,
            visualizationData: result.visualizationData,
            patientId: patientId,
            patientName: patientId ? patients.find(p => p.id === patientId)?.name : undefined,
            returnPath: '/lab-results'
          }
        });
      }, 1000); // Brief delay to show the toast

    } catch (error) {
      console.error('Error processing document:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to process document. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Cannot connect to processing server. Using offline mode with sample data.";
        } else {
          errorMessage = `Processing error: ${error.message}`;
        }
      }
      
      toast({
        title: "Processing Error", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract doctor name from text
  const extractDoctorName = (text: string): string | undefined => {
    const doctorPatterns = [
      /(?:authorized\s*by|doctor|dr\.?)\s*:?\s*([^\n\r]+)/i,
      /dr\.?\s+([a-z\s]+)/i,
      /physician\s*:?\s*([^\n\r]+)/i
    ];

    for (const pattern of doctorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const doctorName = match[1].trim();
        if (doctorName.length > 2 && doctorName.length < 50) {
          return doctorName;
        }
      }
    }
    return undefined;
  };

  // Extract test results from text
  const extractTestResults = (text: string): LabTestResult[] => {
    const results: LabTestResult[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for patterns like "Test Name: Value Unit (Reference Range)"
      const testPattern = /([A-Za-z\s]+):\s*([0-9.]+)\s*([A-Za-z/%]*)\s*\(([^)]+)\)/;
      const match = line.match(testPattern);
      
      if (match) {
        results.push({
          test_name: match[1].trim(),
          result_value: match[2].trim(),
          unit: match[3].trim() || undefined,
          reference_range: match[4].trim() || undefined,
          status: undefined
        });
      }
    }

    return results;
  };
  
  // Reset form function
  const resetForm = () => {
    setSelectedPatient('');
    setResultType('');
    setResultNotes('');
    setResultAuthorizedBy('');
    setOcrExtractedText(null);
    setMatchedPatientId(undefined);
    setAuthorizedBy(undefined);
    setExtractedTestResults([]);
    setDocumentDetails(null);
    setIsDialogOpen(false);
    setUploadedFile(null);
    setProcessedBlocks([]);
    setEditableText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start new scan
  const startNewScan = () => {
    resetForm();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle OCR completion (updated for Textract integration)
  const handleOcrComplete = (text: string, patientId?: string, doctor?: string, structuredData?: LabTestResult[], documentDetails?: any) => {
    console.log('OCR Complete called with:', { 
      text: text.substring(0, 200), 
      patientId, 
      doctor, 
      structuredDataLength: structuredData?.length 
    });
    console.log('Available patients:', patients.map(p => ({ id: p.id, name: p.name })));
    
    setOcrExtractedText(text);
    setEditableText(text);
    
    // Store extracted test results and document details
    if (structuredData && structuredData.length > 0) {
      setExtractedTestResults(structuredData);
      console.log('Stored extracted test results:', structuredData);
    }
    
    if (documentDetails) {
      setDocumentDetails(documentDetails);
      console.log('Stored document details:', documentDetails);
    }
    
    // Enhanced patient matching logic with validation
    let finalPatientId = patientId;
    
    if (patientId) {
      // Verify the provided patient ID exists in current patient list
      const patientExists = patients.find(p => p.id === patientId);
      if (patientExists) {
        setMatchedPatientId(patientId);
        console.log('OCR matched patient verified:', patientExists.name, 'ID:', patientId);
      } else {
        console.log('OCR provided patient ID not found in current list:', patientId);
        finalPatientId = undefined;
      }
    }
    
    // If no valid patient ID from OCR, try enhanced text matching
    if (!finalPatientId && text) {
      const foundPatientId = findPatientFromText(text);
      if (foundPatientId) {
        const foundPatient = patients.find(p => p.id === foundPatientId);
        if (foundPatient) {
          setMatchedPatientId(foundPatientId);
          console.log('Found patient through enhanced text matching:', foundPatient.name, 'ID:', foundPatientId);
        }
      }
    }
    
    // Set authorized by doctor
    if (doctor) {
      setAuthorizedBy(doctor);
      console.log('OCR extracted doctor:', doctor);
    }
    
    // Show success message if patient was matched
    if (finalPatientId || matchedPatientId) {
      const matchedPatient = patients.find(p => p.id === (finalPatientId || matchedPatientId));
      if (matchedPatient) {
        toast({
          title: "Patient Identified",
          description: `Patient automatically identified: ${matchedPatient.name}`,
        });
      }
    }
  };
  
  // Enhanced patient matching function
  const findPatientFromText = (text: string): string | undefined => {
    if (!patients || patients.length === 0) {
      console.log('No patients available for matching');
      return undefined;
    }
    
    const textUpper = text.toUpperCase();
    const lines = text.split('\n');
    
    console.log('Searching for patient in text...');
    console.log('Text length:', text.length);
    console.log('Text preview:', text.substring(0, 300) + '...');
    console.log('Available patients:', patients.map(p => ({ id: p.id, name: p.name })));
    
    // Extract potential patient names from structured lines
    const potentialNames: string[] = [];
    
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
          return patient.id;
        }
        
        // Contains match (both ways)
        if (potentialName.includes(patientNameUpper) || patientNameUpper.includes(potentialName)) {
          console.log(`Found contains match: ${patient.name} (ID: ${patient.id}) with "${potentialName}"`);
          return patient.id;
        }
      }
    }
    
    // Fallback: search for any patient name directly in text
    for (const patient of patients) {
      const nameUpper = patient.name.toUpperCase();
      if (textUpper.includes(nameUpper)) {
        console.log(`Found direct text match: ${patient.name} (ID: ${patient.id})`);
        return patient.id;
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
        return patient.id;
      }
    }
    
    console.log('No patient match found');
    return undefined;
  };
  
  const handleEditAndAdd = () => {
    // Use the raw Google Colab extracted text for saving to preserve exact formatting
    const textToUse = ocrExtractedText; // Always use the raw extraction output, not the edited version
    if (textToUse) {
      // Enhanced patient matching with better fallback logic
      let selectedPatientId = '';
      
      if (matchedPatientId) {
        selectedPatientId = matchedPatientId;
        console.log('Using matched patient ID from OCR:', matchedPatientId);
      } else {
        // Try to find patient again as fallback
        const foundPatientId = findPatientFromText(textToUse);
        if (foundPatientId) {
          selectedPatientId = foundPatientId;
          console.log('Found patient on edit:', foundPatientId);
        }
      }
      
      // Verify the patient exists in the current patient list
      if (selectedPatientId) {
        const patientExists = patients.find(p => p.id === selectedPatientId);
        if (patientExists) {
          setSelectedPatient(selectedPatientId);
          console.log('Auto-selected patient:', patientExists.name, 'ID:', selectedPatientId);
        } else {
          console.log('Patient ID not found in current patient list:', selectedPatientId);
          setSelectedPatient('');
        }
      } else {
        console.log('No patient match found, clearing selection');
        setSelectedPatient('');
      }
      
      // Extract result type from OCR text
      const resultTypePatterns = [
        /(HEMATOLOGY|BIOCHEMISTRY|RADIOLOGY|MICROBIOLOGY|URINE\s*ANALYSIS|BLOOD\s*TEST|LAB\s*TEST)/i,
        /(COMPLETE\s*BLOOD\s*COUNT|CBC|LIVER\s*FUNCTION|KIDNEY\s*FUNCTION)/i
      ];
      
      for (const pattern of resultTypePatterns) {
        const match = textToUse.match(pattern);
        if (match && match[1]) {
          let type = match[1].toUpperCase();
          if (type.includes('URINE')) type = 'Microbiology';
          else if (type.includes('BLOOD') || type.includes('HEMATOLOGY')) type = 'Hematology';
          else if (type.includes('BIOCHEMISTRY') || type.includes('CHEMISTRY')) type = 'Chemistry';
          else if (type.includes('RADIOLOGY')) type = 'Radiology';
          else if (type.includes('MICROBIOLOGY')) type = 'Microbiology';
          else type = 'Other';
          
          setResultType(type);
          console.log('Auto-selected result type:', type);
          break;
        }
      }
      
      setResultNotes(textToUse);
      
      if (authorizedBy) {
        setResultAuthorizedBy(authorizedBy);
        console.log('Auto-filled authorized by:', authorizedBy);
      } else {
        // Try to extract doctor name from text
        const doctorName = extractDoctorName(textToUse);
        if (doctorName) {
          setResultAuthorizedBy(doctorName);
          console.log('Auto-extracted doctor name:', doctorName);
        }
      }
      
      setIsDialogOpen(true);
    }
  };
  
  const handleSaveResult = async () => {
    if (!selectedPatient || !resultType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare the lab result data for the medical documents API - minimal version to avoid validation errors
      const labResultData: CreateLabResultRequest = {
        // Patient - keep only required fields initially
        patient: selectedPatient,
        
        // Only add authorized_by if we have a valid doctor name (not ID)
        ...(resultAuthorizedBy && { authorized_by: resultAuthorizedBy }),
        
        // Document fields - required - Use raw Google Colab extracted text for consistent formatting
        title: `${resultType} Lab Result`,
        description: `${resultType} test results processed via Google Colab algorithms`,
        content: ocrExtractedText || resultNotes, // Use raw extraction text to preserve Google Colab formatting
        document_date: new Date().toISOString().split('T')[0],
        status: 'completed',
        urgency: 'normal',
        
        // Lab result specific fields - required
        test_name: resultType,
        test_category: resultType.toLowerCase(),
        specimen_type: resultType.includes('Urine') || resultType.includes('Microbiology') ? 'urine' : 'blood',
        laboratory_name: documentDetails?.laboratoryName || 'Health Nexus Lab',
        lab_reference_number: `LAB-${Date.now()}`,
        collection_date: documentDetails?.testDate ? new Date(documentDetails.testDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        received_date: new Date().toISOString().split('T')[0],
        reported_date: new Date().toISOString().split('T')[0],
        test_results: extractedTestResults.length > 0 ? extractedTestResults : [],
        interpretation: extractedTestResults.length > 0 ? 'Automated extraction from Google Colab algorithms' : 'Manual entry',
        processing_notes: 'Processed via Google Colab algorithms with AWS Textract OCR system'
      };

      console.log('Saving lab result to medical documents API:', JSON.stringify(labResultData, null, 2));
      console.log('Current user:', currentUser);
      console.log('Selected patient:', selectedPatient);
      console.log('Result authorized by:', resultAuthorizedBy);

      // Save to medical documents API
      const savedLabResult = await medicalDocumentsAPI.createLabResult(labResultData);
      console.log('Lab result saved successfully:', savedLabResult);

      // Also add to local context for immediate UI update
      if (addLabResult) {
        const contextLabResult = {
          id: savedLabResult.id,
          patientId: selectedPatient,
          type: resultType,
          date: new Date().toISOString(),
          notes: ocrExtractedText || resultNotes, // Use raw Google Colab extracted text
          authorizedBy: resultAuthorizedBy,
          testResults: extractedTestResults,
          resultUrl: '', // Add missing property for context compatibility
        };
        addLabResult(contextLabResult);
      }
      
      toast({
        title: "Success",
        description: `Lab result saved to ${patients.find(p => p.id === selectedPatient)?.name}'s medical record successfully!`,
      });
      
      // Reset form
      resetForm();

    } catch (error) {
      console.error('Error saving lab result:', error);
      
      // Check if it's a validation error and provide specific feedback
      if (error instanceof Error && error.message.includes('Validation Error')) {
        toast({
          title: "Validation Error",
          description: `Please check the data format: ${error.message}`,
          variant: "destructive",
        });
        return; // Don't try fallback for validation errors
      }
      
      // Fallback to local storage and context if API fails
      try {
        if (addLabResult) {
          const fallbackResult = {
            id: Date.now().toString(),
            patientId: selectedPatient,
            type: resultType,
            date: new Date().toISOString(),
            notes: ocrExtractedText || resultNotes, // Use raw Google Colab extracted text
            authorizedBy: resultAuthorizedBy,
            testResults: extractedTestResults,
            resultUrl: '',
          };
          addLabResult(fallbackResult);
          
          // Also save to localStorage as backup
          const storageKey = `labresults_patient_${selectedPatient}`;
          const existingResults = localStorage.getItem(storageKey);
          const results = existingResults ? JSON.parse(existingResults) : [];
          results.push(fallbackResult);
          localStorage.setItem(storageKey, JSON.stringify(results));
          
          toast({
            title: "Warning",
            description: "Lab result saved locally. API connection failed but data is preserved.",
            variant: "default",
          });
          
          resetForm();
        }
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
        toast({
          title: "Error",
          description: `Failed to save lab result: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
    }
  };
  
  const filteredResults = labResults.filter(result => {
    const patient = patients.find(p => p.id === result.patientId);
    const matchesSearch = 
      patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (result.authorizedBy && result.authorizedBy.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') {
      return matchesSearch;
    } else if (activeTab === 'recent') {
      const isRecent = new Date(result.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && isRecent;
    }
    
    return false;
  });

  const getPatientInitials = (patientId: string): string => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name.charAt(0) : '?';
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lab Results</h1>
        <p className="text-muted-foreground">View, manage, and analyze patient lab results</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Lab Results</CardTitle>
                  <CardDescription>Manage and view all laboratory results</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search results..."
                      className="pl-8 w-full md:w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Result
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Lab Result</DialogTitle>
                        <DialogDescription>
                          Enter the details for the new lab result
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="patient" className="flex items-center gap-2">
                            Patient
                            {selectedPatient && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                                Auto-selected
                              </span>
                            )}
                          </Label>
                          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger id="patient">
                              <SelectValue placeholder="Select patient" />
                            </SelectTrigger>
                            <SelectContent>
                              {patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type" className="flex items-center gap-2">
                            Result Type
                            {resultType && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                Auto-detected
                              </span>
                            )}
                          </Label>
                          <Select value={resultType} onValueChange={setResultType}>
                            <SelectTrigger id="type">
                              <SelectValue placeholder="Select result type" />
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
                        <div className="space-y-2">
                          <Label htmlFor="authorizedBy" className="flex items-center gap-2">
                            Authorized By
                            {resultAuthorizedBy && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                                Auto-extracted
                              </span>
                            )}
                          </Label>
                          <Input
                            id="authorizedBy"
                            value={resultAuthorizedBy}
                            onChange={(e) => setResultAuthorizedBy(e.target.value)}
                            placeholder="Enter doctor name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Result Notes</Label>
                          <textarea
                            id="notes"
                            className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Enter result details"
                            value={resultNotes}
                            onChange={(e) => setResultNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveResult}>Save Result</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Results</TabsTrigger>
                  <TabsTrigger value="recent">Recent (7 days)</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="m-0">
                  <div className="space-y-4">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result) => {
                        const patient = patients.find(p => p.id === result.patientId);
                        return (
                          <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              
                              <div>
                                <div className="font-medium">{patient?.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{result.type}</span>
                                  {result.authorizedBy && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                      {result.authorizedBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm">{new Date(result.date).toLocaleDateString()}</div>
                              </div>
                              <Button size="sm" variant="outline">View</Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No lab results found. Add new results or adjust your search.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="recent" className="m-0">
                  <div className="space-y-4">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result) => {
                        const patient = patients.find(p => p.id === result.patientId);
                        return (
                          <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                             
                              <div>
                                <div className="font-medium">{patient?.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span>{result.type}</span>
                                  {result.authorizedBy && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                                      {result.authorizedBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm">{new Date(result.date).toLocaleDateString()}</div>
                              </div>
                              <Button size="sm" variant="outline">View</Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent lab results found.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {!ocrExtractedText ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  AWS Textract Document Scanner
                </CardTitle>
                <CardDescription>
                  Upload lab result images for advanced text extraction using AWS Textract
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Processing document with AWS Textract...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Image className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload lab result image
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
                {uploadedFile && (
                  <div className="text-sm text-muted-foreground">
                    <strong>File:</strong> {uploadedFile.name}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Status indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Processing Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Backend connectivity status */}
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${backendConnected ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                    <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    <span className={`text-sm font-medium ${backendConnected ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
                      Backend: {backendConnected ? `${backendType} Connected` : 'Using Simulation Mode'}
                    </span>
                  </div>

                  {matchedPatientId && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-800 dark:text-green-300">
                          Patient Identified: {patients.find(p => p.id === matchedPatientId)?.name}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {authorizedBy && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Doctor Identified: {authorizedBy}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {extractedTestResults.length > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                          {extractedTestResults.length} Test Result(s) Extracted
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleEditAndAdd}>
                      Edit & Add to Lab Results
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={startNewScan}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      New Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* OCR Visualizer Component */}
              <OCRVisualizer
                blocks={processedBlocks}
                uploadedFile={uploadedFile}
                extractedText={ocrExtractedText || ''}
                editableText={editableText}
                onTextChange={setEditableText}
                visualizationData={visualizationData}
              />
              
              {/* Export Button for lab results */}
              {ocrExtractedText && (
                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (uploadedFile && ocrExtractedText) {
                        navigate('/document-comparison', {
                          state: {
                            originalFile: uploadedFile,
                            extractedText: ocrExtractedText,
                            visualizationData: visualizationData,
                            patientId: matchedPatientId,
                            patientName: matchedPatientId ? patients.find(p => p.id === matchedPatientId)?.name : undefined,
                            returnPath: '/lab-results'
                          }
                        });
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Review & Edit Text
                  </Button>
                  
                  <ExportButton 
                    text={editableText}
                    visualizationData={visualizationData}
                    filename={uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "lab-result"}
                    isDisabled={isProcessing}
                  />
                </div>
              )}
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>AWS Textract Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-medium">Advanced OCR Scanning</h3>
                  <p className="text-muted-foreground">
                    Upload lab result images for advanced text extraction using AWS Textract. The system automatically preserves document layout and can detect tables and structured data.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Smart Patient Matching</h3>
                  <p className="text-muted-foreground">
                    The system automatically identifies patient names and doctor information from lab reports, matching them against your patient database for quick data entry.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Editable Results</h3>
                  <p className="text-muted-foreground">
                    After extraction, you can edit the text content before saving. The system maintains the original formatting while allowing corrections and additions.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Supported Formats</h3>
                  <ul className="text-muted-foreground list-disc pl-5 space-y-1">
                    <li>JPEG, PNG, TIFF image formats</li>
                    <li>High-resolution scanned documents</li>
                    <li>Mobile phone camera captures</li>
                    <li>Multi-column lab reports</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LabResults;
