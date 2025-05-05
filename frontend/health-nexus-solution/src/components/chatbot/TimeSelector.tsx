
import React from 'react';
import { Button } from '@/components/ui/button';

interface TimeSelectorProps {
  times: string[];
  onTimeSelect: (time: string) => void;
}

export const TimeSelector = ({ times, onTimeSelect }: TimeSelectorProps) => {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {times.map((time) => (
        <Button 
          key={time} 
          variant="outline" 
          size="sm"
          className="bg-white"
          onClick={() => onTimeSelect(time)}
        >
          {time}
        </Button>
      ))}
    </div>
  );
};
