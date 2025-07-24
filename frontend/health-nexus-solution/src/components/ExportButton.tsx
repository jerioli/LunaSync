import { Button } from '@/components/ui/button';
import { exportDocumentResults } from '@/utils/labResultProcessor';
import { Download } from 'lucide-react';
import React from 'react';

interface ExportButtonProps {
  text: string;
  visualizationData: any;
  imageDataUrl?: string;
  filename?: string;
  isDisabled?: boolean;
}

/**
 * Export Button Component
 * Allows exporting lab results as PDF or text
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  text,
  visualizationData,
  imageDataUrl,
  filename = 'lab-result',
  isDisabled = false
}) => {
  const handleExport = async () => {
    try {
      const blob = await exportDocumentResults(text, visualizationData, imageDataUrl);
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting document:', error);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isDisabled || !text}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export
    </Button>
  );
};

export default ExportButton;
