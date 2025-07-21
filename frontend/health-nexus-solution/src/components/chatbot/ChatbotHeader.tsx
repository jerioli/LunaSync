import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatbotHeaderProps {
  onClose?: () => void;
}

export const ChatbotHeader = ({ onClose }: ChatbotHeaderProps) => {
  return (
    <CardHeader className="bg-[#79c942] text-white flex flex-row items-center justify-between px-4 py-3 rounded-t-lg w-full m-0">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-white" />
        <CardTitle className="text-base font-bold">Dr. MDSync</CardTitle>
      </div>
      
      {onClose && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-8 w-8 text-white hover:bg-white/20 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </CardHeader>
  );
};
