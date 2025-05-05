
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  accept?: string;
  label: string;
}

export const FileUpload = ({ onFileUpload, accept = "image/*", label }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  return (
    <div className="mt-2">
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept={accept}
      />
      <Button 
        onClick={handleButtonClick} 
        className="flex items-center gap-2 bg-gray-200 text-gray-800 hover:bg-gray-300 w-full justify-center"
      >
        <Upload size={16} />
        {label}
      </Button>
    </div>
  );
};
