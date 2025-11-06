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
  operatingHours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  };
};

export interface ClinicContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthLoading: boolean;
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  labResults: LabResult[];
  addPatient: (patient: NewPatient) => Promise<Patient>;
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
  fetchLabResults: (params?: {
    patient_id?: string;
    test_category?: string;
    start_date?: string;
    end_date?: string;
  }) => Promise<LabResult[]>;
  refreshUserData: () => Promise<any>;
}