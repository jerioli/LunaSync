import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';
import { useState } from 'react';

interface TimePopoverProps {
  times: string[];
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  disabled?: boolean;
}

export const TimePopover = ({ 
  times, 
  selectedTime, 
  onTimeSelect, 
  disabled = false 
}: TimePopoverProps) => {
  const [open, setOpen] = useState(false);

  const handleTimeSelect = (time: string) => {
    onTimeSelect(time);
    setOpen(false);
  };

  const formatTimeDisplay = (time: string) => {
    // Convert 24-hour format to 12-hour format if needed
    return time;
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
            <Clock className="mr-2 h-4 w-4" />
            {selectedTime ? formatTimeDisplay(selectedTime) : "Select a time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" side="top">
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            <div className="text-sm font-medium text-gray-700 px-2 py-1 border-b">
              Available Times
            </div>
            {times.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-2">
                No available times
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {times.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "ghost"}
                    className="justify-center text-center h-auto p-2 text-sm"
                    onClick={() => handleTimeSelect(time)}
                  >
                    <div>
                      <Clock className="mx-auto h-3 w-3 mb-1" />
                      {formatTimeDisplay(time)}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
