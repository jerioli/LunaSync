
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Save, Copy, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface OcrResultDisplayProps {
  extractedText: string;
  matchedPatientId?: string;
  authorizedBy?: string;
  onEdit: () => void;
}

const OcrResultDisplay: React.FC<OcrResultDisplayProps> = ({ 
  extractedText, 
  matchedPatientId,
  authorizedBy,
  onEdit 
}) => {
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success('Text copied to clipboard');
  };
  
  const handleSave = () => {
    // Create a blob and download it
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-results-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Lab results saved as text file');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <span>Extracted Lab Results</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
          {extractedText}
        </div>
        
        {matchedPatientId && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✓ Patient record automatically matched
            </p>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Text
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save as Text
          </Button>
          <Button onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit & Add to Patient Record
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OcrResultDisplay;
