// ...existing code...

import MedicalCertificateGenerator from "@/components/patients/MedicalCertificateGenerator";
import PatientMedicalInfo from "@/components/patients/PatientMedicalInfo";
import PatientPersonalInfo from "@/components/patients/PatientPersonalInfo";
import PatientPhysicalExamination from "@/components/patients/PatientPhysicalExamination";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ENV } from "@/config/env";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import { medicalDocumentsAPI } from "@/lib/medicalDocumentsAPI";
import { Patient } from "@/lib/mock-data";
import { axiosInstance } from "@/services/api";
import { type LabResult as APILabResult } from "@/services/medicalDocumentsAPI";
import { parseApiError } from "@/utils/errorHandler";
import {
  HTMLToPDFConverter,
  generateClinicalNoteHTML,
  generatePrescriptionHTML,
  generateSOAPNoteHTML
} from "@/utils/htmlToPdf";
import { formatPatientNameWithFullMiddle } from "@/utils/patientNameUtils";
import { format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Eye,
  File,
  FileText,
  Heart,
  Pencil,
  Plus,
  Printer,
  Save,
  Stethoscope,
  TestTube,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Type declaration for jsPDF
declare global {
  interface Window {
    jspdf?: any;
  }
}

const PatientManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    patients,
    updatePatient,
    deletePatient,
    currentUser,
    fetchPatients,
    clinicCustomization,
  } = useClinic();

  // Helper function to construct full name from name parts for patient record view
  const getFullName = (patient: Patient) => {
    return formatPatientNameWithFullMiddle(patient);
  };

  // Helper function to get logo URL
  const getLogoUrl = (logo: string) => {
    if (!logo) return null;
    if (logo.startsWith("http")) return logo;
    
    // Use environment-aware base URL
    const baseUrl = ENV.API_URL.replace('/api', '');
    
    if (logo.startsWith("/media/")) return `${baseUrl}${logo}`;
    if (logo.startsWith("branding/"))
      return `${baseUrl}/media/${logo}`;
    return `${baseUrl}${logo}`;
  };

  // Role-based access control
  const isDoctor = currentUser?.role === "doctor";
  const isReceptionist = currentUser?.role === "receptionist";
  const isAdmin = currentUser?.role === "admin";
  const canEdit = isDoctor || isReceptionist || isAdmin; // Admins can edit
  const canDelete = isDoctor || isAdmin; // Doctors and admins can delete patient records

  // Clinic settings state
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  // Document management state
  const [certificates, setCertificates] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [soapNotes, setSoapNotes] = useState<any[]>([]);
  const [blankNotes, setBlankNotes] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<APILabResult[]>([]);

  // Medical Documentation Templates state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [currentPrescriptionTab, setCurrentPrescriptionTab] = useState("New");
  const [templateData, setTemplateData] = useState<any>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [currentMedication, setCurrentMedication] = useState({
    name: "",
    dose: "",
    quantity: "",
    frequency: "",
    startDate: "",
    endDate: "",
    notes: "",
    nameType: "Generic",
  });
  const [clinicalNoteData, setClinicalNoteData] = useState({
    title: "",
    notes: "",
  });

  // Document creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDocumentType, setCreateDocumentType] = useState<
    "prescription" | "soap" | "blank" | null
  >(null);
  const [documentData, setDocumentData] = useState<any>({});

  // --- Medication array handlers for e-prescription modal ---
  const handleMedicationChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setDocumentData((prev: any) => {
      const updatedMeds = (prev.medications || []).map((med: any, i: number) =>
        i === index ? { ...med, [field]: value } : med
      );
      return { ...prev, medications: updatedMeds };
    });
  };

  const handleAddMedication = () => {
    setDocumentData((prev: any) => ({
      ...prev,
      medications: [
        ...(prev.medications || []),
        {
          name: "",
          dose: "",
          quantity: "",
          frequency: "",
          startDate: "",
          endDate: "",
          notes: "",
        },
      ],
    }));
  };

  const handleRemoveMedication = (index: number) => {
    setDocumentData((prev: any) => ({
      ...prev,
      medications: (prev.medications || []).filter(
        (_: any, i: number) => i !== index
      ),
    }));
  };

  // Fetch certificates from database for this patient
  const fetchCertificates = async () => {
    if (!patientData?.id) return;

    try {
      const response = await axiosInstance.get(
        `/medical-documents/medical-certificates/?patient_id=${patientData.id}`
      );
      console.log("Fetched certificates from database:", response.data);

      // Convert database records to the expected format
      const formattedCertificates = response.data.map((dbRecord: any) => {
        // Determine certificate type display name
        const getTypeDisplayName = (certType: string) => {
          switch (certType) {
            case "fitness":
              return "Fitness for Work Certificate";
            case "sports_clearance":
              return "Sports Clearance Certificate";
            case "sick_leave":
              return "Sick Leave Certificate";
            case "general":
              return "General Medical Certificate";
            default:
              return "Medical Certificate";
          }
        };

        return {
          id: dbRecord.id,
          type: getTypeDisplayName(dbRecord.certificate_type || "general"),
          title:
            dbRecord.document?.title ||
            getTypeDisplayName(dbRecord.certificate_type || "general"),
          dateCreated:
            dbRecord.document?.created_at || new Date().toISOString(),
          patientId: patientData.id,
          data: {
            // Convert database fields back to form format
            patientName: `${patientData.first_name} ${patientData.last_name}`,
            patientAge: patientData.date_of_birth
              ? (
                  new Date().getFullYear() -
                  new Date(patientData.date_of_birth).getFullYear()
                ).toString()
              : "",
            patientAddress: patientData.address || "",
            patientSex: patientData.gender || "",
            fitForWork:
              dbRecord.certificate_type === "fitness"
                ? "fit"
                : dbRecord.certificate_type === "sports_clearance"
                ? "fit_physical_activities"
                : dbRecord.certificate_type === "sick_leave"
                ? "unfit"
                : "fit",
            diagnosis: dbRecord.medical_opinion || "",
            chiefComplaint: dbRecord.purpose || "",
            medicalRecommendations: dbRecord.examination_findings || "",
            limitations: dbRecord.restrictions || "",
            certificateType: dbRecord.certificate_type || "general",
            dateIssued: dbRecord.document?.document_date
              ? new Date(dbRecord.document.document_date)
                  .toISOString()
                  .split("T")[0]
              : new Date().toISOString().split("T")[0],
            restFromDate:
              dbRecord.valid_from || new Date().toISOString().split("T")[0],
            restToDate: dbRecord.valid_until || "",
            followUpDate: "",
            // Extract other fields from examination_findings if available
          },
          content: null, // Will be generated when needed for viewing
          dbRecord: dbRecord, // Store the original database record
        };
      });

      setCertificates(formattedCertificates);
    } catch (error) {
      console.error("Error fetching certificates:", error);
    }
  };

  // Medical Documentation Templates handler functions
  const placeholders: Record<string, string> = {
    subjective:
      "Describe the patient's symptoms, complaints, and history in their own words",
    objective: "Record measurable or observed findings",
    assessment: "Summarize your clinical assessment or diagnosis",
    plan: "Outline the treatment plan, follow-up, or next steps",
  };

  const handleTemplateSave = async () => {
    if (selectedTemplate === "E-Prescription") {
      // Save prescription with all medications to the database
      try {
        // Validate that medications exist
        if (medications.length === 0) {
          toast({
            title: "Validation Error",
            description:
              "Please add at least one medication to the prescription.",
            variant: "destructive",
          });
          return;
        }

        const prescriptionData = {
          patient: parseInt(id || "0"),
          title: "E-Prescription",
          description:
            "Electronic prescription created from patient management",
          document_date: new Date().toISOString(),
          medications: medications,
          general_instructions: templateData.generalNotes || "",
          status: "approved",
          prescription_number: `RX-${Date.now()}`,
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 30 days from now
          refills_allowed: 0,
          refills_remaining: 0,
        };

        console.log("Sending prescription data:", prescriptionData);
        const response = await axiosInstance.post(
          "/medical-documents/prescriptions/",
          prescriptionData
        );

        toast({
          title: "Success",
          description: "E-Prescription saved successfully!",
        });

        // Refresh prescriptions list
        await loadAllDocuments();

        // Reset form
        setMedications([]);
        setCurrentMedication({
          name: "",
          dose: "",
          quantity: "",
          frequency: "",
          startDate: "",
          endDate: "",
          notes: "",
          nameType: "Generic",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description:
            error.response?.data?.detail || "Failed to save prescription",
          variant: "destructive",
        });
      }
    } else if (selectedTemplate === "SOAP Note" && templateData) {
      try {
        // Validate that at least one SOAP field has content
        const hasContent =
          templateData.subjective ||
          templateData.objective ||
          templateData.assessment ||
          templateData.plan;
        if (!hasContent) {
          toast({
            title: "Validation Error",
            description:
              "Please fill in at least one SOAP field (Subjective, Objective, Assessment, or Plan).",
            variant: "destructive",
          });
          return;
        }

        const soapData = {
          patient: parseInt(id || "0"),
          title: "SOAP Note",
          description: "SOAP Note created from patient management",
          document_date: new Date().toISOString(),
          subjective: templateData.subjective || "",
          objective: templateData.objective || "",
          assessment: templateData.assessment || "",
          plan: templateData.plan || "",
          status: "approved",
        };

        console.log("Sending SOAP data:", soapData);
        const response = await axiosInstance.post(
          "/medical-documents/soap-notes/",
          soapData
        );

        toast({
          title: "Success",
          description: "SOAP Note saved successfully!",
        });

        // Refresh SOAP notes list
        await loadAllDocuments();
      } catch (error: any) {
        toast({
          title: "Error",
          description:
            error.response?.data?.detail || "Failed to save SOAP note",
          variant: "destructive",
        });
      }
    } else if (selectedTemplate === "Clinical Notes") {
      await saveClinicalNoteToDatabase();
    }

    setTemplateData({});
    setSelectedTemplate("");
    setShowTemplateForm(false);
  };

  const handlePrescriptionChange = (field: string, value: any) => {
    setTemplateData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleMedicationChangeTemplate = (field: string, value: string) => {
    setCurrentMedication((prev) => ({ ...prev, [field]: value }));
  };

  const addMedication = () => {
    if (currentMedication.name && currentMedication.dose) {
      setMedications([
        ...medications,
        { ...currentMedication, id: Date.now() },
      ]);
      setCurrentMedication({
        name: "",
        dose: "",
        quantity: "",
        frequency: "",
        startDate: "",
        endDate: "",
        notes: "",
        nameType: "Generic",
      });
    }
  };

  const removeMedication = (id: number) => {
    setMedications(medications.filter((med) => med.id !== id));
  };

  const editMedication = (id: number) => {
    const medication = medications.find((med) => med.id === id);
    if (medication) {
      setCurrentMedication(medication);
      removeMedication(id);
    }
  };

  const handleClinicalNoteChange = (field: string, value: any) => {
    setClinicalNoteData((prev) => ({ ...prev, [field]: value }));
  };

  const saveClinicalNoteToDatabase = async () => {
    if (!clinicalNoteData.title || !clinicalNoteData.notes) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and notes fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const clinicalData = {
        patient: parseInt(id || "0"),
        title: clinicalNoteData.title,
        description: "Clinical note created from patient management",
        document_date: new Date().toISOString(),
        clinical_context: clinicalNoteData.notes,
        note_type: "general",
        status: "approved",
      };

      console.log("Sending clinical note data:", clinicalData);
      const response = await axiosInstance.post(
        "/medical-documents/clinical-notes/",
        clinicalData
      );

      toast({
        title: "Success",
        description: "Clinical Note saved successfully!",
      });

      // Refresh clinical notes list
      await loadAllDocuments();

      // Reset form
      setClinicalNoteData({
        title: "",
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.detail || "Failed to save clinical note",
        variant: "destructive",
      });
    }
  };

  const [prescriptionTab, setPrescriptionTab] = useState("New");

  // Print functionality state
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    includeComprehensiveProfile: true, // Personal info, physical exam, and medical info combined
    includePrescriptions: false,
    includeSoapNotes: false,
    includeClinicalNotes: false,
    includeLabResults: false,
    includeMedicalCertificates: false,
  });
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Redirect unauthorized users
  React.useEffect(() => {
    if (currentUser && !isDoctor && !isReceptionist && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view patient records.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [currentUser, isDoctor, isReceptionist, isAdmin, navigate, toast]);

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "personal" | "physical" | "medical" | "documents"
  >("overview"); // Updated tab types
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Medical History states
  const [medicalHistory, setMedicalHistory] = useState({
    chiefComplaint: "",
    categories: {
      illnesses: false,
      surgeries: false,
      medications: false,
      familyHistory: false,
      socialHistory: false,
    },
    categoryDetails: {
      illnesses: "",
      surgeries: "",
      medications: "",
      familyHistory: "",
      socialHistory: "",
    },
  });

  // Pagination states
  const [soapNotesPage, setSoapNotesPage] = useState(1);
  const [clinicalNotesPage, setClinicalNotesPage] = useState(1);
  const notesPerPage = 5;

  // Initial load effect - only runs once per patient ID
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        // First ensure we have fresh data from backend
        if (fetchPatients) {
          await fetchPatients();
        }

        // Then try to get from context
        if (patients && patients.length > 0) {
          const patient = patients.find((p) => String(p.id) === String(id));
          if (patient) {
            setPatientData(patient);
            setInitialLoadComplete(true);
            // Fetch certificates for this patient
            await fetchCertificates();
            return;
          }
        }

        // If not in context, try localStorage
        const stored = localStorage.getItem("patientsList");
        if (stored) {
          const storedPatients = JSON.parse(stored);
          const patient = storedPatients.find(
            (p: Patient) => String(p.id) === String(id)
          );
          if (patient) {
            setPatientData(patient);
            setInitialLoadComplete(true);
            // Fetch certificates for this patient
            await fetchCertificates();
            return;
          }
        }

        // If still not found, try API directly
        const response = await axiosInstance.get(`patients/${id}/`);
        if (response.data) {
          // Map backend response fields to frontend camelCase
          const mappedPatient = {
            ...response.data,
            registrationDate: response.data.registration_date,
          };

          setPatientData(mappedPatient);
          setInitialLoadComplete(true);

          // Fetch certificates for this patient
          await fetchCertificates();

          // Update localStorage with the fetched data
          const stored = localStorage.getItem("patientsList");
          let updated = [];
          if (stored) {
            updated = JSON.parse(stored);
            const existingIndex = updated.findIndex(
              (p: Patient) => String(p.id) === String(id)
            );
            if (existingIndex >= 0) {
              updated[existingIndex] = mappedPatient;
            } else {
              updated.push(mappedPatient);
            }
          } else {
            updated = [mappedPatient];
          }
          localStorage.setItem("patientsList", JSON.stringify(updated));
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        setInitialLoadComplete(true);
        toast({
          title: "Error",
          description: "Failed to load patient data. Please try again.",
          variant: "destructive",
        });
      }
    };

    // Only fetch if we haven't completed initial load and we're not editing
    if (!initialLoadComplete && !isEditing) {
      fetchPatientData();
    }
  }, [id, toast, fetchPatients, initialLoadComplete, isEditing, patients]);

  // Reset initial load flag when patient ID changes
  useEffect(() => {
    setInitialLoadComplete(false);
    setPatientData(null);
    // Clear certificates when patient changes
    setCertificates([]);
  }, [id]);

  // Initialize medical history when patient data is loaded
  useEffect(() => {
    if (patientData?.medical_info) {
      setMedicalHistory({
        chiefComplaint: patientData.medical_info.chiefComplaint || "",
        categories: {
          illnesses: !!patientData.medical_info.illnesses,
          surgeries: !!patientData.medical_info.surgeries,
          medications: !!patientData.medical_info.medications,
          familyHistory: !!patientData.medical_info.familyHistory,
          socialHistory: !!patientData.medical_info.socialHistory,
        },
        categoryDetails: {
          illnesses: patientData.medical_info.illnesses || "",
          surgeries: patientData.medical_info.surgeries || "",
          medications: patientData.medical_info.medications || "",
          familyHistory: patientData.medical_info.familyHistory || "",
          socialHistory: patientData.medical_info.socialHistory || "",
        },
      });
    } else {
      // Reset to default values if no medical history exists
      setMedicalHistory({
        chiefComplaint: "",
        categories: {
          illnesses: false,
          surgeries: false,
          medications: false,
          familyHistory: false,
          socialHistory: false,
        },
        categoryDetails: {
          illnesses: "",
          surgeries: "",
          medications: "",
          familyHistory: "",
          socialHistory: "",
        },
      });
    }
  }, [patientData]);

  // Fetch clinic settings function
  const fetchClinicSettings = async () => {
    try {
      const response = await axiosInstance.get("/clinic/");
      setClinicSettings(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching clinic settings:", error);
      return {};
    }
  };

  // Fetch clinic settings on component mount
  useEffect(() => {
    fetchClinicSettings();
  }, []);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (patientData && initialLoadComplete) {
      setIsLoading(false);
    }
  }, [patientData, initialLoadComplete]);

  // Certificate management functions
  const handleSaveCertificate = async (certificate: any) => {
    try {
      // Check if the certificate already has a database record (already saved)
      if (certificate.dbRecord || certificate.backendId) {
        console.log(
          "Certificate already exists in database, just updating local state"
        );
        // Certificate already exists in database, just update local state
        setCertificates((prev) => [
          ...prev,
          {
            ...certificate,
            id: certificate.dbRecord?.id || certificate.id,
            backendId: certificate.dbRecord?.id || certificate.backendId,
            documentId:
              certificate.dbRecord?.document?.id || certificate.documentId,
          },
        ]);
        return;
      }

      // If no database record exists, save to backend
      console.log("No database record found, saving certificate to database");
      const certificateData = {
        patient: parseInt(id!),
        title: certificate.data?.title || "Medical Certificate",
        description: certificate.data?.description || "",
        certificate_type: certificate.data?.type || "fitness",
        purpose: certificate.data?.purpose || "",
        medical_opinion:
          certificate.data?.medicalOpinion || certificate.data?.content || "",
        valid_from:
          certificate.data?.validFrom || new Date().toISOString().split("T")[0],
        valid_until: certificate.data?.validUntil || null,
        restrictions: certificate.data?.restrictions || "",
        examination_findings: certificate.data?.examinationFindings || "",
        document_date: new Date().toISOString(),
        status: "approved",
      };

      // Save to backend
      const savedCertificate =
        await medicalDocumentsAPI.createMedicalCertificate(certificateData);

      // Update local state with the saved certificate
      setCertificates((prev) => [
        ...prev,
        {
          ...certificate,
          id: savedCertificate.id || savedCertificate.document?.id,
          backendId: savedCertificate.id,
          documentId: savedCertificate.document?.id,
        },
      ]);

      toast({
        title: "Certificate saved",
        description:
          "Medical certificate has been generated and saved successfully to the database.",
      });
    } catch (error) {
      console.error("Error saving certificate:", error);
      toast({
        title: "Error",
        description: "Failed to save certificate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCertificate = async (certificateId: number) => {
    try {
      // Find the certificate to get its backend ID
      const certificate = certificates.find(
        (cert) => cert.id === certificateId
      );

      if (certificate?.backendId) {
        // Delete from backend
        await medicalDocumentsAPI.deleteMedicalCertificate(
          certificate.backendId
        );
      }

      // Update local state
      setCertificates((prev) =>
        prev.filter((cert) => cert.id !== certificateId)
      );

      toast({
        title: "Certificate deleted",
        description: "Medical certificate has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting certificate:", error);
      toast({
        title: "Error",
        description: "Failed to delete certificate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLabResult = async (labResultId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this lab result? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      // Delete from backend
      await medicalDocumentsAPI.deleteLabResult(labResultId);

      // Update local state
      setLabResults((prev) =>
        prev.filter((result) => result.id !== labResultId)
      );

      toast({
        title: "Lab result deleted",
        description: "Lab result has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting lab result:", error);
      toast({
        title: "Error",
        description: "Failed to delete lab result. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Document creation functions
  const handleCreateDocument = (type: "prescription" | "soap" | "blank") => {
    setCreateDocumentType(type);
    setDocumentData({});
    if (type === "prescription") {
      setPrescriptionTab("New");
      setDocumentData({
        nameType: "",
        name: "",
        dose: "",
        quantity: "",
        frequency: "",
        customFrequency: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd"
        ),
        notes: "",
      });
    } else if (type === "soap") {
      setDocumentData({
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
      });
    } else if (type === "blank") {
      setDocumentData({
        title: "",
        content: "",
      });
    }
    setShowCreateDialog(true);
  };

  const handleSaveDocument = async () => {
    if (!createDocumentType) return;

    try {
      const baseDocumentData = {
        patient: parseInt(id!),
        title: "",
        description: "",
        document_date: new Date().toISOString(),
        status: "approved",
      };

      if (createDocumentType === "prescription") {
        // Prepare medications array for backend
        const medications = (documentData.medications || []).map(
          (med: any) => ({
            name: med.name,
            dose: med.dose,
            quantity: med.quantity,
            frequency: med.frequency,
            startDate: med.startDate,
            endDate: med.endDate,
            notes: med.notes,
          })
        );
        const prescriptionData = {
          ...baseDocumentData,
          title: `Prescription for ${patientData?.name}`,
          description: documentData.generalInstructions || "",
          prescription_number: `RX-${Date.now()
            .toString()
            .slice(-8)
            .toUpperCase()}`,
          medications,
          general_instructions: documentData.generalInstructions || "",
          valid_until:
            medications.length > 0
              ? medications[0].endDate
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
          refills_allowed: 0,
          refills_remaining: 0,
        };

        const savedPrescription = await medicalDocumentsAPI.createPrescription(
          prescriptionData
        );

        // Update local state with the new prescription structure
        const document = {
          id: savedPrescription?.id || Date.now(),
          type: createDocumentType,
          patientId: patientData?.id,
          patientName: patientData?.name,
          dateCreated: new Date().toISOString(),
          data: {
            medications,
            generalInstructions: documentData.generalInstructions || "",
          },
          createdBy: currentUser?.name || "Unknown",
          backendId: savedPrescription?.id,
          documentId: savedPrescription?.document?.id,
        };
        setPrescriptions((prev) => [...prev, document]);
      } else if (createDocumentType === "soap") {
        const soapData = {
          ...baseDocumentData,
          title: `SOAP Note for ${patientData?.name}`,
          description: "SOAP Note",
          subjective: documentData.subjective || "",
          objective: documentData.objective || "",
          assessment: documentData.assessment || "",
          plan: documentData.plan || "",
          vital_signs: {},
          chief_complaint: "",
          history_present_illness: "",
        };

        const savedSOAP = await medicalDocumentsAPI.createSOAPNote(soapData);

        // Update local state
        const document = {
          id: savedSOAP.id || Date.now(),
          type: createDocumentType,
          patientId: patientData?.id,
          patientName: patientData?.name,
          dateCreated: new Date().toISOString(),
          data: documentData,
          createdBy: currentUser?.name || "Unknown",
          backendId: savedSOAP.id,
          documentId: savedSOAP.document?.id,
        };

        setSoapNotes((prev) => [...prev, document]);
      } else if (createDocumentType === "blank") {
        const clinicalNoteData = {
          ...baseDocumentData,
          title: documentData.title || `Clinical Note for ${patientData?.name}`,
          description: "Clinical Note",
          note_type: "general",
          clinical_context: documentData.content || "",
          findings: documentData.content || "",
          recommendations: "",
          follow_up_required: false,
        };

        const savedNote = await medicalDocumentsAPI.createClinicalNote(
          clinicalNoteData
        );

        // Update local state
        const document = {
          id: savedNote.id || Date.now(),
          type: createDocumentType,
          patientId: patientData?.id,
          patientName: patientData?.name,
          dateCreated: new Date().toISOString(),
          data: documentData,
          createdBy: currentUser?.name || "Unknown",
          backendId: savedNote.id,
          documentId: savedNote.document?.id,
        };

        setBlankNotes((prev) => [...prev, document]);
      }

      toast({
        title: "Document saved",
        description: `${
          createDocumentType === "prescription"
            ? "E-Prescription"
            : createDocumentType === "soap"
            ? "SOAP Note"
            : "Clinical Note"
        } has been saved successfully to the database.`,
      });

      setShowCreateDialog(false);
      setCreateDocumentType(null);
      setDocumentData({});
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        title: "Error",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (
    docId: number,
    type: "prescription" | "soap" | "blank"
  ) => {
    try {
      let document;

      if (type === "prescription") {
        document = prescriptions.find((doc) => doc.id === docId);
        if (document?.backendId) {
          await medicalDocumentsAPI.deletePrescription(document.backendId);
        }
        setPrescriptions((prev) => prev.filter((doc) => doc.id !== docId));
      } else if (type === "soap") {
        document = soapNotes.find((doc) => doc.id === docId);
        if (document?.backendId) {
          await medicalDocumentsAPI.deleteSOAPNote(document.backendId);
        }
        setSoapNotes((prev) => prev.filter((doc) => doc.id !== docId));
      } else if (type === "blank") {
        document = blankNotes.find((doc) => doc.id === docId);
        if (document?.backendId) {
          await medicalDocumentsAPI.deleteClinicalNote(document.backendId);
        }
        setBlankNotes((prev) => prev.filter((doc) => doc.id !== docId));
      }

      toast({
        title: "Document deleted",
        description: "Document has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Print functionality
  const handlePrintRecord = () => {
    setShowPrintDialog(true);
  };

  const handlePrintSettingsChange = (
    setting: keyof typeof printSettings,
    value: boolean
  ) => {
    setPrintSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  const generatePrintContent = () => {
    if (!patientData) return "";

    // Check if any document types are selected
    const anyDocumentsSelected =
      printSettings.includePrescriptions ||
      printSettings.includeSoapNotes ||
      printSettings.includeClinicalNotes ||
      printSettings.includeLabResults ||
      printSettings.includeMedicalCertificates;

    // Check if all document types are selected for merged format
    const allDocumentsSelected =
      printSettings.includePrescriptions &&
      printSettings.includeSoapNotes &&
      printSettings.includeClinicalNotes &&
      printSettings.includeLabResults &&
      printSettings.includeMedicalCertificates;

    // Check if we have multiple types of documents
    const hasMultipleDocumentTypes =
      [
        prescriptions.length > 0,
        soapNotes.length > 0,
        blankNotes.length > 0,
        labResults.length > 0,
        certificates.length > 0,
      ].filter(Boolean).length > 1;

    // If comprehensive profile is selected along with documents, or all documents are selected with multiple types, use the merged professional format
    if (
      (printSettings.includeComprehensiveProfile && anyDocumentsSelected) ||
      (allDocumentsSelected && hasMultipleDocumentTypes)
    ) {
      return generateMergedProfessionalDocument();
    }

    // If only comprehensive profile is selected (no documents), use the standard format
    if (printSettings.includeComprehensiveProfile && !anyDocumentsSelected) {
      return generateStandardPrintContent();
    }

    // Otherwise, use individual document printing (each document gets its own page with original design)
    return generateIndividualDocumentsPrint();
  };

  // New function for printing individual documents with their original designs
  const generateIndividualDocumentsPrint = () => {
    if (!patientData) return "";

    const clinicInfo = clinicSettings || {};
    const logoUrl = getLogoUrl(clinicInfo?.logo || "");

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient Documents - ${patientData.name}</title>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 0.15in;
            size: A4;
          }
          
          @media print {
            .page-break {
              page-break-before: always;
            }
            .no-print {
              display: none;
            }
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              max-width: none;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
            width: 100%;
            max-width: none;
          }
        </style>
      </head>
      <body>
    `;

    // Documents sections - Each document type gets its own page with original design
    if (printSettings.includePrescriptions && prescriptions.length > 0) {
      prescriptions.forEach((prescription, index) => {
        if (index > 0) content += `<div class="page-break"></div>`;
        // Use the saved prescription number if available, otherwise fallback
        const prescriptionId =
          prescription.data?.prescription_number ||
          prescription.prescription_number ||
          prescription.id ||
          `RX-${(prescription.backendId || prescription.id || Date.now())
            .toString()
            .slice(-8)
            .toUpperCase()}`;
        const clinicData = clinicSettings || {};
        const meds = prescription.data.medications || [];
        content += `
          <div class="document-container" style="padding: 40px; max-width: 8.5in; margin: 0 auto; background: white; min-height: 11in;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Clinic Logo" style="max-height: 60px; margin-bottom: 10px;">`
                  : ""
              }
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${
                clinicData.clinic_name || "Medical Clinic"
              }</div>
              <div style="font-size: 12px; color: #666;">
                ${clinicData.address || "Clinic Address"}<br>
                ${clinicData.phone || ""} | ${clinicData.email || ""}
              </div>
            </div>

            <!-- Prescription Title -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 14px;">PRESCRIPTION ID: ${prescriptionId}</div>
            </div>

            <!-- Location and Date -->
            <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
              <div>${clinicData.address || "Clinic Address"}</div>
              <div style="margin-top: 10px;">
                Prescribed on: ${format(
                  new Date(prescription.dateCreated),
                  "MMMM dd, yyyy"
                )}
              </div>
              <div>${format(
                new Date(prescription.dateCreated),
                "hh:mm a"
              )} PHT</div>
            </div>

            <!-- Patient Info -->
            <div style="margin-bottom: 20px; font-size: 12px;">
              <div><strong>Patient:</strong> ${patientData?.name}</div>
              <div><strong>Age:</strong> ${
                patientData?.date_of_birth
                  ? Math.floor(
                      (new Date().getTime() -
                        new Date(patientData.date_of_birth).getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000)
                    )
                  : "N/A"
              } years old</div>
              <div><strong>Gender:</strong> ${
                patientData?.gender || "Not specified"
              }</div>
            </div>

            <!-- Rx Symbol -->
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">Rx</div>

            <!-- Prescription Details -->
            <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.6;">
              ${
                meds.length > 0
                  ? meds
                      .map(
                        (med: any, i: number) => `
                <div style="margin-bottom: 18px;">
                  <div style="font-weight: bold; margin-bottom: 5px;">${
                    i + 1
                  }. ${med.name}</div>
                  <div style="margin-bottom: 6px;">${med.dose || ""} - ${
                          med.quantity || ""
                        } ${med.frequency ? `- ${med.frequency}` : ""}</div>
                  ${
                    med.notes
                      ? `<div style="margin-left: 20px; color: #555;">${med.notes}</div>`
                      : ""
                  }
                  <div style="font-size: 12px; color: #888; margin-left: 20px;">${
                    med.startDate ? `Start: ${med.startDate}` : ""
                  } ${med.endDate ? ` | End: ${med.endDate}` : ""}</div>
                </div>
              `
                      )
                      .join("")
                  : "<div>No medications listed.</div>"
              }
              ${
                prescription.data.generalInstructions
                  ? `<div style="margin-top: 10px; color: #444; font-style: italic;">General Instructions: ${prescription.data.generalInstructions}</div>`
                  : ""
              }
            </div>

            <!-- Doctor Signature Area -->
            <div style="text-align: right; margin-top: 60px;">
              <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
              <div style="font-size: 12px;">Dr. ${
                currentUser?.first_name || currentUser?.name
              } ${currentUser?.last_name || ""}</div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
              <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
            </div>
          </div>
        `;
      });
    }

    if (printSettings.includeSoapNotes && soapNotes.length > 0) {
      soapNotes.forEach((note, index) => {
        content += `<div class="page-break"></div>`;

        const clinicData = clinicSettings || {};
        const soapId = `SOAP-${Date.now().toString().slice(-8).toUpperCase()}`;

        content += `
          <div style="padding: 40px; max-width: 8.5in; margin: 0 auto; background: white; min-height: 11in;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Clinic Logo" style="max-height: 60px; margin-bottom: 10px;">`
                  : ""
              }
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${
                clinicData.clinic_name || "Medical Clinic"
              }</div>
              <div style="font-size: 12px; color: #666;">
                ${clinicData.address || "Clinic Address"}<br>
                ${clinicData.phone || ""} | ${clinicData.email || ""}
              </div>
            </div>

            <!-- SOAP Note Title -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 16px;">SOAP NOTE</div>
              <div style="font-size: 12px; margin-top: 5px;">ID: ${soapId}</div>
            </div>

            <!-- Patient Info -->
            <div style="margin-bottom: 30px; font-size: 12px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
              <div><strong>Patient:</strong> ${patientData?.name}</div>
              <div><strong>Date:</strong> ${format(
                new Date(note.dateCreated),
                "MMMM dd, yyyy"
              )}</div>
              <div><strong>Provider:</strong> ${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>

            <!-- SOAP Content -->
            <div style="margin-bottom: 30px;">
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">SUBJECTIVE:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.subjective || "Not recorded"
                }</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">OBJECTIVE:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.objective || "Not recorded"
                }</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ASSESSMENT:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.assessment || "Not recorded"
                }</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">PLAN:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.plan || "Not recorded"
                }</div>
              </div>
            </div>

            <!-- Signature Area -->
            <div style="text-align: right; margin-top: 60px;">
              <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
              <div style="font-size: 12px;">${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>
          </div>
        `;
      });
    }

    if (printSettings.includeClinicalNotes && blankNotes.length > 0) {
      blankNotes.forEach((note, index) => {
        content += `<div class="page-break"></div>`;

        const clinicData = clinicSettings || {};
        const noteId = `CN-${Date.now().toString().slice(-8).toUpperCase()}`;

        content += `
          <div style="padding: 40px; max-width: 8.5in; margin: 0 auto; background: white; min-height: 11in;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Clinic Logo" style="max-height: 60px; margin-bottom: 10px;">`
                  : ""
              }
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${
                clinicData.clinic_name || "Medical Clinic"
              }</div>
              <div style="font-size: 12px; color: #666;">
                ${clinicData.address || "Clinic Address"}<br>
                ${clinicData.phone || ""} | ${clinicData.email || ""}
              </div>
            </div>

            <!-- Clinical Note Title -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 16px;">CLINICAL NOTE</div>
              <div style="font-size: 14px; margin-top: 5px;">${
                note.data?.title || "General Clinical Note"
              }</div>
              <div style="font-size: 12px; margin-top: 5px;">ID: ${noteId}</div>
            </div>

            <!-- Patient Info -->
            <div style="margin-bottom: 30px; font-size: 12px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
              <div><strong>Patient:</strong> ${patientData?.name}</div>
              <div><strong>Date:</strong> ${format(
                new Date(note.dateCreated),
                "MMMM dd, yyyy"
              )}</div>
              <div><strong>Provider:</strong> ${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>

            <!-- Note Content -->
            <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; background: #fdfdfd; min-height: 300px;">
              <div style="white-space: pre-wrap; line-height: 1.6; font-size: 13px;">${
                note.data?.content || "No content recorded"
              }</div>
            </div>

            <!-- Signature Area -->
            <div style="text-align: right; margin-top: 60px;">
              <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
              <div style="font-size: 12px;">${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>
          </div>
        `;
      });
    }

    if (printSettings.includeLabResults && labResults.length > 0) {
      labResults.forEach((result, index) => {
        content += `<div class="page-break"></div>`;

        // Use the actual saved lab result HTML content with original design
        let labResultContent = result.document?.content || "";

        // If we have the complete HTML content, use it directly
        if (labResultContent.includes("<!DOCTYPE html>")) {
          // Extract just the body content to avoid nested HTML structures
          let bodyMatch = labResultContent.match(
            /<body[^>]*>([\s\S]*?)<\/body>/i
          );
          if (bodyMatch) {
            labResultContent = bodyMatch[1];
          } else {
            // Fallback: remove html, head tags but keep the content
            labResultContent = labResultContent.replace(/<\/?html[^>]*>/gi, "");
            labResultContent = labResultContent.replace(
              /<head[^>]*>[\s\S]*?<\/head>/gi,
              ""
            );
            labResultContent = labResultContent.replace(/<\/?body[^>]*>/gi, "");
          }

          // Extract and preserve the original styles
          let styleMatch = result.document?.content?.match(
            /<style[^>]*>([\s\S]*?)<\/style>/i
          );
          let originalStyles = styleMatch ? styleMatch[1] : "";

          content += `
            <style>
              ${originalStyles}
              @page {
                margin: 0.3in;
                size: A4;
              }
              @media print {
                .page-break {
                  page-break-before: always;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
            ${labResultContent}
          `;
        } else {
          // Fallback: Create a basic lab result layout if content is missing
          content += `
            <div style="padding: 40px; max-width: 8.5in; margin: 0 auto; background: white; min-height: 11in; font-family: Arial, sans-serif;">
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">LABORATORY RESULT REPORT</h1>
                <p style="font-size: 12px;">Generated: ${format(
                  new Date(),
                  "MMMM dd, yyyy"
                )}</p>
              </div>
              
              <div style="margin-bottom: 20px; font-size: 12px; background: #f9f9f9; padding: 15px;">
                <div><strong>Patient:</strong> ${patientData?.name}</div>
                <div><strong>Test Type:</strong> ${
                  result.test_name || result.test_category || "N/A"
                }</div>
                <div><strong>Laboratory:</strong> ${
                  result.laboratory_name || "N/A"
                }</div>
                <div><strong>Date:</strong> ${format(
                  new Date(
                    result.document?.document_date ||
                      result.document?.created_at ||
                      new Date()
                  ),
                  "MMMM dd, yyyy"
                )}</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px;">TEST RESULTS</h3>
                <div style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 11px; border: 1px solid #ddd; padding: 15px; background: #fdfdfd; min-height: 200px;">
                  ${
                    labResultContent ||
                    result.interpretation ||
                    "Test results not available"
                  }
                </div>
              </div>
            </div>
          `;
        }
      });
    }

    if (printSettings.includeMedicalCertificates && certificates.length > 0) {
      certificates.forEach((cert, index) => {
        content += `<div class="page-break"></div>`;

        // Use the actual saved certificate HTML content with original design
        let certificateContent = cert.content || "";

        // Clean the certificate content to work within our document structure
        if (certificateContent.includes("<!DOCTYPE html>")) {
          // Extract just the body content to avoid nested HTML structures
          let bodyMatch = certificateContent.match(
            /<body[^>]*>([\s\S]*?)<\/body>/i
          );
          if (bodyMatch) {
            certificateContent = bodyMatch[1];
          } else {
            // Fallback: remove html, head tags but keep the content
            certificateContent = certificateContent.replace(
              /<\/?html[^>]*>/gi,
              ""
            );
            certificateContent = certificateContent.replace(
              /<head[^>]*>[\s\S]*?<\/head>/gi,
              ""
            );
            certificateContent = certificateContent.replace(
              /<\/?body[^>]*>/gi,
              ""
            );
          }

          // Extract and preserve the original styles
          let styleMatch = cert.content?.match(
            /<style[^>]*>([\s\S]*?)<\/style>/i
          );
          let originalStyles = styleMatch ? styleMatch[1] : "";

          content += `
            <style>
              ${originalStyles}
              @page {
                margin: 0.5in;
                size: A4;
              }
              @media print {
                .page-break {
                  page-break-before: always;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
            ${certificateContent}
          `;
        } else {
          // Add the certificate content as-is if it's already clean
          content += certificateContent;
        }
      });
    }

    content += `
      </body>
      </html>
    `;

    return content;
  };

  const generateMergedProfessionalDocument = () => {
    if (!patientData) return "";

    const clinicInfo = clinicSettings || {};
    const logoUrl = getLogoUrl(clinicInfo?.logo || "");

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Complete Medical Record - ${patientData.name}</title>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          @media print {
            .page-break {
              page-break-before: always;
            }
            .no-print {
              display: none;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 15px;
            background: white;
          }

          .document-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
          }

          .logo {
            height: 50px;
            width: auto;
            margin-bottom: 8px;
          }

          .clinic-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 3px;
          }

          .clinic-info {
            font-size: 12px;
            margin-bottom: 10px;
          }

          .document-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .patient-info {
            margin-bottom: 20px;
            padding: 10px 0;
          }

          .patient-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 14px;
          }

          .section {
            margin-bottom: 20px;
          }

          .section-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
            padding-bottom: 3px;
            border-bottom: 1px solid #000;
          }

          .document-item {
            margin-bottom: 15px;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
          }

          .document-type {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 3px;
          }

          .document-meta {
            font-size: 11px;
            margin-bottom: 6px;
          }

          .content {
            font-size: 12px;
            line-height: 1.4;
          }

          .soap-section {
            margin-bottom: 8px;
          }

          .soap-label {
            font-weight: bold;
            margin-bottom: 2px;
            font-size: 12px;
          }

          .content-text {
            font-size: 12px;
            line-height: 1.4;
            margin-left: 8px;
          }

          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid #000;
            padding-top: 10px;
          }

          .signature-area {
            text-align: right;
            margin-top: 25px;
          }

          .signature-line {
            border-bottom: 1px solid #000;
            width: 180px;
            margin-left: auto;
            margin-bottom: 3px;
          }

          .doctor-name {
            font-size: 11px;
          }

          .rx-symbol {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 3px;
          }
        </style>
      </head>
      <body>
    `;

    // Professional Document Header
    const documentId = `MR-${Date.now().toString().slice(-8).toUpperCase()}`;
    content += `
      <div class="document-header">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="Clinic Logo" class="logo">`
            : `<div style="width: 50px; height: 50px; background: #f3f4f6; margin: 0 auto 8px; border-radius: 4px;"></div>`
        }
        <div class="clinic-name">${
          clinicInfo?.clinic_name || "Medical Center"
        }</div>
        <div class="clinic-info">
          ${clinicInfo?.address || "Clinic Address"}<br>
          ${clinicInfo?.phone ? `Tel: ${clinicInfo.phone}` : ""} ${
      clinicInfo?.email ? `| Email: ${clinicInfo.email}` : ""
    }
        </div>
        <div class="document-title">Complete Medical Record</div>
        <div style="font-size: 11px;">DOC ID: ${documentId}</div>
      </div>
    `;

    // Patient Information Header
    content += `
      <div class="patient-info">
        <div class="patient-row">
          <span><strong>Patient:</strong> ${patientData.name}</span>
          <span><strong>Date:</strong> ${format(
            new Date(),
            "MMM dd, yyyy"
          )}</span>
        </div>
        <div class="patient-row">
          <span><strong>Age:</strong> ${
            patientData.date_of_birth
              ? Math.floor(
                  (new Date().getTime() -
                    new Date(patientData.date_of_birth).getTime()) /
                    (365.25 * 24 * 60 * 60 * 1000)
                )
              : "N/A"
          } years</span>
          <span><strong>Gender:</strong> ${
            patientData.gender || "Not specified"
          }</span>
        </div>
        <div class="patient-row">
          <span><strong>Phone:</strong> ${patientData.phone}</span>
          <span><strong>Generated by:</strong> ${
            currentUser?.name || "Medical Staff"
          }</span>
        </div>
      </div>
    `;

    // Personal Information, Physical Examination, and Medical Information Sections
    if (printSettings.includeComprehensiveProfile) {
      // Personal Information Section
      content += `
        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="document-item">
            <div class="content">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                <div><strong>Full Name:</strong> ${patientData.name}</div>
                <div><strong>Date of Birth:</strong> ${
                  patientData.date_of_birth
                    ? format(
                        new Date(patientData.date_of_birth),
                        "MMM dd, yyyy"
                      )
                    : "N/A"
                }</div>
                <div><strong>Phone:</strong> ${patientData.phone}</div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                <div><strong>Email:</strong> ${patientData.email}</div>
                <div><strong>Address:</strong> ${
                  patientData.address || "N/A"
                }</div>
                <div><strong>Religion:</strong> ${
                  patientData.religion || "N/A"
                }</div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                <div><strong>Emergency Contact:</strong> ${
                  (patientData as any)?.emergency_contact || "N/A"
                }</div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Physical Examination Section
      content += `
        <div class="section">
          <div class="section-title">Physical Examination</div>
          <div class="document-item">
            <div class="content">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                <div><strong>Height:</strong> ${
                  patientData.physical_examination?.height || "Not recorded"
                }</div>
                <div><strong>Weight:</strong> ${
                  patientData.physical_examination?.weight || "Not recorded"
                }</div>
                <div><strong>Blood Pressure:</strong> ${
                  patientData.physical_examination?.bloodPressure ||
                  "Not recorded"
                }</div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div><strong>Temperature:</strong> ${
                  patientData.physical_examination?.temperature ||
                  "Not recorded"
                }</div>
                <div><strong>Pulse Rate:</strong> ${
                  patientData.physical_examination?.pulseRate || "Not recorded"
                }</div>
                <div><strong>Respiratory Rate:</strong> ${
                  patientData.physical_examination?.respiratoryRate ||
                  "Not recorded"
                }</div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Medical Information Section
      content += `
        <div class="section">
          <div class="section-title">Medical Information</div>
          <div class="document-item">
            <div class="content">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                <div><strong>Blood Type:</strong> ${
                  patientData.medical_info?.bloodType || "N/A"
                }</div>
                <div><strong>Known Allergies:</strong> ${
                  patientData.medical_info?.allergies?.join(", ") ||
                  "None recorded"
                }</div>
              </div>
              ${
                patientData.medical_info?.medicalHistory
                  ? `
                <div style="margin-top: 8px;">
                  <div><strong>Medical History:</strong></div>
                  <div style="margin-top: 4px; padding-left: 8px; font-size: 11px;">${patientData.medical_info.medicalHistory}</div>
                </div>
              `
                  : ""
              }
              
              ${
                (patientData.medical_info as any)?.chiefComplaint
                  ? `
                <div style="margin-top: 8px;">
                  <div><strong>Chief Complaint:</strong></div>
                  <div style="margin-top: 4px; padding-left: 8px; font-size: 11px;">${
                    (patientData.medical_info as any).chiefComplaint
                  }</div>
                </div>
              `
                  : ""
              }
              
              <div style="margin-top: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  ${
                    (patientData.medical_info as any)?.illnesses
                      ? `
                    <div>
                      <div><strong>Illnesses:</strong></div>
                      <div style="margin-top: 2px; padding-left: 8px; font-size: 11px;">${
                        (patientData.medical_info as any).illnesses
                      }</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    (patientData.medical_info as any)?.surgeries
                      ? `
                    <div>
                      <div><strong>Surgeries:</strong></div>
                      <div style="margin-top: 2px; padding-left: 8px; font-size: 11px;">${
                        (patientData.medical_info as any).surgeries
                      }</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    (patientData.medical_info as any)?.medications
                      ? `
                    <div>
                      <div><strong>Current Medications:</strong></div>
                      <div style="margin-top: 2px; padding-left: 8px; font-size: 11px;">${
                        (patientData.medical_info as any).medications
                      }</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    (patientData.medical_info as any)?.familyHistory
                      ? `
                    <div>
                      <div><strong>Family History:</strong></div>
                      <div style="margin-top: 2px; padding-left: 8px; font-size: 11px;">${
                        (patientData.medical_info as any).familyHistory
                      }</div>
                    </div>
                  `
                      : ""
                  }
                  
                  ${
                    (patientData.medical_info as any)?.socialHistory
                      ? `
                    <div>
                      <div><strong>Social History:</strong></div>
                      <div style="margin-top: 2px; padding-left: 8px; font-size: 11px;">${
                        (patientData.medical_info as any).socialHistory
                      }</div>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // E-Prescriptions Section
    if (prescriptions.length > 0) {
      content += `
        <div class="section">
          <div class="section-title">E-Prescriptions (${prescriptions.length})</div>
      `;

      prescriptions.forEach((prescription, index) => {
        content += `
          <div class="document-item">
            <div class="document-type">
              <div class="rx-symbol">Rx</div>
              Prescription #${index + 1}
            </div>
            <div class="document-meta">
              Prescribed on: ${format(
                new Date(prescription.dateCreated),
                "MMM dd, yyyy"
              )}
            </div>
            <div class="content">
              <div style="font-weight: bold; margin-bottom: 5px;">${
                prescription.data.name
              }</div>
              <div style="margin-bottom: 5px;">${
                prescription.data.dosage
              } - Quantity: ${prescription.data.quantity}</div>
              ${
                prescription.data.description
                  ? `<div style="margin-left: 10px; font-style: italic;">${prescription.data.description}</div>`
                  : ""
              }
            </div>
          </div>
        `;
      });

      content += `</div>`;
    }

    // SOAP Notes Section
    if (soapNotes.length > 0) {
      content += `
        <div class="section">
          <div class="section-title">SOAP Notes (${soapNotes.length})</div>
      `;

      soapNotes.forEach((note, index) => {
        content += `
          <div class="document-item">
            <div class="document-type">SOAP Note #${index + 1}</div>
            <div class="document-meta">
              Created on: ${format(new Date(note.dateCreated), "MMM dd, yyyy")}
            </div>
            <div class="content">
              <div class="soap-section">
                <div class="soap-label">Subjective:</div>
                <div class="content-text">${
                  note.data?.subjective || "Not recorded"
                }</div>
              </div>
              <div class="soap-section">
                <div class="soap-label">Objective:</div>
                <div class="content-text">${
                  note.data?.objective || "Not recorded"
                }</div>
              </div>
              <div class="soap-section">
                <div class="soap-label">Assessment:</div>
                <div class="content-text">${
                  note.data?.assessment || "Not recorded"
                }</div>
              </div>
              <div class="soap-section">
                <div class="soap-label">Plan:</div>
                <div class="content-text">${
                  note.data?.plan || "Not recorded"
                }</div>
              </div>
            </div>
          </div>
        `;
      });

      content += `</div>`;
    }

    // Clinical Notes Section
    if (blankNotes.length > 0) {
      content += `
        <div class="section">
          <div class="section-title">Clinical Notes (${blankNotes.length})</div>
      `;

      blankNotes.forEach((note, index) => {
        content += `
          <div class="document-item">
            <div class="document-type">${
              note.data?.title || `Clinical Note #${index + 1}`
            }</div>
            <div class="document-meta">
              Created on: ${format(new Date(note.dateCreated), "MMM dd, yyyy")}
            </div>
            <div class="content">
              <div style="white-space: pre-wrap;">${
                note.data?.content || "No content recorded"
              }</div>
            </div>
          </div>
        `;
      });

      content += `</div>`;
    }

    // Lab Results Section
    if (labResults.length > 0) {
      content += `
        <div class="section">
          <div class="section-title">Laboratory Results (${labResults.length})</div>
      `;

      labResults.forEach((result, index) => {
        content += `
          <div class="document-item">
            <div class="document-type">Lab Result #${index + 1}</div>
            <div class="document-meta">
              Test Date: ${format(
                new Date(
                  (result as any)?.test_date ||
                    (result as any)?.date ||
                    new Date()
                ),
                "MMM dd, yyyy"
              )}
            </div>
            <div class="content">
              <div><strong>Test Type:</strong> ${
                (result as any)?.test_type || (result as any)?.type || "N/A"
              }</div>
              ${
                (result as any)?.laboratory_name
                  ? `<div><strong>Laboratory:</strong> ${
                      (result as any).laboratory_name
                    }</div>`
                  : ""
              }
              ${
                (result as any)?.doctor_notes
                  ? `<div><strong>Doctor's Notes:</strong> ${
                      (result as any).doctor_notes
                    }</div>`
                  : ""
              }
              ${
                (result as any)?.critical_values &&
                (result as any).critical_values.length > 0
                  ? `<div style="font-weight: bold;">Critical: ${
                      (result as any).critical_values.length
                    } value(s)</div>`
                  : ""
              }
              ${
                (result as any)?.abnormal_values &&
                (result as any).abnormal_values.length > 0
                  ? `<div style="font-weight: bold;">Abnormal: ${
                      (result as any).abnormal_values.length
                    } value(s)</div>`
                  : ""
              }
            </div>
          </div>
        `;
      });

      content += `</div>`;
    }

    // Medical Certificates Section
    if (certificates.length > 0) {
      content += `
        <div class="section">
          <div class="section-title">Medical Certificates (${certificates.length})</div>
      `;

      certificates.forEach((cert, index) => {
        // Clean certificate content
        let certificateContent = cert.content;
        certificateContent = certificateContent.replace(/<html[^>]*>/gi, "");
        certificateContent = certificateContent.replace(/<\/html>/gi, "");
        certificateContent = certificateContent.replace(
          /<head[^>]*>[\s\S]*?<\/head>/gi,
          ""
        );
        certificateContent = certificateContent.replace(/<body[^>]*>/gi, "");
        certificateContent = certificateContent.replace(/<\/body>/gi, "");

        content += `
          <div class="document-item">
            <div class="document-type">Medical Certificate #${index + 1}</div>
            <div class="document-meta">
              Issued on: ${format(new Date(cert.dateCreated), "MMM dd, yyyy")}
            </div>
            <div class="content">
              ${certificateContent}
            </div>
          </div>
        `;
      });

      content += `</div>`;
    }

    // Professional Signature Area
    content += `
      <div class="signature-area">
        <div class="signature-line"></div>
        <div class="doctor-name">Dr. ${
          currentUser?.first_name || currentUser?.name
        } ${currentUser?.last_name || ""}</div>
      </div>
    `;

    // Footer
    content += `
      <div class="footer">
        <div>Generated on ${format(
          new Date(),
          "MMM dd, yyyy"
        )} | Document ID: ${documentId}</div>
        <div>Generated by: ${currentUser?.name || "Medical Staff"}</div>
      </div>
      </body>
      </html>
    `;

    return content;
  };

  const generateStandardPrintContent = () => {
    if (!patientData) return "";

    const clinicInfo = clinicSettings || {};
    const logoUrl = getLogoUrl(clinicInfo?.logo || "");

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Patient Record - ${patientData.name}</title>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 1in;
            size: A4;
          }
          
          @media print {
            .page-break {
              page-break-before: always;
              page-break-after: auto;
            }
            .no-print {
              display: none;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .document-container {
              page-break-inside: avoid;
              min-height: 100vh;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .logo {
            max-height: 80px;
            margin-bottom: 10px;
          }
          
          .clinic-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .clinic-info {
            font-size: 14px;
            color: #666;
          }
          
          .patient-header {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
          }
          
          .patient-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .patient-details {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .info-item {
            display: flex;
            gap: 5px;
          }
          
          .info-label {
            font-weight: bold;
            min-width: 120px;
          }
          
          .document {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
          }
          
          .document-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          .document-date {
            color: #666;
            font-size: 12px;
            margin-bottom: 10px;
          }
          
          .prescription-details {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 3px;
          }
          
          .soap-section {
            margin-bottom: 10px;
          }
          
          .soap-label {
            font-weight: bold;
            color: #444;
            margin-bottom: 5px;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
    `;

    // Header with clinic info
    content += `
      <div class="header">
        ${
          logoUrl ? `<img src="${logoUrl}" alt="Clinic Logo" class="logo">` : ""
        }
        <div class="clinic-name">${
          clinicInfo?.clinic_name || "Medical Clinic"
        }</div>
        <div class="clinic-info">
          ${clinicInfo?.address || ""}<br>
          ${clinicInfo?.phone || ""} | ${clinicInfo?.email || ""}
        </div>
      </div>
    `;

    // Patient header
    content += `
      <div class="patient-header">
        <div class="patient-name">${patientData.name}</div>
        <div class="patient-details">
         
          <span><strong>Age:</strong> ${
            patientData.date_of_birth
              ? new Date().getFullYear() -
                new Date(patientData.date_of_birth).getFullYear()
              : "N/A"
          } years</span>
          <span><strong>Gender:</strong> ${patientData.gender}</span>
          <span><strong>Date:</strong> ${format(new Date(), "PPP")}</span>
        </div>
      </div>
    `;

    // Personal Information, Physical Examination, and Medical Information Sections
    if (printSettings.includeComprehensiveProfile) {
      // Personal Information
      content += `
        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Full Name:</span>
              <span>${patientData.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date of Birth:</span>
              <span>${
                patientData.date_of_birth
                  ? format(new Date(patientData.date_of_birth), "PPP")
                  : "N/A"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Gender:</span>
              <span class="capitalize">${patientData.gender}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Phone:</span>
              <span>${patientData.phone}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span>${patientData.email}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Address:</span>
              <span>${patientData.address || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Religion:</span>
              <span>${patientData.religion || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Emergency Contact:</span>
              <span>${(patientData as any)?.emergency_contact || "N/A"}</span>
            </div>
          </div>
        </div>
      `;

      // Physical Examination
      content += `
        <div class="section">
          <div class="section-title">Physical Examination</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Height:</span>
              <span>${
                patientData.physical_examination?.height || "Not recorded"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Weight:</span>
              <span>${
                patientData.physical_examination?.weight || "Not recorded"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Blood Pressure:</span>
              <span>${
                patientData.physical_examination?.bloodPressure ||
                "Not recorded"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Temperature:</span>
              <span>${
                patientData.physical_examination?.temperature || "Not recorded"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Pulse Rate:</span>
              <span>${
                patientData.physical_examination?.pulseRate || "Not recorded"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Respiratory Rate:</span>
              <span>${
                patientData.physical_examination?.respiratoryRate ||
                "Not recorded"
              }</span>
            </div>
          </div>
        </div>
      `;

      // Medical Information
      content += `
        <div class="section">
          <div class="section-title">Medical Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Blood Type:</span>
              <span>${patientData.medical_info?.bloodType || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Known Allergies:</span>
              <span>${
                patientData.medical_info?.allergies?.join(", ") ||
                "None recorded"
              }</span>
            </div>
          </div>
          ${
            patientData.medical_info?.medicalHistory
              ? `
            <div class="info-item">
              <span class="info-label">Medical History:</span>
              <div style="margin-top: 5px;">${patientData.medical_info.medicalHistory}</div>
            </div>
          `
              : ""
          }
          
          ${
            (patientData.medical_info as any)?.chiefComplaint
              ? `
            <div class="info-item">
              <span class="info-label">Chief Complaint:</span>
              <div style="margin-top: 5px;">${
                (patientData.medical_info as any).chiefComplaint
              }</div>
            </div>
          `
              : ""
          }
          
          <div class="info-grid" style="margin-top: 15px;">
            ${
              (patientData.medical_info as any)?.illnesses
                ? `
              <div class="info-item">
                <span class="info-label">Illnesses:</span>
                <div style="margin-top: 3px;">${
                  (patientData.medical_info as any).illnesses
                }</div>
              </div>
            `
                : ""
            }
            
            ${
              (patientData.medical_info as any)?.surgeries
                ? `
              <div class="info-item">
                <span class="info-label">Surgeries:</span>
                <div style="margin-top: 3px;">${
                  (patientData.medical_info as any).surgeries
                }</div>
              </div>
            `
                : ""
            }
            
            ${
              (patientData.medical_info as any)?.medications
                ? `
              <div class="info-item">
                <span class="info-label">Current Medications:</span>
                <div style="margin-top: 3px;">${
                  (patientData.medical_info as any).medications
                }</div>
              </div>
            `
                : ""
            }
            
            ${
              (patientData.medical_info as any)?.familyHistory
                ? `
              <div class="info-item">
                <span class="info-label">Family History:</span>
                <div style="margin-top: 3px;">${
                  (patientData.medical_info as any).familyHistory
                }</div>
              </div>
            `
                : ""
            }
            
            ${
              (patientData.medical_info as any)?.socialHistory
                ? `
              <div class="info-item">
                <span class="info-label">Social History:</span>
                <div style="margin-top: 3px;">${
                  (patientData.medical_info as any).socialHistory
                }</div>
              </div>
            `
                : ""
            }
          </div>
        </div>
      `;
    }

    // Documents sections (existing format)
    if (printSettings.includePrescriptions && prescriptions.length > 0) {
      prescriptions.forEach((prescription, index) => {
        content += `<div class="page-break"></div>`;
        const prescriptionId = `${Date.now()
          .toString()
          .slice(-8)
          .toUpperCase()}`;
        const clinicData = clinicSettings || {};
        content += `
          <div class="document-container" style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif;">
            <!-- Header with Logo and QR -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
              <div>
                ${
                  clinicData.logo
                    ? `<img src="${getLogoUrl(
                        clinicData.logo
                      )}" alt="Clinic Logo" style="height: 50px; width: auto; margin-bottom: 10px;">`
                    : `<div style="width: 50px; height: 50px; background: #f0f0f0; margin-bottom: 10px;"></div>`
                }
                <div style="font-size: 14px; color: #333;">${
                  clinicData.clinic_name || "Medical Center"
                }</div>
              </div>
              <div style="text-align: center;">
                <div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
                  QR CODE
                </div>
              </div>
            </div>

            <!-- Prescription ID -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 14px;">PRESCRIPTION ID: ${prescriptionId}</div>
            </div>

            <!-- Location and Date -->
            <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
              <div>${clinicData.address || "Clinic Address"}</div>
              <div style="margin-top: 10px;">
                Prescribed on: ${format(
                  new Date(prescription.dateCreated),
                  "MMMM dd, yyyy"
                )}
              </div>
              <div>${format(
                new Date(prescription.dateCreated),
                "hh:mm a"
              )} PHT</div>
            </div>

            <!-- Patient Info -->
            <div style="margin-bottom: 20px; font-size: 12px;">
              <div><strong>Patient:</strong> ${patientData?.name}</div>
              <div><strong>Age:</strong> ${
                patientData?.date_of_birth
                  ? Math.floor(
                      (new Date().getTime() -
                        new Date(patientData.date_of_birth).getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000)
                    )
                  : "N/A"
              } years old</div>
              <div><strong>Gender:</strong> ${
                patientData?.gender || "Not specified"
              }</div>
            </div>

            <!-- Rx Symbol -->
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">Rx</div>

            <!-- Prescription Details -->
            <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.6;">
              <div style="font-weight: bold; margin-bottom: 5px;">${
                prescription.data.name
              }</div>
              <div style="margin-bottom: 10px;">${
                prescription.data.dose || prescription.data.dosage || ""
              } - ${prescription.data.quantity || ""}</div>
              ${
                prescription.data.notes || prescription.data.description
                  ? `<div style="margin-left: 20px; color: #555;">${
                      prescription.data.notes || prescription.data.description
                    }</div>`
                  : ""
              }
            </div>

            <!-- Doctor Signature Area -->
            <div style="text-align: right; margin-top: 60px;">
              <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
              <div style="font-size: 12px;">Dr. ${
                currentUser?.first_name || currentUser?.name
              } ${currentUser?.last_name || ""}</div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
              <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
            </div>
          </div>
        `;
      });
    }

    if (printSettings.includeSoapNotes && soapNotes.length > 0) {
      soapNotes.forEach((note, index) => {
        content += `<div class="page-break"></div>`;

        const clinicData = clinicSettings || {};
        const soapId = `SOAP-${Date.now().toString().slice(-8).toUpperCase()}`;

        content += `
          <div style="padding: 40px; max-width: 8.5in; margin: 0 auto; background: white; min-height: 11in;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Clinic Logo" style="max-height: 60px; margin-bottom: 10px;">`
                  : ""
              }
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${
                clinicData.clinic_name || "Medical Clinic"
              }</div>
              <div style="font-size: 12px; color: #666;">
                ${clinicData.address || "Clinic Address"}<br>
                ${clinicData.phone || ""} | ${clinicData.email || ""}
              </div>
            </div>

            <!-- SOAP Note Title -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 16px;">SOAP NOTE</div>
              <div style="font-size: 12px; margin-top: 5px;">ID: ${soapId}</div>
            </div>

            <!-- Patient Info -->
            <div style="margin-bottom: 30px; font-size: 12px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
              <div><strong>Patient:</strong> ${patientData?.name}</div>
              <div><strong>Date:</strong> ${format(
                new Date(note.dateCreated),
                "MMMM dd, yyyy"
              )}</div>
              <div><strong>Provider:</strong> ${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>

            <!-- SOAP Content -->
            <div style="margin-bottom: 30px;">
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">SUBJECTIVE:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.subjective || "Not recorded"
                }</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">OBJECTIVE:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.objective || "Not recorded"
                }</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ASSESSMENT:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.assessment || "Not recorded"
                }</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 3px;">PLAN:</div>
                <div style="margin-left: 15px; line-height: 1.5; white-space: pre-wrap;">${
                  note.data?.plan || "Not recorded"
                }</div>
              </div>
            </div>

            <!-- Signature Area -->
            <div style="text-align: right; margin-top: 60px;">
              <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
              <div style="font-size: 12px;">${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>
          </div>
        `;
      });
    }

    if (printSettings.includeClinicalNotes && blankNotes.length > 0) {
      blankNotes.forEach((note, index) => {
        content += `<div class="page-break"></div>`;

        const clinicData = clinicSettings || {};
        const noteId = `CN-${Date.now().toString().slice(-8).toUpperCase()}`;

        content += `
          <div style="padding: 40px; max-width: 8.5in; margin: 0 auto; background: white; min-height: 11in;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" alt="Clinic Logo" style="max-height: 60px; margin-bottom: 10px;">`
                  : ""
              }
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${
                clinicData.clinic_name || "Medical Clinic"
              }</div>
              <div style="font-size: 12px; color: #666;">
                ${clinicData.address || "Clinic Address"}<br>
                ${clinicData.phone || ""} | ${clinicData.email || ""}
              </div>
            </div>

            <!-- Clinical Note Title -->
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-weight: bold; font-size: 16px;">CLINICAL NOTE</div>
              <div style="font-size: 14px; margin-top: 5px;">${
                note.data?.title || "General Clinical Note"
              }</div>
              <div style="font-size: 12px; margin-top: 5px;">ID: ${noteId}</div>
            </div>

            <!-- Patient Info -->
            <div style="margin-bottom: 30px; font-size: 12px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
              <div><strong>Patient:</strong> ${patientData?.name}</div>
              <div><strong>Date:</strong> ${format(
                new Date(note.dateCreated),
                "MMMM dd, yyyy"
              )}</div>
              <div><strong>Provider:</strong> ${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>

            <!-- Note Content -->
            <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; background: #fdfdfd; min-height: 300px;">
              <div style="white-space: pre-wrap; line-height: 1.6; font-size: 13px;">${
                note.data?.content || "No content recorded"
              }</div>
            </div>

            <!-- Signature Area -->
            <div style="text-align: right; margin-top: 60px;">
              <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
              <div style="font-size: 12px;">${
                note.createdBy || currentUser?.name || "Medical Staff"
              }</div>
            </div>
          </div>
        `;
      });
    }

    if (printSettings.includeLabResults && labResults.length > 0) {
      labResults.forEach((result, index) => {
        content += `<div class="page-break"></div>`;

        // Use the actual saved lab result HTML content with original design
        let labResultContent = result.document?.content || "";

        // If we have the complete HTML content, use it directly
        if (labResultContent.includes("<!DOCTYPE html>")) {
          // Extract just the body content to avoid nested HTML structures
          let bodyMatch = labResultContent.match(
            /<body[^>]*>([\s\S]*?)<\/body>/i
          );
          if (bodyMatch) {
            labResultContent = bodyMatch[1];
          } else {
            // Fallback: remove html, head tags but keep the content
            labResultContent = labResultContent.replace(/<\/?html[^>]*>/gi, "");
            labResultContent = labResultContent.replace(
              /<head[^>]*>[\s\S]*?<\/head>/gi,
              ""
            );
            labResultContent = labResultContent.replace(/<\/?body[^>]*>/gi, "");
          }

          // Extract and preserve the original styles
          let styleMatch = result.document?.content?.match(
            /<style[^>]*>([\s\S]*?)<\/style>/i
          );
          let originalStyles = styleMatch ? styleMatch[1] : "";

          content += `
            <style>
              ${originalStyles}
              @page {
                margin: 0.3in;
                size: A4;
              }
              @media print {
                .page-break {
                  page-break-before: always;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
            ${labResultContent}
          `;
        } else {
          // Fallback: Create a basic lab result layout if content is missing
          content += `
            <div style="padding: 40px; max-width: 8.5in; margin: 0 auto; background: white; min-height: 11in; font-family: Arial, sans-serif;">
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">LABORATORY RESULT REPORT</h1>
                <p style="font-size: 12px;">Generated: ${format(
                  new Date(),
                  "MMMM dd, yyyy"
                )}</p>
              </div>
              
              <div style="margin-bottom: 20px; font-size: 12px; background: #f9f9f9; padding: 15px;">
                <div><strong>Patient:</strong> ${patientData?.name}</div>
                <div><strong>Test Type:</strong> ${
                  result.test_name || result.test_category || "N/A"
                }</div>
                <div><strong>Laboratory:</strong> ${
                  result.laboratory_name || "N/A"
                }</div>
                <div><strong>Date:</strong> ${format(
                  new Date(
                    result.document?.document_date ||
                      result.document?.created_at ||
                      new Date()
                  ),
                  "MMMM dd, yyyy"
                )}</div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px;">TEST RESULTS</h3>
                <div style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 11px; border: 1px solid #ddd; padding: 15px; background: #fdfdfd; min-height: 200px;">
                  ${
                    labResultContent ||
                    result.interpretation ||
                    "Test results not available"
                  }
                </div>
              </div>
            </div>
          `;
        }
      });
    }

    if (printSettings.includeMedicalCertificates && certificates.length > 0) {
      certificates.forEach((cert, index) => {
        content += `<div class="page-break"></div>`;

        // Use the actual saved certificate HTML content with original design
        let certificateContent = cert.content || "";

        // Clean the certificate content to work within our document structure
        if (certificateContent.includes("<!DOCTYPE html>")) {
          // Extract just the body content to avoid nested HTML structures
          let bodyMatch = certificateContent.match(
            /<body[^>]*>([\s\S]*?)<\/body>/i
          );
          if (bodyMatch) {
            certificateContent = bodyMatch[1];
          } else {
            // Fallback: remove html, head tags but keep the content
            certificateContent = certificateContent.replace(
              /<\/?html[^>]*>/gi,
              ""
            );
            certificateContent = certificateContent.replace(
              /<head[^>]*>[\s\S]*?<\/head>/gi,
              ""
            );
            certificateContent = certificateContent.replace(
              /<\/?body[^>]*>/gi,
              ""
            );
          }

          // Extract and preserve the original styles
          let styleMatch = cert.content?.match(
            /<style[^>]*>([\s\S]*?)<\/style>/i
          );
          let originalStyles = styleMatch ? styleMatch[1] : "";

          content += `
            <style>
              ${originalStyles}
              @page {
                margin: 0.5in;
                size: A4;
              }
              @media print {
                .page-break {
                  page-break-before: always;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
            ${certificateContent}
          `;
        } else {
          // Add the certificate content as-is if it's already clean
          content += certificateContent;
        }
      });
    }

    content += `
        <div class="footer">
          <div>Generated on ${format(new Date(), "PPP")} by ${
      currentUser?.name || "Medical Staff"
    }</div>
          <div>This is a computer-generated document.</div>
        </div>
      </body>
      </html>
    `;

    return content;
  };

  const handlePreviewPrint = () => {
    const content = generatePrintContent();
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      setShowPrintPreview(true);
    }
  };

  const handleConfirmPrint = () => {
    const content = generatePrintContent();
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(content);
      newWindow.document.close();
      newWindow.onload = () => {
        newWindow.print();
        newWindow.close();
      };
    }
    setShowPrintDialog(false);
    setShowPrintPreview(false);
  };

  const handleDocumentInputChange = (field: string, value: string) => {
    setDocumentData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleViewCertificate = (certificate: any) => {
    // Open certificate in a new window for viewing/printing
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Medical Certificate</title>
          <style>
            body { margin: 0; padding: 20px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${certificate.content}
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleDownloadCertificate = (certificate: any) => {
    // Create a downloadable HTML file
    const blob = new Blob(
      [
        `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Certificate - ${certificate.data.patientName}</title>
        <meta charset="utf-8">
      </head>
      <body>
        ${certificate.content}
      </body>
      </html>
    `,
      ],
      { type: "text/html" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Medical_Certificate_${certificate.data.patientName}_${format(
      new Date(certificate.dateCreated),
      "yyyy-MM-dd"
    )}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load documents from backend API on component mount
  useEffect(() => {
    if (id) {
      loadAllDocuments();
    }
  }, [id]);

  // Function to load all documents from database
  const loadAllDocuments = async () => {
    if (!id) return;

    try {
      // Load medical certificates
      const certificatesResponse =
        await medicalDocumentsAPI.getMedicalCertificatesByPatient(id);
      const mappedCertificates = certificatesResponse.map((cert: any) => ({
        id: cert.id,
        type: "certificate",
        patientId: cert.document?.patient,
        patientName: patientData?.name,
        dateCreated: cert.document?.created_at || cert.document?.document_date,
        data: {
          title: cert.document?.title,
          type: cert.certificate_type,
          purpose: cert.purpose,
          medicalOpinion: cert.medical_opinion,
          validFrom: cert.valid_from,
          validUntil: cert.valid_until,
          restrictions: cert.restrictions,
          examinationFindings: cert.examination_findings,
        },
        content: cert.document?.content || "",
        createdBy: cert.document?.created_by?.name || "Medical Staff",
        backendId: cert.id,
        documentId: cert.document?.id,
      }));
      setCertificates(mappedCertificates);

      // Load prescriptions
      const prescriptionsResponse =
        await medicalDocumentsAPI.getPrescriptionsByPatient(id);
      console.log("Fetched prescriptionsResponse:", prescriptionsResponse);
      const mappedPrescriptions = prescriptionsResponse.map(
        (prescription: any) => ({
          id: prescription.id,
          type: "prescription",
          prescription_number: prescription.prescription_number, // Add this line
          patientId: prescription.document?.patient,
          patientName: patientData?.name,
          dateCreated:
            prescription.document?.created_at ||
            prescription.document?.document_date,
          document_uuid:
            prescription.document_uuid !== undefined &&
            prescription.document_uuid !== null
              ? prescription.document_uuid
              : (prescription.document &&
                  (prescription.document.id ||
                    prescription.document.document_uuid)) ||
                undefined,
          data: {
            medications: prescription.medications || [],
            generalInstructions: prescription.general_instructions || "",
            startDate: prescription.document?.document_date?.split("T")[0],
            endDate: prescription.valid_until,
          },
          createdBy: prescription.document?.created_by?.name || "Medical Staff",
          backendId: prescription.id,
          documentId: prescription.document?.id,
        })
      );
      setPrescriptions(mappedPrescriptions);

      // Load SOAP notes
      const soapResponse = await medicalDocumentsAPI.getSOAPNotesByPatient(id);
      const mappedSoapNotes = soapResponse.map((soap: any) => ({
        id: soap.id,
        type: "soap",
        patientId: soap.document?.patient,
        patientName: patientData?.name,
        dateCreated: soap.document?.created_at || soap.document?.document_date,
        data: {
          subjective: soap.subjective || "",
          objective: soap.objective || "",
          assessment: soap.assessment || "",
          plan: soap.plan || "",
        },
        createdBy: soap.document?.created_by?.name || "Medical Staff",
        backendId: soap.id,
        documentId: soap.document?.id,
      }));
      setSoapNotes(mappedSoapNotes);

      // Load clinical notes
      const clinicalResponse =
        await medicalDocumentsAPI.getClinicalNotesByPatient(id);
      const mappedClinicalNotes = clinicalResponse.map((note: any) => ({
        id: note.id,
        type: "blank",
        patientId: note.document?.patient,
        patientName: patientData?.name,
        dateCreated: note.document?.created_at || note.document?.document_date,
        data: {
          title: note.document?.title || "Clinical Note",
          content: note.findings || note.clinical_context || "",
        },
        createdBy: note.document?.created_by?.name || "Medical Staff",
        backendId: note.id,
        documentId: note.document?.id,
      }));
      setBlankNotes(mappedClinicalNotes);

      // Load lab results
      loadLabResults();
    } catch (error) {
      console.error("Failed to load documents:", error);
      // Fallback to localStorage for backward compatibility
      loadDocumentsFromLocalStorage();
    }
  };

  // Fallback function to load from localStorage
  const loadDocumentsFromLocalStorage = () => {
    if (!id) return;

    // Load certificates
    const certificatesKey = `certificates_patient_${id}`;
    const existingCertificates = localStorage.getItem(certificatesKey);
    if (existingCertificates) {
      setCertificates(JSON.parse(existingCertificates));
    }

    // Load prescriptions
    const prescriptionsKey = `prescriptions_patient_${id}`;
    const existingPrescriptions = localStorage.getItem(prescriptionsKey);
    if (existingPrescriptions) {
      setPrescriptions(JSON.parse(existingPrescriptions));
    }

    // Load SOAP notes
    const soapKey = `soapnotes_patient_${id}`;
    const existingSoap = localStorage.getItem(soapKey);
    if (existingSoap) {
      setSoapNotes(JSON.parse(existingSoap));
    }

    // Load blank notes
    const blankKey = `blanknotes_patient_${id}`;
    const existingBlank = localStorage.getItem(blankKey);
    if (existingBlank) {
      setBlankNotes(JSON.parse(existingBlank));
    }
  };

  // Function to load lab results from database
  const loadLabResults = async () => {
    if (!id) return;

    try {
      const results = await medicalDocumentsAPI.getLabResultsByPatient(id);
      setLabResults(results.lab_results || []);
    } catch (error) {
      console.error("Failed to load lab results:", error);
      // Fallback to localStorage for backward compatibility
      const labKey = `labresults_patient_${id}`;
      const existingLab = localStorage.getItem(labKey);
      if (existingLab) {
        try {
          const parsedLab = JSON.parse(existingLab);
          setLabResults(Array.isArray(parsedLab) ? parsedLab : []);
        } catch (parseError) {
          console.error("Error parsing localStorage lab results:", parseError);
          setLabResults([]);
        }
      } else {
        setLabResults([]);
      }
    }
  };

  // Listen for lab results updates when returning from Lab Results page
  useEffect(() => {
    const handleFocus = () => {
      // Reload lab results when window regains focus (when returning from Lab Results page)
      if (id) {
        loadLabResults();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-xl">Loading patient data...</div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-xl font-bold">Patient not found</div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/patients")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Patient List
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!patientData) return;

    // Check permissions
    if (!canEdit) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to edit patient records.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Filter data based on role - receptionists can only update personal info
      let dataToSend = { ...patientData };
      if (isReceptionist && !isDoctor) {
        // Keep original medical_info and physical_examination for receptionists - don't send modified medical data
        const originalPatient = patients.find(
          (p) => String(p.id) === String(patientData.id)
        );
        if (originalPatient) {
          dataToSend.medical_info = originalPatient.medical_info;
          dataToSend.physical_examination =
            originalPatient.physical_examination;
        }
      }

      // Ensure medical_info has the correct structure
      if (dataToSend.medical_info) {
        dataToSend.medical_info = {
          bloodType: dataToSend.medical_info.bloodType || "",
          allergies: dataToSend.medical_info.allergies || [],
          medicalHistory: dataToSend.medical_info.medicalHistory || "",
          chiefComplaint: medicalHistory.chiefComplaint,
          illnesses: medicalHistory.categoryDetails.illnesses,
          surgeries: medicalHistory.categoryDetails.surgeries,
          medications: medicalHistory.categoryDetails.medications,
          familyHistory: medicalHistory.categoryDetails.familyHistory,
          socialHistory: medicalHistory.categoryDetails.socialHistory,
        };
      } else {
        // If no medical_info exists, create it with the medical history
        dataToSend.medical_info = {
          bloodType: "",
          allergies: [],
          medicalHistory: "",
          chiefComplaint: medicalHistory.chiefComplaint,
          illnesses: medicalHistory.categoryDetails.illnesses,
          surgeries: medicalHistory.categoryDetails.surgeries,
          medications: medicalHistory.categoryDetails.medications,
          familyHistory: medicalHistory.categoryDetails.familyHistory,
          socialHistory: medicalHistory.categoryDetails.socialHistory,
        };
      }

      const response = await axiosInstance.put(
        `patients/${patientData.id}/`,
        dataToSend
      );

      // Map backend response fields to frontend camelCase
      const updatedPatient = {
        ...response.data,
        registrationDate: response.data.registration_date,
      };

      // Update the context state
      updatePatient(patientData.id, updatedPatient);

      // Update local state with the mapped data
      setPatientData(updatedPatient);

      // Update localStorage
      const stored = localStorage.getItem("patientsList");
      if (stored) {
        const storedPatients = JSON.parse(stored);
        const updatedPatients = storedPatients.map((p: Patient) =>
          String(p.id) === String(patientData.id) ? updatedPatient : p
        );
        localStorage.setItem("patientsList", JSON.stringify(updatedPatients));
      }

      setIsEditing(false);
      toast({
        title: "Patient record updated",
        description: "Patient information has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating patient:", error);

      // Use the error handler utility to get a better error message
      const parsedError = parseApiError(
        error,
        "Failed to update patient. Please try again later."
      );

      toast({
        title: parsedError.title,
        description: parsedError.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data from context or localStorage
    const originalPatient = patients.find((p) => String(p.id) === String(id));
    if (originalPatient) {
      setPatientData(originalPatient);
    } else {
      // Try localStorage as fallback
      const stored = localStorage.getItem("patientsList");
      if (stored) {
        const storedPatients = JSON.parse(stored);
        const patient = storedPatients.find(
          (p: Patient) => String(p.id) === String(id)
        );
        if (patient) {
          setPatientData(patient);
        }
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!patientData) return;

    // Check permissions
    if (!canDelete) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to delete patient records.",
        variant: "destructive",
      });
      return;
    }

    // Add confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${getFullName(
        patientData
      )}'s record? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      await axiosInstance.delete(`patients/${patientData.id}/`);

      // Update the context state
      deletePatient(patientData.id);

      // Remove from localStorage
      const stored = localStorage.getItem("patientsList");
      if (stored) {
        const storedPatients = JSON.parse(stored);
        const updatedPatients = storedPatients.filter(
          (p: Patient) => String(p.id) !== String(patientData.id)
        );
        localStorage.setItem("patientsList", JSON.stringify(updatedPatients));
      }

      toast({
        title: "Patient record deleted",
        description: "Patient information has been successfully deleted.",
      });

      navigate("/patients");
    } catch (error) {
      console.error("Error deleting patient:", error);

      // Use the error handler utility to get a better error message
      const parsedError = parseApiError(
        error,
        "Failed to delete patient. Please try again later."
      );

      toast({
        title: parsedError.title,
        description: parsedError.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNext = () => {
    if (activeTab === "overview") setActiveTab("personal");
    else if (activeTab === "personal") setActiveTab("physical");
    else if (activeTab === "physical") setActiveTab("medical");
    else if (activeTab === "medical") setActiveTab("documents");
  };

  const renderPatientOverview = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Health Record
          </CardTitle>
          <CardDescription>Complete health record summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Basic Information</h3>
              <div className="space-y-1">
                <div>
                  <span className="font-medium">Name:</span> {getFullName(patientData)}
                </div>
                <div>
                  <span className="font-medium">Age:</span>{" "}
                  {patientData.date_of_birth
                    ? new Date().getFullYear() -
                      new Date(patientData.date_of_birth).getFullYear()
                    : "Not Specified"}{" "}
                  years
                </div>
                <div>
                  <span className="font-medium">Gender:</span>{" "}
                  <span className="capitalize">{patientData.gender}</span>
                </div>
                <div>
                  <span className="font-medium">Phone:</span>{" "}
                  {patientData.phone}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {patientData.email}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Medical Summary</h3>
              <div className="space-y-1">
                <div>
                  <span className="font-medium">Blood Type:</span>{" "}
                  {patientData.medical_info?.bloodType || "Not Specified"}
                </div>
                <div>
                  <span className="font-medium">Known Allergies:</span>{" "}
                  {patientData.medical_info?.allergies?.length
                    ? patientData.medical_info.allergies.length
                    : "None"}
                </div>
                <div>
                  <span className="font-medium">Registration:</span>{" "}
                  {patientData.registrationDate
                    ? format(
                        new Date(patientData.registrationDate),
                        "MMM dd, yyyy"
                      )
                    : "Not Specified"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Physical Examination</h3>
              <div className="space-y-1">
                <div>
                  <span className="font-medium">Height:</span>{" "}
                  {patientData.physical_examination?.height || "Not Specified"}
                </div>
                <div>
                  <span className="font-medium">Weight:</span>{" "}
                  {patientData.physical_examination?.weight || "Not Specified"}
                </div>
                <div>
                  <span className="font-medium">Blood Pressure:</span>{" "}
                  {patientData.physical_examination?.bloodPressure ||
                    "Not Specified"}
                </div>
                <div>
                  <span className="font-medium">Temperature:</span>{" "}
                  {patientData.physical_examination?.temperature ||
                    "Not Specified"}
                </div>
                <div>
                  <span className="font-medium">Pulse Rate:</span>{" "}
                  {patientData.physical_examination?.pulseRate ||
                    "Not Specified"}
                </div>
                <div>
                  <span className="font-medium">Respiratory Rate:</span>{" "}
                  {patientData.physical_examination?.respiratoryRate ||
                    "Not Specified"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Visit History
          </CardTitle>
          <CardDescription>
            List of previous visits and appointment dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-semibold">
                    Date Visited
                  </th>
                  <th className="text-left py-2 px-4 font-semibold">Doctor</th>
                  <th className="text-left py-2 px-4 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {/* Mock data for demonstration */}
                <tr>
                  <td className="py-2 px-4">2025-08-01</td>
                  <td className="py-2 px-4">Dr. John Smith</td>
                  <td className="py-2 px-4">Routine Checkup</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">2025-07-15</td>
                  <td className="py-2 px-4">Dr. Jane Doe</td>
                  <td className="py-2 px-4">Follow-up</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">2025-06-10</td>
                  <td className="py-2 px-4">Dr. John Smith</td>
                  <td className="py-2 px-4">Lab Results Review</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderDocuments = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents & Records
        </CardTitle>
        <CardDescription>
          E-Prescriptions, SOAP Notes, Lab Results, and Medical Certificates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* E-Prescriptions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  Rx
                </div>
                <h3 className="font-semibold">E-Prescriptions</h3>
              </div>
              {isDoctor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateDocument("prescription")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {prescriptions.length > 0 ? (
                prescriptions.map((prescription, index) => (
                  <div
                    key={prescription.id || index}
                    className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          Rx
                        </div>
                        <div className="flex-1">
                          {(
                            prescription.data?.medications ||
                            prescription.medications
                          )?.length > 0 ? (
                            (
                              prescription.data?.medications ||
                              prescription.medications
                            ).map((med: any, idx: number) => (
                              <div key={idx} className="mb-2">
                                <div className="font-semibold text-xs">
                                  {idx + 1}. {med.name || ""}
                                </div>
                                <div className="text-xs">
                                  {med.dose || med.dosage || ""} -{" "}
                                  {med.quantity || ""}{" "}
                                  {med.frequency ? `- ${med.frequency}` : ""}
                                </div>
                                {med.notes && (
                                  <div className="text-xs text-gray-500 ml-4">
                                    {med.notes}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 ml-4">
                                  {med.startDate
                                    ? `Start: ${med.startDate}`
                                    : ""}{" "}
                                  {med.endDate ? ` | End: ${med.endDate}` : ""}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500">
                              No medications listed.
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Fetch current clinic settings
                              let currentClinicSettings = clinicSettings;
                              if (!currentClinicSettings) {
                                try {
                                  currentClinicSettings = await fetchClinicSettings();
                                } catch (error) {
                                  console.error("Failed to fetch clinic settings:", error);
                                  currentClinicSettings = {};
                                }
                              }

                              // Generate HTML content using template
                              const htmlContent = generatePrescriptionHTML(
                                prescription,
                                patientData,
                                currentClinicSettings,
                                currentUser
                              );

                              // View as PDF
                              await HTMLToPDFConverter.viewPDFFromHTML(htmlContent);

                              toast({
                                title: "Prescription Viewed",
                                description: "Prescription opened as PDF",
                              });
                            } catch (error) {
                              console.error("Error generating prescription PDF:", error);
                              toast({
                                title: "Error",
                                description: "Failed to generate prescription PDF",
                                variant: "destructive",
                              });
                            }
                          }}
                          title="View Prescription (PDF)"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {isDoctor && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteDocument(
                                prescription.id,
                                "prescription"
                              )
                            }
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Prescription"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      Rx
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        No prescriptions available
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isDoctor
                          ? 'Click "Add" to create prescriptions'
                          : "Prescriptions will appear here when created by doctors"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SOAP Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <h3 className="font-semibold">SOAP Notes</h3>
              </div>
              {isDoctor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateDocument("soap")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {soapNotes.length > 0 ? (
                soapNotes.map((note, index) => (
                  <div
                    key={note.id || index}
                    className="p-3 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          S
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            SOAP Note
                          </div>
                          <div className="text-xs text-green-600">
                            {note.data?.assessment?.substring(0, 50) ||
                              "Assessment pending"}
                            {(note.data?.assessment?.length || 0) > 50
                              ? "..."
                              : ""}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created:{" "}
                            {new Date(note.dateCreated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Fetch current clinic settings
                              let currentClinicSettings = clinicSettings;
                              if (!currentClinicSettings) {
                                try {
                                  currentClinicSettings = await fetchClinicSettings();
                                } catch (error) {
                                  console.error("Failed to fetch clinic settings:", error);
                                  currentClinicSettings = {};
                                }
                              }

                              // Generate HTML content using template
                              const htmlContent = generateSOAPNoteHTML(
                                note,
                                patientData,
                                currentClinicSettings,
                                currentUser
                              );

                              // View as PDF
                              await HTMLToPDFConverter.viewPDFFromHTML(htmlContent);

                              toast({
                                title: "SOAP Note Viewed",
                                description: "SOAP note opened as PDF",
                              });
                            } catch (error) {
                              console.error("Error generating SOAP note PDF:", error);
                              toast({
                                title: "Error",
                                description: "Failed to generate SOAP note PDF",
                                variant: "destructive",
                              });
                            }
                          }}
                          title="View SOAP Note"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteDocument(note.id, "soap")
                            }
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete SOAP Note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      S
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        No SOAP notes available
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isDoctor
                          ? 'Click "Add" to create SOAP notes'
                          : "SOAP notes will appear here when created by doctors"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Blank Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <h3 className="font-semibold">Clinical Notes</h3>
              </div>
              {isDoctor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateDocument("blank")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {blankNotes.length > 0 ? (
                blankNotes.map((note, index) => (
                  <div
                    key={note.id || index}
                    className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          N
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {note.data?.title || "Clinical Note"}
                          </div>
                          <div className="text-xs text-blue-600">
                            {note.data?.content?.substring(0, 50) ||
                              "Content pending"}
                            {(note.data?.content?.length || 0) > 50
                              ? "..."
                              : ""}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created:{" "}
                            {new Date(note.dateCreated).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              // Fetch current clinic settings
                              let currentClinicSettings = clinicSettings;
                              if (!currentClinicSettings) {
                                try {
                                  currentClinicSettings = await fetchClinicSettings();
                                } catch (error) {
                                  console.error("Failed to fetch clinic settings:", error);
                                  currentClinicSettings = {};
                                }
                              }

                              // Generate HTML content using template
                              const htmlContent = generateClinicalNoteHTML(
                                note,
                                patientData,
                                currentClinicSettings,
                                currentUser
                              );

                              // View as PDF
                              await HTMLToPDFConverter.viewPDFFromHTML(htmlContent);

                              toast({
                                title: "Clinical Note Viewed",
                                description: "Clinical note opened as PDF",
                              });
                            } catch (error) {
                              console.error("Error generating clinical note PDF:", error);
                              toast({
                                title: "Error",
                                description: "Failed to generate clinical note PDF",
                                variant: "destructive",
                              });
                            }
                          }}
                          title="View Note"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteDocument(note.id, "blank")
                            }
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      N
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        No clinical notes available
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isDoctor
                          ? 'Click "Add" to create clinical notes'
                          : "Clinical notes will appear here when created by doctors"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lab Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                <h3 className="font-semibold">Lab Results</h3>
              </div>
              {isDoctor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/lab-results?patientId=${
                        patientData?.id
                      }&patientName=${encodeURIComponent(
                        patientData?.name || ""
                      )}&returnTo=patient`
                    )
                  }
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {labResults.length > 0 ? (
                labResults.map((result, index) => (
                  <div
                    key={result.id || index}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {result.test_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {result.test_category} |{" "}
                          {result.document?.status || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Date:{" "}
                          {result.document?.document_date
                            ? new Date(
                                result.document.document_date
                              ).toLocaleDateString()
                            : "Date not available"}
                        </div>
                        {result.laboratory_name && (
                          <div className="text-xs text-muted-foreground">
                            Lab: {result.laboratory_name}
                          </div>
                        )}
                        {result.critical_values &&
                          result.critical_values.length > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              🚨 {result.critical_values.length} critical
                              value(s)
                            </div>
                          )}
                        {result.abnormal_values &&
                          result.abnormal_values.length > 0 && (
                            <div className="text-xs text-yellow-600 font-medium">
                              ⚠️ {result.abnormal_values.length} abnormal
                              value(s)
                            </div>
                          )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Simply open the saved processed_file PDF
                            const processedFileUrl = (result.document as any)
                              ?.processed_file;

                            if (processedFileUrl) {
                              // Open the saved professional PDF directly
                              const baseUrl = ENV.API_URL.replace('/api', '');
                              const pdfUrl = processedFileUrl.startsWith("http")
                                ? processedFileUrl
                                : `${baseUrl}${processedFileUrl}`;

                              console.log("Opening saved PDF at:", pdfUrl);
                              window.open(pdfUrl, "_blank");

                              toast({
                                title: "Lab Result Opened",
                                description:
                                  "Saved PDF lab result opened from patient record.",
                              });
                            } else {
                              // No saved PDF available
                              toast({
                                title: "No PDF Available",
                                description:
                                  "No processed PDF found for this lab result. Please re-upload through Lab Results page.",
                                variant: "destructive",
                              });
                            }
                          }}
                          title="View Saved Lab Result PDF"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {isDoctor && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLabResult(result.id)}
                            title="Delete Lab Result"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border rounded-lg">
                  <div className="text-sm font-medium">
                    No lab results available
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isDoctor
                      ? 'Click "Upload" to add lab results'
                      : "Lab results will appear here when uploaded by doctors"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Medical Certificates */}
        <div className="space-y-3">
          <MedicalCertificateGenerator
            patient={patientData}
            onSaveCertificate={handleSaveCertificate}
            onDeleteCertificate={handleDeleteCertificate}
            savedCertificates={certificates}
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/patients")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getFullName(patientData)}
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="secondary">
                  {patientData.date_of_birth
                    ? new Date().getFullYear() -
                      new Date(patientData.date_of_birth).getFullYear()
                    : "N/A"}{" "}
                  years old
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {patientData.gender}
                </Badge>
                <Badge variant="outline">ID: {patientData.id}</Badge>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handlePrintRecord}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Record
                </Button>
                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                )}
                {canEdit && activeTab !== "overview" && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    disabled={isDeleting}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Record
                  </Button>
                )}
                {!canEdit && !canDelete && (
                  <div className="text-sm text-muted-foreground">
                    View only - Contact a doctor or receptionist to make changes
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(
            value as
              | "overview"
              | "personal"
              | "physical"
              | "medical"
              | "documents"
          )
        }
        className="w-full"
      >
        <TabsList className="mb-4 grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="physical" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Physical Exam
          </TabsTrigger>
          <TabsTrigger value="medical" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Medical Info
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Role-based information banner */}
        {isEditing && isReceptionist && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> As a receptionist, you can only edit
                  personal information. Medical and physical examination data
                  can only be modified by doctors.
                </p>
              </div>
            </div>
          </div>
        )}

        <TabsContent value="overview">{renderPatientOverview()}</TabsContent>

        <TabsContent value="personal">
          <PatientPersonalInfo
            patient={patientData}
            isEditing={isEditing}
            onUpdate={(updatedData) =>
              setPatientData((prev) => ({ ...prev, ...updatedData }))
            }
          />
          {isEditing && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="physical">
          <PatientPhysicalExamination
            patient={patientData}
            isEditing={isEditing && (isDoctor || isAdmin)} // Doctors and admins can edit physical exam data
            onUpdate={(updatedData) =>
              setPatientData((prev) => ({ ...prev, ...updatedData }))
            }
          />
          {isEditing && (isDoctor || isAdmin) && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleNext}>Next: Medical Information</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="medical">
          <PatientMedicalInfo
            patient={patientData}
            isEditing={isEditing && (isDoctor || isAdmin)} // Doctors and admins can edit medical info
            onUpdate={(updatedData) =>
              setPatientData((prev) => ({ ...prev, ...updatedData }))
            }
          />

          {/* Medical Documentation Templates Section */}
          {(isDoctor || isAdmin) && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">
                Medical Documentation Templates
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setSelectedTemplate("SOAP Note");
                      setShowTemplateForm(true);
                    }}
                    variant="outline"
                    className="hover:bg-[#1EAEDB] hover:text-white"
                  >
                    SOAP Note
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedTemplate("E-Prescription");
                      setShowTemplateForm(true);
                    }}
                    variant="outline"
                    className="hover:bg-[#1EAEDB] hover:text-white"
                  >
                    E-Prescription
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedTemplate("Clinical Notes");
                      setShowTemplateForm(true);
                    }}
                    variant="outline"
                    className="hover:bg-[#1EAEDB] hover:text-white"
                  >
                    Clinical Notes
                  </Button>
                </div>

                {showTemplateForm && selectedTemplate === "SOAP Note" && (
                  <div className="space-y-4 border p-4 rounded-lg">
                    {["subjective", "objective", "assessment", "plan"].map(
                      (field) => (
                        <div key={field}>
                          <Label>
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                          </Label>
                          <Textarea
                            value={templateData[field] || ""}
                            onChange={(e) =>
                              handlePrescriptionChange(field, e.target.value)
                            }
                            placeholder={placeholders[field]}
                            rows={3}
                          />
                        </div>
                      )
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="hover:bg-[#1EAEDB] hover:text-white"
                        onClick={() => {
                          setSelectedTemplate("");
                          setShowTemplateForm(false);
                          setTemplateData({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleTemplateSave}
                        className="hover:bg-[#1EAEDB]"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {showTemplateForm && selectedTemplate === "Clinical Notes" && (
                  <div className="border p-4 rounded-lg">
                    <div className="space-y-4">
                      <div>
                        <Label>
                          Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={clinicalNoteData.title}
                          onChange={(e) =>
                            handleClinicalNoteChange("title", e.target.value)
                          }
                          placeholder="Enter clinical note title (e.g., Follow-up Visit, Initial Assessment)"
                        />
                      </div>

                      <div>
                        <Label>
                          Clinical Notes <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          value={clinicalNoteData.notes}
                          onChange={(e) =>
                            handleClinicalNoteChange("notes", e.target.value)
                          }
                          placeholder="Enter your clinical notes here..."
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="hover:bg-[#1EAEDB] hover:text-white"
                        onClick={() => {
                          setSelectedTemplate("");
                          setShowTemplateForm(false);
                          setClinicalNoteData({
                            title: "",
                            notes: "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveClinicalNoteToDatabase}
                        className="hover:bg-[#1EAEDB]"
                      >
                        Save Clinical Note
                      </Button>
                    </div>
                  </div>
                )}

                {showTemplateForm && selectedTemplate === "E-Prescription" && (
                  <div className="space-y-4 border p-4 rounded-lg">
                    <div className="flex gap-2">
                      {["New", "Favorites", "Generic", "Brand"].map((tab) => (
                        <Button
                          key={tab}
                          variant={
                            currentPrescriptionTab === tab
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setCurrentPrescriptionTab(tab)}
                          className="hover:bg-[#1EAEDB]"
                        >
                          {tab}
                        </Button>
                      ))}
                    </div>

                    {currentPrescriptionTab === "New" && (
                      <div className="space-y-4">
                        {/* Add Medication Form */}
                        <div className="bg-gray-50 p-4 rounded border">
                          <h4 className="font-medium mb-3">Add Medication</h4>
                          <div className="space-y-3">
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="nameType"
                                  checked={
                                    currentMedication.nameType === "Generic"
                                  }
                                  onChange={() =>
                                    handleMedicationChangeTemplate(
                                      "nameType",
                                      "Generic"
                                    )
                                  }
                                />
                                Generic Name
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="nameType"
                                  checked={
                                    currentMedication.nameType === "Brand"
                                  }
                                  onChange={() =>
                                    handleMedicationChangeTemplate(
                                      "nameType",
                                      "Brand"
                                    )
                                  }
                                />
                                Brand Name
                              </label>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Medication Name"
                                value={currentMedication.name}
                                onChange={(e) =>
                                  handleMedicationChangeTemplate(
                                    "name",
                                    e.target.value
                                  )
                                }
                              />
                              <Input
                                placeholder="Dose (e.g., 500mg)"
                                value={currentMedication.dose}
                                onChange={(e) =>
                                  handleMedicationChangeTemplate(
                                    "dose",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Quantity"
                                value={currentMedication.quantity}
                                onChange={(e) => {
                                  if (/^\d*$/.test(e.target.value))
                                    handleMedicationChangeTemplate(
                                      "quantity",
                                      e.target.value
                                    );
                                }}
                              />
                              <Select
                                value={currentMedication.frequency}
                                onValueChange={(val) =>
                                  handleMedicationChangeTemplate(
                                    "frequency",
                                    val
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Once daily">
                                    Once daily
                                  </SelectItem>
                                  <SelectItem value="Twice daily">
                                    Twice daily
                                  </SelectItem>
                                  <SelectItem value="Three times daily">
                                    Three times daily
                                  </SelectItem>
                                  <SelectItem value="Every 8 hours">
                                    Every 8 hours
                                  </SelectItem>
                                  <SelectItem value="Every 6 hours">
                                    Every 6 hours
                                  </SelectItem>
                                  <SelectItem value="As needed">
                                    As needed
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Start Date</Label>
                                <Input
                                  type="date"
                                  value={currentMedication.startDate}
                                  onChange={(e) =>
                                    handleMedicationChangeTemplate(
                                      "startDate",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label>End Date</Label>
                                <Input
                                  type="date"
                                  value={currentMedication.endDate}
                                  onChange={(e) =>
                                    handleMedicationChangeTemplate(
                                      "endDate",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <Textarea
                              placeholder="Medication-specific notes or instructions"
                              value={currentMedication.notes}
                              onChange={(e) =>
                                handleMedicationChangeTemplate(
                                  "notes",
                                  e.target.value
                                )
                              }
                              rows={2}
                            />

                            <Button
                              onClick={addMedication}
                              disabled={
                                !currentMedication.name ||
                                !currentMedication.dose
                              }
                              className="hover:bg-[#1EAEDB]"
                            >
                              Add Medication
                            </Button>
                          </div>
                        </div>

                        {/* Medications Table */}
                        {medications.length > 0 && (
                          <div className="border rounded">
                            <div className="bg-gray-100 p-3 border-b">
                              <h4 className="font-medium">
                                Prescribed Medications
                              </h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="p-2 text-left border-r">
                                      Medication
                                    </th>
                                    <th className="p-2 text-left border-r">
                                      Dose
                                    </th>
                                    <th className="p-2 text-left border-r">
                                      Quantity
                                    </th>
                                    <th className="p-2 text-left border-r">
                                      Frequency
                                    </th>
                                    <th className="p-2 text-left border-r">
                                      Duration
                                    </th>
                                    <th className="p-2 text-left border-r">
                                      Notes
                                    </th>
                                    <th className="p-2 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {medications.map((med, index) => (
                                    <tr
                                      key={med.id}
                                      className="border-b hover:bg-gray-50"
                                    >
                                      <td className="p-2 border-r">
                                        <div className="font-medium">
                                          {med.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          ({med.nameType})
                                        </div>
                                      </td>
                                      <td className="p-2 border-r">
                                        {med.dose}
                                      </td>
                                      <td className="p-2 border-r">
                                        {med.quantity}
                                      </td>
                                      <td className="p-2 border-r">
                                        {med.frequency}
                                      </td>
                                      <td className="p-2 border-r">
                                        {med.startDate && med.endDate
                                          ? `${med.startDate} to ${med.endDate}`
                                          : med.startDate ||
                                            med.endDate ||
                                            "Not specified"}
                                      </td>
                                      <td className="p-2 border-r">
                                        {med.notes || "-"}
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex justify-center gap-2">
                                          <Pencil
                                            className="h-4 w-4 text-[#1EAEDB] cursor-pointer hover:text-blue-600"
                                            onClick={() =>
                                              editMedication(med.id)
                                            }
                                          />
                                          <Trash2
                                            className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700"
                                            onClick={() =>
                                              removeMedication(med.id)
                                            }
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* General Prescription Notes */}
                        <div>
                          <Label>General Prescription Notes</Label>
                          <Textarea
                            placeholder="Any general instructions or notes for the entire prescription"
                            value={templateData.generalNotes || ""}
                            onChange={(e) =>
                              handlePrescriptionChange(
                                "generalNotes",
                                e.target.value
                              )
                            }
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            variant="outline"
                            className="hover:bg-[#1EAEDB] hover:text-white"
                            onClick={() => {
                              setSelectedTemplate("");
                              setShowTemplateForm(false);
                              setMedications([]);
                              setCurrentMedication({
                                name: "",
                                dose: "",
                                quantity: "",
                                frequency: "",
                                startDate: "",
                                endDate: "",
                                notes: "",
                                nameType: "Generic",
                              });
                              setTemplateData({});
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleTemplateSave}
                            className="hover:bg-[#1EAEDB]"
                            disabled={medications.length === 0}
                          >
                            Save E-Prescription
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Other tabs content would go here if needed */}
                    {currentPrescriptionTab !== "New" && (
                      <div className="text-center text-gray-500 py-8">
                        This feature will be available in future updates.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Display Created Medical Documents */}
          {(isDoctor || isAdmin) && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">Recent Medical Documents</h3>

              {/* SOAP Notes Section */}
              {soapNotes.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-[#1EAEDB]">
                    SOAP Notes ({soapNotes.length})
                  </h4>
                  <Accordion type="single" collapsible className="w-full">
                    {soapNotes.slice(0, 3).map((soap, idx) => (
                      <AccordionItem
                        key={soap.id}
                        value={`soap-${idx}`}
                        className="relative"
                      >
                        <AccordionTrigger className="text-left">
                          SOAP Note -{" "}
                          {new Date(soap.dateCreated).toLocaleDateString()}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="space-y-2">
                              <div>
                                <strong>Subjective:</strong>{" "}
                                {soap.data.subjective || "N/A"}
                              </div>
                              <div>
                                <strong>Objective:</strong>{" "}
                                {soap.data.objective || "N/A"}
                              </div>
                              <div>
                                <strong>Assessment:</strong>{" "}
                                {soap.data.assessment || "N/A"}
                              </div>
                              <div>
                                <strong>Plan:</strong> {soap.data.plan || "N/A"}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              Created by: {soap.createdBy} on{" "}
                              {new Date(soap.dateCreated).toLocaleString()}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {/* E-Prescriptions Section */}
              {prescriptions.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-[#1EAEDB]">
                    E-Prescriptions ({prescriptions.length})
                  </h4>
                  <Accordion type="single" collapsible className="w-full">
                    {prescriptions.slice(0, 3).map((prescription, idx) => (
                      <AccordionItem
                        key={prescription.id}
                        value={`prescription-${idx}`}
                        className="relative"
                      >
                        <AccordionTrigger className="text-left">
                          E-Prescription -{" "}
                          {new Date(
                            prescription.dateCreated
                          ).toLocaleDateString()}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="space-y-3">
                              {prescription.data.medications &&
                              prescription.data.medications.length > 0 ? (
                                <div className="border rounded">
                                  <div className="bg-gray-100 p-2 border-b">
                                    <h5 className="font-medium text-sm">
                                      Prescribed Medications
                                    </h5>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="p-2 text-left border-r">
                                            Medication
                                          </th>
                                          <th className="p-2 text-left border-r">
                                            Dose
                                          </th>
                                          <th className="p-2 text-left border-r">
                                            Qty
                                          </th>
                                          <th className="p-2 text-left border-r">
                                            Frequency
                                          </th>
                                          <th className="p-2 text-left">
                                            Notes
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {prescription.data.medications.map(
                                          (med: any, medIndex: number) => (
                                            <tr
                                              key={medIndex}
                                              className="border-b"
                                            >
                                              <td className="p-2 border-r">
                                                <div className="font-medium">
                                                  {med.name ||
                                                    med.medication_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  (
                                                  {med.nameType ||
                                                    med.name_type ||
                                                    "Generic"}
                                                  )
                                                </div>
                                              </td>
                                              <td className="p-2 border-r">
                                                {med.dose || med.dosage}
                                              </td>
                                              <td className="p-2 border-r">
                                                {med.quantity}
                                              </td>
                                              <td className="p-2 border-r">
                                                {med.frequency}
                                              </td>
                                              <td className="p-2">
                                                {med.notes ||
                                                  med.instructions ||
                                                  "-"}
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  No medications prescribed
                                </div>
                              )}
                              {prescription.data.generalInstructions && (
                                <div className="bg-blue-50 p-2 rounded">
                                  <strong className="text-sm">
                                    General Instructions:
                                  </strong>
                                  <div className="text-sm mt-1">
                                    {prescription.data.generalInstructions}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              Created by: {prescription.createdBy} on{" "}
                              {new Date(
                                prescription.dateCreated
                              ).toLocaleString()}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {/* Clinical Notes Section */}
              {blankNotes.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-[#1EAEDB]">
                    Clinical Notes ({blankNotes.length})
                  </h4>
                  <Accordion type="single" collapsible className="w-full">
                    {blankNotes.slice(0, 3).map((note, idx) => (
                      <AccordionItem
                        key={note.id}
                        value={`clinical-${idx}`}
                        className="relative"
                      >
                        <AccordionTrigger className="text-left">
                          {note.data.title} -{" "}
                          {new Date(note.dateCreated).toLocaleDateString()}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="space-y-2">
                              <div>
                                <strong>Title:</strong>{" "}
                                {note.data.title || "N/A"}
                              </div>
                              <div>
                                <strong>Content:</strong>{" "}
                                {note.data.content || "N/A"}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              Created by: {note.createdBy} on{" "}
                              {new Date(note.dateCreated).toLocaleString()}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {/* Show message if no documents */}
              {soapNotes.length === 0 &&
                prescriptions.length === 0 &&
                blankNotes.length === 0 && (
                  <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No medical documents created yet.</p>
                    <p className="text-sm">
                      Use the templates above to create SOAP notes,
                      prescriptions, or clinical notes.
                    </p>
                  </div>
                )}
            </div>
          )}

          {isEditing && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleNext}>Next: Documents</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents">{renderDocuments()}</TabsContent>
      </Tabs>

      {/* Document Creation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create{" "}
              {createDocumentType === "prescription"
                ? "E-Prescription"
                : createDocumentType === "soap"
                ? "SOAP Note"
                : "Clinical Note"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {createDocumentType === "prescription" && (
              <div className="space-y-4">
                {(documentData.medications || []).map(
                  (med: any, idx: number) => (
                    <div
                      key={idx}
                      className="border p-3 rounded mb-2 bg-gray-50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                        <div>
                          <Label>Medication Name</Label>
                          <Input
                            value={med.name || ""}
                            onChange={(e) =>
                              handleMedicationChange(
                                idx,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Enter medication name"
                          />
                        </div>
                        <div>
                          <Label>Dosage</Label>
                          <Input
                            value={med.dose || ""}
                            onChange={(e) =>
                              handleMedicationChange(
                                idx,
                                "dose",
                                e.target.value
                              )
                            }
                            placeholder="e.g., 500mg"
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            value={med.quantity || ""}
                            onChange={(e) =>
                              handleMedicationChange(
                                idx,
                                "quantity",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Capsule #21"
                          />
                        </div>
                        <div>
                          <Label>Frequency</Label>
                          <Input
                            value={med.frequency || ""}
                            onChange={(e) =>
                              handleMedicationChange(
                                idx,
                                "frequency",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Once a day"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={med.startDate || ""}
                            onChange={(e) =>
                              handleMedicationChange(
                                idx,
                                "startDate",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={med.endDate || ""}
                            onChange={(e) =>
                              handleMedicationChange(
                                idx,
                                "endDate",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={med.notes || ""}
                          onChange={(e) =>
                            handleMedicationChange(idx, "notes", e.target.value)
                          }
                          placeholder="Additional instructions or notes"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveMedication(idx)}
                          disabled={documentData.medications.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                )}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddMedication}
                  >
                    + Add Medication
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>General Instructions</Label>
                  <Textarea
                    value={documentData.generalInstructions || ""}
                    onChange={(e) =>
                      handleDocumentInputChange(
                        "generalInstructions",
                        e.target.value
                      )
                    }
                    placeholder="General instructions for all medications (optional)"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {createDocumentType === "soap" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subjective</Label>
                  <Textarea
                    value={documentData.subjective || ""}
                    onChange={(e) =>
                      handleDocumentInputChange("subjective", e.target.value)
                    }
                    placeholder="Patient's symptoms, complaints, and history in their own words"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Textarea
                    value={documentData.objective || ""}
                    onChange={(e) =>
                      handleDocumentInputChange("objective", e.target.value)
                    }
                    placeholder="Measurable or observed findings"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assessment</Label>
                  <Textarea
                    value={documentData.assessment || ""}
                    onChange={(e) =>
                      handleDocumentInputChange("assessment", e.target.value)
                    }
                    placeholder="Clinical assessment or diagnosis"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Textarea
                    value={documentData.plan || ""}
                    onChange={(e) =>
                      handleDocumentInputChange("plan", e.target.value)
                    }
                    placeholder="Treatment plan, follow-up, or next steps"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {createDocumentType === "blank" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={documentData.title || ""}
                    onChange={(e) =>
                      handleDocumentInputChange("title", e.target.value)
                    }
                    placeholder="Enter note title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={documentData.content || ""}
                    onChange={(e) =>
                      handleDocumentInputChange("content", e.target.value)
                    }
                    placeholder="Enter your clinical notes here..."
                    rows={10}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveDocument}>
              Save{" "}
              {createDocumentType === "prescription"
                ? "Prescription"
                : createDocumentType === "soap"
                ? "SOAP Note"
                : "Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Settings Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Patient Record</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Select the sections and documents to include in the patient
              record:
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="comprehensiveProfile"
                  checked={printSettings.includeComprehensiveProfile}
                  onCheckedChange={(checked) =>
                    handlePrintSettingsChange(
                      "includeComprehensiveProfile",
                      !!checked
                    )
                  }
                />
                <label htmlFor="comprehensiveProfile" className="font-medium">
                  Comprehensive Profile (Personal Info, Physical Exam, Medical
                  Info)
                </label>
              </div>

              <hr className="my-2" />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prescriptions"
                  checked={printSettings.includePrescriptions}
                  onCheckedChange={(checked) =>
                    handlePrintSettingsChange("includePrescriptions", !!checked)
                  }
                  disabled={prescriptions.length === 0}
                />
                <label
                  htmlFor="prescriptions"
                  className={
                    prescriptions.length === 0 ? "text-muted-foreground" : ""
                  }
                >
                  E-Prescriptions ({prescriptions.length})
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soapNotes"
                  checked={printSettings.includeSoapNotes}
                  onCheckedChange={(checked) =>
                    handlePrintSettingsChange("includeSoapNotes", !!checked)
                  }
                  disabled={soapNotes.length === 0}
                />
                <label
                  htmlFor="soapNotes"
                  className={
                    soapNotes.length === 0 ? "text-muted-foreground" : ""
                  }
                >
                  SOAP Notes ({soapNotes.length})
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clinicalNotes"
                  checked={printSettings.includeClinicalNotes}
                  onCheckedChange={(checked) =>
                    handlePrintSettingsChange("includeClinicalNotes", !!checked)
                  }
                  disabled={blankNotes.length === 0}
                />
                <label
                  htmlFor="clinicalNotes"
                  className={
                    blankNotes.length === 0 ? "text-muted-foreground" : ""
                  }
                >
                  Clinical Notes ({blankNotes.length})
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="labResults"
                  checked={printSettings.includeLabResults}
                  onCheckedChange={(checked) =>
                    handlePrintSettingsChange("includeLabResults", !!checked)
                  }
                  disabled={labResults.length === 0}
                />
                <label
                  htmlFor="labResults"
                  className={
                    labResults.length === 0 ? "text-muted-foreground" : ""
                  }
                >
                  Lab Results ({labResults.length})
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="certificates"
                  checked={printSettings.includeMedicalCertificates}
                  onCheckedChange={(checked) =>
                    handlePrintSettingsChange(
                      "includeMedicalCertificates",
                      !!checked
                    )
                  }
                  disabled={certificates.length === 0}
                />
                <label
                  htmlFor="certificates"
                  className={
                    certificates.length === 0 ? "text-muted-foreground" : ""
                  }
                >
                  Medical Certificates ({certificates.length})
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePreviewPrint}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleConfirmPrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientManagement;
