import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { Patient } from "@/lib/mock-data";
import { useClinic } from "@/contexts/ClinicContext";
import MedicalCertificateGenerator from "@/components/patients/MedicalCertificateGenerator";
import { toast } from "sonner";
import axios from "axios";

const GenerateMedicalCertificate: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients } = useClinic();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCertificates, setSavedCertificates] = useState<any[]>([]);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        if (patientId) {
          // First try to get from context
          const contextPatient = patients.find((p) => p.id === patientId);

          if (contextPatient) {
            setPatient(contextPatient);
          } else {
            // If not in context, fetch from API
            const response = await axios.get(`/patients/${patientId}/`);
            setPatient(response.data);
          }

          // Fetch existing certificates for this patient
          try {
            const certificatesResponse = await axios.get(
              `/patients/${patientId}/certificates/`
            );
            setSavedCertificates(certificatesResponse.data || []);
          } catch (certError) {
            console.log(
              "No existing certificates found or error fetching them:",
              certError
            );
            setSavedCertificates([]);
          }
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        toast.error("Failed to load patient information");
        navigate("/patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, patients, navigate]);

  const handleSaveCertificate = async (certificate: any) => {
    try {
      // Save certificate to the backend
      const response = await axios.post(
        `/patients/${patientId}/certificates/`,
        {
          patient_id: patientId,
          certificate_type:
            certificate.data?.fitForWork === "unfit"
              ? "sick_leave"
              : certificate.data?.fitForWork === "limited"
              ? "fitness_limited"
              : "fitness",
          content: certificate.content,
          diagnosis: certificate.data?.diagnosis || "",
          recommendations: certificate.data?.recommendations || "",
          doctor_notes: certificate.data?.doctorNotes || "",
          valid_from:
            certificate.data?.restFromDate ||
            new Date().toISOString().split("T")[0],
          valid_to:
            certificate.data?.restToDate ||
            new Date().toISOString().split("T")[0],
          issued_date:
            certificate.data?.dateIssued ||
            new Date().toISOString().split("T")[0],
        }
      );

      // Update local state
      setSavedCertificates((prev) => [...prev, response.data]);

      toast.success("Medical certificate saved successfully!");
    } catch (error) {
      console.error("Error saving certificate:", error);
      toast.error("Failed to save medical certificate");
    }
  };

  const handleDeleteCertificate = async (certificateId: number) => {
    try {
      await axios.delete(
        `/patients/${patientId}/certificates/${certificateId}/`
      );
      setSavedCertificates((prev) =>
        prev.filter((cert) => cert.id !== certificateId)
      );
      toast.success("Medical certificate deleted successfully!");
    } catch (error) {
      console.error("Error deleting certificate:", error);
      toast.error("Failed to delete medical certificate");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patient information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Patient Not Found
            </h3>
            <p className="text-gray-600 mb-4">
              The patient you're looking for could not be found.
            </p>
            <Button onClick={() => navigate("/patients")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient Details
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Generate Medical Certificate</h1>
          <p className="text-gray-600">
            Create a medical certificate for {patient.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Medical Certificate for {patient.name}
          </CardTitle>
          <CardDescription>
            Generate and manage medical certificates for this patient
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MedicalCertificateGenerator
            patient={patient}
            onSaveCertificate={handleSaveCertificate}
            onDeleteCertificate={handleDeleteCertificate}
            savedCertificates={savedCertificates}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateMedicalCertificate;
