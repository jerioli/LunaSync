import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import { medicalDocumentsAPI } from "@/lib/medicalDocumentsAPI";
import { parseApiError } from "@/utils/errorHandler";
import { Pencil, Trash2 } from "lucide-react";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const AddPatient = () => {
  const navigate = useNavigate();
  const { addPatient, currentUser, patients } = useClinic();
  const { toast } = useToast();

  // Check user role for access control
  const isDoctor = currentUser?.role === "doctor";
  const isReceptionist = currentUser?.role === "receptionist";
  const isAdmin = currentUser?.role === "admin";

  // Redirect if user doesn't have permission to add patients
  React.useEffect(() => {
    if (currentUser && !isDoctor && !isReceptionist && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to add patients.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [currentUser, isDoctor, isReceptionist, isAdmin, navigate, toast]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    middle_initial: "",
    suffix: "",
    gender: "",
    marital_status: "" as
      | "single"
      | "married"
      | "divorced"
      | "widowed"
      | "prefer_not_to_say"
      | "",
    address: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    religion: "",
  });

  const [loading, setLoading] = useState(false);
  const [noMiddleName, setNoMiddleName] = useState(false);

  // New state for templates and forms
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [currentPrescriptionTab, setCurrentPrescriptionTab] = useState("New");
  const [templateData, setTemplateData] = useState<any>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Medication management state
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

  // Clinical Notes state
  const [clinicalNoteData, setClinicalNoteData] = useState({
    title: "",
    notes: "",
    findings: "",
    recommendations: "",
    followUpRequired: false,
    followUpDate: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value as any, // Use 'as any' to allow flexible typing for different field types
    }));
  };

  const [medicalHistory, setMedicalHistory] = useState({
    chiefComplaint: "",
    categories: {
      illnesses: false,
      surgeries: false,
      medications: false,
      familyHistory: false,
      socialHistory: false,
      allergies: false,
    },
    categoryDetails: {
      illnesses: "",
      surgeries: "",
      medications: "",
      familyHistory: "",
      socialHistory: "",
      allergies: "",
    },
  });

  // Physical examination state
  const [physicalExamination, setPhysicalExamination] = useState({
    height: "",
    weight: "",
    bloodPressure: "",
    temperature: "",
    pulseRate: "",
    respiratoryRate: "",
    notes: "",
  });

  const handleHistoryChange = (
    field: string,
    value: string | boolean | undefined,
    isCategory = false
  ) => {
    setMedicalHistory((prev) => {
      if (field === "chiefComplaint") {
        return { ...prev, chiefComplaint: value as string };
      }

      if (isCategory) {
        // Handle category toggle (checkbox)
        return {
          ...prev,
          categories: { ...prev.categories, [field]: value as boolean },
        };
      } else {
        // Handle category details (textarea content)
        if (value === undefined) {
          const updated = { ...prev };
          updated.categories[field] = false;
          updated.categoryDetails[field] = "";
          return updated;
        }
        return {
          ...prev,
          categoryDetails: {
            ...prev.categoryDetails,
            [field]: value as string,
          },
        };
      }
    });
  };

  const handlePhysicalExamChange = (field: string, value: string) => {
    setPhysicalExamination((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Template handling functions
  const handleTemplateSave = () => {
    if (selectedTemplate === "E-Prescription") {
      // Save prescription with all medications
      const prescriptionData = {
        medications: medications,
        generalNotes: templateData.generalNotes || "",
      };

      if (deleteIndex !== null) {
        const updatedTemplates = [...templates];
        updatedTemplates[deleteIndex] = {
          type: selectedTemplate,
          data: prescriptionData,
        };
        setTemplates(updatedTemplates);
        setDeleteIndex(null);
      } else {
        setTemplates([
          ...templates,
          { type: selectedTemplate, data: prescriptionData },
        ]);
      }
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
    } else if (selectedTemplate && templateData) {
      if (deleteIndex !== null) {
        const updatedTemplates = [...templates];
        updatedTemplates[deleteIndex] = {
          type: selectedTemplate,
          data: templateData,
        };
        setTemplates(updatedTemplates);
        setDeleteIndex(null);
      } else {
        setTemplates([
          ...templates,
          { type: selectedTemplate, data: templateData },
        ]);
      }
    }
    setTemplateData({});
    setSelectedTemplate("");
    setShowForm(false);
  };

  // Medication handling functions
  const handleMedicationChange = (field: string, value: string) => {
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

  // Clinical Notes handling functions
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

    // We need a patient ID, but since this is AddPatient, we don't have one yet
    // So we'll save it as a template for now and it will be saved when the patient is created
    if (!form.first_name || !form.last_name) {
      toast({
        title: "Patient Required",
        description: "Please fill in patient information first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, add it to templates like other documents
      const clinicalNote = {
        type: "Clinical Notes",
        data: {
          title: clinicalNoteData.title,
          notes: clinicalNoteData.notes,
          findings: clinicalNoteData.findings,
          recommendations: clinicalNoteData.recommendations,
          followUpRequired: clinicalNoteData.followUpRequired,
          followUpDate: clinicalNoteData.followUpDate,
          saveToDatabase: true, // Flag to indicate this should be saved to DB
        },
      };

      setTemplates([...templates, clinicalNote]);

      // Reset form
      setClinicalNoteData({
        title: "",
        notes: "",
        findings: "",
        recommendations: "",
        followUpRequired: false,
        followUpDate: "",
      });

      setSelectedTemplate("");
      setShowForm(false);

      toast({
        title: "Success",
        description:
          "Clinical note will be saved to database when patient is created.",
      });
    } catch (error: any) {
      console.error("Error preparing clinical note:", error);
      toast({
        title: "Error",
        description: "Failed to prepare clinical note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrescriptionChange = (field: string, value: any) => {
    setTemplateData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditTemplate = (index: number) => {
    const template = templates[index];
    setSelectedTemplate(template.type);
    setDeleteIndex(index);

    if (template.type === "E-Prescription") {
      setMedications(template.data.medications || []);
      setTemplateData({ generalNotes: template.data.generalNotes || "" });
    } else if (template.type === "Clinical Notes") {
      setClinicalNoteData({
        title: template.data.title || "",
        notes: template.data.notes || "",
        findings: template.data.findings || "",
        recommendations: template.data.recommendations || "",
        followUpRequired: template.data.followUpRequired || false,
        followUpDate: template.data.followUpDate || "",
      });
    } else {
      setTemplateData(template.data);
    }

    setShowForm(true);
  };

  const handleDeleteTemplate = () => {
    if (deleteIndex !== null) {
      const updatedTemplates = [...templates];
      updatedTemplates.splice(deleteIndex, 1);
      setTemplates(updatedTemplates);
      setDeleteIndex(null);
      setShowDeleteConfirm(false);
    }
  };

  const personalRef = useRef(null);
  const examRef = useRef(null);
  const historyRef = useRef(null);

  const scrollTo = (ref: any) =>
    ref.current?.scrollIntoView({ behavior: "smooth" });
  const [activeTab, setActiveTab] = useState<"personal" | "exam" | "history">(
    "personal"
  );

  const [showCancelModal, setShowCancelModal] = useState(false);

  const placeholders: Record<string, string> = {
    chiefComplaint: "Write here the complaint",
    illnesses: "List any illnesses",
    surgeries: "List any surgeries",
    allergies: "List any allergies",
    medications: "List any medications",
    familyHistory: "Describe family medical history",
    socialHistory: "Describe social history",
    subjective:
      "Describe the patient's symptoms, complaints, and history in their own words",
    objective: "Record measurable or observed findings",
    assessment: "Summarize your clinical assessment or diagnosis",
    plan: "Outline the treatment plan, follow-up, or next steps",
  };

  const handleSaveAll = async () => {
    // Basic validation
    if (
      !form.first_name ||
      !form.last_name ||
      !form.email ||
      !form.phone ||
      !form.dateOfBirth ||
      !form.gender
    ) {
      toast({
        title: "Validation Error",
        description:
          "Please fill in all required fields (First Name, Last Name, Email, Phone, Date of Birth, Sex).",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate patients
    const existingEmailPatient = patients.find(
      (patient) =>
        patient.email &&
        patient.email.toLowerCase() === form.email.toLowerCase()
    );

    if (existingEmailPatient) {
      toast({
        title: "Duplicate Patient",
        description: `A patient with email "${form.email}" already exists. Please use a different email address.`,
        variant: "destructive",
      });
      return;
    }

    const existingPhonePatient = patients.find(
      (patient) => patient.phone && patient.phone === form.phone
    );

    if (existingPhonePatient) {
      toast({
        title: "Duplicate Patient",
        description: `A patient with phone number "${form.phone}" already exists. Please use a different phone number.`,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate based on name and date of birth
    const existingNameDatePatient = patients.find((patient) => {
      if (!patient.first_name || !patient.last_name || !patient.date_of_birth) {
        return false;
      }

      return (
        patient.first_name.toLowerCase() === form.first_name.toLowerCase() &&
        patient.last_name.toLowerCase() === form.last_name.toLowerCase() &&
        patient.date_of_birth === form.dateOfBirth
      );
    });

    if (existingNameDatePatient) {
      toast({
        title: "Duplicate Patient",
        description: `A patient named "${form.first_name} ${form.last_name}" with the same date of birth (${form.dateOfBirth}) already exists. Please verify the patient information.`,
        variant: "destructive",
      });
      return;
    }

    // Check if user has permission to add patients
    if (!isDoctor && !isReceptionist && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to add patients.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Construct full name for backward compatibility
      const nameParts = [];
      if (form.first_name) nameParts.push(form.first_name);
      if (
        form.middle_initial &&
        form.middle_initial.trim() !== "" &&
        !noMiddleName
      ) {
        const initial = form.middle_initial.endsWith(".")
          ? form.middle_initial
          : form.middle_initial + ".";
        nameParts.push(initial);
      }
      if (form.last_name) nameParts.push(form.last_name);
      if (form.suffix) nameParts.push(form.suffix);
      const fullName = nameParts.join(" ");

      // Send both new fields and legacy name field to the backend
      const patientData = {
        name: fullName, // For backward compatibility
        first_name: form.first_name,
        last_name: form.last_name,
        middle_initial:
          !noMiddleName &&
          form.middle_initial &&
          form.middle_initial.trim() !== ""
            ? form.middle_initial
            : undefined,
        suffix: form.suffix || undefined,
        email: form.email,
        phone: form.phone,
        date_of_birth: form.dateOfBirth, // Convert from frontend field name
        gender: form.gender.toLowerCase() as "male" | "female" | "other",
        address: form.address,
        religion: form.religion || undefined,
        marital_status: (form.marital_status || "single") as
          | "single"
          | "married"
          | "divorced"
          | "widowed"
          | "prefer_not_to_say",
        medical_info:
          isDoctor || isAdmin
            ? {
                medicalHistory: medicalHistory.chiefComplaint || "",
                allergies: medicalHistory.categories.allergies
                  ? [medicalHistory.categoryDetails.allergies]
                  : [],
                bloodType: "",
                chiefComplaint: medicalHistory.chiefComplaint,
                illnesses: medicalHistory.categoryDetails.illnesses,
                surgeries: medicalHistory.categoryDetails.surgeries,
                medications: medicalHistory.categoryDetails.medications,
                familyHistory: medicalHistory.categoryDetails.familyHistory,
                socialHistory: medicalHistory.categoryDetails.socialHistory,
              }
            : undefined,
        physical_examination:
          isDoctor || isAdmin ? physicalExamination : undefined,
      };

      const savedPatient = await addPatient(patientData);

      // Save clinical notes to database if any
      const clinicalNotesToSave = templates.filter(
        (template) =>
          template.type === "Clinical Notes" && template.data.saveToDatabase
      );

      if (clinicalNotesToSave.length > 0 && savedPatient?.id) {
        for (const noteTemplate of clinicalNotesToSave) {
          try {
            const clinicalNoteData = {
              patient: Number(savedPatient.id),
              title: noteTemplate.data.title,
              description: "Clinical Note",
              note_type: "clinical_note",
              clinical_context: noteTemplate.data.notes,
              findings: noteTemplate.data.findings || "",
              recommendations: noteTemplate.data.recommendations || "",
              follow_up_required: noteTemplate.data.followUpRequired || false,
              follow_up_date: noteTemplate.data.followUpDate || null,
              document_date: new Date().toISOString().split("T")[0],
              status: "active",
            };

            await medicalDocumentsAPI.createClinicalNote(clinicalNoteData);
          } catch (noteError) {
            console.error("Error saving clinical note:", noteError);
            // Continue with other notes even if one fails
          }
        }
      }

      toast({
        title: "Success",
        description:
          isDoctor || isAdmin
            ? `${fullName} has been successfully added as a patient with medical information.${
                clinicalNotesToSave.length > 0
                  ? ` ${clinicalNotesToSave.length} clinical note(s) saved.`
                  : ""
              }`
            : `${fullName} has been successfully added as a patient. Medical information can be added later by a doctor.`,
      });

      navigate("/patients");
    } catch (error: any) {
      console.error("Error saving patient:", error);

      // Use the error handler utility to get a better error message
      const parsedError = parseApiError(
        error,
        "Failed to save patient. Please try again."
      );

      toast({
        title: parsedError.title,
        description: parsedError.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center pb-4 px-8 border-b h-20">
        <h1 className="text-3xl font-bold">Add New Patient</h1>
        <button
          onClick={() => navigate("/patients")}
          className="text-[#1EAEDB] hover:underline"
        >
          ◄ Back to Patients List
        </button>
      </div>

      <Card className="h-[82vh] flex flex-col">
        <CardHeader className="border-b">
          <nav className="flex justify-around items-center">
            <ul className="flex gap-10 text-base">
              <li>
                <button
                  onClick={() => {
                    setActiveTab("personal");
                    scrollTo(personalRef);
                  }}
                  className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                    activeTab === "personal"
                      ? "text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]"
                      : ""
                  }`}
                >
                  Personal Information
                </button>
              </li>
              {(isDoctor || isAdmin) && (
                <>
                  <li>
                    <button
                      onClick={() => {
                        setActiveTab("exam");
                        scrollTo(examRef);
                      }}
                      className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                        activeTab === "exam"
                          ? "text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]"
                          : ""
                      }`}
                    >
                      Physical Examination
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setActiveTab("history");
                        scrollTo(historyRef);
                      }}
                      className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                        activeTab === "history"
                          ? "text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]"
                          : ""
                      }`}
                    >
                      Medical History
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-10 py-6">
          {isReceptionist && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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
                    <strong>Note:</strong> As a receptionist, you can only add
                    personal information. Physical examination and medical
                    history can only be added by doctors or admins.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={personalRef} className="border p-4 rounded">
            <h2 className="text-xl font-bold mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Enter first name"
                  value={form.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                />
              </div>
              <div>
                <Label>
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Enter last name"
                  value={form.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Middle Name</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="noMiddleName"
                      checked={noMiddleName}
                      onChange={(e) => {
                        setNoMiddleName(e.target.checked);
                        if (e.target.checked) {
                          handleChange("middle_initial", "");
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label
                      htmlFor="noMiddleName"
                      className="text-sm text-gray-600"
                    >
                      No middle name
                    </label>
                  </div>
                </div>
                <Input
                  placeholder="Enter middle name"
                  value={form.middle_initial}
                  onChange={(e) =>
                    handleChange("middle_initial", e.target.value)
                  }
                  disabled={noMiddleName}
                  className={noMiddleName ? "bg-gray-100" : ""}
                />
              </div>
              <div>
                <Label>Suffix</Label>
                <Select
                  value={form.suffix || "none"}
                  onValueChange={(value) =>
                    handleChange("suffix", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select suffix (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Jr.">Jr.</SelectItem>
                    <SelectItem value="Sr.">Sr.</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Sex <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => handleChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marital Status</Label>
                <Select
                  value={form.marital_status}
                  onValueChange={(value) =>
                    handleChange("marital_status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Home Address</Label>
                <Input
                  placeholder="Input your home address"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  required
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                />
              </div>
              <div>
                <Label>
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  type="email"
                  placeholder="Input your email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label>
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Input your phone number"
                  value={form.phone}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value))
                      handleChange("phone", e.target.value);
                  }}
                />
              </div>
              <div>
                <Label>Religion</Label>
                <Input
                  placeholder="Input your religion"
                  value={form.religion}
                  onChange={(e) => handleChange("religion", e.target.value)}
                />
              </div>
            </div>
          </div>

          {(isDoctor || isAdmin) && (
            <>
              <div ref={examRef} className="border p-4 rounded">
                <h2 className="text-xl font-bold mb-4">Physical Examination</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Vital Signs</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          placeholder="e.g., 175 cm"
                          value={physicalExamination.height}
                          onChange={(e) =>
                            handlePhysicalExamChange("height", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight</Label>
                        <Input
                          id="weight"
                          placeholder="e.g., 70 kg"
                          value={physicalExamination.weight}
                          onChange={(e) =>
                            handlePhysicalExamChange("weight", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bloodPressure">Blood Pressure</Label>
                        <Input
                          id="bloodPressure"
                          placeholder="e.g., 120/80 mmHg"
                          value={physicalExamination.bloodPressure}
                          onChange={(e) =>
                            handlePhysicalExamChange(
                              "bloodPressure",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Additional Vitals</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input
                          id="temperature"
                          placeholder="e.g., 98.6°F or 37°C"
                          value={physicalExamination.temperature}
                          onChange={(e) =>
                            handlePhysicalExamChange(
                              "temperature",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pulseRate">Pulse Rate</Label>
                        <Input
                          id="pulseRate"
                          placeholder="e.g., 72 bpm"
                          value={physicalExamination.pulseRate}
                          onChange={(e) =>
                            handlePhysicalExamChange(
                              "pulseRate",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="respiratoryRate">
                          Respiratory Rate
                        </Label>
                        <Input
                          id="respiratoryRate"
                          placeholder="e.g., 16/min"
                          value={physicalExamination.respiratoryRate}
                          onChange={(e) =>
                            handlePhysicalExamChange(
                              "respiratoryRate",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SOAP Notes, E-Prescription, and Blank Template Section */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-4">
                    Medical Documentation Templates
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Button
                        onClick={() => {
                          setSelectedTemplate("SOAP Note");
                          setShowForm(true);
                        }}
                        variant="outline"
                        className="hover:bg-[#1EAEDB] hover:text-white"
                      >
                        SOAP Note
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedTemplate("E-Prescription");
                          setShowForm(true);
                        }}
                        variant="outline"
                        className="hover:bg-[#1EAEDB] hover:text-white"
                      >
                        E-Prescription
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedTemplate("Clinical Notes");
                          setShowForm(true);
                        }}
                        variant="outline"
                        className="hover:bg-[#1EAEDB] hover:text-white"
                      >
                        Clinical Notes
                      </Button>
                    </div>

                    {showForm && selectedTemplate === "SOAP Note" && (
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
                                  handlePrescriptionChange(
                                    field,
                                    e.target.value
                                  )
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
                            onClick={() => setShowCancelDialog(true)}
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

                    {showForm && selectedTemplate === "Clinical Notes" && (
                      <div className="border p-4 rounded-lg">
                        <div className="space-y-4">
                          <div>
                            <Label>
                              Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={clinicalNoteData.title}
                              onChange={(e) =>
                                handleClinicalNoteChange(
                                  "title",
                                  e.target.value
                                )
                              }
                              placeholder="Enter clinical note title (e.g., Follow-up Visit, Initial Assessment)"
                            />
                          </div>

                          <div>
                            <Label>
                              Clinical Notes{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              value={clinicalNoteData.notes}
                              onChange={(e) =>
                                handleClinicalNoteChange(
                                  "notes",
                                  e.target.value
                                )
                              }
                              placeholder="Enter your clinical notes here..."
                              rows={4}
                            />
                          </div>

                          <div>
                            <Label>Findings</Label>
                            <Textarea
                              value={clinicalNoteData.findings}
                              onChange={(e) =>
                                handleClinicalNoteChange(
                                  "findings",
                                  e.target.value
                                )
                              }
                              placeholder="Enter clinical findings..."
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label>Recommendations</Label>
                            <Textarea
                              value={clinicalNoteData.recommendations}
                              onChange={(e) =>
                                handleClinicalNoteChange(
                                  "recommendations",
                                  e.target.value
                                )
                              }
                              placeholder="Enter recommendations and treatment plan..."
                              rows={3}
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="followUpRequired"
                                checked={clinicalNoteData.followUpRequired}
                                onChange={(e) =>
                                  handleClinicalNoteChange(
                                    "followUpRequired",
                                    e.target.checked
                                  )
                                }
                              />
                              <Label
                                htmlFor="followUpRequired"
                                className="text-sm font-normal cursor-pointer"
                              >
                                Follow-up required
                              </Label>
                            </div>

                            {clinicalNoteData.followUpRequired && (
                              <div>
                                <Label>Follow-up Date</Label>
                                <Input
                                  type="date"
                                  value={clinicalNoteData.followUpDate}
                                  onChange={(e) =>
                                    handleClinicalNoteChange(
                                      "followUpDate",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            variant="outline"
                            className="hover:bg-[#1EAEDB] hover:text-white"
                            onClick={() => setSelectedTemplate("")}
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

                    {showForm && selectedTemplate === "E-Prescription" && (
                      <div className="space-y-4 border p-4 rounded-lg">
                        <div className="flex gap-2">
                          {["New", "Favorites", "Generic", "Brand"].map(
                            (tab) => (
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
                            )
                          )}
                        </div>

                        {currentPrescriptionTab === "New" && (
                          <div className="space-y-4">
                            {/* Add Medication Form */}
                            <div className="bg-gray-50 p-4 rounded border">
                              <h4 className="font-medium mb-3">
                                Add Medication
                              </h4>
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
                                        handleMedicationChange(
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
                                        handleMedicationChange(
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
                                      handleMedicationChange(
                                        "name",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <Input
                                    placeholder="Dose (e.g., 500mg)"
                                    value={currentMedication.dose}
                                    onChange={(e) =>
                                      handleMedicationChange(
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
                                        handleMedicationChange(
                                          "quantity",
                                          e.target.value
                                        );
                                    }}
                                  />
                                  <Select
                                    value={currentMedication.frequency}
                                    onValueChange={(val) =>
                                      handleMedicationChange("frequency", val)
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
                                        handleMedicationChange(
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
                                        handleMedicationChange(
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
                                    handleMedicationChange(
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
                                        <th className="p-2 text-center">
                                          Actions
                                        </th>
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
                                placeholder="General notes for this prescription (e.g., dietary instructions, follow-up recommendations)"
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
                                onClick={() => setSelectedTemplate("")}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleTemplateSave}
                                className="hover:bg-[#1EAEDB]"
                                disabled={medications.length === 0}
                              >
                                Save Prescription
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Templates Accordion */}
                    {templates.length > 0 && (
                      <Accordion type="single" collapsible className="w-full">
                        {templates.map((item, idx) => (
                          <AccordionItem
                            key={idx}
                            value={`item-${idx}`}
                            className="relative"
                          >
                            <AccordionTrigger className="text-left">
                              {item.type} {idx + 1}
                            </AccordionTrigger>
                            <div className="absolute right-4 top-3 flex gap-2 z-10">
                              <Pencil
                                className="h-4 w-4 text-[#1EAEDB] cursor-pointer hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTemplate(idx);
                                }}
                              />
                              <Trash2
                                className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteIndex(idx);
                                  setShowDeleteConfirm(true);
                                }}
                              />
                            </div>
                            <AccordionContent>
                              <div className="bg-gray-50 p-3 rounded">
                                {item.type === "SOAP Note" && (
                                  <div className="space-y-2">
                                    <div>
                                      <strong>Subjective:</strong>{" "}
                                      {item.data.subjective || "N/A"}
                                    </div>
                                    <div>
                                      <strong>Objective:</strong>{" "}
                                      {item.data.objective || "N/A"}
                                    </div>
                                    <div>
                                      <strong>Assessment:</strong>{" "}
                                      {item.data.assessment || "N/A"}
                                    </div>
                                    <div>
                                      <strong>Plan:</strong>{" "}
                                      {item.data.plan || "N/A"}
                                    </div>
                                  </div>
                                )}
                                {item.type === "E-Prescription" && (
                                  <div className="space-y-3">
                                    {item.data.medications &&
                                    item.data.medications.length > 0 ? (
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
                                                <th className="p-2 text-left border-r">
                                                  Duration
                                                </th>
                                                <th className="p-2 text-left">
                                                  Notes
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {item.data.medications.map(
                                                (
                                                  med: any,
                                                  medIndex: number
                                                ) => (
                                                  <tr
                                                    key={medIndex}
                                                    className="border-b"
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
                                                      {med.startDate &&
                                                      med.endDate
                                                        ? `${med.startDate} to ${med.endDate}`
                                                        : med.startDate ||
                                                          med.endDate ||
                                                          "Not specified"}
                                                    </td>
                                                    <td className="p-2">
                                                      {med.notes || "-"}
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
                                    {item.data.generalNotes && (
                                      <div className="bg-blue-50 p-2 rounded">
                                        <strong className="text-sm">
                                          General Notes:
                                        </strong>
                                        <div className="text-sm mt-1">
                                          {item.data.generalNotes}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {item.type === "Clinical Notes" && (
                                  <div className="space-y-2">
                                    <div>
                                      <strong>Title:</strong>{" "}
                                      {item.data.title || "N/A"}
                                    </div>
                                    <div>
                                      <strong>Notes:</strong>{" "}
                                      {item.data.notes || "N/A"}
                                    </div>
                                    {item.data.findings && (
                                      <div>
                                        <strong>Findings:</strong>{" "}
                                        {item.data.findings}
                                      </div>
                                    )}
                                    {item.data.recommendations && (
                                      <div>
                                        <strong>Recommendations:</strong>{" "}
                                        {item.data.recommendations}
                                      </div>
                                    )}
                                    {item.data.followUpRequired && (
                                      <div className="bg-yellow-50 p-2 rounded">
                                        <strong>Follow-up Required:</strong>{" "}
                                        {item.data.followUpDate
                                          ? `Scheduled for ${item.data.followUpDate}`
                                          : "Yes"}
                                      </div>
                                    )}
                                    {item.data.saveToDatabase && (
                                      <div className="bg-blue-50 p-2 rounded text-sm">
                                        <strong>Status:</strong> Will be saved
                                        to database when patient is created
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </div>
              </div>

              <div ref={historyRef} className="border p-4 rounded">
                <h2 className="text-xl font-bold mb-4">Medical History</h2>
                {/* Chief Complaint always visible */}
                <div className="mb-4">
                  <Label>Chief Complaint</Label>
                  <Textarea
                    value={medicalHistory.chiefComplaint}
                    onChange={(e) =>
                      handleHistoryChange("chiefComplaint", e.target.value)
                    }
                    placeholder="Enter the main reason for this medical consultation..."
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Select applicable categories:
                  </Label>

                  {/* First Row: Illnesses, Surgeries, Medications */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Illnesses */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="illnesses"
                          checked={medicalHistory.categories.illnesses}
                          onChange={(e) =>
                            handleHistoryChange(
                              "illnesses",
                              e.target.checked,
                              true
                            )
                          }
                        />
                        <Label
                          htmlFor="illnesses"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Illnesses
                        </Label>
                      </div>
                      {medicalHistory.categories.illnesses && (
                        <Textarea
                          placeholder="List any illnesses"
                          value={medicalHistory.categoryDetails.illnesses}
                          onChange={(e) =>
                            handleHistoryChange("illnesses", e.target.value)
                          }
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Surgeries */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="surgeries"
                          checked={medicalHistory.categories.surgeries}
                          onChange={(e) =>
                            handleHistoryChange(
                              "surgeries",
                              e.target.checked,
                              true
                            )
                          }
                        />
                        <Label
                          htmlFor="surgeries"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Surgeries
                        </Label>
                      </div>
                      {medicalHistory.categories.surgeries && (
                        <Textarea
                          placeholder="List any surgeries"
                          value={medicalHistory.categoryDetails.surgeries}
                          onChange={(e) =>
                            handleHistoryChange("surgeries", e.target.value)
                          }
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Medications */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="medications"
                          checked={medicalHistory.categories.medications}
                          onChange={(e) =>
                            handleHistoryChange(
                              "medications",
                              e.target.checked,
                              true
                            )
                          }
                        />
                        <Label
                          htmlFor="medications"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Medications
                        </Label>
                      </div>
                      {medicalHistory.categories.medications && (
                        <Textarea
                          placeholder="List any medications"
                          value={medicalHistory.categoryDetails.medications}
                          onChange={(e) =>
                            handleHistoryChange("medications", e.target.value)
                          }
                          rows={2}
                        />
                      )}
                    </div>
                  </div>

                  {/* Second Row: Family History, Social History, Allergies */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Family History */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="familyHistory"
                          checked={medicalHistory.categories.familyHistory}
                          onChange={(e) =>
                            handleHistoryChange(
                              "familyHistory",
                              e.target.checked,
                              true
                            )
                          }
                        />
                        <Label
                          htmlFor="familyHistory"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Family History
                        </Label>
                      </div>
                      {medicalHistory.categories.familyHistory && (
                        <Textarea
                          placeholder="Describe family medical history"
                          value={medicalHistory.categoryDetails.familyHistory}
                          onChange={(e) =>
                            handleHistoryChange("familyHistory", e.target.value)
                          }
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Social History */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="socialHistory"
                          checked={medicalHistory.categories.socialHistory}
                          onChange={(e) =>
                            handleHistoryChange(
                              "socialHistory",
                              e.target.checked,
                              true
                            )
                          }
                        />
                        <Label
                          htmlFor="socialHistory"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Social History
                        </Label>
                      </div>
                      {medicalHistory.categories.socialHistory && (
                        <Textarea
                          placeholder="Describe social history"
                          value={medicalHistory.categoryDetails.socialHistory}
                          onChange={(e) =>
                            handleHistoryChange("socialHistory", e.target.value)
                          }
                          rows={2}
                        />
                      )}
                    </div>

                    {/* Allergies */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allergies"
                          checked={medicalHistory.categories.allergies}
                          onChange={(e) =>
                            handleHistoryChange(
                              "allergies",
                              e.target.checked,
                              true
                            )
                          }
                        />
                        <Label
                          htmlFor="allergies"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Allergies
                        </Label>
                      </div>
                      {medicalHistory.categories.allergies && (
                        <Textarea
                          placeholder="List any allergies"
                          value={medicalHistory.categoryDetails.allergies}
                          onChange={(e) =>
                            handleHistoryChange("allergies", e.target.value)
                          }
                          rows={2}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSaveAll}
              className="hover:bg-[#1EAEDB]"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isDoctor || isAdmin
                ? "Save Patient Record"
                : "Save Patient (Personal Info Only)"}
            </Button>
            <Button
              variant="outline"
              className="hover:bg-[#1EAEDB] hover:text-white"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this template?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleDeleteTemplate} variant="destructive">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to cancel?</DialogTitle>
          </DialogHeader>
          <div className="mb-4">All the information will be discarded.</div>
          <DialogFooter>
            <Button
              variant="outline"
              className="hover:bg-[#1EAEDB] hover:text-white"
              onClick={() => setShowCancelDialog(false)}
            >
              No
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowCancelDialog(false);
                setShowForm(false);
                setTemplateData({});
                setSelectedTemplate("");
              }}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      {showCancelModal && (
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent>
            <div className="flex justify-between items-center">
              <DialogHeader>Confirm Cancellation</DialogHeader>
              <button onClick={() => setShowCancelModal(false)}></button>
            </div>
            <p>
              Are you sure you want to cancel? All the information will be
              discarded.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                onClick={() => navigate("/patients")}
                className="hover:bg-[#1EAEDB] hover:text-white"
              >
                Yes
              </Button>
              <Button
                variant="outline"
                className="hover:bg-[#1EAEDB] hover:text-white"
                onClick={() => setShowCancelModal(false)}
              >
                No
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AddPatient;
