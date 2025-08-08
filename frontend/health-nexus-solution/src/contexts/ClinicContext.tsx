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
import { ClinicContextType, ClinicCustomization } from '@/types/clinic';
import { checkSessionStatus } from '@/utils/sessionManager';
import axios from 'axios';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';
// Configure axios for session-based authentication
axios.defaults.withCredentials = true; // Important for session cookies

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
      localStorage.setItem("sessionId", (user as any).sessionId || '');
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("sessionId");
    }
  };

  // Manual logout function that clears everything
  const forceLogout = () => {
    console.log('🚪 Manual logout triggered');
    localStorage.removeItem("user");
    localStorage.removeItem("sessionId");
    setCurrentUserState(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // First check if there's a stored user
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUserState(user);
        
        // Only validate session if we have both user and sessionId
        const storedSessionId = localStorage.getItem("sessionId");
        if (storedSessionId) {
          try {
            console.log('🔍 Validating existing session...');
            const sessionStatus = await checkSessionStatus();
            console.log('📊 Full session status response:', sessionStatus);
            
            if (sessionStatus.authenticated === true) {
              // Session is valid, update user data if needed
              console.log('✅ Session is valid');
              if (sessionStatus.user) {
                const updatedUser = {
                  ...user,
                  ...sessionStatus.user,
                  sessionId: sessionStatus.session_id
                };
                setCurrentUserState(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
              }
            } else {
              // Session is not authenticated, but we'll keep the user logged in locally
              // This prevents automatic logout on page refresh
              // The user will be prompted to login again when they try to make authenticated requests
              console.log('⚠️ Session not authenticated on server, but keeping user logged in locally');
              console.log('� User can continue using the app and will be prompted to re-authenticate when needed');
            }
          } catch (error) {
            console.error('❌ Session validation failed:', error);
            // Don't clear user on network errors - let them stay logged in
            console.log('🔄 Network error during session check, keeping user logged in');
          }
        }
      }
    };

    initializeAuth();
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

      const response = await axios.post('patients/', formattedPatient);
      
      // Ensure the response data has the correct structure
      const newPatient = {
        ...response.data,
        medical_info: response.data.medical_info || {
          bloodType: '',
          allergies: [],
          medicalHistory: ''
        }
      };

      setPatientsList(prev => [...prev, newPatient]);
      return newPatient;
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
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
      const response = await axios.get('patients/');
      setPatientsList(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }, []);

  return (
    <ClinicContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        forceLogout,
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