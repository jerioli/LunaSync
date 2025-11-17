import axios from 'axios';
import { ENV } from '../config/env';

// Use environment-aware API URL
const API_BASE_URL = ENV.API_URL;

// Create axios instance with credentials for session authentication
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: ENV.IS_PRODUCTION ? 30000 : 10000, // 30s timeout in production, 10s in dev
});

// Add request interceptor to include session ID for development
axiosInstance.interceptors.request.use(
  (config) => {
    // Get session ID from localStorage (stored during login)
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    
    // Add environment info for debugging
    if (ENV.IS_DEVELOPMENT) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (ENV.IS_DEVELOPMENT) {
      console.error('API Error:', error.response?.status, error.response?.data);
    }
    
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - session expired or invalid
      console.warn('🔒 Session expired or unauthorized');
      
      // Clear session data
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      
      // Show session expired modal
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // Create and show session expired modal
        showSessionExpiredModal();
      }
    }
    
    return Promise.reject(error);
  }
);

// Function to show session expired modal
function showSessionExpiredModal() {
  // Remove any existing modal
  const existingModal = document.getElementById('session-expired-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'session-expired-modal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    backdrop-filter: blur(4px);
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  `;

  modalContent.innerHTML = `
    <style>
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
    <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
    <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
      Session Expired
    </h2>
    <p style="font-size: 16px; color: #6b7280; margin-bottom: 24px; line-height: 1.5;">
      Your session has timed out for security reasons. Please log in again to continue.
    </p>
    <button id="session-expired-btn" style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 16px;
      font-weight: 600;
      padding: 12px 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.5)';" 
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';">
      Go to Login
    </button>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Add click handler to button
  const button = document.getElementById('session-expired-btn');
  if (button) {
    button.addEventListener('click', () => {
      modalOverlay.remove();
      window.location.href = '/login';
    });
  }

  // Auto-redirect after 5 seconds
  setTimeout(() => {
    if (document.getElementById('session-expired-modal')) {
      modalOverlay.remove();
      window.location.href = '/login';
    }
  }, 5000);
}

export interface Doctor {
  image: string;
  id: number;
  first_name: string;
  last_name: string;
  middle_initial?: string | null;
  suffix?: string | null;
  email?: string | null;
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
  middle_initial?: string | null;
  suffix?: string | null;
  email?: string | null;
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
  middle_initial?: string | null;
  suffix?: string | null;
  email?: string | null;
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
  middle_initial?: string | null;
  suffix?: string | null;
  email?: string | null;
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
  patient_id?: string; // Unique Patient ID for returning patients
  name: string; // Keep for backward compatibility
  fullName?: string; // Computed full name from decrypted components
  first_name?: string;
  last_name?: string;
  middle_initial?: string;
  suffix?: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth: string;
  gender?: string;
  address?: string;
  religion?: string; // Added missing religion field
  marital_status?: string;
  medical_info?: any;
  physical_examination?: any;
  registrationDate: string; // Frontend uses camelCase
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
    }
  },
  receptionists: {
    getAll: async (): Promise<Receptionist[]> => {
      const response = await axiosInstance.get('/receptionists/');
      return response.data;
    }
  },
  admins: {
    getAll: async (): Promise<Admin[]> => {
      const response = await axiosInstance.get('/admins/');
      return response.data;
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
    },
    checkByPatientId: async (patientId: string) => {
      const response = await axiosInstance.get(`/patients/check-patient-id/?patient_id=${encodeURIComponent(patientId)}`);
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

