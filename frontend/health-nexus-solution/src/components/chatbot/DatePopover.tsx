import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, CalendarDays } from 'lucide-react';
import { useState } from 'react';

interface DatePopoverProps {
  availableDates: Date[];
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  disabled?: boolean;
}

export const DatePopover = ({ 
  availableDates, 
  selectedDate, 
  onDateSelect, 
  disabled = false 
}: DatePopoverProps) => {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (date: Date) => {
    onDateSelect(date);
    setOpen(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="mt-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={`w-full justify-start text-left font-normal bg-white ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={disabled}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {selectedDate ? formatDate(selectedDate) : "Select a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" side="top">
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            <div className="text-sm font-medium text-gray-700 px-2 py-1 border-b">
              Available Dates
            </div>
            {availableDates.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-2">
                No available dates
              </div>
            ) : (
              availableDates.map((date) => (
                <Button
                  key={date.toISOString()}
                  variant={selectedDate?.toDateString() === date.toDateString() ? "default" : "ghost"}
                  className="justify-start text-left h-auto p-2"
                  onClick={() => handleDateSelect(date)}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-medium">{formatDate(date)}</div>
                    <div className="text-xs text-gray-500">
                      {date.toLocaleDateString('en-US', { year: 'numeric' })}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
