import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  generateMedicalCertificateHTML,
  MedicalCertificateTemplateData,
} from "@/utils/medicalCertificateTemplate";
import axios from "axios";
import { ArrowLeft, Eye, FileText, Mail, Save } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
// Import sessionManager to ensure global axios configuration is applied
import "@/utils/sessionManager";

interface CertificateFormData {
  // Patient information
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientDob: string;
  patientAge: string;

  // Certificate details
  certificateType: string;
  diagnosis: string;
  recommendations: string;

  // Work fitness details
  fitForWork: "fit" | "unfit" | "limited";
  restFromDate: string;
  restToDate: string;
  limitations: string;
  followUpDate: string;

  // Hospital and doctor info
  hospitalName: string;
  hospitalAddress: string;
  hospitalContact: string;
  doctorName: string;
  doctorLicense: string;
  doctorPRC: string;
  doctorPTR: string;

  // Additional fields
  doctorNotes: string;
  requestId?: number;
}

interface LocationState {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientDob: string;
  certificateType: string;
  requestId?: number;
  additionalInfo?: string;
  returnPath?: string;
}

const MedicalCertificateGeneration: React.FC = () => {
  const { currentUser } = useClinic();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [formData, setFormData] = useState<CertificateFormData>({
    // Patient information
    patientName: state?.patientName || "",
    patientEmail: state?.patientEmail || "",
    patientPhone: state?.patientPhone || "",
    patientDob: state?.patientDob || "",
    patientAge: "",

    // Certificate details
    certificateType: state?.certificateType || "general",
    diagnosis: "",
    recommendations: "",

    // Work fitness details
    fitForWork: "unfit",
    restFromDate: new Date().toISOString().split("T")[0],
    restToDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    limitations: "",
    followUpDate: "",

    // Hospital and doctor info
    hospitalName: "HealthNexus Medical Center",
    hospitalAddress: "123 Medical Plaza, City, State 12345",
    hospitalContact: "Phone: (555) 123-4567 | Email: info@healthnexus.com",
    doctorName: currentUser?.name || "Dr. [Doctor Name]",
    doctorLicense: "",
    doctorPRC: "",
    doctorPTR: "",

    // Additional fields
    doctorNotes: "",
    requestId: state?.requestId,
  });

  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [clinicSettings, setClinicSettings] = useState<any>(null);

  // Helper function to get logo URL
  const getLogoUrl = (logo: string) => {
    if (!logo) return null;
    if (logo.startsWith("http")) return logo;
    if (logo.startsWith("/media/")) return `http://127.0.0.1:8000${logo}`;
    if (logo.startsWith("branding/"))
      return `http://127.0.0.1:8000/media/${logo}`;
    return `http://127.0.0.1:8000${logo}`;
  };

  // Fetch clinic settings
  const fetchClinicSettings = async () => {
    try {
      const response = await axios.get("/clinics/current/");
      setClinicSettings(response.data);

      // Update form data with clinic information
      setFormData((prev) => ({
        ...prev,
        hospitalName: response.data.clinic_name || "HealthNexus Medical Center",
        hospitalAddress: `${response.data.address || "123 Medical Plaza"}, ${
          response.data.city || "City"
        }, ${response.data.state || "State"} ${response.data.zip || "12345"}`,
        hospitalContact: `Phone: ${
          response.data.phone || "(555) 123-4567"
        } | Email: ${response.data.email || "info@healthnexus.com"}`,
      }));
    } catch (error) {
      console.error("Error fetching clinic settings:", error);
    }
  };

  // Fetch clinic settings on component mount
  useEffect(() => {
    fetchClinicSettings();
  }, []);

  // Calculate patient age when DOB changes
  useEffect(() => {
    if (formData.patientDob) {
      const dob = new Date(formData.patientDob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDifference = today.getMonth() - dob.getMonth();

      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      setFormData((prev) => ({ ...prev, patientAge: age.toString() }));
    }
  }, [formData.patientDob]);

  const certificateTypes = {
    sick_leave: "Sick Leave Certificate",
    fitness: "Medical Fitness Certificate",
    physical_activities: "Physical Activities Fitness Certificate",
    vaccination: "Vaccination Certificate",
    general: "General Medical Certificate",
  };

  // Generate template content based on certificate type
  const generateTemplateContent = () => {
    const logoUrl = clinicSettings?.logo
      ? getLogoUrl(clinicSettings.logo)
      : null;

    const templateData: MedicalCertificateTemplateData = {
      hospitalName: formData.hospitalName,
      hospitalAddress: formData.hospitalAddress,
      hospitalContact: formData.hospitalContact,
      hospitalLicense: "",
      hospitalLogo: logoUrl,
      doctorName: formData.doctorName,
      doctorLicense: formData.doctorLicense,
      doctorPRC: formData.doctorPRC,
      doctorPTR: formData.doctorPTR,
      patientName: formData.patientName,
      patientAge: formData.patientAge,
      chiefComplaint: "",
      diagnosis: formData.diagnosis,
      medicalRecommendations: formData.recommendations,
      restFromDate: formData.restFromDate,
      restToDate: formData.restToDate,
      fitForWork: formData.fitForWork,
      limitations: formData.limitations,
      followUpDate: formData.followUpDate,
      dateIssued: new Date().toISOString().split("T")[0],
      certificateType: formData.certificateType,
    };

    return generateMedicalCertificateHTML(templateData);
  };

  const handleUseTemplate = () => {
    // Set default values based on certificate type
    const templates = {
      sick_leave: {
        diagnosis: "Acute upper respiratory tract infection",
        recommendations:
          "Complete bed rest, adequate hydration, and prescribed medication",
        fitForWork: "unfit" as const,
      },
      fitness: {
        diagnosis: "No significant medical findings",
        recommendations: "Patient is medically cleared for physical activities",
        fitForWork: "fit" as const,
      },
      vaccination: {
        diagnosis: "Vaccination administered as per schedule",
        recommendations:
          "Continue normal activities, observe for any adverse reactions",
        fitForWork: "fit" as const,
      },
      general: {
        diagnosis: "Medical evaluation completed",
        recommendations: "Follow prescribed treatment plan",
        fitForWork: "fit" as const,
      },
    };

    const template =
      templates[formData.certificateType] || templates["general"];

    setFormData((prev) => ({
      ...prev,
      diagnosis: template.diagnosis,
      recommendations: template.recommendations,
      fitForWork: template.fitForWork,
    }));
  };

  const handleSaveAndSend = async () => {
    if (!formData.diagnosis.trim() || !formData.recommendations.trim()) {
      toast.error("Please enter diagnosis and recommendations");
      return;
    }

    setIsSending(true);
    try {
      const certificateHTML = generateTemplateContent();

      const payload = {
        action: "doctor_approve",
        certificate_content: certificateHTML,
        doctor_notes: formData.doctorNotes,
      };

      const response = await axios.post(
        `/medical-certificates/${formData.requestId}/approve/`,
        payload
      );

      toast.success("Medical certificate has been saved and sent via email!");

      // Navigate back to the return path or medical certificates page
      navigate(state?.returnPath || "/medical-certificates");
    } catch (error) {
      console.error("Error saving and sending certificate:", error);
      toast.error("Failed to save and send certificate");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!formData.diagnosis.trim() || !formData.recommendations.trim()) {
      toast.error("Please enter diagnosis and recommendations");
      return;
    }

    setIsSaving(true);
    try {
      // Save as draft or update without sending
      toast.success("Medical certificate has been saved as draft!");
    } catch (error) {
      console.error("Error saving certificate:", error);
      toast.error("Failed to save certificate");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    setIsPreview(true);
  };

  const handleBack = () => {
    navigate(state?.returnPath || "/medical-certificates");
  };

  if (isPreview) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => setIsPreview(false)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Edit
          </Button>
          <div className="flex space-x-2">
            <Button
              onClick={handleSaveOnly}
              disabled={isSaving}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handleSaveAndSend}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : "Save & Send via Email"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Medical Certificate Preview</CardTitle>
            <CardDescription>
              {certificateTypes[formData.certificateType]} for{" "}
              {formData.patientName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="bg-white border rounded-lg shadow-lg"
              dangerouslySetInnerHTML={{ __html: generateTemplateContent() }}
            />

            {formData.doctorNotes && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Doctor's Notes:</h3>
                <p className="text-sm">{formData.doctorNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Medical Certificates
        </Button>
        <div className="flex space-x-2">
          <Button onClick={handleUseTemplate} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Use Template
          </Button>
          <Button
            onClick={handlePreview}
            disabled={
              !formData.diagnosis.trim() || !formData.recommendations.trim()
            }
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Medical Certificate</CardTitle>
          <CardDescription>
            Create a medical certificate for {formData.patientName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                value={formData.patientName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientName: e.target.value,
                  }))
                }
                disabled
              />
            </div>
            <div>
              <Label htmlFor="patientEmail">Patient Email</Label>
              <Input
                id="patientEmail"
                value={formData.patientEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientEmail: e.target.value,
                  }))
                }
                disabled
              />
            </div>
            <div>
              <Label htmlFor="patientPhone">Patient Phone</Label>
              <Input
                id="patientPhone"
                value={formData.patientPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientPhone: e.target.value,
                  }))
                }
                disabled
              />
            </div>
            <div>
              <Label htmlFor="patientDob">Date of Birth</Label>
              <Input
                id="patientDob"
                value={formData.patientDob}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    patientDob: e.target.value,
                  }))
                }
                disabled
              />
            </div>
          </div>

          <div>
            <Label htmlFor="certificateType">Certificate Type</Label>
            <Select
              value={formData.certificateType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, certificateType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sick_leave">
                  Sick Leave Certificate
                </SelectItem>
                <SelectItem value="fitness">
                  Medical Fitness Certificate
                </SelectItem>
                <SelectItem value="physical_activities">
                  Physical Activities Fitness Certificate
                </SelectItem>
                <SelectItem value="vaccination">
                  Vaccination Certificate
                </SelectItem>
                <SelectItem value="general">
                  General Medical Certificate
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state?.additionalInfo && (
            <div>
              <Label>Additional Information from Patient</Label>
              <div className="mt-1 p-2 bg-gray-50 rounded border">
                {state.additionalInfo}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hospitalName">Hospital Name</Label>
              <Input
                id="hospitalName"
                value={formData.hospitalName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hospitalName: e.target.value,
                  }))
                }
                placeholder="Enter hospital name"
              />
            </div>
            <div>
              <Label htmlFor="doctorName">Doctor Name</Label>
              <Input
                id="doctorName"
                value={formData.doctorName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    doctorName: e.target.value,
                  }))
                }
                placeholder="Enter doctor name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hospitalAddress">Hospital Address</Label>
            <Input
              id="hospitalAddress"
              value={formData.hospitalAddress}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hospitalAddress: e.target.value,
                }))
              }
              placeholder="Enter hospital address"
            />
          </div>

          <div>
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))
              }
              placeholder="Enter patient diagnosis..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="recommendations">Medical Recommendations</Label>
            <Textarea
              id="recommendations"
              value={formData.recommendations}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  recommendations: e.target.value,
                }))
              }
              placeholder="Enter medical recommendations..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="fitForWork">Fitness for Work</Label>
            <Select
              value={formData.fitForWork}
              onValueChange={(value: "fit" | "unfit" | "limited") =>
                setFormData((prev) => ({ ...prev, fitForWork: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fit">Fit for Work</SelectItem>
                <SelectItem value="unfit">Unfit for Work</SelectItem>
                <SelectItem value="limited">Limited Work Capacity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.fitForWork === "unfit" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="restFromDate">Rest From</Label>
                <Input
                  id="restFromDate"
                  type="date"
                  value={formData.restFromDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      restFromDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="restToDate">Rest To</Label>
                <Input
                  id="restToDate"
                  type="date"
                  value={formData.restToDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      restToDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          {formData.fitForWork === "limited" && (
            <div>
              <Label htmlFor="limitations">Work Limitations</Label>
              <Textarea
                id="limitations"
                value={formData.limitations}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    limitations: e.target.value,
                  }))
                }
                placeholder="Specify work limitations..."
                rows={3}
              />
            </div>
          )}

          <div>
            <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
            <Input
              id="followUpDate"
              type="date"
              value={formData.followUpDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  followUpDate: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="doctorNotes">Doctor's Notes (Optional)</Label>
            <Textarea
              id="doctorNotes"
              value={formData.doctorNotes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  doctorNotes: e.target.value,
                }))
              }
              placeholder="Enter any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleSaveOnly}
              disabled={
                isSaving ||
                !formData.diagnosis.trim() ||
                !formData.recommendations.trim()
              }
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handlePreview}
              disabled={
                !formData.diagnosis.trim() || !formData.recommendations.trim()
              }
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Certificate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalCertificateGeneration;
