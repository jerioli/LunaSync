import { defaultClinicCustomization } from '@/constants/clinicDefaults';
import {
    Appointment,
    appointments,
    Inventory,
    LabResult,
    labResults,
    NewPatient,
    Patient,
    Payment,
    Prescription,
    prescriptions,
    User,
    users
} from '@/lib/mock-data';
import { axiosInstance } from '@/services/api';
import { ClinicContextType, ClinicCustomization } from '@/types/clinic';
import { parseApiError } from '@/utils/errorHandler';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// Remove the base URL setting since we're using proxy
// axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

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
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>(appointments);
  const [prescriptionsList, setPrescriptionsList] = useState<Prescription[]>(prescriptions);
  const [labResultsList, setLabResultsList] = useState<LabResult[]>(labResults);
  const [clinicCustomization, setClinicCustomization] = useState<ClinicCustomization>(defaultClinicCustomization);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

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

  const addPatient = async (patient: NewPatient) => {
    try {
      // Format the patient data to match backend expectations
      const formattedPatient = {
        ...patient,
        medical_info: patient.medical_info || {
          bloodType: '',
          allergies: [],
          medicalHistory: ''
        }
      };

      const response = await axiosInstance.post('patients/', formattedPatient);
      
      // Ensure the response data has the correct structure and map field names
      const newPatient = {
        ...response.data,
        // Map backend snake_case to frontend camelCase
        registrationDate: response.data.registration_date,
        medical_info: response.data.medical_info || {
          bloodType: '',
          allergies: [],
          medicalHistory: ''
        }
      };

      setPatientsList(prev => [...prev, newPatient]);
      return newPatient;
    } catch (error: any) {
      console.error('Error adding patient:', error);
      
      // Use the error handler utility to parse the error
      const parsedError = parseApiError(error, 'Failed to add patient. Please try again.');
      
      // Create a more detailed error object
      const detailedError = new Error(parsedError.message);
      (detailedError as any).isValidationError = parsedError.isValidationError;
      (detailedError as any).validationErrors = parsedError.validationErrors;
      (detailedError as any).title = parsedError.title;
      
      throw detailedError;
    }
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

  // Add deletePatient function
  const deletePatient = (id: string) => {
    setPatientsList((prevPatients) => prevPatients.filter((patient) => patient.id !== id));
  };

  // New function to update clinic customization
  const updateClinicCustomization = (data: Partial<ClinicCustomization>) => {
    setClinicCustomization({
      ...clinicCustomization,
      ...data
    });
  };

  const updateInventory = (id: string, updatedData: Partial<Inventory>) => {
    setInventory(inventory.map(item => 
      item.id === id ? { ...item, ...updatedData } : item
    ));
  };

  const addPayment = (payment: Payment) => {
    setPayments([...payments, payment]);
  };

  const updatePayment = (id: string, data: Partial<Payment>) => {
    setPayments(payments.map(payment => 
      payment.id === id ? { ...payment, ...data } : payment
    ));
  };  // Fetch patients from backend
  const fetchPatients = useCallback(async () => {
    try {
      const response = await axiosInstance.get('patients/');
      
      // Map backend snake_case fields to frontend camelCase
      const mappedPatients = response.data.map((patient: any) => ({
        ...patient,
        registrationDate: patient.registration_date
      }));
      
      setPatientsList(mappedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }, []);

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
     
        addPatient,
        addAppointment,
        updateAppointment,
        addPrescription,
        addLabResult,
     
        updatePatient,
        deletePatient,
        clinicCustomization,
        updateClinicCustomization,
        inventory,
        payments,
        updateInventory,
        addPayment,
        updatePayment,
        fetchPatients,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};