export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  readonly?: boolean;
  hasNoMiddleNameOption?: boolean;
  validation?: {
    pattern?: string;
    message?: string;
  };
};

export type MessageType = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  type?: 'text' | 'options' | 'date' | 'doctor' | 'slot' | 'form' | 'typing' | 'datetime-picker' | 'date-picker' | 'time-picker' | 'faq-accordion';
  options?: { value: string; label: string; disabled?: boolean }[];
  dateSelector?: boolean;
  timeSelector?: boolean;
  dateTimePicker?: boolean; // Combined date-time picker (for doctor-first)
  datePickerOnly?: boolean; // Separate date picker (for date-first step 1)
  timePickerOnly?: boolean; // Separate time picker (for date-first step 2)
  dateOnlyMode?: boolean; // Flag to indicate date-only selection mode
  timeOnlyMode?: boolean; // Flag to indicate time-only selection mode
  times?: string[];
  timesDisabled?: boolean; // To disable time slots after selection
  availableDates?: Date[]; // For popover date selector
  selectedDate?: Date; // For popover date selector
  selectedTime?: string; // For popover time selector
  getTimeSlotsForDate?: (date: Date) => Promise<string[]>; // Function to get time slots for a date
  getTimeSlotsForDoctor?: (doctorId: string, date: Date) => Promise<string[]>; // Function to get time slots for specific doctor and date
  selectedDoctorId?: string; // Store selected doctor ID for time picker
  fileUpload?: boolean;
  fileUploadLabel?: string;
  fileUploadAccept?: string;
  messageKey?: string; // To identify which set of options this message contains
  formFields?: FormField[];
  showCancelOption?: boolean; // For form cancel functionality
  isTyping?: boolean; // For typing animation
  faqs?: any[]; // For FAQ accordion display
};

export type Doctor = {
  id: string;
  name: string;
  specialization: string;
  availableDays: string[]; // ['Monday', 'Tuesday', etc.]
  maxAppointmentsPerDay: number;
};

export interface AppointmentForm {
  date?: Date;
  time: string;
  type: string;
  doctorId: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  suffix: string;
  email: string;
  phone: string;
  notes: string;
  dateOfBirth: string;
  gender: string;
  religion?: string;
  address: string;
  maritalStatus: string;
  confirmationMethod?: 'sms' | 'email';
  termsAgreed?: boolean;
  patient_id?: string; // For returning patients
}

export type MedicalRecordRequestForm = {
  requestType: string;
  deliveryMethod: string;
  patientId: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  idVerificationFront: File | null;
  idVerificationBack: File | null;
  idVerificationFrontPreview: string | null;
  idVerificationBackPreview: string | null;
  additionalInfo: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

export type PrescriptionRequestForm = {
  prescriptionType: string; // 'new' or 'refill'
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  idVerificationFront: File | null;
  idVerificationBack: File | null;
  idVerificationFrontPreview: string | null;
  idVerificationBackPreview: string | null;
  prescriptionImage: File | null;
  prescriptionImagePreview: string | null;
  additionalNotes: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

// Define time slot type for doctor availability
export type TimeSlot = {
  id: string;
  time: string;
  selected: boolean;
};

// Define doctor availability type
export type DoctorAvailability = {
  doctorId: string;
  date: string;
  slots: string[];
};
