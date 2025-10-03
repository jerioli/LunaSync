import { 
  pdfGenerator, 
  type PrescriptionData,
  type SOAPNoteData,
  type DocumentHeaderInfo,
  type PatientInfo 
} from "@/utils/pdfGenerator";

export const generatePrescriptionPDF = (
  prescription: any,
  patientData: any,
  clinicSettings: any,
  currentUser: any
) => {
  // Generate PDF for prescription
  const headerInfo: DocumentHeaderInfo = {
    clinicName: clinicSettings?.clinic_name || "Medical Center",
    clinicAddress: clinicSettings?.address 
      ? `${clinicSettings.address}, ${clinicSettings.city || ''}, ${clinicSettings.state || ''} ${clinicSettings.zip || ''}`
      : "Clinic Address",
    clinicPhone: clinicSettings?.phone || "",
    clinicEmail: clinicSettings?.email,
    doctorName: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Dr. [Doctor Name]",
  };

  const patientInfo: PatientInfo = {
    name: `${patientData?.first_name} ${patientData?.last_name}`,
    age: patientData?.date_of_birth ? 
      String(new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear()) : "",
    address: patientData?.address || "",
    gender: patientData?.gender || "",
  };

  const pdfData: PrescriptionData = {
    headerInfo,
    patientInfo,
    prescriptionNumber: prescription.prescription_number || `RX-${Date.now().toString().slice(-8).toUpperCase()}`,
    medications: (prescription.data?.medications || prescription.medications || []).map((med: any) => ({
      name: med.name || "",
      dose: med.dose || med.dosage || "",
      quantity: med.quantity || "",
      frequency: med.frequency || "",
      duration: med.startDate && med.endDate ? 
        `${med.startDate} to ${med.endDate}` : "",
      instructions: med.notes || "",
    })),
    generalInstructions: prescription.general_instructions || "",
    validUntil: prescription.valid_until || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateIssued: prescription.dateCreated || new Date().toISOString().split('T')[0],
  };

  const pdf = pdfGenerator.generatePrescription(pdfData);
  return pdf;
};

export const generateSOAPNotePDF = (
  soapNote: any,
  patientData: any,
  clinicSettings: any,
  currentUser: any
) => {
  const headerInfo: DocumentHeaderInfo = {
    clinicName: clinicSettings?.clinic_name || "Medical Center",
    clinicAddress: clinicSettings?.address 
      ? `${clinicSettings.address}, ${clinicSettings.city || ''}, ${clinicSettings.state || ''} ${clinicSettings.zip || ''}`
      : "Clinic Address",
    clinicPhone: clinicSettings?.phone || "",
    clinicEmail: clinicSettings?.email,
    doctorName: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Dr. [Doctor Name]",
  };

  const patientInfo: PatientInfo = {
    name: `${patientData?.first_name} ${patientData?.last_name}`,
    age: patientData?.date_of_birth ? 
      String(new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear()) : "",
    address: patientData?.address || "",
    gender: patientData?.gender || "",
  };

  const pdfData: SOAPNoteData = {
    headerInfo,
    patientInfo,
    subjective: soapNote.subjective || "",
    objective: soapNote.objective || "",
    assessment: soapNote.assessment || "",
    plan: soapNote.plan || "",
    dateCreated: soapNote.dateCreated || soapNote.document?.document_date || new Date().toISOString(),
  };

  const pdf = pdfGenerator.generateSOAPNote(pdfData);
  return pdf;
};