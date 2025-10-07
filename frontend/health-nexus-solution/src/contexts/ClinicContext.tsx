import { defaultClinicCustomization } from "@/constants/clinicDefaults";
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
  users,
} from "@/lib/mock-data";
import { axiosInstance } from "@/services/api";
import { medicalDocumentsAPI } from "@/services/medicalDocumentsAPI";
import { ClinicContextType, ClinicCustomization } from "@/types/clinic";
import { parseApiError } from "@/utils/errorHandler";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Remove the base URL setting since we're using proxy
// axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

export const ClinicContext = createContext<ClinicContextType | undefined>(
  undefined
);
// Add the useClinic hook
export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
};
export const ClinicProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [appointmentsList, setAppointmentsList] =
    useState<Appointment[]>(appointments);
  const [prescriptionsList, setPrescriptionsList] =
    useState<Prescription[]>(prescriptions);
  const [labResultsList, setLabResultsList] = useState<LabResult[]>(labResults);
  const [clinicCustomization, setClinicCustomization] =
    useState<ClinicCustomization>(defaultClinicCustomization);
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

  // Function to refresh user data from backend
  const refreshUserData = async () => {
    try {
      console.log("[DEBUG] ClinicContext - Refreshing user data...");
      const userResponse = await fetch("/api/auth/current-user/", {
        credentials: "include",
      });
      const userData = await userResponse.json();
      console.log(
        "[DEBUG] ClinicContext - Fresh user data from backend:",
        userData
      );

      if (userData.success) {
        const updatedUser = {
          id: String(userData.user.id),
          name: userData.user.name,
          username: userData.user.username,
          email: userData.user.email,
          role: userData.user.role,
          force_password_change: userData.user.force_password_change,
          can_manage_appointments: userData.user.can_manage_appointments,
          can_manage_patients: userData.user.can_manage_patients,
          can_manage_staff: userData.user.can_manage_staff,
          can_view_reports: userData.user.can_view_reports,
          can_manage_clinic_settings: userData.user.can_manage_clinic_settings,
          can_manage_permissions: userData.user.can_manage_permissions,
          can_access_integrations: userData.user.can_access_integrations,
          can_view_audit_logs: userData.user.can_view_audit_logs,
          can_view_usage_reports: userData.user.can_view_usage_reports,
          can_access_security_testing:
            userData.user.can_access_security_testing,
          can_manage_inventory: userData.user.can_manage_inventory,
        };

        console.log(
          "[DEBUG] ClinicContext - Updated user with fresh data:",
          updatedUser
        );
        console.log(
          "[DEBUG] ClinicContext - can_manage_inventory from backend:",
          userData.user.can_manage_inventory
        );
        console.log(
          "[DEBUG] ClinicContext - can_manage_staff from backend:",
          userData.user.can_manage_staff
        );
        console.log("[DEBUG] ClinicContext - All permissions from backend:", {
          can_manage_appointments: userData.user.can_manage_appointments,
          can_manage_patients: userData.user.can_manage_patients,
          can_manage_staff: userData.user.can_manage_staff,
          can_manage_inventory: userData.user.can_manage_inventory,
          can_manage_clinic_settings: userData.user.can_manage_clinic_settings,
        });
        setCurrentUserState(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      }
    } catch (error) {
      console.log("Unable to refresh user data:", error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log(
            "[DEBUG] ClinicContext - Loaded user from localStorage:",
            user
          );
          console.log(
            "[DEBUG] ClinicContext - can_manage_inventory from localStorage:",
            user.can_manage_inventory
          );

          // Automatically refresh user data to get complete permissions
          try {
            console.log("[DEBUG] ClinicContext - Auto-refreshing user data...");
            const userResponse = await fetch("/api/auth/current-user/", {
              credentials: "include",
            });
            const userData = await userResponse.json();
            console.log(
              "[DEBUG] ClinicContext - Fresh user data from backend:",
              userData
            );

            if (userData.success) {
              const updatedUser = {
                id: String(userData.user.id),
                name: userData.user.name,
                username: userData.user.username,
                email: userData.user.email,
                role: userData.user.role,
                force_password_change: userData.user.force_password_change,
                can_manage_appointments: userData.user.can_manage_appointments,
                can_manage_patients: userData.user.can_manage_patients,
                can_manage_staff: userData.user.can_manage_staff,
                can_view_reports: userData.user.can_view_reports,
                can_manage_clinic_settings:
                  userData.user.can_manage_clinic_settings,
                can_manage_permissions: userData.user.can_manage_permissions,
                can_access_integrations: userData.user.can_access_integrations,
                can_view_audit_logs: userData.user.can_view_audit_logs,
                can_view_usage_reports: userData.user.can_view_usage_reports,
                can_access_security_testing:
                  userData.user.can_access_security_testing,
                can_manage_inventory: userData.user.can_manage_inventory,
              };

              console.log(
                "[DEBUG] ClinicContext - Updated user with fresh data:",
                updatedUser
              );
              console.log(
                "[DEBUG] ClinicContext - can_manage_inventory from backend:",
                userData.user.can_manage_inventory
              );
              console.log(
                "[DEBUG] ClinicContext - can_manage_staff from backend:",
                userData.user.can_manage_staff
              );
              console.log(
                "[DEBUG] ClinicContext - All permissions from backend:",
                {
                  can_manage_appointments:
                    userData.user.can_manage_appointments,
                  can_manage_patients: userData.user.can_manage_patients,
                  can_manage_staff: userData.user.can_manage_staff,
                  can_manage_inventory: userData.user.can_manage_inventory,
                  can_manage_clinic_settings:
                    userData.user.can_manage_clinic_settings,
                }
              );
              setCurrentUserState(updatedUser);
              localStorage.setItem("user", JSON.stringify(updatedUser));
            } else {
              // If backend refresh fails but we have cached data, use it
              console.log(
                "[DEBUG] ClinicContext - Backend refresh failed, using cached data"
              );
              setCurrentUserState(user);
            }
          } catch (error) {
            console.log(
              "Unable to refresh user data, using cached data:",
              error
            );
            // Continue with cached user data if refresh fails
            setCurrentUserState(user);
          }
        }
      } catch (error) {
        console.error("Error loading stored user:", error);
        localStorage.removeItem("user");
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Watch for localStorage changes to auto-refresh when user logs in
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === "user" && e.newValue) {
        console.log(
          "[DEBUG] ClinicContext - Detected login, auto-refreshing..."
        );
        // Small delay to ensure backend session is ready
        setTimeout(async () => {
          try {
            await refreshUserData();
          } catch (error) {
            console.log("Auto-refresh failed:", error);
          }
        }, 100);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const addPatient = async (patient: NewPatient) => {
    try {
      // Format the patient data to match backend expectations
      const formattedPatient = {
        ...patient,
        medical_info: patient.medical_info || {
          bloodType: "",
          allergies: [],
          medicalHistory: "",
        },
      };

      const response = await axiosInstance.post("patients/", formattedPatient);

      // Ensure the response data has the correct structure and map field names
      const newPatient = {
        ...response.data,
        // Map backend snake_case to frontend camelCase
        registrationDate: response.data.registration_date,
        medical_info: response.data.medical_info || {
          bloodType: "",
          allergies: [],
          medicalHistory: "",
        },
      };

      setPatientsList((prev) => [...prev, newPatient]);
      return newPatient;
    } catch (error: any) {
      console.error("Error adding patient:", error);

      // Use the error handler utility to parse the error
      const parsedError = parseApiError(
        error,
        "Failed to add patient. Please try again."
      );

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
    const existingPatientIndex = patientsList.findIndex(
      (patient) => patient.id === id
    );

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
    setPatientsList((prevPatients) =>
      prevPatients.filter((patient) => patient.id !== id)
    );
  };

  // New function to update clinic customization
  const updateClinicCustomization = (data: Partial<ClinicCustomization>) => {
    setClinicCustomization({
      ...clinicCustomization,
      ...data,
    });
  };

  const updateInventory = (id: string, updatedData: Partial<Inventory>) => {
    setInventory(
      inventory.map((item) =>
        item.id === id ? { ...item, ...updatedData } : item
      )
    );
  };

  const addPayment = (payment: Payment) => {
    setPayments([...payments, payment]);
  };

  const updatePayment = (id: string, data: Partial<Payment>) => {
    setPayments(
      payments.map((payment) =>
        payment.id === id ? { ...payment, ...data } : payment
      )
    );
  }; // Fetch patients from backend
  const fetchPatients = useCallback(async () => {
    try {
      const response = await axiosInstance.get("patients/");

      // Map backend snake_case fields to frontend camelCase
      const mappedPatients = response.data.map((patient: any) => ({
        ...patient,
        id: String(patient.id), // Ensure string conversion for consistency
        registrationDate: patient.registration_date,
      }));

      console.log(
        "Fetched patients for lab results:",
        mappedPatients.map((p) => ({
          id: p.id,
          name: p.name,
          idType: typeof p.id,
        }))
      );

      setPatientsList(mappedPatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  }, []);

  // Fetch lab results from backend - using same approach as PatientManagement
  const fetchLabResults = useCallback(
    async (params?: {
      patient_id?: string;
      test_category?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      try {
        console.log("Fetching lab results with params:", params);

        let apiResults: any[] = [];

        // If we have a patient_id, use the same method as PatientManagement
        if (params?.patient_id) {
          const response = await medicalDocumentsAPI.getLabResultsByPatient(
            params.patient_id
          );
          console.log("Patient lab results response:", response);
          apiResults = response.lab_results || [];
        } else {
          // Otherwise, fetch all lab results using the general endpoint
          apiResults = await medicalDocumentsAPI.getLabResults(params);
          console.log("All lab results response:", apiResults);
        }

        // Transform API response to match frontend LabResult interface
        const transformedResults: LabResult[] = apiResults.map(
          (result: any) => {
            // Use patient_name directly from API response instead of doing lookups
            const patientName = result.patient_name || "Unknown Patient";
            const patientId =
              result.document?.patient ||
              result.patient ||
              result.patient_id ||
              null;

            console.log("Transforming lab result - using API patient_name:", {
              resultId: result.id,
              patientName: patientName,
              hasPatientName: !!result.patient_name,
              patientId: patientId,
              testName: result.test_name,
              documentDate: result.document?.document_date,
            });

            return {
              id: result.id,
              patientId: patientId ? String(patientId) : null,
              patientName: patientName, // Use the patient_name from API serializer
              date:
                result.document?.document_date ||
                result.reported_date ||
                result.document?.created_at ||
                new Date().toISOString(),
              type: result.test_name || result.test_category || "Lab Test",
              resultUrl:
                result.pdf_url ||
                result.file_url ||
                result.processed_file_url ||
                result.original_file_url ||
                null, // Use PDF URLs from API
              notes: result.interpretation || result.processing_notes,
              authorizedBy: result.document?.authorized_by,
              structuredData: result.test_results || [],
              summary: {
                totalTests: (result.test_results || []).length,
                criticalCount: (result.critical_values || []).length,
                abnormalCount: (result.abnormal_values || []).length,
                normalCount: Math.max(
                  0,
                  (result.test_results || []).length -
                    (result.critical_values || []).length -
                    (result.abnormal_values || []).length
                ),
              },
            };
          }
        );

        setLabResultsList(transformedResults);
        return transformedResults;
      } catch (error) {
        console.error("Error fetching lab results:", error);
        // Return empty array on error but don't clear existing results
        return [];
      }
    },
    []
  );

  return (
    <ClinicContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthLoading,
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
        fetchLabResults,
        refreshUserData,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};
