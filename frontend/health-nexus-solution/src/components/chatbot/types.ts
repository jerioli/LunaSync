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
  type?: 'text' | 'options' | 'date' | 'doctor' | 'slot' | 'form';
  options?: { value: string; label: string; disabled?: boolean }[];
  dateSelector?: boolean;
  timeSelector?: boolean;
  times?: string[];
  fileUpload?: boolean;
  fileUploadLabel?: string;
  fileUploadAccept?: string;
  messageKey?: string; // To identify which set of options this message contains
  formFields?: FormField[];
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
  name: string;
  email: string;
  phone: string;
  notes: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  maritalStatus: string;
  termsAgreed?: boolean;
}

export type MedicalRecordRequestForm = {
  requestType: string;
  patientName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  idVerification: File | null;
  additionalInfo: string;
};

export type PrescriptionRequestForm = {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  patientName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  idVerification: File | null;
  prescriptionImage: File | null;
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
