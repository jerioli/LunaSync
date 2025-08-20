import axios from 'axios';

// Use direct URL to ensure session cookies are handled properly
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Create axios instance with credentials for session authentication
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include session ID for development
axiosInstance.interceptors.request.use(
  (config) => {
    // Get session ID from localStorage (stored during login)
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
  can_manage_permissions?: boolean;
  can_access_integrations?: boolean;
  can_view_audit_logs?: boolean;
  can_view_usage_reports?: boolean;
  can_access_security_testing?: boolean;
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
  can_manage_permissions?: boolean;
  can_access_integrations?: boolean;
  can_view_audit_logs?: boolean;
  can_view_usage_reports?: boolean;
  can_access_security_testing?: boolean;
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
  can_manage_permissions?: boolean;
  can_access_integrations?: boolean;
  can_view_audit_logs?: boolean;
  can_view_usage_reports?: boolean;
  can_access_security_testing?: boolean;
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
  can_manage_permissions?: boolean;
  can_access_integrations?: boolean;
  can_view_audit_logs?: boolean;
  can_view_usage_reports?: boolean;
  can_access_security_testing?: boolean;
  image?: string;
}

export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender?: string;
  address?: string;
  marital_status?: string;
  medical_info?: any;
  physical_examination?: any;
  registration_date: string;
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
    delete: async (id: number): Promise<void> => {
      await axiosInstance.delete(`/staff/${id}/`);
    }
  },
  receptionists: {
    getAll: async (): Promise<Receptionist[]> => {
      const response = await axiosInstance.get('/receptionists/');
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await axiosInstance.delete(`/staff/${id}/`);
    }
  },
  admins: {
    getAll: async (): Promise<Admin[]> => {
      const response = await axiosInstance.get('/admins/');
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await axiosInstance.delete(`/staff/${id}/`);
    }
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
          can_manage_permissions: permissions.can_manage_permissions,
          can_access_integrations: permissions.can_access_integrations,
          can_view_audit_logs: permissions.can_view_audit_logs,
          can_view_usage_reports: permissions.can_view_usage_reports,
          can_access_security_testing: permissions.can_access_security_testing,
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
      const response = await axiosInstance.post('/login/', {
        email: email,
        password: password
      });
      return response.data;
    },
    getCurrentUser: async () => {
      const response = await axiosInstance.get('/auth/current-user/');
      return response.data;
    }
  },
  patients: {
    getAll: async () => {
      const response = await axiosInstance.get('/patients/patients/');
      return response.data;
    },
    checkByEmail: async (email: string) => {
      const response = await axiosInstance.get(`/patients/check-email/?email=${encodeURIComponent(email)}`);
      return response.data;
    }
  },
  permissions: {
    getAll: async () => {
      const response = await axiosInstance.get('/permissions/');
      return response.data;
    },
    getUser: async (userId: number) => {
      const response = await axiosInstance.get(`/permissions/${userId}/`);
      return response.data;
    },
    update: async (userId: number, permissions: any) => {
      const response = await axiosInstance.patch(`/permissions/${userId}/`, { permissions });
      return response.data;
    }
  },
  auditLogs: {
    getAll: async () => {
      const response = await axiosInstance.get('/audit-logs/');
      return response.data;
    }
  },
  usageReports: {
    get: async () => {
      const response = await axiosInstance.get('/usage-reports/');
      return response.data;
    }
  },
  integrations: {
    getAll: async () => {
      const response = await axiosInstance.get('/integrations/');
      return response.data;
    },
    create: async (data: any) => {
      const response = await axiosInstance.post('/integrations/', data);
      return response.data;
    },
    update: async (integrationId: number, data: any) => {
      const response = await axiosInstance.patch(`/integrations/${integrationId}/`, data);
      return response.data;
    }
  },
  securityTesting: {
    getAll: async () => {
      const response = await axiosInstance.get('/security-testing/');
      return response.data;
    },
    runTest: async (testType: string) => {
      const response = await axiosInstance.post('/security-testing/', { test_type: testType });
      return response.data;
    }
  }
};

// Export the configured axios instance for direct use
export { axiosInstance };

