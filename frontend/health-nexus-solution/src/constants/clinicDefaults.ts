
import { User, Patient, Appointment, Prescription, LabResult, Inventory, Payment } from '@/lib/mock-data';
import { ClinicCustomization } from '@/types/clinic';

export const defaultClinicCustomization: ClinicCustomization = {
  name: 'MedSync',
  logo: '/placeholder.svg',
  address: '123 Medical Way, Healthville, CA 90210',
  phone: '(555) 123-4567',
  email: 'info@healthtrackclinic.com',
  website: 'www.healthtrackclinic.com',
  colors: {
    primary: '#0070f3',
    secondary: '#10b981',
  },
  faqs: [
    {
      question: 'What are your clinic hours?',
      answer: 'Our clinic is open Monday through Friday from 9:00 AM to 5:00 PM, and Saturday from 10:00 AM to 2:00 PM. We are closed on Sundays and holidays.'
    },
    {
      question: 'How do I schedule an appointment?',
      answer: 'You can schedule an appointment by calling our office, using the online patient portal, or by visiting us in person. We recommend booking at least 24 hours in advance for routine visits.'
    },
    {
      question: 'What insurance plans do you accept?',
      answer: 'We accept most major insurance plans including Medicare, Blue Cross Blue Shield, Aetna, Cigna, and United Healthcare. Please call our office to verify your specific insurance coverage.'
    }
  ]
};

export type ClinicContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  labResults: LabResult[];
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