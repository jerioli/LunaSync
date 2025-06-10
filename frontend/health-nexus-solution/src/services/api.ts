import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance without token handling
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface PredefinedTimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export interface DoctorAvailability {
  id: number;
  doctor: number;
  doctor_name: string;
  date: string;
  is_available: boolean;
  max_appointments: number;
  time_slots: TimeSlot[];
}

export const api = {
  doctors: {
    getAll: async (): Promise<Doctor[]> => {
      const response = await axiosInstance.get('/doctors/');
      return response.data;
    },
  },
  appointments: {
    create: async (data: any) => {
      const response = await axiosInstance.post('/appointments/create/', data);
      return response.data;
    },
    list: async () => {
      const response = await axiosInstance.get('/appointments/list/');
      return response.data;
    },
  },
  availability: {
    getTimeSlots: async (doctorId: string, date: string) => {
      const response = await axiosInstance.get('/availability/', {
        params: { 
          doctor_id: doctorId,
          date: date
        }
      });
      return response.data;
    },
    getAvailableDates: async (doctorId: string) => {
      const response = await axiosInstance.get('/availability/available_dates/', {
        params: { doctor_id: doctorId }
      });
      return response.data;
    },
    create: async (data: { doctor_id: number; date: string }): Promise<DoctorAvailability> => {
      const response = await axiosInstance.post('/availability/', data);
      return response.data;
    },
    getPredefinedTimeSlots: async (): Promise<PredefinedTimeSlot[]> => {
      const response = await axiosInstance.get('/availability/predefined_slots/active_slots/');
      return response.data;
    },
    updateTimeSlot: async (availabilityId: number, timeSlotId: number, isBooked: boolean): Promise<TimeSlot> => {
      const response = await axiosInstance.patch(`/availability/${availabilityId}/update_time_slot/`, {
        time_slot_id: timeSlotId,
        is_booked: isBooked
      });
      return response.data;
    }
  },
  auth: {
    login: async (email: string, password: string) => {
      const response = await axios.post(`${API_BASE_URL}/login/`, {
        email: email,
        password: password
      });
      return response.data;
    }
  },
  patients: {
    getAll: async () => {
      const response = await axiosInstance.get('/patients/patients/');
      return response.data;
    }
  },
}; 