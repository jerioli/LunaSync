import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useClinic } from "@/contexts/ClinicContext";
import {
  generateMedicalCertificateHTML,
  MedicalCertificateTemplateData,
} from "@/utils/medicalCertificateTemplate";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Mail,
  Printer,
  Search,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { axiosInstance } from "@/services/api";

// Remove axios default configuration since we're using axiosInstance

interface MedicalCertificateRequest {
  id: number;
  request_type: string;
  patient_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  additional_info: string;
  status:
    | "pending"
    | "receptionist_approved"
    | "doctor_approved"
    | "completed"
    | "rejected";
  requested_at: string;
  receptionist_approved_at?: string;
  doctor_approved_at?: string;
  certificate_content?: string;
  doctor_notes?: string;
  rejection_reason?: string;
  id_verification_front?: string;
  id_verification_back?: string;
}

interface ClinicInfo {
  clinic_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
}

interface DoctorInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  license?: string;
  prc?: string;
  ptr?: string;
}

interface CertificateFormData {
  hospitalName: string;
  hospitalAddress: string;
  hospitalContact: string;
  hospitalLicense: string;
  doctorName: string;
  doctorLicense: string;
  doctorPRC: string;
  doctorPTR: string;
  patientName: string;
  patientAge: string;
  diagnosis: string;
  recommendations: string;
  restFromDate: string;
  restToDate: string;
  fitForWork: "fit" | "unfit" | "limited";
  limitations: string;
  followUpDate: string;
  dateIssued: string;
  certificateType: string;
}

type SortField =
  | "patient_name"
  | "request_type"
  | "status"
  | "requested_at"
  | "email";
type SortDirection = "asc" | "desc";

const MedicalCertificateManagement: React.FC = () => {
  const { currentUser } = useClinic();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MedicalCertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] =
    useState<MedicalCertificateRequest | null>(null);

  // Helper function to get image URL - similar to how clinic logo is handled
  const getImageUrl = (imagePath: string) => {
    console.log("=== GET IMAGE URL DEBUG ===");
    console.log("Input imagePath:", imagePath);

    if (!imagePath) {
      console.log("No imagePath provided, returning null");
      return null;
    }

    let finalUrl;
    // If it's already a full URL, return as-is
    if (imagePath.startsWith("http")) {
      finalUrl = imagePath;
      console.log("Already full URL:", finalUrl);
      return finalUrl;
    }
    // If it starts with /media/, add the base URL
    if (imagePath.startsWith("/media/")) {
      finalUrl = `http://127.0.0.1:8000${imagePath}`;
      console.log("Starts with /media/, constructed URL:", finalUrl);
      return finalUrl;
    }
    // If it starts with medical_requests/, add the full path
    if (imagePath.startsWith("medical_requests/")) {
      finalUrl = `http://127.0.0.1:8000/media/${imagePath}`;
      console.log("Starts with medical_requests/, constructed URL:", finalUrl);
      return finalUrl;
    }
    // If it's just a filename, assume it's in medical_requests folder
    if (!imagePath.includes("/")) {
      finalUrl = `http://127.0.0.1:8000/media/medical_requests/${imagePath}`;
      console.log("Just filename, constructed URL:", finalUrl);
      return finalUrl;
    }
    // Otherwise, add base URL
    finalUrl = `http://127.0.0.1:8000${
      imagePath.startsWith("/") ? imagePath : "/" + imagePath
    }`;
    console.log("Default case, constructed URL:", finalUrl);
    console.log("=== END GET IMAGE URL DEBUG ===");
    return finalUrl;
  };

  // Helper function to get logo URL
  const getLogoUrl = (logo: string) => {
    if (!logo) return null;
    if (logo.startsWith("http")) return logo;
    if (logo.startsWith("/media/")) return `http://127.0.0.1:8000${logo}`;
    if (logo.startsWith("branding/"))
      return `http://127.0.0.1:8000/media/${logo}`;
    return `http://127.0.0.1:8000${logo}`;
  };

  const [certificateContent, setCertificateContent] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCertificateForm, setShowCertificateForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);

  // Search and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("requested_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [certificateFormData, setCertificateFormData] =
    useState<CertificateFormData>({
      hospitalName: "HealthNexus Medical Center",
      hospitalAddress: "123 Medical Plaza, City, State 12345",
      hospitalContact: "",
      hospitalLicense: "",
      doctorName: "",
      doctorLicense: "",
      doctorPRC: "",
      doctorPTR: "",
      patientName: "",
      patientAge: "",
      diagnosis: "",
      recommendations: "",
      restFromDate: format(new Date(), "yyyy-MM-dd"),
      restToDate: format(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      ),
      fitForWork: "unfit",
      limitations: "",
      followUpDate: "",
      dateIssued: format(new Date(), "yyyy-MM-dd"),
      certificateType: "",
    });

  useEffect(() => {
    fetchRequests();
    fetchClinicInfo();
    fetchDoctorInfo();
  }, []);

  // Add effect to periodically refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchClinicInfo = async () => {
    try {
      const response = await axiosInstance.get("/clinics/current/");
      setClinicInfo(response.data);

      // Update certificate form data with clinic info
      setCertificateFormData((prev) => ({
        ...prev,
        hospitalName: response.data.clinic_name,
        hospitalAddress: `${response.data.address}, ${response.data.city}, ${response.data.state} ${response.data.zip}`,
        hospitalContact: `Phone: ${response.data.phone} | Email: ${
          response.data.email
        }${response.data.website ? ` | ${response.data.website}` : ""}`,
      }));
    } catch (error) {
      console.error("Error fetching clinic info:", error);
    }
  };

  const fetchDoctorInfo = async () => {
    try {
      const response = await axiosInstance.get("/doctors/current/");
      setDoctorInfo(response.data);

      // Update certificate form data with doctor info
      setCertificateFormData((prev) => ({
        ...prev,
        doctorName: `Dr. ${response.data.first_name} ${response.data.last_name}`,
        doctorLicense: response.data.license || "",
        doctorPRC: response.data.prc || "",
        doctorPTR: response.data.ptr || "",
      }));
    } catch (error) {
      console.error("Error fetching doctor info:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      console.log("=== FETCHING MEDICAL CERTIFICATES ===");
      console.log("Current timestamp:", new Date().toISOString());

      // Add cache busting parameter
      const response = await axiosInstance.get("/medical-certificates/", {
        params: { _t: Date.now() },
      });

      console.log("Full response:", response);
      console.log("Response data:", response.data);
      console.log("Response status:", response.status);

      // Ensure response.data is an array
      const requestsData = Array.isArray(response.data) ? response.data : [];
      console.log("Processed requests data:", requestsData);
      console.log("Number of requests:", requestsData.length);

      if (requestsData.length > 0) {
        console.log("First request sample:", requestsData[0]);
        console.log("ID verification fields in first request:");
        console.log(
          "- id_verification_front:",
          requestsData[0].id_verification_front
        );
        console.log(
          "- id_verification_back:",
          requestsData[0].id_verification_back
        );
      } else {
        console.log("No requests found in response");
      }
      console.log("=== END API RESPONSE DEBUG ===");
      setRequests(requestsData);
    } catch (error) {
      console.error("Error fetching medical certificate requests:", error);
      console.error("Error details:", error.response || error.message);
      setRequests([]); // Set empty array on error
      toast.error("Failed to load medical certificate requests");
    } finally {
      setLoading(false);
    }
  };

  // Sorting helper functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortData = (
    data: MedicalCertificateRequest[]
  ): MedicalCertificateRequest[] => {
    return [...data].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "requested_at") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue ? bValue.toLowerCase() : "";
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  // Filter and sort requests
  const filteredAndSortedRequests = sortData(
    (requests || []).filter((request) => {
      const matchesSearch =
        request.patient_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.request_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || request.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
  );

  // Pagination logic
  const totalItems = filteredAndSortedRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredAndSortedRequests.slice(
    startIndex,
    endIndex
  );

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, sortField, sortDirection]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleCreateCertificate = (request: MedicalCertificateRequest) => {
    // Calculate patient age
    const patientAge = request.date_of_birth
      ? String(
          new Date().getFullYear() -
            new Date(request.date_of_birth).getFullYear()
        )
      : "";

    // Set up certificate form data with request information
    setCertificateFormData((prev) => ({
      ...prev,
      patientName: request.patient_name,
      patientAge: patientAge,
      certificateType: request.request_type,
      // Pre-fill with any existing certificate content
      diagnosis: request.certificate_content || "",
      recommendations: request.additional_info || "",
    }));

    setSelectedRequest(request);
    setShowCertificateForm(true);
  };

  const handlePreviewCertificate = () => {
    if (
      !certificateFormData.diagnosis ||
      !certificateFormData.recommendations
    ) {
      toast.error("Please fill in diagnosis and recommendations");
      return;
    }
    setShowPreview(true);
  };

  const handleSaveCertificate = async () => {
    if (!selectedRequest) return;

    try {
      setLoading(true);
      const logoUrl = clinicInfo?.logo ? getLogoUrl(clinicInfo.logo) : null;

      const templateData: MedicalCertificateTemplateData = {
        ...certificateFormData,
        chiefComplaint: "",
        medicalRecommendations: certificateFormData.recommendations,
        hospitalLogo: logoUrl,
        certificateType: selectedRequest.request_type,
      };

      const certificateHTML = generateMedicalCertificateHTML(templateData);

      // Update the request with certificate content
      const response = await axiosInstance.post(
        `/medical-certificates/${selectedRequest.id}/approve/`,
        {
          action: "doctor_approve",
          certificate_content: certificateHTML,
          certificate_html: certificateHTML, // Add HTML version for email
          doctor_notes: doctorNotes,
        }
      );

      toast.success("Certificate generated and sent successfully");
      setShowCertificateForm(false);
      setShowPreview(false);

      // Refresh the requests list to show updated data
      setTimeout(() => {
        fetchRequests();
      }, 1000);
    } catch (error) {
      console.error("Error saving certificate:", error);
      toast.error("Failed to save certificate");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCertificate = () => {
    if (!selectedRequest) return;

    const logoUrl = clinicInfo?.logo ? getLogoUrl(clinicInfo.logo) : null;

    const templateData: MedicalCertificateTemplateData = {
      ...certificateFormData,
      chiefComplaint: "",
      medicalRecommendations: certificateFormData.recommendations,
      hospitalLogo: logoUrl,
      certificateType: selectedRequest.request_type,
    };

    const certificateHTML = generateMedicalCertificateHTML(templateData);

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medical Certificate - ${certificateFormData.patientName}</title>
            <style>
              body { margin: 0; padding: 20px; }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${certificateHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadCertificate = () => {
    if (!selectedRequest) return;

    const logoUrl = clinicInfo?.logo ? getLogoUrl(clinicInfo.logo) : null;

    const templateData: MedicalCertificateTemplateData = {
      ...certificateFormData,
      chiefComplaint: "",
      medicalRecommendations: certificateFormData.recommendations,
      hospitalLogo: logoUrl,
      certificateType: selectedRequest.request_type,
    };

    const certificateHTML = generateMedicalCertificateHTML(templateData);

    const blob = new Blob([certificateHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-certificate-${
      certificateFormData.patientName
    }-${format(new Date(), "yyyy-MM-dd")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = async (requestId: number, action: string) => {
    try {
      let payload: any = { action };

      if (action === "doctor_approve") {
        payload.certificate_content = certificateContent;
        payload.doctor_notes = doctorNotes;
      } else if (action === "reject") {
        payload.rejection_reason = rejectionReason;
      }

      const response = await axiosInstance.post(
        `/medical-certificates/${requestId}/approve/`,
        payload
      );

      toast.success(response.data.message);

      // Refresh the requests list to show updated data
      setTimeout(() => {
        fetchRequests();
      }, 1000);

      setSelectedRequest(null);
      setCertificateContent("");
      setDoctorNotes("");
      setRejectionReason("");
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      receptionist_approved: {
        color: "bg-blue-100 text-blue-800",
        label: "Receptionist Approved",
      },
      doctor_approved: {
        color: "bg-green-100 text-green-800",
        label: "Doctor Approved",
      },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getRequestTypeLabel = (type: string) => {
    const types = {
      sick_leave: "Sick Leave Certificate",
      fitness: "Medical Fitness Certificate",
      physical_activities: "Physical Activities Fitness Certificate",
      vaccination: "Vaccination Certificate",
      general: "General Medical Certificate",
    };
    return types[type] || type;
  };

  // Use the paginated requests for display
  const filteredRequests = paginatedRequests;

  const currentUserRole = currentUser?.role;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Medical Certificate Management
          </h1>
          <p className="text-muted-foreground">
            Manage medical certificate requests from patients
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Medical Certificate Requests</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
                {totalItems} medical certificate requests
                {sortField && (
                  <span className="ml-2">
                    • Sorted by {sortField.replace("_", " ")} (
                    {sortDirection === "asc" ? "A-Z" : "Z-A"})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients, emails, or types..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="receptionist_approved">
                    Receptionist Approved
                  </SelectItem>
                  <SelectItem value="doctor_approved">
                    Doctor Approved
                  </SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  fetchRequests();
                }}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </Button>

              {(searchQuery ||
                filterStatus !== "all" ||
                sortField !== "requested_at" ||
                sortDirection !== "desc") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                    setSortField("requested_at");
                    setSortDirection("desc");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading medical certificate requests...
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchQuery || filterStatus !== "all" ? (
                  <>
                    <p className="text-lg font-medium">
                      No medical certificate requests found
                    </p>
                    <p className="text-sm">
                      Try adjusting your search term or filters
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">
                      No medical certificate requests yet
                    </p>
                    <p className="text-sm">
                      Certificate requests from patients will appear here
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("patient_name")}
                    >
                      Patient Name
                      {renderSortIcon("patient_name")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("request_type")}
                    >
                      Request Type
                      {renderSortIcon("request_type")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("email")}
                    >
                      Email
                      {renderSortIcon("email")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      {renderSortIcon("status")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                      onClick={() => handleSort("requested_at")}
                    >
                      Requested At
                      {renderSortIcon("requested_at")}
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.patient_name}
                    </TableCell>
                    <TableCell>
                      {getRequestTypeLabel(request.request_type)}
                    </TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Request Details</DialogTitle>
                            </DialogHeader>
                            {selectedRequest && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Patient
                                    </Label>
                                    <p className="font-medium">
                                      {selectedRequest.patient_name}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Type
                                    </Label>
                                    <p className="font-medium">
                                      {getRequestTypeLabel(
                                        selectedRequest.request_type
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      DOB
                                    </Label>
                                    <p className="text-sm">
                                      {selectedRequest.date_of_birth}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Email
                                    </Label>
                                    <p className="text-sm">
                                      {selectedRequest.email}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Phone
                                    </Label>
                                    <p className="text-sm">
                                      {selectedRequest.phone}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Status
                                    </Label>
                                    <div className="mt-1">
                                      {getStatusBadge(selectedRequest.status)}
                                    </div>
                                  </div>
                                </div>

                                {selectedRequest.additional_info && (
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Additional Info
                                    </Label>
                                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded text-muted-foreground">
                                      {selectedRequest.additional_info}
                                    </p>
                                  </div>
                                )}

                                {/* ID Verification Images - Compact version */}
                                {(selectedRequest.id_verification_front ||
                                  selectedRequest.id_verification_back) && (
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      ID Verification
                                    </Label>
                                    <div className="mt-2 flex gap-2">
                                      {selectedRequest.id_verification_front && (
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-1">
                                            Front
                                          </p>
                                          <img
                                            src={getImageUrl(
                                              selectedRequest.id_verification_front
                                            )}
                                            alt="ID Front"
                                            className="w-full h-20 object-contain rounded border cursor-pointer hover:opacity-80"
                                            onClick={() =>
                                              window.open(
                                                getImageUrl(
                                                  selectedRequest.id_verification_front
                                                ),
                                                "_blank"
                                              )
                                            }
                                            onError={(e) =>
                                              ((
                                                e.target as HTMLImageElement
                                              ).style.display = "none")
                                            }
                                          />
                                        </div>
                                      )}
                                      {selectedRequest.id_verification_back && (
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-1">
                                            Back
                                          </p>
                                          <img
                                            src={getImageUrl(
                                              selectedRequest.id_verification_back
                                            )}
                                            alt="ID Back"
                                            className="w-full h-20 object-contain rounded border cursor-pointer hover:opacity-80"
                                            onClick={() =>
                                              window.open(
                                                getImageUrl(
                                                  selectedRequest.id_verification_back
                                                ),
                                                "_blank"
                                              )
                                            }
                                            onError={(e) =>
                                              ((
                                                e.target as HTMLImageElement
                                              ).style.display = "none")
                                            }
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Action buttons - simplified */}
                                {(selectedRequest.status === "pending" ||
                                  selectedRequest.status ===
                                    "receptionist_approved") && (
                                  <div className="flex flex-col gap-2 pt-3 border-t">
                                    <div className="flex gap-2">
                                      {currentUserRole === "receptionist" &&
                                        selectedRequest.status ===
                                          "pending" && (
                                          <>
                                            <Button
                                              onClick={() =>
                                                handleApprove(
                                                  selectedRequest.id,
                                                  "receptionist_approve"
                                                )
                                              }
                                              className="bg-blue-600 hover:bg-blue-700 flex-1"
                                              size="sm"
                                            >
                                              <CheckCircle className="h-4 w-4 mr-1" />
                                              Approve
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() => {
                                                if (rejectionReason.trim()) {
                                                  handleApprove(
                                                    selectedRequest.id,
                                                    "reject"
                                                  );
                                                } else {
                                                  toast.error(
                                                    "Please provide a rejection reason"
                                                  );
                                                }
                                              }}
                                              size="sm"
                                              className="flex-1"
                                            >
                                              <XCircle className="h-4 w-4 mr-1" />
                                              Reject
                                            </Button>
                                          </>
                                        )}

                                      {currentUserRole === "doctor" &&
                                        selectedRequest.status ===
                                          "receptionist_approved" && (
                                          <>
                                            <Button
                                              onClick={() =>
                                                handleCreateCertificate(
                                                  selectedRequest
                                                )
                                              }
                                              className="bg-blue-600 hover:bg-blue-700 flex-1"
                                              size="sm"
                                            >
                                              <FileText className="h-4 w-4 mr-1" />
                                              Generate Certificate
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() => {
                                                if (rejectionReason.trim()) {
                                                  handleApprove(
                                                    selectedRequest.id,
                                                    "reject"
                                                  );
                                                } else {
                                                  toast.error(
                                                    "Please provide a rejection reason"
                                                  );
                                                }
                                              }}
                                              size="sm"
                                              className="flex-1"
                                            >
                                              <XCircle className="h-4 w-4 mr-1" />
                                              Reject
                                            </Button>
                                          </>
                                        )}
                                    </div>

                                    {/* Compact rejection reason input */}
                                    <Textarea
                                      value={rejectionReason}
                                      onChange={(e) =>
                                        setRejectionReason(e.target.value)
                                      }
                                      placeholder="Rejection reason (if rejecting)..."
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">Show</p>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">entries</p>
              </div>

              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Form Modal */}
      <Dialog open={showCertificateForm} onOpenChange={setShowCertificateForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Medical Certificate</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient-name">Patient Name</Label>
                <Input
                  id="patient-name"
                  value={certificateFormData.patientName}
                  onChange={(e) =>
                    setCertificateFormData((prev) => ({
                      ...prev,
                      patientName: e.target.value,
                    }))
                  }
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <Label htmlFor="patient-age">Patient Age</Label>
                <Input
                  id="patient-age"
                  value={certificateFormData.patientAge}
                  onChange={(e) =>
                    setCertificateFormData((prev) => ({
                      ...prev,
                      patientAge: e.target.value,
                    }))
                  }
                  placeholder="Enter patient age"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                value={certificateFormData.diagnosis}
                onChange={(e) =>
                  setCertificateFormData((prev) => ({
                    ...prev,
                    diagnosis: e.target.value,
                  }))
                }
                placeholder="Enter diagnosis"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="recommendations">Medical Recommendations</Label>
              <Textarea
                id="recommendations"
                value={certificateFormData.recommendations}
                onChange={(e) =>
                  setCertificateFormData((prev) => ({
                    ...prev,
                    recommendations: e.target.value,
                  }))
                }
                placeholder="Enter medical recommendations"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rest-from">Rest From</Label>
                <Input
                  id="rest-from"
                  type="date"
                  value={certificateFormData.restFromDate}
                  onChange={(e) =>
                    setCertificateFormData((prev) => ({
                      ...prev,
                      restFromDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="rest-to">Rest To</Label>
                <Input
                  id="rest-to"
                  type="date"
                  value={certificateFormData.restToDate}
                  onChange={(e) =>
                    setCertificateFormData((prev) => ({
                      ...prev,
                      restToDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fit-for-work">Fitness for Work</Label>
              <Select
                value={certificateFormData.fitForWork}
                onValueChange={(value: "fit" | "unfit" | "limited") =>
                  setCertificateFormData((prev) => ({
                    ...prev,
                    fitForWork: value,
                  }))
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

            {certificateFormData.fitForWork === "limited" && (
              <div>
                <Label htmlFor="limitations">Work Limitations</Label>
                <Textarea
                  id="limitations"
                  value={certificateFormData.limitations}
                  onChange={(e) =>
                    setCertificateFormData((prev) => ({
                      ...prev,
                      limitations: e.target.value,
                    }))
                  }
                  placeholder="Specify work limitations"
                  rows={3}
                />
              </div>
            )}

            <div>
              <Label htmlFor="follow-up">Follow-up Date (Optional)</Label>
              <Input
                id="follow-up"
                type="date"
                value={certificateFormData.followUpDate}
                onChange={(e) =>
                  setCertificateFormData((prev) => ({
                    ...prev,
                    followUpDate: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="doctor-notes">Doctor Notes (Optional)</Label>
              <Textarea
                id="doctor-notes"
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter any additional notes..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCertificateForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePreviewCertificate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Certificate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{
                __html: generateMedicalCertificateHTML({
                  ...certificateFormData,
                  chiefComplaint: "",
                  medicalRecommendations: certificateFormData.recommendations,
                  hospitalLogo: clinicInfo?.logo
                    ? getLogoUrl(clinicInfo.logo)
                    : null,
                  certificateType: selectedRequest?.request_type || "",
                }),
              }}
            />

            <div className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={handlePrintCertificate}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownloadCertificate}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleSaveCertificate}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                <Mail className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Save and Send via Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalCertificateManagement;
