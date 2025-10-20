import { Patient } from '@/lib/mock-data';

/**
 * Constructs a full name from patient name parts
 * @param patient - Patient object with name fields
 * @returns Formatted full name string
 */
export const getPatientFullName = (patient: Patient): string => {
  if (patient.first_name || patient.last_name) {
    const nameParts = [];
    if (patient.first_name) nameParts.push(patient.first_name);
    if (patient.middle_initial) {
      const initial = patient.middle_initial.endsWith('.') ? patient.middle_initial : patient.middle_initial + '.';
      nameParts.push(initial);
    }
    if (patient.last_name) nameParts.push(patient.last_name);
    if (patient.suffix) nameParts.push(patient.suffix);
    return nameParts.join(' ');
  }
  return patient.name || 'Unknown Patient';
};

/**
 * Parses a full name string into name components
 * @param fullName - Full name string to parse
 * @returns Object with separated name components
 */
export const parseFullName = (fullName: string) => {
  const trimmedName = fullName.trim();
  if (!trimmedName) return { first_name: '', last_name: '', middle_initial: '', suffix: '' };

  const nameParts = trimmedName.split(' ');
  const suffixes = ['Jr.', 'Sr.', 'III', 'II', 'IV', 'Jr', 'Sr'];
  
  let first_name = '';
  let last_name = '';
  let middle_initial = '';
  let suffix = '';

  if (nameParts.length === 1) {
    first_name = nameParts[0];
  } else if (nameParts.length === 2) {
    first_name = nameParts[0];
    last_name = nameParts[1];
  } else {
    first_name = nameParts[0];
    
    // Check if last part is a suffix
    const lastPart = nameParts[nameParts.length - 1];
    if (suffixes.includes(lastPart)) {
      suffix = lastPart;
      last_name = nameParts[nameParts.length - 2];
      
      // If there are still parts left, they are middle names/initials
      if (nameParts.length > 3) {
        const middleParts = nameParts.slice(1, -2);
        middle_initial = middleParts[0]; // Take first middle name as initial
      }
    } else {
      last_name = lastPart;
      
      // Middle parts
      if (nameParts.length > 2) {
        const middleParts = nameParts.slice(1, -1);
        middle_initial = middleParts[0]; // Take first middle name as initial
      }
    }
  }

  return {
    first_name,
    last_name,
    middle_initial,
    suffix
  };
};

/**
 * Formats patient name for display with different styles
 * @param patient - Patient object
 * @param style - Display style: 'full' | 'first-last' | 'last-first' | 'initials'
 * @returns Formatted name string
 */
export const formatPatientName = (patient: Patient, style: 'full' | 'first-last' | 'last-first' | 'initials' = 'full'): string => {
  const first = patient.first_name || '';
  const last = patient.last_name || '';
  const middle = patient.middle_initial || '';
  const suffix = patient.suffix || '';

  switch (style) {
    case 'first-last':
      return `${first} ${last}`.trim();
    
    case 'last-first':
      return last && first ? `${last}, ${first}` : `${first}${last}`.trim();
    
    case 'initials':
      const firstInitial = first.charAt(0).toUpperCase();
      const lastInitial = last.charAt(0).toUpperCase();
      return `${firstInitial}${lastInitial}`;
    
    case 'full':
    default:
      return getPatientFullName(patient);
  }
};
