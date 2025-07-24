// API service for medical documents
const API_BASE_URL = 'http://localhost:8000/api/medical-documents';

export interface LabTestResult {
  test_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  status?: 'normal' | 'abnormal' | 'critical';
}

export interface DocumentDetails {
  patientName?: string;
  patientId?: string;
  dateOfBirth?: string;
  age?: string;
  gender?: string;
  testDate?: string;
  reportDate?: string;
  laboratoryName?: string;
  doctorName?: string;
  authorizedBy?: string;
  collectionDate?: string;
  specimenType?: string;
  referringPhysician?: string;
  labAddress?: string;
  reportId?: string;
  urgency?: string;
  comments?: string;
  clinicalHistory?: string;
  allTestResults: LabTestResult[];
  rawSections: {
    header?: string;
    patientInfo?: string;
    testResults?: string;
    footer?: string;
    comments?: string;
  };
}

export interface LabResult {
  id: string;
  document: {
    id: string;
    title: string;
    description: string;
    status: string;
    urgency: string;
    document_date: string;
    created_at: string;
    updated_at: string;
    patient: string;
    created_by: string;
    authorized_by?: string;
    content: string;
    is_confidential: boolean;
  };
  test_name: string;
  test_category: string;
  specimen_type: string;
  laboratory_name: string;
  lab_reference_number: string;
  collection_date?: string;
  received_date?: string;
  reported_date?: string;
  test_results: LabTestResult[];
  critical_values: LabTestResult[];
  abnormal_values: LabTestResult[];
  interpretation: string;
  clinical_significance: string;
  recommendations: string;
  specimen_quality: string;
  processing_notes: string;
}

export interface CreateLabResultRequest {
  // Patient and staff
  patient: string;
  created_by?: string; // Made optional for testing
  authorized_by?: string;
  
  // Document fields
  title: string;
  description?: string;
  content?: string;
  document_date?: string;
  status?: string;
  urgency?: string;
  
  // Lab result specific fields
  test_name: string;
  test_category: string;
  specimen_type: string;
  laboratory_name?: string;
  lab_reference_number?: string;
  collection_date?: string;
  received_date?: string;
  reported_date?: string;
  test_results: LabTestResult[];
  critical_values?: LabTestResult[];
  abnormal_values?: LabTestResult[];
  interpretation?: string;
  clinical_significance?: string;
  recommendations?: string;
  specimen_quality?: string;
  processing_notes?: string;
}

class MedicalDocumentsAPI {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      console.error('API Error Details:', errorData); // Debug logging
      
      // Handle validation errors from Django REST Framework
      if (response.status === 400 && errorData) {
        const errorMessages = [];
        if (typeof errorData === 'object') {
          for (const [field, messages] of Object.entries(errorData)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            }
          }
        }
        const detailedError = errorMessages.length > 0 ? errorMessages.join('; ') : JSON.stringify(errorData);
        throw new Error(`Validation Error: ${detailedError}`);
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Lab Results API methods
  async getLabResults(params?: {
    patient_id?: string;
    test_category?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<LabResult[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    
    const url = `${API_BASE_URL}/lab-results/?${queryParams.toString()}`;
    return this.fetchWithAuth(url);
  }

  async getLabResultsByPatient(patientId: string): Promise<{
    patient: string;
    lab_results: LabResult[];
  }> {
    const url = `${API_BASE_URL}/lab-results/by_patient/?patient_id=${patientId}`;
    return this.fetchWithAuth(url);
  }

  async getCriticalLabResults(): Promise<LabResult[]> {
    const url = `${API_BASE_URL}/lab-results/critical_values/`;
    return this.fetchWithAuth(url);
  }

  async createLabResult(data: CreateLabResultRequest): Promise<LabResult> {
    const url = `${API_BASE_URL}/lab-results/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLabResult(id: string, data: Partial<CreateLabResultRequest>): Promise<LabResult> {
    const url = `${API_BASE_URL}/lab-results/${id}/`;
    return this.fetchWithAuth(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteLabResult(id: string): Promise<void> {
    const url = `${API_BASE_URL}/lab-results/${id}/`;
    await this.fetchWithAuth(url, {
      method: 'DELETE',
    });
  }

  async getLabResult(id: string): Promise<LabResult> {
    const url = `${API_BASE_URL}/lab-results/${id}/`;
    return this.fetchWithAuth(url);
  }

  // Medical Documents general API methods
  async getMedicalDocuments(params?: {
    patient_id?: string;
    document_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    
    const url = `${API_BASE_URL}/documents/?${queryParams.toString()}`;
    return this.fetchWithAuth(url);
  }

  async createMedicalDocument(data: any) {
    const url = `${API_BASE_URL}/documents/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMedicalDocument(id: string, data: any) {
    const url = `${API_BASE_URL}/documents/${id}/`;
    return this.fetchWithAuth(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async approveMedicalDocument(id: string) {
    const url = `${API_BASE_URL}/documents/${id}/approve/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
    });
  }

  async archiveMedicalDocument(id: string) {
    const url = `${API_BASE_URL}/documents/${id}/archive/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
    });
  }

  // SOAP Notes API methods
  async getSOAPNotes(patientId?: string) {
    const url = patientId 
      ? `${API_BASE_URL}/soap-notes/?patient_id=${patientId}`
      : `${API_BASE_URL}/soap-notes/`;
    return this.fetchWithAuth(url);
  }

  async createSOAPNote(data: {
    patient: string;
    created_by: string;
    authorized_by?: string;
    title: string;
    description?: string;
    document_date?: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    vital_signs?: any;
    chief_complaint?: string;
    history_present_illness?: string;
  }) {
    const url = `${API_BASE_URL}/soap-notes/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Prescriptions API methods
  async getPrescriptions(params?: {
    patient_id?: string;
    physician_id?: string;
    valid_only?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    
    const url = `${API_BASE_URL}/prescriptions/?${queryParams.toString()}`;
    return this.fetchWithAuth(url);
  }

  async createPrescription(data: {
    patient: string;
    created_by: string;
    prescribing_physician: string;
    title: string;
    description?: string;
    document_date?: string;
    prescription_number: string;
    medications: any[];
    general_instructions?: string;
    pharmacy_notes?: string;
    valid_until: string;
    refills_allowed?: number;
  }) {
    const url = `${API_BASE_URL}/prescriptions/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async dispensePrescription(id: string, dispensedBy: string) {
    const url = `${API_BASE_URL}/prescriptions/${id}/dispense/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify({ dispensed_by: dispensedBy }),
    });
  }

  // Clinical Notes API methods
  async getClinicalNotes(params?: {
    patient_id?: string;
    note_type?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    
    const url = `${API_BASE_URL}/clinical-notes/?${queryParams.toString()}`;
    return this.fetchWithAuth(url);
  }

  // Medical Certificates API methods
  async getMedicalCertificates(params?: {
    patient_id?: string;
    certificate_type?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    
    const url = `${API_BASE_URL}/medical-certificates/?${queryParams.toString()}`;
    return this.fetchWithAuth(url);
  }

  // Physical Examinations API methods
  async getPhysicalExaminations(patientId?: string) {
    const url = patientId 
      ? `${API_BASE_URL}/physical-examinations/?patient_id=${patientId}`
      : `${API_BASE_URL}/physical-examinations/`;
    return this.fetchWithAuth(url);
  }

  async createPhysicalExamination(data: {
    patient: string;
    created_by: string;
    authorized_by?: string;
    title: string;
    description?: string;
    document_date?: string;
    general_appearance?: any;
    vital_signs?: any;
    head_neck?: any;
    cardiovascular?: any;
    respiratory?: any;
    abdominal?: any;
    neurological?: any;
    musculoskeletal?: any;
    skin?: any;
    other_systems?: any;
    overall_impression?: string;
    abnormal_findings?: string;
    recommendations?: string;
  }) {
    const url = `${API_BASE_URL}/physical-examinations/`;
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const medicalDocumentsAPI = new MedicalDocumentsAPI();
