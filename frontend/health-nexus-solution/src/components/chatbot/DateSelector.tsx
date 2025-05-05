
import React from 'react';
import { Calendar } from '@/components/ui/calendar';

interface DateSelectorProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

export const DateSelector = ({ selectedDate, onDateSelect }: DateSelectorProps) => {
  return (
    <div className="mt-3 bg-white rounded-lg p-2">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        disabled={(date) => 
          date < new Date() || 
          date > new Date(new Date().setMonth(new Date().getMonth() + 3)) ||
          date.getDay() === 0 || 
          date.getDay() === 6
        }
        className="rounded border"
      />
    </div>
  );
};
