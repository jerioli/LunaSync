
export type User = {
  id: string;
  name: string;
  email: string;
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
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  address: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  medicalInfo?: {
    bloodType?: string;
    allergies?: string[];
    medicalHistory?: string;
  };
  medicalHistory?: string;
  registrationDate: string;
  image?: string;
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
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@clinic.com",
    role: "doctor",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    email: "michael.chen@clinic.com",
    role: "doctor",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    id: "3",
    name: "Emma Rodriguez",
    email: "emma.rodriguez@clinic.com",
    role: "receptionist",
    image: "https://randomuser.me/api/portraits/women/23.jpg",
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james.wilson@clinic.com",
    role: "admin",
    image: "https://randomuser.me/api/portraits/men/42.jpg",
  },
  {
    id: "5",
    name: "John Smith",
    email: "john.smith@example.com",
    role: "patient",
    image: "https://randomuser.me/api/portraits/men/22.jpg",
  },
];

// Mock Patients
export const patients: Patient[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "555-123-4567",
    dateOfBirth: "1985-06-15",
    gender: "male",
    address: "123 Main St, Anytown, AN 12345",
    maritalStatus: "married",
    medicalInfo: {
      bloodType: "O+",
      allergies: ["Penicillin", "Peanuts"],
      medicalHistory: "Hypertension, diagnosed in 2018",
    },
    registrationDate: "2020-03-10",
  },
  {
    id: "2",
    name: "Mary Johnson",
    email: "mary.johnson@example.com",
    phone: "555-987-6543",
    dateOfBirth: "1992-09-22",
    gender: "female",
    address: "456 Oak Ave, Somewhere, SW 67890",
    maritalStatus: "single",
    medicalInfo: {
      bloodType: "A-",
      allergies: ["Latex"],
      medicalHistory: "Asthma since childhood",
    },
    registrationDate: "2019-11-05",
  },{
    id: "3",
    name: "Robert Williams",
    email: "robert.williams@example.com",
    phone: "555-456-7890",
    dateOfBirth: "1978-01-30",
    gender: "male",
    address: "789 Pine Rd, Elsewhere, EL 10112",
    maritalStatus: "divorced",
    medicalInfo: {
      bloodType: "B+",
      allergies: [],
      medicalHistory: "Type 2 diabetes, diagnosed in 2015",
    },
    registrationDate: "2020-07-22",
  },
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

// Mock Inventory
export const inventory: Inventory[] = [
  {
    id: "1",
    name: "Disposable Face Masks",
    category: "PPE",
    quantity: 500,
    unit: "pieces",
    threshold: 100,
    lastRestocked: "2023-05-15",
  },
  {
    id: "2",
    name: "Nitrile Gloves (Medium)",
    category: "PPE",
    quantity: 200,
    unit: "pairs",
    threshold: 50,
    lastRestocked: "2023-05-20",
  },
  {
    id: "3",
    name: "Alcohol Swabs",
    category: "Medical Supplies",
    quantity: 300,
    unit: "packets",
    threshold: 75,
    lastRestocked: "2023-05-25",
  },
  {
    id: "4",
    name: "Syringes (10ml)",
    category: "Medical Supplies",
    quantity: 150,
    unit: "pieces",
    threshold: 30,
    lastRestocked: "2023-06-01",
  },
  {
    id: "5",
    name: "Blood Pressure Cuffs",
    category: "Equipment",
    quantity: 10,
    unit: "pieces",
    threshold: 3,
    lastRestocked: "2023-04-10",
  },
];

// Mock Payments
export const payments: Payment[] = [
  {
    id: "1",
    patientId: "1",
    appointmentId: "1",
    amount: 150.00,
    date: "2023-06-15",
    method: "insurance",
    status: "paid",
    reference: "INS12345",
  },
  {
    id: "2",
    patientId: "2",
    appointmentId: "2",
    amount: 75.00,
    date: "2023-06-15",
    method: "card",
    status: "paid",
    reference: "CARD6789",
  },
  {
    id: "3",
    patientId: "3",
    appointmentId: "3",
    amount: 200.00,
    date: "2023-06-15",
    method: "cash",
    status: "paid",
  },
  {
    id: "4",
    patientId: "4",
    appointmentId: "4",
    amount: 250.00,
    date: "2023-06-16",
    method: "insurance",
    status: "pending",
    reference: "INS24680",
  },
];
