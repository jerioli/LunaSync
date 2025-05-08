
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  Patient, 
  Appointment, 
  Prescription, 
  LabResult,
  Inventory,
  Payment,
  users,
  patients,
  appointments,
  prescriptions,
  labResults,
  inventory,
  payments
} from '@/lib/mock-data';
import { ClinicContextType, ClinicCustomization } from '@/types/clinic';
import { defaultClinicCustomization } from '@/constants/clinicDefaults';

export const ClinicContext = createContext<ClinicContextType | undefined>(undefined);
// Add the useClinic hook
export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUserState(JSON.parse(storedUser));
    }
  }, []);

  const [patientsList, setPatientsList] = useState<Patient[]>(patients);
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>(appointments);
  const [prescriptionsList, setPrescriptionsList] = useState<Prescription[]>(prescriptions);
  const [labResultsList, setLabResultsList] = useState<LabResult[]>(labResults);
  const [inventoryList, setInventoryList] = useState<Inventory[]>(inventory);
  const [paymentsList, setPaymentsList] = useState<Payment[]>(payments);
  const [clinicCustomization, setClinicCustomization] = useState<ClinicCustomization>(defaultClinicCustomization);

  const addPatient = (patient: Patient) => {
    setPatientsList([...patientsList, patient]);
  };

  const addAppointment = (appointment: Appointment) => {
    setAppointmentsList([...appointmentsList, appointment]);
  };

  const updateAppointment = (id: string, updatedData: Partial<Appointment>) => {
    setAppointmentsList(
      appointmentsList.map((appointment) =>
        appointment.id === id ? { ...appointment, ...updatedData } : appointment
      )
    );
  };

  const addPrescription = (prescription: Prescription) => {
    setPrescriptionsList([...prescriptionsList, prescription]);
  };

  const addLabResult = (labResult: LabResult) => {
    setLabResultsList([...labResultsList, labResult]);
  };

  const updateInventory = (id: string, updatedData: Partial<Inventory>) => {
    setInventoryList(
      inventoryList.map((item) =>
        item.id === id ? { ...item, ...updatedData } : item
      )
    );
  };

  const addPayment = (payment: Payment) => {
    setPaymentsList([...paymentsList, payment]);
  };

  const updatePayment = (id: string, updatedData: Partial<Payment>) => {
    setPaymentsList(
      paymentsList.map((payment) =>
        payment.id === id ? { ...payment, ...updatedData } : payment
      )
    );
  };

  const updatePatient = (id: string, updatedData: Partial<Patient>) => {
    // Check if the patient already exists
    const existingPatientIndex = patientsList.findIndex(patient => patient.id === id);
    
    if (existingPatientIndex !== -1) {
      // Update existing patient
      setPatientsList(
        patientsList.map((patient) =>
          patient.id === id ? { ...patient, ...updatedData } : patient
        )
      );
    } else {
      // Add new patient (when id doesn't exist yet)
      setPatientsList([...patientsList, updatedData as Patient]);
    }
  };

  // New function to update clinic customization
  const updateClinicCustomization = (data: Partial<ClinicCustomization>) => {
    setClinicCustomization({
      ...clinicCustomization,
      ...data
    });
  };

  return (
    <ClinicContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        
        patients: patientsList,
        appointments: appointmentsList,
        prescriptions: prescriptionsList,
        labResults: labResultsList,
        inventory: inventoryList,
        payments: paymentsList,
        addPatient,
        addAppointment,
        updateAppointment,
        addPrescription,
        addLabResult,
        updateInventory,
        addPayment,
        updatePayment,
        updatePatient,
        clinicCustomization,
        updateClinicCustomization,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};
