import React from 'react';
import { Button } from '@/components/ui/button';

interface MessageOptionProps {
  options: { label: string; value: string }[];
  onOptionSelect: (value: string) => void;
  isDarkBackground: boolean;
}

export const MessageOptions = ({ options, onOptionSelect, isDarkBackground }: MessageOptionProps) => {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <Button 
          key={option.value} 
          variant="outline" 
          size="sm"
          className={isDarkBackground 
            ? 'border-white hover:bg-white/20' 
            : 'bg-white border-[#79c942] text-[#79c942] hover:bg-[#79c942]/10'}
          onClick={() => onOptionSelect(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};
