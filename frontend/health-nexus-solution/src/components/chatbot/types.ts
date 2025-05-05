
export type MessageType = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  options?: { label: string; value: string }[];
  dateSelector?: boolean;
  timeSelector?: boolean;
  times?: string[];
  fileUpload?: boolean;
  fileUploadLabel?: string;
  fileUploadAccept?: string;
};

export type AppointmentForm = {
  date: Date | undefined;
  time: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

export type MedicalRecordRequestForm = {
  requestType: string;
  patientName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  idVerification: File | null;
  additionalInfo: string;
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
