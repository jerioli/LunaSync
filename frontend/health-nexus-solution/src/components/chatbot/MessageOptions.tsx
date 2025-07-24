
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
          className={isDarkBackground ? '' : 'bg-white'}
          onClick={() => onOptionSelect(option.value, messageKey)}
          disabled={option.disabled}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};
