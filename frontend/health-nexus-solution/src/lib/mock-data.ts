
export type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'doctor' | 'receptionist' | 'admin' | 'patient';
  image?: string;
  phone?: string;
  speciality?: string;
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth?: string; // Use camelCase for frontend
  gender: 'male' | 'female' | 'other';
  address: string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed'; // Use camelCase for frontend
  medical_info?: {
    bloodType?: string;
    allergies?: string[];
    medicalHistory?: string;
  };
  registrationDate: string;
};

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
  date: string;
  type: string;
  resultUrl: string;
  notes?: string;
  authorizedBy?: string;
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
export const labResults: LabResult[] = [
  {
    id: "1",
    patientId: "1",
    date: "2023-06-01",
    type: "Blood Test",
    resultUrl: "/placeholder.svg",
    notes: "Cholesterol slightly elevated.",
    authorizedBy: "Dr. Sarah Johnson"
  },
  {
    id: "2",
    patientId: "2",
    date: "2023-05-20",
    type: "Lung Function Test",
    resultUrl: "/placeholder.svg",
    notes: "Lung function improved since last visit.",
    authorizedBy: "Dr. Michael Chen"
  },
  {
    id: "3",
    patientId: "3",
    date: "2023-06-05",
    type: "HbA1c Test",
    resultUrl: "/placeholder.svg",
    notes: "HbA1c levels within target range.",
    authorizedBy: "Dr. Sarah Johnson"
  },
];
