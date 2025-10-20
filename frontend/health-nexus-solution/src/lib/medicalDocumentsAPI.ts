import { axiosInstance } from '@/services/api';

export interface CreateMedicalCertificateData {
  patient: number;
  title: string;
  description?: string;
  certificate_type: string;
  purpose: string;
  medical_opinion: string;
  valid_from: string;
  valid_until?: string;
  restrictions?: string;
  examination_findings?: string;
  document_date?: string;
  status?: string;
}

export interface CreatePhysicalExaminationData {
  patient: number;
  title: string;
  description?: string;
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
  document_date?: string;
  status?: string;
}

export interface CreatePrescriptionData {
  patient: number;
  title: string;
  description?: string;
  prescription_number: string;
  medications: any[];
  general_instructions?: string;
  pharmacy_notes?: string;
  valid_until: string;
  refills_allowed?: number;
  refills_remaining?: number;
  document_date?: string;
  status?: string;
}

export interface CreateSOAPNoteData {
  patient: number;
  title: string;
  description?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vital_signs?: any;
  chief_complaint?: string;
  history_present_illness?: string;
  document_date?: string;
  status?: string;
}

export interface CreateClinicalNoteData {
  patient: number;
  title: string;
  description?: string;
  note_type: string;
  clinical_context?: string;
  findings?: string;
  recommendations?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  document_date?: string;
  status?: string;
}

class MedicalDocumentsAPI {
  private baseURL = '/medical-documents';

  // Medical Certificates
  async createMedicalCertificate(data: CreateMedicalCertificateData) {
    const response = await axiosInstance.post(`${this.baseURL}/medical-certificates/`, data);
    return response.data;
  }

  async getMedicalCertificatesByPatient(patientId: string | number) {
    const response = await axiosInstance.get(`${this.baseURL}/medical-certificates/?patient_id=${patientId}`);
    return response.data;
  }

  async deleteMedicalCertificate(certificateId: string | number) {
    const response = await axiosInstance.delete(`${this.baseURL}/medical-certificates/${certificateId}/`);
    return response.data;
  }

  // Physical Examinations
  async createPhysicalExamination(data: CreatePhysicalExaminationData) {
    const response = await axiosInstance.post(`${this.baseURL}/physical-examinations/`, data);
    return response.data;
  }

  async getPhysicalExaminationsByPatient(patientId: string | number) {
    const response = await axiosInstance.get(`${this.baseURL}/physical-examinations/?patient_id=${patientId}`);
    return response.data;
  }

  async deletePhysicalExamination(examinationId: string | number) {
    const response = await axiosInstance.delete(`${this.baseURL}/physical-examinations/${examinationId}/`);
    return response.data;
  }

  // Prescriptions
  async createPrescription(data: CreatePrescriptionData) {
    const response = await axiosInstance.post(`${this.baseURL}/prescriptions/`, data);
    return response.data;
  }

  async getPrescriptionsByPatient(patientId: string | number) {
    const response = await axiosInstance.get(`${this.baseURL}/prescriptions/?patient_id=${patientId}`);
    return response.data;
  }

  async deletePrescription(prescriptionId: string | number) {
    const response = await axiosInstance.delete(`${this.baseURL}/prescriptions/${prescriptionId}/`);
    return response.data;
  }

  // SOAP Notes
  async createSOAPNote(data: CreateSOAPNoteData) {
    const response = await axiosInstance.post(`${this.baseURL}/soap-notes/`, data);
    return response.data;
  }

  async getSOAPNotesByPatient(patientId: string | number) {
    const response = await axiosInstance.get(`${this.baseURL}/soap-notes/?patient_id=${patientId}`);
    return response.data;
  }

  async deleteSOAPNote(noteId: string | number) {
    const response = await axiosInstance.delete(`${this.baseURL}/soap-notes/${noteId}/`);
    return response.data;
  }

  // Clinical Notes
  async createClinicalNote(data: CreateClinicalNoteData) {
    const response = await axiosInstance.post(`${this.baseURL}/clinical-notes/`, data);
    return response.data;
  }

  async getClinicalNotesByPatient(patientId: string | number) {
    const response = await axiosInstance.get(`${this.baseURL}/clinical-notes/?patient_id=${patientId}`);
    return response.data;
  }

  async deleteClinicalNote(noteId: string | number) {
    const response = await axiosInstance.delete(`${this.baseURL}/clinical-notes/${noteId}/`);
    return response.data;
  }

  // Lab Results (already exists)
  async getLabResultsByPatient(patientId: string | number) {
    const response = await axiosInstance.get(`${this.baseURL}/lab-results/by_patient/?patient_id=${patientId}`);
    return response.data;
  }

  async createLabResult(formData: FormData) {
    const response = await axiosInstance.post(`${this.baseURL}/lab-results/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteLabResult(labResultId: string | number) {
    const response = await axiosInstance.delete(`${this.baseURL}/lab-results/${labResultId}/`);
    return response.data;
  }

  // General Documents
  async getAllDocumentsByPatient(patientId: string | number) {
    const response = await axiosInstance.get(`${this.baseURL}/documents/?patient_id=${patientId}`);
    return response.data;
  }
}

export const medicalDocumentsAPI = new MedicalDocumentsAPI();
export default medicalDocumentsAPI;
