import React from 'react';
import { Button } from '@/components/ui/button';

interface MessageOptionProps {
  options: { label: string; value: string; disabled?: boolean }[];
  onOptionSelect: (value: string, messageKey?: string) => void;
  isDarkBackground: boolean;
  messageKey?: string;
}

export const MessageOptions = ({ options, onOptionSelect, isDarkBackground, messageKey }: MessageOptionProps) => {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <Button 
          key={option.value} 
          variant="outline" 
          size="sm"
<<<<<<< HEAD
          className={isDarkBackground ? '' : 'bg-white'}
          onClick={() => onOptionSelect(option.value, messageKey)}
          disabled={option.disabled}
=======
          className={isDarkBackground 
            ? 'border-white hover:bg-white/20' 
            : 'bg-white border-[#79c942] text-[#79c942] hover:bg-[#79c942]/10'}
          onClick={() => onOptionSelect(option.value)}
>>>>>>> origin/main
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};
