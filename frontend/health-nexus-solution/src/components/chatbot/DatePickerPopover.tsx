import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import React, { useState } from 'react';

interface DatePickerPopoverProps {
  availableDates?: Date[];
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  availableDates = [],
  selectedDate,
  onDateSelect,
  disabled = false,
  placeholder = "Select a date"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
      setIsOpen(false);
    }
  };

  // Function to check if a date is available
  const isDateAvailable = (date: Date) => {
    if (availableDates.length === 0) return true; // If no restriction, all dates are available
    return availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  };

  // Filter available dates to only show dates from today onwards
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              format(selectedDate, "PPP")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              // Disable past dates
              if (date < today) return true;
              // If availableDates is provided, only allow those dates
              if (availableDates.length > 0) {
                return !isDateAvailable(date);
              }
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePickerPopover;