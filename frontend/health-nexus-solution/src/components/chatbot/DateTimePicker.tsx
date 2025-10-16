import { format } from 'date-fns';
import { Calendar, Check, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DatePopover } from './DatePopover';
import { TimePopover } from './TimePopover';

interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean;
}

interface DateTimePickerProps {
  availableDates: Date[];
  onDateTimeSelect: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
  getTimeSlotsForDate: (date: Date) => Promise<string[]>;
  disabled?: boolean;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  availableDates,
  onDateTimeSelect,
  selectedDate,
  selectedTime,
  getTimeSlotsForDate,
  disabled = false
}) => {
  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date | undefined>(selectedDate);
  const [currentSelectedTime, setCurrentSelectedTime] = useState<string | undefined>(selectedTime);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Generate default time slots if no specific slots are available
  const generateDefaultTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Add slots every 20 minutes
      for (let minute = 0; minute < 60; minute += 20) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = format(new Date().setHours(hour, minute), 'h:mm a');
        // Mark some common appointment times as booked for demo
        const isBookedSlot = (hour === 10 && minute === 0) || 
                            (hour === 11 && minute === 20) || 
                            (hour === 14 && minute === 40) ||
                            (hour === 15 && minute === 0);
        slots.push({
          time: displayTime,
          available: !isBookedSlot,
          booked: isBookedSlot
        });
      }
    }
    return slots;
  };

  // Load time slots when date is selected
  useEffect(() => {
    if (currentSelectedDate) {
      setLoadingTimeSlots(true);
      getTimeSlotsForDate(currentSelectedDate)
        .then((slots) => {
          if (slots && slots.length > 0) {
            // Create comprehensive time slots showing available and booked
            const allTimeSlots = generateDefaultTimeSlots();
            const availableSlotSet = new Set(slots);
            
            const combinedSlots = allTimeSlots.map(slot => {
              const isAvailable = availableSlotSet.has(slot.time);
              return {
                time: slot.time,
                available: isAvailable,
                booked: !isAvailable // If not available, assume it's booked
              };
            });
            
            setTimeSlots(combinedSlots);
          } else {
            // Use default slots if no API slots available
            setTimeSlots(generateDefaultTimeSlots());
          }
        })
        .catch(() => {
          // Fallback to default slots on error
          setTimeSlots(generateDefaultTimeSlots());
        })
        .finally(() => {
          setLoadingTimeSlots(false);
        });
    } else {
      setTimeSlots([]);
    }
  }, [currentSelectedDate, getTimeSlotsForDate]);

  // Show confirmation when both date and time are selected
  useEffect(() => {
    if (currentSelectedDate && currentSelectedTime && !showConfirmation) {
      setShowConfirmation(true);
    }
  }, [currentSelectedDate, currentSelectedTime, showConfirmation]);



  const handleDateSelect = (date: Date) => {
    if (disabled) return;
    setCurrentSelectedDate(date);
    setCurrentSelectedTime(undefined); // Reset time when date changes
    setShowConfirmation(false);
  };

  const handleTimeSelect = (time: string) => {
    if (disabled) return;
    setCurrentSelectedTime(time);
  };

  const handleConfirm = () => {
    if (currentSelectedDate && currentSelectedTime) {
      onDateTimeSelect(currentSelectedDate, currentSelectedTime);
    }
  };

  const handleCancel = () => {
    setCurrentSelectedDate(undefined);
    setCurrentSelectedTime(undefined);
    setShowConfirmation(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 w-full max-w-2xl mx-auto relative min-w-0" style={{ zIndex: 10 }}>
      {/* Header */}
      <div className="flex items-start gap-2 mb-4">
        <Calendar className="w-5 h-5 text-[#79c942] flex-shrink-0 mt-0.5" />
        <span className="font-medium text-gray-800 text-sm sm:text-base leading-tight">
          Please select your preferred appointment date and time 📅 ⏰:
        </span>
      </div>

      {/* Date and Time Selection - Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Date Selection */}
        <div className="relative min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <DatePopover
            availableDates={availableDates}
            selectedDate={currentSelectedDate}
            onDateSelect={handleDateSelect}
            disabled={disabled}
          />
        </div>

        {/* Time Selection */}
        <div className="relative min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
          <TimePopover
            timeSlots={timeSlots}
            selectedTime={currentSelectedTime}
            onTimeSelect={handleTimeSelect}
            disabled={disabled || loadingTimeSlots || !currentSelectedDate}
          />
        </div>
      </div>

      {/* Status message */}
      {currentSelectedDate && timeSlots.length > 0 && (
        <div className="text-xs text-gray-500 mb-4">
          {loadingTimeSlots ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#79c942]"></div>
              <span>Loading available times...</span>
            </div>
          ) : (
            <div>
              <span className="text-[#79c942]">{timeSlots.filter(s => s.available && !s.booked).length} available</span>
              {timeSlots.some(s => s.booked) && (
                <span className="text-red-500 ml-2">• {timeSlots.filter(s => s.booked).length} booked</span>
              )}
            </div>
          )}
        </div>
      )}

      {!currentSelectedDate && (
        <div className="text-sm text-gray-500 mb-4">Please select a date first</div>
      )}

      {/* Confirmation */}
      {showConfirmation && currentSelectedDate && currentSelectedTime && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium text-green-800 break-words">
              ✅ Appointment set for {format(currentSelectedDate, 'MM/dd/yyyy')} at {currentSelectedTime}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <button
              onClick={handleConfirm}
              disabled={disabled}
              className="flex-1 bg-[#79c942] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#6bb836] transition-colors min-w-0"
            >
              Confirm Appointment
            </button>
            <button
              onClick={handleCancel}
              disabled={disabled}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;