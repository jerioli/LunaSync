
import { User, Patient, Appointment, Prescription, LabResult, Inventory, Payment } from '@/lib/mock-data';

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

export type ClinicContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  labResults: LabResult[];
  deletePatient: (id: string) => void;
  inventory: Inventory[];
  payments: Payment[];
  addPatient: (patient: Patient) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updatedData: Partial<Appointment>) => void;
  addPrescription: (prescription: Prescription) => void;
  addLabResult: (labResult: LabResult) => void;
  updateInventory: (id: string, updatedData: Partial<Inventory>) => void;
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, updatedData: Partial<Payment>) => void;
  updatePatient: (id: string, updatedData: Partial<Patient>) => void;
  clinicCustomization: ClinicCustomization;
  updateClinicCustomization: (data: Partial<ClinicCustomization>) => void;
};