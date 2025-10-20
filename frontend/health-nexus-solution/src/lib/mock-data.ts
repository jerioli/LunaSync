
export type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: 'doctor' | 'receptionist' | 'admin' | 'patient' | 'superadmin';
  image?: string;
  phone?: string;
  speciality?: string;
  force_password_change?: boolean;
  // Superadmin permissions
  can_manage_permissions?: boolean;
  can_access_integrations?: boolean;
  can_view_audit_logs?: boolean;
  can_view_usage_reports?: boolean;
  can_access_security_testing?: boolean;
  // Other permissions
  can_manage_staff?: boolean;
  can_manage_appointments?: boolean;
  can_manage_patients?: boolean;
  can_view_reports?: boolean;
  can_manage_clinic_settings?: boolean;
  can_manage_inventory?: boolean;
};

export type Patient = {
  
  id: string;
  name: string; // Keep for backward compatibility
  first_name?: string;
  last_name?: string;
  middle_initial?: string;
  suffix?: string;
  email: string;
  phone: string;
  date_of_birth?: string; // Use camelCase for frontend
  gender: 'male' | 'female' | 'other';
  address: string;
  religion?: string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed'; // Use camelCase for frontend
  medical_info?: {
      bloodType?: string;
  allergies?: string[];
  medicalHistory?: string;
  chiefComplaint?: string;
  illnesses?: string;
  surgeries?: string;
  medications?: string;
  familyHistory?: string;
  socialHistory?: string;
  };
  physical_examination?: {
    height?: string;
    weight?: string;
    bloodPressure?: string;
    temperature?: string;
    pulseRate?: string;
    respiratoryRate?: string;
    notes?: string;
  };
  registrationDate: string;
};

// Type for creating new patients (excludes auto-generated fields)
export type NewPatient = Omit<Patient, 'id' | 'registrationDate'>;

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'pending';
  type: string;
  notes?: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  instructions?: string;
};

export type LabResult = {
  id: string;
  patientId: string;
  patientName?: string; // Patient name from API
  date: string;
  type: string;
  resultUrl: string | null;
  notes?: string;
  authorizedBy?: string;
  structuredData?: Array<{
    test_name: string;
    result_value: string;
    unit: string;
    reference_range: string;
    status?: 'normal' | 'abnormal' | 'critical';
  }>;
  summary?: {
    totalTests: number;
    criticalCount: number;
    abnormalCount: number;
    normalCount: number;
  };
};

export type Inventory = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number;
  lastRestocked: string;
};

export type Payment = {
  id: string;
  patientId: string;
  appointmentId: string;
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'insurance' | 'other';
  status: 'paid' | 'pending' | 'cancelled';
  reference?: string;
};

// Mock Users
export const users: User[] = [
];

// Mock Patients
export const patients: Patient[] = [
];

// Mock Appointments
export const appointments: Appointment[] = [
  {
    id: "1",
    patientId: "1",
    doctorId: "1",
    date: "2023-06-15",
    time: "09:00",
    status: "completed",
    type: "Regular Checkup",
    notes: "Patient reported feeling better after medication.",
  },
  {
    id: "2",
    patientId: "2",
    doctorId: "1",
    date: "2023-06-15",
    time: "10:30",
    status: "completed",
    type: "Follow-up",
    notes: "Asthma symptoms have improved.",
  },
  {
    id: "3",
    patientId: "3",
    doctorId: "2",
    date: "2023-06-15",
    time: "14:00",
    status: "completed",
    type: "Diabetes Management",
    notes: "Blood sugar levels are stable.",
  },
  {
    id: "4",
    patientId: "4",
    doctorId: "2",
    date: "2023-06-16",
    time: "11:00",
    status: "scheduled",
    type: "Annual Physical",
  },
  {
    id: "5",
    patientId: "5",
    doctorId: "1",
    date: "2023-06-16",
    time: "15:30",
    status: "scheduled",
    type: "Cardiology Followup",
  },
  {
    id: "6",
    patientId: "1",
    doctorId: "1",
    date: "2023-06-20",
    time: "09:00",
    status: "scheduled",
    type: "Prescription Renewal",
  },
];

// Mock Prescriptions
export const prescriptions: Prescription[] = [
  {
    id: "1",
    patientId: "1",
    doctorId: "1",
    date: "2023-06-15",
    medications: [
      {
        name: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "30 days",
      },
      {
        name: "Aspirin",
        dosage: "81mg",
        frequency: "Once daily",
        duration: "30 days",
      },
    ],
    instructions: "Take with food in the morning.",
  },
  {
    id: "2",
    patientId: "2",
    doctorId: "1",
    date: "2023-06-15",
    medications: [
      {
        name: "Albuterol",
        dosage: "90mcg",
        frequency: "As needed",
        duration: "30 days",
      },
    ],
    instructions: "Use inhaler when experiencing shortness of breath.",
  },
  {
    id: "3",
    patientId: "3",
    doctorId: "2",
    date: "2023-06-15",
    medications: [
      {
        name: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily",
        duration: "90 days",
      },
    ],
    instructions: "Take with meals.",
  },
];

// Mock Lab Results
export const labResults: LabResult[] = [];
