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
  image: string;
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  can_manage_appointments?: boolean;
  can_manage_patients?: boolean;
  can_manage_staff?: boolean;
  can_view_reports?: boolean;
  can_manage_clinic_settings?: boolean;
}

export interface Receptionist {
  image: string;
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  can_manage_appointments?: boolean;
  can_manage_patients?: boolean;
  can_manage_staff?: boolean;
  can_view_reports?: boolean;
  can_manage_clinic_settings?: boolean;
}

export interface Admin {
  image: string;
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  can_manage_appointments?: boolean;
  can_manage_patients?: boolean;
  can_manage_staff?: boolean;
  can_view_reports?: boolean;
  can_manage_clinic_settings?: boolean;
}

export interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  username: string;
  role: string;
  is_active: boolean;
  can_manage_appointments: boolean;
  can_manage_patients: boolean;
  can_manage_staff: boolean;
  can_view_reports: boolean;
  can_manage_clinic_settings: boolean;
  image?: string;
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
  receptionists: {
    getAll: async (): Promise<Receptionist[]> => {
      const response = await axiosInstance.get('/receptionists/');
      return response.data;
    },
  },
  admins: {
    getAll: async (): Promise<Admin[]> => {
      const response = await axiosInstance.get('/admins/');
      return response.data;
    },
  },
  staff: {
    getDetails: async (userId: number): Promise<StaffMember> => {
      const response = await axiosInstance.get(`/staff/${userId}/`);
      return response.data;
    },
    update: async (userId: number, data: Partial<StaffMember>): Promise<StaffMember> => {
      const response = await axiosInstance.patch(`/staff/${userId}/`, data);
      return response.data.data;
    },
    updatePermissions: async (userId: number, permissions: Partial<StaffMember>): Promise<StaffMember> => {
      const response = await axiosInstance.patch(`/staff/${userId}/permissions/`, {
        permissions: {
          can_manage_appointments: permissions.can_manage_appointments,
          can_manage_patients: permissions.can_manage_patients,
          can_manage_staff: permissions.can_manage_staff,
          can_view_reports: permissions.can_view_reports,
          can_manage_clinic_settings: permissions.can_manage_clinic_settings,
        }
      });
      return response.data.data;
    },
    delete: async (userId: number): Promise<void> => {
      await axiosInstance.delete(`/staff/${userId}/`);
    }
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
          date: date,
          _t: Date.now() // Cache busting parameter
        }
      });
      return response.data;
    },
    getAvailableDates: async (doctorId: string) => {
      const response = await axiosInstance.get('/availability/available_dates/', {
        params: { 
          doctor_id: doctorId,
          _t: Date.now() // Cache busting parameter
        }
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