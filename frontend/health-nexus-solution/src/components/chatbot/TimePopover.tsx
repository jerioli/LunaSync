import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';
import { useState } from 'react';

interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean;
}

interface TimePopoverProps {
  times?: string[]; // Keep for backward compatibility
  timeSlots?: TimeSlot[]; // New prop for enhanced time slots
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  disabled?: boolean;
}

export const TimePopover = ({ 
  times, 
  timeSlots,
  selectedTime, 
  onTimeSelect, 
  disabled = false 
}: TimePopoverProps) => {
  const [open, setOpen] = useState(false);

  // Convert times array to timeSlots format for backward compatibility
  const actualTimeSlots = timeSlots || (times?.map(time => ({ time, available: true, booked: false })) || []);

  const handleTimeSelect = (time: string, isAvailable: boolean) => {
    if (isAvailable) {
      onTimeSelect(time);
      setOpen(false);
    }
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
            className={`w-full justify-start text-left font-normal bg-white min-w-0 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={disabled}
            title={selectedTime ? formatTimeDisplay(selectedTime) : "Select a time"}
          >
            <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedTime ? formatTimeDisplay(selectedTime) : "Select a time"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-w-[90vw] p-2" align="start" side="top">
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto min-w-0">
            <div className="text-sm font-medium text-gray-700 px-2 py-1 border-b">
              Time Slots
            </div>
            {actualTimeSlots.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-2">
                No time slots available
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 min-w-0">
                {actualTimeSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  const isAvailable = slot.available && !slot.booked;
                  
                  return (
                    <Button
                      key={slot.time}
                      variant={isSelected ? "default" : "ghost"}
                      className={`justify-center text-center h-auto p-2 text-xs min-w-0 truncate whitespace-nowrap relative ${
                        !isAvailable 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleTimeSelect(slot.time, isAvailable)}
                      disabled={!isAvailable}
                      title={
                        slot.booked 
                          ? `${formatTimeDisplay(slot.time)} - Booked`
                          : !slot.available 
                            ? `${formatTimeDisplay(slot.time)} - Unavailable`
                            : formatTimeDisplay(slot.time)
                      }
                    >
                      <div className="flex flex-col items-center min-w-0">
                        <Clock className="h-3 w-3 mb-1 flex-shrink-0" />
                        <span className="truncate max-w-full">{formatTimeDisplay(slot.time)}</span>
                        {slot.booked && (
                          <span className="text-[10px] text-red-600 font-medium mt-0.5">BOOKED</span>
                        )}
                        {!slot.available && !slot.booked && (
                          <span className="text-[10px] text-gray-500 font-medium mt-0.5">N/A</span>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
