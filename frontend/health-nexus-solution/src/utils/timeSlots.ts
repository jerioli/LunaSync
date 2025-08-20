import { ClinicCustomization } from '@/types/clinic';

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface GeneratedTimeSlot {
  start_time: string;
  display_time: string;
}

/**
 * Generates time slots based on clinic operating hours with 20-minute intervals
 * @param date - The date for which to generate time slots
 * @param clinicCustomization - The clinic customization containing operating hours
 * @returns Array of formatted time slot strings (e.g., "9:00 AM", "9:20 AM")
 */
export const generateTimeSlots = (
  date: Date, 
  clinicCustomization: ClinicCustomization
): string[] => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[date.getDay()] as keyof typeof clinicCustomization.operatingHours;
  
  const dayHours = clinicCustomization.operatingHours[dayOfWeek];
  
  // If clinic is closed on this day, return empty array
  if (!dayHours.isOpen) {
    return [];
  }
  
  const timeSlots: string[] = [];
  const [openHour, openMinute] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
  
  // Convert to minutes for easier calculation
  const openTimeInMinutes = openHour * 60 + openMinute;
  const closeTimeInMinutes = closeHour * 60 + closeMinute;
  
  // Generate 20-minute intervals
  const intervalMinutes = 20;
  
  for (let currentTime = openTimeInMinutes; currentTime < closeTimeInMinutes; currentTime += intervalMinutes) {
    const hours = Math.floor(currentTime / 60);
    const minutes = currentTime % 60;
    
    // Format to 12-hour format with AM/PM
    const displayHour = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedTime = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    timeSlots.push(formattedTime);
  }
  
  return timeSlots;
};

/**
 * Converts a display time (e.g., "9:00 AM") back to 24-hour format (e.g., "09:00")
 * @param displayTime - Time in 12-hour format with AM/PM
 * @returns Time in 24-hour format (HH:MM)
 */
export const convertDisplayTimeTo24Hour = (displayTime: string): string => {
  const [time, period] = displayTime.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour24 = hours;
  
  if (period === 'AM' && hours === 12) {
    hour24 = 0;
  } else if (period === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Checks if a time slot conflicts with existing appointments
 * This is a placeholder function - in a real application, you would check against
 * a database of existing appointments for the doctor on the given date
 * @param doctorId - The doctor's ID
 * @param date - The appointment date
 * @param timeSlot - The time slot to check
 * @returns boolean indicating if the slot is available
 */
export const isTimeSlotAvailable = async (
  doctorId: string, 
  date: Date, 
  timeSlot: string
): Promise<boolean> => {
  // TODO: Implement actual appointment conflict checking
  // For now, return true (all slots available)
  // In a real implementation, you would:
  // 1. Query the database for existing appointments for this doctor on this date
  // 2. Check if any appointment conflicts with the given time slot
  // 3. Return false if there's a conflict, true if available
  
  return true;
};

/**
 * Filters generated time slots to only show available ones
 * @param timeSlots - Array of generated time slots
 * @param doctorId - The doctor's ID
 * @param date - The appointment date
 * @returns Array of available time slots
 */
export const filterAvailableTimeSlots = async (
  timeSlots: string[],
  doctorId: string,
  date: Date
): Promise<string[]> => {
  const availableSlots: string[] = [];
  
  for (const slot of timeSlots) {
    const isAvailable = await isTimeSlotAvailable(doctorId, date, slot);
    if (isAvailable) {
      availableSlots.push(slot);
    }
  }
  
  return availableSlots;
};
