export type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    message?: string;
  };
};

export type MessageType = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  type?: 'text' | 'options' | 'date' | 'doctor' | 'slot' | 'form' | 'typing';
  options?: { value: string; label: string; disabled?: boolean }[];
  dateSelector?: boolean;
  timeSelector?: boolean;
  times?: string[];
  timesDisabled?: boolean; // To disable time slots after selection
  availableDates?: Date[]; // For popover date selector
  selectedDate?: Date; // For popover date selector
  selectedTime?: string; // For popover time selector
  fileUpload?: boolean;
  fileUploadLabel?: string;
  fileUploadAccept?: string;
  messageKey?: string; // To identify which set of options this message contains
  formFields?: FormField[];
  isTyping?: boolean; // For typing animation
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
  address: string;
  maritalStatus: string;
  termsAgreed?: boolean;
  patient_id?: string; // For returning patients
}

export type MedicalRecordRequestForm = {
  requestType: string;
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
