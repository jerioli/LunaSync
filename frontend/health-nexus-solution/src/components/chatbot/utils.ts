
import { v4 as uuidv4 } from 'uuid';
import { TimeSlot } from './types';

export const generateTimeSlots = () => {
  const times = [];
  for (let hour = 9; hour <= 16; hour++) {
    times.push(`${hour}:00`);
    if (hour < 16) times.push(`${hour}:30`);
  }
  return times;
};

export const appointmentTypes = [
  { label: 'Regular Checkup', value: 'Regular Checkup' },
  { label: 'Follow-up', value: 'Follow-up' },
  { label: 'Consultation', value: 'Consultation' },
  { label: 'Vaccination', value: 'Vaccination' }
];

// Function to generate time slots from 9 AM to 5 PM in 30-minute increments
export const generateFullTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour <= 17; hour++) {
    const amPm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    
    // Add :00 slot
    slots.push({
      id: uuidv4(),
      time: `${displayHour}:00 ${amPm}`,
      selected: false
    });
    
    // Add :30 slot (except for 5 PM)
    if (hour < 17) {
      slots.push({
        id: uuidv4(),
        time: `${displayHour}:30 ${amPm}`,
        selected: false
      });
    }
  }
  return slots;
};

// Function to validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Function to validate phone number format
export const validatePhone = (phone: string): boolean => {
  // Simple validation: at least 10 digits
  const phoneRegex = /^\d{10,}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};
