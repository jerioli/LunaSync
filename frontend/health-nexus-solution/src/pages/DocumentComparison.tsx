import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, FileText, Home, Minus, Plus, RotateCcw, Save, Stethoscope, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Type declaration for jsPDF
declare global {
  interface Window {
    jspdf?: any;
  }
}

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

// OCR text cleaning function to prevent excessive blank lines and preserve formatting
function cleanOcrText(text: string): string {
  // Heuristic: preserve line breaks, keep extra spaces for lines that look like headers/tables
  return text
    .split('\n')
    .map(line => {
      // If line contains multiple columns (e.g., separated by 2+ spaces or tabs), preserve spacing
      if (/\s{2,}|\t/.test(line)) return line;
      // If line is all caps or looks like a section header, preserve spacing
      if (/^[A-Z0-9 .:-]+$/.test(line.trim()) && line.trim().length > 8) return line;
      // Otherwise, collapse multiple spaces to one
      return line.replace(/ {2,}/g, ' ');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n'); // Prevent excessive blank lines
}

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

  // Viewing modal state - REMOVED (no longer needed)
  // const [showViewModal, setShowViewModal] = useState(false);

  // Auto-detection states
  const [detectedPatientName, setDetectedPatientName] = useState<string | null>(null);
  const [detectedDoctorName, setDetectedDoctorName] = useState<string | null>(null);
  const [autoDetectionResults, setAutoDetectionResults] = useState<{
    patient: boolean;
    doctor: boolean;
  }>({ patient: false, doctor: false });

  // Floating window position state
  const [floatingWindowPos, setFloatingWindowPos] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 384, height: 500 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [textareaHeight, setTextareaHeight] = useState(400);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });

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

  // Floating window drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setDragOffset({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - dragOffset.x;
    const deltaY = e.clientY - dragOffset.y;

    setWindowSize(prev => {
      let newWidth = prev.width;
      let newHeight = prev.height;
      let newPosX = floatingWindowPos.x;
      let newPosY = floatingWindowPos.y;

      if (resizeDirection.includes('right')) {
        newWidth = Math.max(200, prev.width + deltaX);
      }
      if (resizeDirection.includes('left')) {
        newWidth = Math.max(200, prev.width - deltaX);
        newPosX = floatingWindowPos.x + deltaX;
      }
      if (resizeDirection.includes('bottom')) {
        newHeight = Math.max(150, prev.height + deltaY);
      }
      if (resizeDirection.includes('top')) {
        newHeight = Math.max(150, prev.height - deltaY);
        newPosY = floatingWindowPos.y + deltaY;
      }

      setFloatingWindowPos({ x: newPosX, y: newPosY });
      return { width: newWidth, height: newHeight };
    });

    setDragOffset({ x: e.clientX, y: e.clientY });
  };

  // Zoom handlers
  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoomLevel + 0.25);
    setZoomLevel(newZoom);
    // Auto-hide document when zoomed for better visibility
    if (newZoom > 1.5) {
      setIsDocumentVisible(false);
    }
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(0.25, zoomLevel - 0.25);
    setZoomLevel(newZoom);
    // Auto-show document when zoom is reasonable
    if (newZoom <= 1.5) {
      setIsDocumentVisible(true);
    }
  };
  
  const handleZoomReset = () => {
    setZoomLevel(1);
    setIsDocumentVisible(true);
  };

  const toggleDocumentVisibility = () => {
    setIsDocumentVisible(!isDocumentVisible);
  };

  // Add event listeners for mouse events with velocity tracking
  React.useEffect(() => {
    let lastMousePos = { x: 0, y: 0 };
    let lastTime = Date.now();

    const handleMove = (e: MouseEvent) => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      
      if (isDragging) {
        const newPos = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        };
        
        // Calculate velocity for bounce effect
        if (deltaTime > 0) {
          const velX = (e.clientX - lastMousePos.x) / deltaTime * 16; // Convert to pixels per frame
          const velY = (e.clientY - lastMousePos.y) / deltaTime * 16;
          setVelocity({ x: velX, y: velY });
        }
        
        setFloatingWindowPos(newPos);
      }
      if (isResizing) {
        handleResize(e);
      }
      
      lastMousePos = { x: e.clientX, y: e.clientY };
      lastTime = currentTime;
    };

    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleUp);
      if (isDragging) {
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, dragOffset.x, dragOffset.y]);

  // Handle window resize for textarea height adjustment
  React.useEffect(() => {
    const handleWindowResize = () => {
      const lineCount = editableText.split('\n').length;
      const calculatedHeight = Math.max(400, (lineCount * 22) + 40);
      setTextareaHeight(calculatedHeight); // Precise fit to content
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [editableText]);

  // Bounce effect for floating window
  React.useEffect(() => {
    const checkBounds = () => {
      if (!isDocumentVisible) return;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      let newX = floatingWindowPos.x;
      let newY = floatingWindowPos.y;
      let newVelX = velocity.x;
      let newVelY = velocity.y;
      let bounced = false;

      // Check right boundary
      if (newX + windowSize.width > screenWidth) {
        newX = screenWidth - windowSize.width;
        newVelX = -Math.abs(newVelX) * 0.8; // Bounce with damping
        bounced = true;
      }
      // Check left boundary
      if (newX < 0) {
        newX = 0;
        newVelX = Math.abs(newVelX) * 0.8;
        bounced = true;
      }
      // Check bottom boundary
      if (newY + windowSize.height > screenHeight) {
        newY = screenHeight - windowSize.height;
        newVelY = -Math.abs(newVelY) * 0.8;
        bounced = true;
      }
      // Check top boundary
      if (newY < 0) {
        newY = 0;
        newVelY = Math.abs(newVelY) * 0.8;
        bounced = true;
      }

      if (bounced) {
        setFloatingWindowPos({ x: newX, y: newY });
        setVelocity({ x: newVelX, y: newVelY });
      }
    };

    const interval = setInterval(checkBounds, 16); // 60fps check
    return () => clearInterval(interval);
  }, [floatingWindowPos, windowSize, velocity, isDocumentVisible]);

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

    // Set the editable text with OCR cleaning
    const cleanedText = cleanOcrText(state.extractedText);
    setEditableText(cleanedText);

    // Initialize textarea height to fit content precisely
    const initialLineCount = cleanedText.split('\n').length;
    const initialHeight = Math.max(400, (initialLineCount * 22) + 40); // Precise fit
    setTextareaHeight(initialHeight); // No excessive space

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

    // Calculate precise height to fit content exactly
    const lineCount = newText.split('\n').length;
    const calculatedHeight = Math.max(400, (lineCount * 22) + 40); // 22px per line + small padding
    setTextareaHeight(calculatedHeight); // Precise fit without excess space

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

  const handleCleanText = () => {
    const cleanedText = cleanOcrText(editableText);
    setEditableText(cleanedText);
    setHasChanges(cleanedText !== state.extractedText);
    
    // Adjust container to fit cleaned content precisely
    const lineCount = cleanedText.split('\n').length;
    const calculatedHeight = Math.max(400, (lineCount * 22) + 40);
    setTextareaHeight(calculatedHeight); // Precise fit without excess space
    
    toast({
      title: "Text Cleaned",
      description: "OCR text has been cleaned - excessive blank lines removed and formatting preserved.",
    });
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
  };

  const handleResetText = () => {
    const cleanedText = cleanOcrText(state.extractedText);
    setEditableText(cleanedText);
    setHasChanges(false);
    
    // Adjust container to fit reset content precisely
    const lineCount = cleanedText.split('\n').length;
    const calculatedHeight = Math.max(400, (lineCount * 22) + 40);
    setTextareaHeight(calculatedHeight); // Precise fit without excess space
    
    toast({
      title: "Text Reset",
      description: "Extracted text has been reset to original with OCR cleaning applied.",
    });
  };

  // Generate HTML-based professional PDF using the same format as downloadCorrectedText
  const generateProfessionalHTMLPDF = (): string => {
    return `<!DOCTYPE html>
    <html>
    <head>
      <title>Lab Result Report - ${selectedPatient?.name || 'Patient'}</title>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Times New Roman', serif; 
          font-size: 11pt;
          line-height: 1.3;
          background-color: #ffffff;
          color: #000000;
          width: 11.5in;
          min-height: 11in;
          margin: 0 auto;
          padding: 0.3in;
        }
        
        .page {
          width: 100%;
          min-height: 12.2in;
          background: white;
          padding: 0.3in;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        
        .title {
          font-size: 17pt;
          font-weight: bold;
          color: #000;
          margin-bottom: 4px;
        }
        
        .date {
          font-size: 9pt;
          color: #555;
        }
        
        .info-section {
          border: 1px solid #ccc;
          padding: 8px;
          margin-bottom: 12px;
          background: #f9f9f9;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          font-size: 11pt;
        }
        
        .info-item {
          margin: 2px 0;
        }
        
        .label {
          font-weight: bold;
          color: #000;
          display: inline-block;
          width: 70px;
        }
        
        .results-header {
          font-size: 13pt;
          font-weight: bold;
          color: #000;
          margin: 6px 0 6px 0;
          border-bottom: 1px solid #ccc;
          padding-bottom: 3px;
        }
        
        .content {
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 9pt;
          line-height: 1.2;
          border: 1px solid #ddd;
          padding: 12px;
          background: #fdfdfd;
          word-break: break-word;
          overflow-wrap: break-word;
          flex: 1;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <h1 class="title">LABORATORY RESULT REPORT</h1>
          <p class="date">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div class="info-section">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Patient:</span> ${selectedPatient?.name || 'Not selected'}
            </div>
            <div class="info-item">
              <span class="label">Test Type:</span> ${resultType || 'Not specified'}
            </div>
            <div class="info-item">
              <span class="label">Authorized:</span> ${authorizedBy || 'Not specified'}
            </div>
            <div class="info-item">
              <span class="label">Date:</span> ${new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <h3 class="results-header">TEST RESULTS</h3>
        <div class="content">${editableText}</div>
      </div>
    </body>
    </html>`;
  };

  // Simplified save function - no modal, direct save
  const handleSaveLabResult = async () => {
    // Validation
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
      console.log('Generating HTML PDF and saving lab result...');
      console.log('Selected patient ID:', selectedPatientId);
      console.log('Selected patient object:', selectedPatient);
      console.log('Result type:', resultType);
      console.log('Authorized by:', authorizedBy);

      // Generate the professional HTML content
      const htmlContent = generateProfessionalHTMLPDF();
      
      // Create a PDF file from HTML content using blob
      const pdfBlob = new Blob([htmlContent], { type: 'text/html' });
      const pdfFileName = `lab_result_${selectedPatient?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'patient'}_${new Date().toISOString().split('T')[0]}.html`;
      const pdfFile = new File([pdfBlob], pdfFileName, { type: 'text/html' });

      console.log('HTML PDF file created:', pdfFileName);
      console.log('Editable text length:', editableText?.length);
      console.log('Original file:', state.originalFile?.name, state.originalFile?.size, 'bytes');

      // Use the exact same FormData structure as before
      const formData = new FormData();
      formData.append('patient', selectedPatientId);
      formData.append('title', `${resultType} Lab Result`);
      formData.append('description', `${resultType} test results processed via Google Colab algorithms`);
      formData.append('content', editableText);
      formData.append('document_date', new Date().toISOString().split('T')[0]);
      formData.append('status', 'completed');
      formData.append('urgency', 'normal');
      
      // Lab result specific fields
      formData.append('test_name', resultType);
      formData.append('test_category', resultType.toLowerCase());
      formData.append('specimen_type', resultType.includes('Urine') || resultType.includes('Microbiology') ? 'urine' : 'blood');
      formData.append('laboratory_name', 'Health Nexus Lab');
      formData.append('lab_reference_number', `LAB-${Date.now()}`);
      formData.append('collection_date', new Date().toISOString().split('T')[0]);
      formData.append('received_date', new Date().toISOString().split('T')[0]);
      formData.append('reported_date', new Date().toISOString().split('T')[0]);
      formData.append('test_results', JSON.stringify([]));
      formData.append('interpretation', 'Automated extraction from Google Colab algorithms');
      formData.append('processing_notes', 'Processed via Google Colab algorithms with AWS Textract OCR system');
      
      if (authorizedBy && authorizedBy.trim()) {
        formData.append('authorized_by', authorizedBy.trim());
      }
      
      // Include the original file AND the generated HTML file as processed_file
      formData.append('document', state.originalFile);
      formData.append('processed_file', pdfFile);

      console.log('Making request to save lab result...');
      
      const response = await fetch('http://localhost:8000/api/medical-documents/lab-results/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `HTTP ${response.status}: ${response.statusText}`);
      }

      const savedLabResult = await response.json();
      console.log('Lab result saved successfully:', savedLabResult);
      console.log('=== LAB RESULT SAVE DEBUG END ===');
      
      toast({
        title: "Success",
        description: `Professional lab result saved to ${selectedPatient?.name}'s medical record!`,
      });

      // Navigate back to lab results
      navigate('/lab-results', {
        state: {
          savedLabResult: savedLabResult,
          message: "Professional lab result saved successfully",
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

  // View function - opens the same HTML format in new window
  const handleViewLabResult = () => {
    // Validation
    if (!selectedPatientId) {
      toast({
        title: "Missing Information",
        description: "Please select a patient before viewing the lab result.",
        variant: "destructive",
      });
      return;
    }

    if (!resultType) {
      toast({
        title: "Missing Information",
        description: "Please specify the result type before viewing the lab result.",
        variant: "destructive",
      });
      return;
    }

    // Generate and open the HTML content
    const htmlContent = generateProfessionalHTMLPDF();
    const viewWindow = window.open('', '_blank', 'width=1000,height=1200,scrollbars=yes,resizable=yes');
    
    if (viewWindow) {
      viewWindow.document.write(htmlContent);
      viewWindow.document.close();
      
      toast({
        title: "Lab Result Opened", 
        description: "Professional PDF lab result opened in new tab.",
      });
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to view the lab result.",
        variant: "destructive",
      });
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
    const content = `${editableText}`;
    
    // Open in a PDF-sized viewing window that maintains the content
    const viewWindow = window.open('', '_blank', 'width=1000,height=1200,scrollbars=yes,resizable=yes');
    if (viewWindow) {
      viewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lab Result Report - ${selectedPatient?.name || 'Patient'}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* PDF-optimized styling for single page */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
        body { 
          font-family: 'Times New Roman', serif; 
          font-size: 12pt;
          line-height: 1.4;
          background-color: #ffffff;
          color: #000000;
          width: 8.5in;
          min-height: 13in;
          margin: 0 auto;
          padding: 0.4in;
          position: relative;
          overflow-y: auto;
          overflow-x: hidden;
        }            .page {
              width: 100%;
              min-height: 12.2in;
              background: white;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              padding: 0.3in;
              display: flex;
              flex-direction: column;
            }
            
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 12px;
              flex-shrink: 0;
            }
            
            .title {
              font-size: 17pt;
              font-weight: bold;
              color: #000;
              margin-bottom: 4px;
            }
            
            .date {
              font-size: 10pt;
              color: #555;
            }
            
            .info-section {
              border: 1px solid #ccc;
              padding: 8px;
              margin-bottom: 12px;
              background: #f9f9f9;
              flex-shrink: 0;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              font-size: 11pt;
            }
            
            .info-item {
              margin: 2px 0;
            }
            
            .label {
              font-weight: bold;
              color: #000;
              display: inline-block;
              width: 70px;
            }
            
            .results-header {
              font-size: 13pt;
              font-weight: bold;
              color: #000;
              margin: 6px 0 6px 0;
              border-bottom: 1px solid #ccc;
              padding-bottom: 3px;
              flex-shrink: 0;
            }
            
            .content {
              white-space: pre-wrap;
              font-family: 'Courier New', monospace;
              font-size: 10pt;
              line-height: 1.3;
              border: 1px solid #ddd;
              padding: 10px;
              background: #fdfdfd;
              word-break: break-word;
              overflow-wrap: break-word;
              flex: 1;
              overflow-y: auto;
              max-height: 9in;
            }
            
            .download-actions {
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(255,255,255,0.95);
              padding: 12px;
              border-radius: 6px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              z-index: 1000;
            }
            
            .action-btn {
              display: block;
              width: 130px;
              margin: 4px 0;
              padding: 8px 12px;
              border: none;
              border-radius: 4px;
              font-size: 10pt;
              cursor: pointer;
              transition: all 0.2s;
            }
            
            .pdf-btn {
              background: #dc2626;
              color: white;
            }
            
            .pdf-btn:hover {
              background: #b91c1c;
            }
            
            .download-btn {
              background: #2563eb;
              color: white;
            }
            
            .download-btn:hover {
              background: #1d4ed8;
            }
            
            .print-btn {
              background: #059669;
              color: white;
            }
            
            .print-btn:hover {
              background: #047857;
            }
            
            .copy-btn {
              background: #7c3aed;
              color: white;
            }
            
            .copy-btn:hover {
              background: #6d28d9;
            }
            
            /* Print styles for single page PDF */
            @media print {
              body {
                width: 8.5in;
                height: 11in;
                margin: 0;
                padding: 0.4in;
                font-size: 9pt;
                overflow: hidden;
              }
              
              .download-actions { 
                display: none !important; 
              }
              
              .page {
                box-shadow: none;
                margin: 0;
                padding: 0.2in;
                height: 10.2in;
                min-height: 10.2in;
              }
              
              .header {
                padding-bottom: 5px;
                margin-bottom: 8px;
              }
              
              .title {
                font-size: 12pt;
              }
              
              .info-section {
                padding: 6px;
                margin-bottom: 8px;
              }
              
              .info-grid {
                font-size: 8pt;
              }
              
              .results-header {
                font-size: 10pt;
                margin: 5px 0 5px 0;
              }
              
              .content {
                border: 1px solid #000;
                font-size: 7pt;
                line-height: 1.1;
                padding: 6px;
                overflow: hidden;
                flex: 1;
                max-height: none;
              }
            }
            
            /* Responsive for smaller screens */
            @media screen and (max-width: 1100px) {
              body {
                width: 95%;
                padding: 15px;
              }
              
              .info-grid {
                grid-template-columns: 1fr;
              }
              
              .download-actions {
                position: relative;
                margin-top: 15px;
                right: auto;
                top: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <h1 class="title">LABORATORY RESULT REPORT</h1>
              <p class="date">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <div class="info-section">
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Patient:</span> ${selectedPatient?.name || 'Not selected'}
                </div>
                <div class="info-item">
                  <span class="label">Test Type:</span> ${resultType || 'Not specified'}
                </div>
                <div class="info-item">
                  <span class="label">Authorized:</span> ${authorizedBy || 'Not specified'}
                </div>
                <div class="info-item">
                  <span class="label">Date:</span> ${new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <h3 class="results-header">TEST RESULTS</h3>
            <div class="content">${editableText}</div>
          </div>
          
          <div class="download-actions">
            <button class="action-btn pdf-btn" onclick="generatePDF()">Save PDF</button>
            <button class="action-btn download-btn" onclick="downloadAsFile()">Save TXT</button>
            <button class="action-btn print-btn" onclick="window.print()">Print</button>
            <button class="action-btn copy-btn" onclick="copyToClipboard()">Copy</button>
          </div>
          
          <script>
            function generatePDF() {
              window.print();
            }
            
            function downloadAsFile() {
              const content = \`Lab Result Report
Patient: ${selectedPatient?.name || 'Not selected'}
Test Type: ${resultType || 'Not specified'}
Authorized By: ${authorizedBy || 'Not specified'}
Date: ${new Date().toLocaleDateString()}

Results:
${editableText}\`;
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'lab_result_${selectedPatient?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'patient'}_${new Date().toISOString().split('T')[0]}.txt';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            
            function copyToClipboard() {
              const content = \`Lab Result Report
Patient: ${selectedPatient?.name || 'Not selected'}
Test Type: ${resultType || 'Not specified'}
Authorized By: ${authorizedBy || 'Not specified'}
Date: ${new Date().toLocaleDateString()}

Results:
${editableText}\`;
              navigator.clipboard.writeText(content).then(function() {
                alert('Report copied to clipboard successfully!');
              }).catch(function() {
                const textArea = document.createElement('textarea');
                textArea.value = content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Report copied to clipboard!');
              });
            }
            
            window.addEventListener('load', function() {
              if (window.outerWidth < 1000 || window.outerHeight < 1200) {
                window.resizeTo(1000, 1200);
              }
            });
          </script>
        </body>
        </html>
      `);
      viewWindow.document.close();
      
      toast({
        title: "Single-Page PDF View",
        description: "Lab result report opened in compressed single-page format.",
      });
    } else {
      // Fallback to direct download if popup is blocked
      const cleanContent = `Lab Result Report
Patient: ${selectedPatient?.name || 'Not selected'}
Test Type: ${resultType || 'Not specified'}
Authorized By: ${authorizedBy || 'Not specified'}
Date: ${new Date().toLocaleDateString()}

Results:
${editableText}`;
      const blob = new Blob([cleanContent], { type: 'text/plain' });
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
    }
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
    <div className="w-full px-2 py-6">
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

      {/* Enhanced Layout - Floating Document, Fullscreen Text */}
      <div className="relative">
        {/* Dynamically Sized Text Editor - Fits Content Precisely */}
        <Card className="border-gray-300 flex flex-col" style={{ height: `${textareaHeight + 120}px` }}>
          <CardHeader className="pb-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-base font-medium text-gray-800">Extracted Text Editor - Full View</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded"
                  onClick={handleResetText}
                  disabled={!hasChanges}
                  title="Reset to original"
                >
                  Reset
                </button>
                <button
                  className="px-2 py-1 text-xs border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                  onClick={handleCleanText}
                  title="Clean OCR text - remove excessive blank lines"
                >
                  Clean Text
                </button>
                <button
                  className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded"
                  onClick={handlePreview}
                  title="Preview document"
                >
                  Preview
                </button>
                <button
                  className="px-2 py-1 text-xs border border-gray-300 hover:bg-gray-100 rounded"
                  onClick={downloadCorrectedText}
                  title="Download document"
                >
                  Download
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="flex-1 p-2" style={{ height: `${textareaHeight}px` }}>
              <textarea
                value={editableText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Extracted text will appear here for editing..."
                className="w-full h-full font-mono text-sm border border-gray-300 p-3 focus:border-gray-500 focus:outline-none resize-none bg-white leading-normal"
                style={{ 
                  height: `${textareaHeight}px`,
                  overflow: 'hidden', // Remove scrolling completely
                  minHeight: `${textareaHeight}px`,
                  maxHeight: `${textareaHeight}px`,
                  wordWrap: 'break-word', // Wrap long words
                  whiteSpace: 'pre-wrap', // Preserve line breaks and wrap text
                  overflowWrap: 'break-word' // Break long words that exceed container width
                }}
              />
            </div>
            <div className="flex-shrink-0 bg-gray-50 p-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span>{editableText.length} characters</span>
                  <span>{editableText.split('\n').length} lines</span>
                  <span className={hasChanges ? "text-orange-600 font-medium" : "text-green-600"}>
                    {hasChanges ? 'Modified' : 'Original'}
                  </span>
                  <span className="text-blue-600">OCR Cleaned - No excessive blank lines</span>
                </div>
                <span className="text-gray-400">
                  {state.originalFile.name} ({(state.originalFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Floating Original Document Window - Toggleable */}
        {isDocumentVisible && (
          <div 
            className="fixed z-50 bg-white border border-gray-300 shadow-lg"
            style={{
              left: `${floatingWindowPos.x}px`,
              top: `${floatingWindowPos.y}px`,
              width: `${windowSize.width}px`,
              height: `${windowSize.height}px`,
              cursor: isDragging ? 'grabbing' : 'default'
            }}
          >
            {/* Header - Minimal with Toggle */}
            <div 
              className="bg-gray-100 border-b border-gray-300 p-2 cursor-move select-none"
              onMouseDown={handleMouseDown}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Original Document</span>
                <div className="flex items-center gap-1">
                  {/* Zoom Controls */}
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded flex items-center"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs text-gray-600 px-1 min-w-[40px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded flex items-center"
                    onClick={handleZoomIn}
                    title="Zoom In"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded ml-1 flex items-center"
                    onClick={handleZoomReset}
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded ml-1 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(originalImageUrl, '_blank');
                    }}
                    title="Open in new tab"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-gray-200 rounded flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFloatingWindowPos({ x: 16, y: 16 });
                      setWindowSize({ width: 384, height: 500 });
                      setZoomLevel(1);
                    }}
                    title="Reset position & size"
                  >
                    <Home className="h-3 w-3" />
                  </button>
                  <button
                    className="text-xs px-1 py-0.5 hover:bg-red-100 text-red-600 rounded ml-1 flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDocumentVisibility();
                    }}
                    title="Hide document"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div 
              className="overflow-auto bg-white"
              style={{ height: `${windowSize.height - 40}px` }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ 
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
                width: `${100 / zoomLevel}%`,
                height: `${100 / zoomLevel}%`
              }}>
                <img
                  src={originalImageUrl}
                  alt="Original Document"
                  className="w-full h-auto object-contain"
                  style={{ 
                    backgroundColor: '#ffffff',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>

            {/* Resize Handles */}
            <div 
              className="resize-handle absolute top-0 right-0 w-3 h-3 cursor-nw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'top-right')}
              style={{ background: 'transparent' }}
            />
            <div 
              className="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
              style={{ background: 'transparent' }}
            />
            <div 
              className="resize-handle absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
              style={{ background: 'transparent' }}
            />
            <div 
              className="resize-handle absolute top-0 left-0 w-3 h-3 cursor-ne-resize"
              onMouseDown={(e) => handleResizeStart(e, 'top-left')}
              style={{ background: 'transparent' }}
            />
            
            {/* Edge resize handles */}
            <div 
              className="resize-handle absolute top-0 left-3 right-3 h-1 cursor-n-resize"
              onMouseDown={(e) => handleResizeStart(e, 'top')}
              style={{ background: 'transparent' }}
            />
            <div 
              className="resize-handle absolute bottom-0 left-3 right-3 h-1 cursor-s-resize"
              onMouseDown={(e) => handleResizeStart(e, 'bottom')}
              style={{ background: 'transparent' }}
            />
            <div 
              className="resize-handle absolute left-0 top-3 bottom-3 w-1 cursor-w-resize"
              onMouseDown={(e) => handleResizeStart(e, 'left')}
              style={{ background: 'transparent' }}
            />
            <div 
              className="resize-handle absolute right-0 top-3 bottom-3 w-1 cursor-e-resize"
              onMouseDown={(e) => handleResizeStart(e, 'right')}
              style={{ background: 'transparent' }}
            />
          </div>
        )}

        {/* Show Document Button when hidden */}
        {!isDocumentVisible && (
          <button
            className="fixed top-4 right-4 z-50 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg shadow-lg hover:bg-gray-700 flex items-center gap-2"
            onClick={toggleDocumentVisibility}
            title="Show original document"
          >
            <Eye className="h-4 w-4" />
            Show Document
          </button>
        )}
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
          variant="outline"
          onClick={handleViewLabResult}
          disabled={!selectedPatientId || !resultType}
          className="min-w-[120px]"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        
        <Button
          onClick={handleSaveLabResult}
          disabled={isSaving || !selectedPatientId || !resultType}
          className="min-w-[120px]"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
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
