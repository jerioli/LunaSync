
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Scan, ImageOff, FileCheck } from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';

interface OcrScannerProps {
  onScanComplete: (extractedText: string, patientId?: string, authorizedBy?: string) => void;
}

const OcrScanner: React.FC<OcrScannerProps> = ({ onScanComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { patients } = useClinic();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!selectedFile.type.includes('image')) {
        toast.error('Please select an image file');
        return;
      }
      
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  // Function to extract patient info from OCR text
  const extractPatientInfo = (text: string) => {
    // Try to extract patient name
    const patientNameMatch = text.match(/Patient Name:?\s*([^\n]+)/i);
    const patientIdMatch = text.match(/Patient ID:?\s*([^\n]+)/i);
    const authorizedByMatch = text.match(/Authorized by:?\s*([^\n]+)/i);
    
    let matchedPatientId: string | undefined = undefined;
    let authorizedBy: string | undefined = undefined;
    
    // Get patient name and search for matching patient
    if (patientNameMatch && patientNameMatch[1]) {
      const patientName = patientNameMatch[1].trim();
      // Try exact match first
      let matchedPatient = patients.find(p => 
        p.name.toLowerCase() === patientName.toLowerCase()
      );
      
      // If no exact match, try partial match
      if (!matchedPatient) {
        matchedPatient = patients.find(p => 
          p.name.toLowerCase().includes(patientName.toLowerCase()) ||
          patientName.toLowerCase().includes(p.name.toLowerCase())
        );
      }
      
      // If still no match but we have a patient ID, try to find by ID
      if (!matchedPatient && patientIdMatch && patientIdMatch[1]) {
        const patientId = patientIdMatch[1].trim();
        matchedPatient = patients.find(p => p.id === patientId);
      }
      
      if (matchedPatient) {
        matchedPatientId = matchedPatient.id;
      }
    }
    
    // Extract doctor who authorized the results
    if (authorizedByMatch && authorizedByMatch[1]) {
      authorizedBy = authorizedByMatch[1].trim();
    }
    
    return { matchedPatientId, authorizedBy };
  };
  
  const handleScan = () => {
    if (!file) {
      toast.error('Please select an image to scan');
      return;
    }
    
    setIsScanning(true);
    setProgress(0);
    
    // Simulate OCR processing
    const simulateOcr = () => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 10;
          
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsScanning(false);
              
              // Example extracted text from lab results
              const exampleExtractedText = `
                LABORATORY RESULTS
                
                Patient Name: John Smith
                Patient ID: PT12345
                Date of Collection: 2023-04-01
                
                HEMATOLOGY:
                - Hemoglobin: 14.2 g/dL (Normal: 13.5-17.5)
                - WBC Count: 7.5 x 10^9/L (Normal: 4.5-11.0)
                - Platelet Count: 250 x 10^9/L (Normal: 150-450)
                
                BIOCHEMISTRY:
                - Glucose: 95 mg/dL (Normal: 70-100)
                - Creatinine: 0.9 mg/dL (Normal: 0.7-1.2)
                - Cholesterol: 175 mg/dL (Normal: <200)
                
                Authorized by: Dr. Sarah Johnson
                Report Date: 2023-04-03
              `;
              
              // Extract patient info
              const { matchedPatientId, authorizedBy } = extractPatientInfo(exampleExtractedText);
              
              // Pass both the text and extracted patient ID to the parent component
              onScanComplete(exampleExtractedText, matchedPatientId, authorizedBy);
              toast.success('Lab results scanned successfully');
              
              if (matchedPatientId) {
                toast.success('Patient record automatically matched');
              }
            }, 500);
          }
          
          return newProgress;
        });
      }, 200);
    };
    
    simulateOcr();
  };
  
  const handleClear = () => {
    setFile(null);
    setPreview(null);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          <span>Lab Results OCR Scanner</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
          {preview ? (
            <div className="space-y-4">
              <img src={preview} alt="Lab result preview" className="max-h-[300px] mx-auto object-contain" />
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleClear}>
                  <ImageOff className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button onClick={handleScan} disabled={isScanning}>
                  <Scan className="h-4 w-4 mr-2" />
                  {isScanning ? 'Scanning...' : 'Scan Document'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8">
              <div className="flex flex-col items-center">
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload Lab Result Image</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a clear photo or scan of the lab result to automatically extract data
                </p>
                <Button asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Upload className="h-4 w-4 mr-2" />
                    Select Image
                  </label>
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {isScanning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing image...</span>
              <span className="text-sm">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">OCR Best Practices:</p>
              <ul className="text-muted-foreground mt-1 space-y-1 list-disc pl-4">
                <li>Use high-resolution, well-lit images</li>
                <li>Ensure the document is flat and not wrinkled</li>
                <li>Align the document properly in the frame</li>
                <li>Include the entire document in the image</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OcrScanner;
