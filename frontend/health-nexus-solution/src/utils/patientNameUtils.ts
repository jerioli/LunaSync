/**
 * Utility functions for formatting patient names consistently across the application
 */

// Type for patient data that might have different structures
export interface PatientNameData {
  id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  middle_initial?: string;
  suffix?: string;
  fullName?: string;
  patient_name?: string;
  display_patient_name?: string;
  is_deleted?: boolean;
}

/**
 * Checks if a patient is soft-deleted
 */
export const isPatientSoftDeleted = (patient: any): boolean => {
  // Check if the patient object has the is_deleted field and it's true
  return Boolean(patient?.is_deleted);
};

/**
 * Finds a patient by ID from a list of patients and checks if they're soft-deleted
 */
export const isPatientSoftDeletedById = (patientId: any, patients: any[]): boolean => {
  if (!patientId || !Array.isArray(patients)) {
    return false;
  }

  // Find the patient in the list
  const patient = patients.find(p => 
    String(p.id) === String(patientId) || 
    p.id === patientId
  );

  return isPatientSoftDeleted(patient);
};

/**
 * Gets patient from appointment and checks if they're soft-deleted
 */
export const isAppointmentPatientSoftDeleted = (appointment: any, patients: any[]): boolean => {
  // If appointment has a patient object directly
  if (appointment?.patient && typeof appointment.patient === 'object') {
    return isPatientSoftDeleted(appointment.patient);
  }

  // If appointment has a patient ID, find the patient in the list
  if (appointment?.patientId) {
    return isPatientSoftDeletedById(appointment.patientId, patients);
  }

  // If appointment has a patient field that's an ID
  if (appointment?.patient && (typeof appointment.patient === 'string' || typeof appointment.patient === 'number')) {
    return isPatientSoftDeletedById(appointment.patient, patients);
  }

  return false;
};

/**
 * Formats a patient name with only the middle initial (first letter + dot)
 * instead of the full middle name
 */
export const formatPatientNameWithInitial = (patient: PatientNameData): string => {
  // If we have separate name components, use them
  if (patient.first_name || patient.last_name) {
    const nameParts: string[] = [];
    
    if (patient.first_name) {
      nameParts.push(patient.first_name);
    }
    
    if (patient.middle_initial) {
      // Extract only the first letter of middle name/initial and add a dot
      const initial = patient.middle_initial.charAt(0).toUpperCase() + '.';
      nameParts.push(initial);
    }
    
    if (patient.last_name) {
      nameParts.push(patient.last_name);
    }
    
    if (patient.suffix) {
      nameParts.push(patient.suffix);
    }
    
    return nameParts.join(' ');
  }
  
  // Fallback to existing name fields
  return patient.fullName || patient.name || patient.patient_name || patient.display_patient_name || 'Unknown Patient';
};

/**
 * Formats a patient name with the full middle name (for detailed views like patient records)
 */
export const formatPatientNameWithFullMiddle = (patient: PatientNameData): string => {
  // If we have separate name components, use them
  if (patient.first_name || patient.last_name) {
    const nameParts: string[] = [];
    
    if (patient.first_name) {
      nameParts.push(patient.first_name);
    }
    
    if (patient.middle_initial) {
      // Use the full middle name/initial as stored
      nameParts.push(patient.middle_initial);
    }
    
    if (patient.last_name) {
      nameParts.push(patient.last_name);
    }
    
    if (patient.suffix) {
      nameParts.push(patient.suffix);
    }
    
    return nameParts.join(' ');
  }
  
  // Fallback to existing name fields
  return patient.fullName || patient.name || patient.patient_name || patient.display_patient_name || 'Unknown Patient';
};

/**
 * Gets the first initial for avatar display
 */
export const getPatientInitial = (patient: PatientNameData): string => {
  const formattedName = formatPatientNameWithInitial(patient);
  return formattedName.charAt(0).toUpperCase();
};

/**
 * Formats patient name for display in appointment lists and other components
 * This handles various appointment data structures
 * @param patientId - Patient ID or object
 * @param appointment - Appointment object
 * @param useFullMiddleName - Whether to show full middle name (default: false, shows initial only)
 */
export const getPatientNameFromAppointment = (patientId: any, appointment: any, useFullMiddleName: boolean = false): string => {
  const nameFormatter = useFullMiddleName ? formatPatientNameWithFullMiddle : formatPatientNameWithInitial;
  
  // First check for patient_name field (from API response)
  if (appointment?.patient_name && 
      appointment.patient_name !== 'N/A' && 
      appointment.patient_name.trim() !== '') {
    return appointment.patient_name;
  }
  
  // For confirmed appointments, use display_patient_name if available
  if (appointment?.display_patient_name && 
      appointment.display_patient_name !== 'N/A' && 
      appointment.display_patient_name.trim() !== '') {
    return appointment.display_patient_name;
  }
  
  // For pending appointments, try to get name from notes
  if (appointment?.notes && appointment.status === 'pending') {
    const notes = appointment.notes;
    if (notes.includes('Patient Details (Pending):')) {
      try {
        const patientDetails = JSON.parse(notes.split('Patient Details (Pending):')[1].trim());
        
        // Use the appropriate name formatter based on the parameter
        const formattedName = nameFormatter(patientDetails);
        if (formattedName !== 'Unknown Patient') {
          return formattedName;
        }
        
        // Fallback to the name field if available
        if (patientDetails.name && patientDetails.name.trim()) {
          return patientDetails.name;
        }
      } catch (error) {
        console.error('Error parsing patient details:', error);
      }
    }
  }
  
  // If patientId is an object with name components, format it
  if (typeof patientId === 'object' && patientId !== null) {
    if (patientId.first_name || patientId.last_name || patientId.name) {
      return nameFormatter(patientId);
    }
  }
  
  // If patientId is a string, use it
  if (typeof patientId === 'string' && patientId.trim() !== '') {
    return patientId;
  }
  
  return 'Unknown Patient';
};