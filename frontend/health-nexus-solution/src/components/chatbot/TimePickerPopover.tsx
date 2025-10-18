import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import React, { useEffect, useState } from 'react';

interface TimePickerPopoverProps {
  selectedDate?: Date;
  selectedDoctorId?: string;
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  getTimeSlotsForDoctor?: (doctorId: string, date: Date) => Promise<string[]>;
  disabled?: boolean;
  placeholder?: string;
}

export const TimePickerPopover: React.FC<TimePickerPopoverProps> = ({
  selectedDate,
  selectedDoctorId,
  selectedTime,
  onTimeSelect,
  getTimeSlotsForDoctor,
  disabled = false,
  placeholder = "Select a time"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (selectedDate && selectedDoctorId && getTimeSlotsForDoctor) {
        console.log('[DEBUG] TimePickerPopover: Fetching slots for doctor', selectedDoctorId);
        setIsLoading(true);
        try {
          const slots = await getTimeSlotsForDoctor(selectedDoctorId, selectedDate);
          setTimeSlots(slots);
        } catch (error) {
          console.error('Error fetching time slots:', error);
          setTimeSlots([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setTimeSlots([]);
      }
    };

    fetchTimeSlots();
  }, [selectedDate, selectedDoctorId, getTimeSlotsForDoctor]);

  const handleTimeSelect = (time: string) => {
    onTimeSelect(time);
    setIsOpen(false);
  };

  const canShowTimePicker = selectedDate && selectedDoctorId;

  return (
    <div className="w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled || !canShowTimePicker}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedTime && "text-muted-foreground"
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {selectedTime ? (
              selectedTime
            ) : (
              <span>{canShowTimePicker ? placeholder : "Select date and doctor first"}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading time slots...</p>
              </div>
            ) : timeSlots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeSelect(time)}
                    className="text-sm"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">
                  {canShowTimePicker ? "No time slots available" : "Please select date and doctor first"}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimePickerPopover;