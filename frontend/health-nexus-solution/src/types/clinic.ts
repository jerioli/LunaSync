import { Appointment, Inventory, LabResult, NewPatient, Patient, Payment, Prescription, User } from '@/lib/mock-data';

// Define clinic branding and customization types
export type ClinicCustomization = {
  name: string;
  logo: string;
  secondaryLogo?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  faqs: {
    question: string;
    answer: string;
  }[];
};

export interface ClinicContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  forceLogout: () => void;
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  labResults: LabResult[];
  addPatient: (patient: NewPatient) => Promise<void>;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updatedData: Partial<Appointment>) => void;
  addPrescription: (prescription: Prescription) => void;
  addLabResult: (labResult: LabResult) => void;
  updatePatient: (id: string, updatedData: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  clinicCustomization: ClinicCustomization;
  updateClinicCustomization: (data: Partial<ClinicCustomization>) => void;
  inventory: Inventory[];
  payments: Payment[];
  updateInventory: (id: string, updatedData: Partial<Inventory>) => void;
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, data: Partial<Payment>) => void;
  fetchPatients: () => Promise<void>;
}