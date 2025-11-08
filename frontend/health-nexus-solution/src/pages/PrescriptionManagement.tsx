import PrescriptionApproval from "@/components/PrescriptionApproval";
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
import { ENV } from "@/config/env";
import { useClinic } from "@/contexts/ClinicContext";
import { axiosInstance } from "@/services/api";
import {
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Mail,
  Plus,
  Search,
  XCircle
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

// Remove axios default configuration since we're using axiosInstance

interface Medication {
  id: number;
  name: string;
  dose: string;
  quantity: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
  nameType: "Generic" | "Brand";
}

interface Patient {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  date_of_birth: string;
  email: string;
  phone: string;
  gender?: string;
}

interface PrescriptionRequest {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  patient_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  additional_notes: string;
  status:
    | "pending"
    | "receptionist_approved"
    | "doctor_approved"
    | "completed"
    | "rejected";
  requested_at: string;
  receptionist_approved_at?: string;
  doctor_approved_at?: string;
  prescription_content?: string;
  doctor_notes?: string;
  rejection_reason?: string;
  id_verification_front?: string;
  id_verification_back?: string;
  prescription_image?: string;
}

type SortField =
  | "patient_name"
  | "medication_name"
  | "status"
  | "requested_at"
  | "email";
type SortDirection = "asc" | "desc";

const PrescriptionManagement: React.FC = () => {
  const { currentUser } = useClinic();
  const [requests, setRequests] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] =
    useState<PrescriptionRequest | null>(null);
  const [prescriptionContent, setPrescriptionContent] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDoctorApprovalForm, setShowDoctorApprovalForm] = useState(false);
  const [requestForApproval, setRequestForApproval] = useState<PrescriptionRequest | null>(null);

  // E-Prescription creation states
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMedication, setCurrentMedication] = useState<Medication>({
    id: 0,
    name: "",
    dose: "",
    quantity: "",
    frequency: "",
    startDate: "",
    endDate: "",
    notes: "",
    nameType: "Generic",
  });
  const [generalNotes, setGeneralNotes] = useState("");
  const [createPrescriptionNotes, setCreatePrescriptionNotes] = useState("");

  // Search and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("requested_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      const baseUrl = ENV.API_URL.replace('/api', '');
      finalUrl = `${baseUrl}${imagePath}`;
      console.log("Starts with /media/, constructed URL:", finalUrl);
      return finalUrl;
    }
    // If it starts with medical_requests/, add the full path
    if (imagePath.startsWith("medical_requests/")) {
      const baseUrl = ENV.API_URL.replace('/api', '');
      finalUrl = `${baseUrl}/media/${imagePath}`;
      console.log("Starts with medical_requests/, constructed URL:", finalUrl);
      return finalUrl;
    }
    // If it's just a filename, assume it's in medical_requests folder
    if (!imagePath.includes("/")) {
      const baseUrl = ENV.API_URL.replace('/api', '');
      finalUrl = `${baseUrl}/media/medical_requests/${imagePath}`;
      console.log("Just filename, constructed URL:", finalUrl);
      return finalUrl;
    }
    // Otherwise, add base URL
    const baseUrl = ENV.API_URL.replace('/api', '');
    finalUrl = `${baseUrl}${
      imagePath.startsWith("/") ? imagePath : "/" + imagePath
    }`;
    console.log("Default case, constructed URL:", finalUrl);
    console.log("=== END GET IMAGE URL DEBUG ===");
    return finalUrl;
  };

  useEffect(() => {
    fetchRequests();
    fetchPatients();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axiosInstance.get("/prescription-requests/");
      // Ensure response.data is an array
      const requestsData = Array.isArray(response.data) ? response.data : [];
      setRequests(requestsData);
    } catch (error) {
      console.error("Error fetching prescription requests:", error);
      toast.error("Failed to load prescription requests");
      setRequests([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axiosInstance.get("/patients/");
      setPatients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Failed to load patients");
      setPatients([]);
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

  const sortData = (data: PrescriptionRequest[]): PrescriptionRequest[] => {
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
        request.medication_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

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

  const handleShowDoctorApprovalForm = (request: PrescriptionRequest) => {
    setRequestForApproval(request);
  };

  const handleApprovalClose = () => {
    setRequestForApproval(null);
  };

  const handleApprovalSubmit = async (requestId: number, action: string, prescriptionData?: any) => {
    try {
      if (action === "doctor_approve" && prescriptionData) {
        // Get the prescription request details
        const prescriptionRequest = requests.find(req => req.id === requestId);
        if (!prescriptionRequest) {
          toast.error("Prescription request not found");
          return;
        }

        // Find the patient by name
        const patient = patients.find(p => 
          p.name === prescriptionRequest.patient_name || 
          `${p.first_name} ${p.last_name}` === prescriptionRequest.patient_name
        );

        if (!patient) {
          toast.error("Patient not found. Please ensure the patient exists in the system.");
          return;
        }

        // Parse medications from prescription content
        const medications: Medication[] = [];
        if (prescriptionData.prescription_content) {
          const lines = prescriptionData.prescription_content.split('\n');
          let currentMed: Partial<Medication> = {};
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.match(/^\d+\./)) {
              // Save previous medication if exists
              if (currentMed.name) {
                medications.push({
                  ...currentMed,
                  id: Date.now() + Math.random()
                } as Medication);
              }
              // Start new medication
              currentMed = {
                name: trimmedLine.split('.', 2)[1]?.trim() || 'Unknown medication',
                dose: '',
                quantity: '',
                frequency: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                notes: '',
                nameType: 'Generic' as "Generic" | "Brand"
              };
            } else if (trimmedLine.startsWith('Dose:')) {
              currentMed.dose = trimmedLine.replace('Dose:', '').trim();
            } else if (trimmedLine.startsWith('Quantity:')) {
              currentMed.quantity = trimmedLine.replace('Quantity:', '').trim();
            } else if (trimmedLine.startsWith('Frequency:')) {
              currentMed.frequency = trimmedLine.replace('Frequency:', '').trim();
            } else if (trimmedLine.startsWith('Duration:')) {
              const duration = trimmedLine.replace('Duration:', '').trim();
              if (duration.includes(' to ')) {
                const [start, end] = duration.split(' to ');
                currentMed.startDate = start.trim();
                currentMed.endDate = end.trim();
              }
            } else if (trimmedLine.startsWith('Notes:')) {
              currentMed.notes = trimmedLine.replace('Notes:', '').trim();
            }
          }
          
          // Add the last medication
          if (currentMed.name) {
            medications.push({
              ...currentMed,
              id: Date.now() + Math.random()
            } as Medication);
          }
        }

        // If no medications parsed, create one from the original request
        if (medications.length === 0) {
          medications.push({
            id: Date.now(),
            name: prescriptionRequest.medication_name || 'Prescribed medication',
            dose: prescriptionRequest.dosage || '',
            quantity: '30', // Default quantity
            frequency: prescriptionRequest.frequency || '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            notes: prescriptionRequest.additional_notes || '',
            nameType: 'Generic' as "Generic" | "Brand"
          });
        }

        // Approve prescription request - this will handle E-Prescription creation and email sending internally
        const approvalPayload = {
          action: "doctor_approve",
          prescription_content: prescriptionData.prescription_content,
          doctor_notes: prescriptionData.doctor_notes,
          medications: medications // Send the parsed medications array
        };

        await axiosInstance.post(
          `/medical-documents/prescription-requests/${requestId}/approve/`,
          approvalPayload
        );

        toast.success("E-Prescription created and sent to patient successfully!");
        
      } else if (action === "reject" && prescriptionData) {
        // Handle rejection normally
        const payload = {
          action: "reject",
          rejection_reason: prescriptionData.rejection_reason
        };

        await axiosInstance.post(
          `/medical-documents/prescription-requests/${requestId}/approve/`,
          payload
        );

        toast.success("Prescription request rejected");
      } else {
        // Handle other actions normally
        const payload = { action };
        
        await axiosInstance.post(
          `/medical-documents/prescription-requests/${requestId}/approve/`,
          payload
        );

        toast.success("Request updated successfully");
      }

      fetchRequests();
      setRequestForApproval(null);
    } catch (error) {
      console.error("Error updating request:", error);
      console.error("Error details:", error.response?.data);
      toast.error(error.response?.data?.error || "Failed to update request");
    }
  };

  const handleApprove = async (requestId: number, action: string) => {
    try {
      let payload: any = { action };

      if (action === "doctor_approve") {
        payload.prescription_content = prescriptionContent;
        payload.doctor_notes = doctorNotes;
      } else if (action === "reject") {
        payload.rejection_reason = rejectionReason;
      }

      const response = await axiosInstance.post(
        `/medical-documents/prescription-requests/${requestId}/approve/`,
        payload
      );

      toast.success(response.data.message);
      fetchRequests();
      setSelectedRequest(null);
      setPrescriptionContent("");
      setDoctorNotes("");
      setRejectionReason("");
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    }
  };

  // E-Prescription creation functions
  const handleMedicationChange = (field: keyof Medication, value: string) => {
    setCurrentMedication((prev) => ({ ...prev, [field]: value }));
  };

  const addMedication = () => {
    if (currentMedication.name && currentMedication.dose) {
      setMedications((prev) => [
        ...prev,
        { ...currentMedication, id: Date.now() },
      ]);
      setCurrentMedication({
        id: 0,
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
    setMedications((prev) => prev.filter((med) => med.id !== id));
  };

  const editMedication = (id: number) => {
    const medication = medications.find((med) => med.id === id);
    if (medication) {
      setCurrentMedication(medication);
      removeMedication(id);
    }
  };

  const handleCreatePrescription = async () => {
    if (!selectedPatient || medications.length === 0) {
      toast.error("Please select a patient and add at least one medication");
      return;
    }

    try {
      // Convert medications array to structured prescription content
      let prescriptionContentText = "";
      if (medications.length > 0) {
        prescriptionContentText = medications.map((med, index) => 
          `${index + 1}. ${med.name}
   Dose: ${med.dose}
   Quantity: ${med.quantity}
   Frequency: ${med.frequency}
   Duration: ${med.startDate}${med.endDate ? ` to ${med.endDate}` : ''}
   ${med.notes ? `Notes: ${med.notes}` : ''}`
        ).join('\n\n');
      }
      
      if (generalNotes) {
        prescriptionContentText += `\n\nGeneral Instructions:\n${generalNotes}`;
      }

      const prescriptionData = {
        patient_id: selectedPatient.id,
        medications: medications,
        prescription_content: prescriptionContentText,
        doctor_notes: createPrescriptionNotes,
        general_instructions: generalNotes,
      };

      const response = await axiosInstance.post(
        "/medical-documents/create-prescription/",
        prescriptionData
      );

      toast.success("E-Prescription created successfully!");
      
      // Reset form
      setSelectedPatient(null);
      setMedications([]);
      setGeneralNotes("");
      setCreatePrescriptionNotes("");
      setShowCreatePrescription(false);
      
      // Optionally refresh requests to show if this creates any related data
      fetchRequests();
    } catch (error) {
      console.error("Error creating prescription:", error);
      toast.error("Failed to create prescription. Please try again.");
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

  // Use the paginated requests for display
  const filteredRequests = paginatedRequests;

  const currentUserRole = currentUser?.role;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Prescription Management
          </h1>
          <p className="text-muted-foreground">
            Manage prescription requests from patients
          </p>
        </div>
        {currentUserRole === "doctor" && (
          <Button
            onClick={() => setShowCreatePrescription(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create E-Prescription
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              
              <p className="text-sm text-muted-foreground mt-1">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
                {totalItems} prescription requests
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
                  placeholder="Search patients, medications..."
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
              Loading prescription requests...
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchQuery || filterStatus !== "all" ? (
                  <>
                    <p className="text-lg font-medium">
                      No prescription requests found
                    </p>
                    <p className="text-sm">
                      Try adjusting your search term or filters
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">
                      No prescription requests yet
                    </p>
                    <p className="text-sm">
                      Prescription requests from patients will appear here
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
                      onClick={() => handleSort("medication_name")}
                    >
                      Medication
                      {renderSortIcon("medication_name")}
                    </Button>
                  </TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
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
                    <TableCell>{request.medication_name}</TableCell>
                    <TableCell>{request.dosage}</TableCell>
                    <TableCell>{request.frequency}</TableCell>
                    <TableCell>{request.duration}</TableCell>
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
                              <DialogTitle>Prescription Details</DialogTitle>
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
                                      Medication
                                    </Label>
                                    <p className="font-medium">
                                      {selectedRequest.medication_name}
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
                                      Dosage
                                    </Label>
                                    <p className="text-sm">
                                      {selectedRequest.dosage}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Frequency
                                    </Label>
                                    <p className="text-sm">
                                      {selectedRequest.frequency}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Duration
                                    </Label>
                                    <p className="text-sm">
                                      {selectedRequest.duration}
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

                                {selectedRequest.additional_notes && (
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Additional Notes
                                    </Label>
                                    <p className="text-sm mt-1 p-2 bg-gray-50 rounded text-muted-foreground">
                                      {selectedRequest.additional_notes}
                                    </p>
                                  </div>
                                )}

                                {/* ID Verification Images - Compact */}
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

                                {/* Prescription Image - Compact */}
                                {selectedRequest.prescription_image && (
                                  <div>
                                    <Label className="font-medium text-xs text-muted-foreground">
                                      Prescription Image
                                    </Label>
                                    <div className="mt-2">
                                      <img
                                        src={getImageUrl(
                                          selectedRequest.prescription_image
                                        )}
                                        alt="Prescription"
                                        className="w-full h-24 object-contain rounded border cursor-pointer hover:opacity-80"
                                        onClick={() =>
                                          window.open(
                                            getImageUrl(
                                              selectedRequest.prescription_image
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
                                    </div>

                                    {/* Doctor approval - Simple button to open separate modal */}
                                    {currentUserRole === "doctor" &&
                                      selectedRequest.status ===
                                        "receptionist_approved" && (
                                        <div className="space-y-2">
                                          <Button
                                            onClick={() => handleShowDoctorApprovalForm(selectedRequest)}
                                            className="w-full bg-green-600 hover:bg-green-700"
                                          >
                                            <Mail className="h-4 w-4 mr-1" />
                                            Review & Approve Prescription
                                          </Button>
                                        </div>
                                      )}

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
      
      {/* Prescription Approval Modal */}
      {requestForApproval && (
        <PrescriptionApproval
          request={requestForApproval}
          onClose={handleApprovalClose}
          onApprove={handleApprovalSubmit}
        />
      )}

      {/* Create E-Prescription Modal */}
      <Dialog open={showCreatePrescription} onOpenChange={setShowCreatePrescription}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New E-Prescription</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6">
            {/* Left side - Patient Selection and Medication List */}
            <div className="space-y-4">
              {/* Patient Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Patient</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedPatient?.id.toString() || ""}
                    onValueChange={(value) => {
                      const patient = patients.find(p => p.id.toString() === value);
                      setSelectedPatient(patient || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.name || `${patient.first_name} ${patient.last_name}`} - {patient.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedPatient && (
                    <div className="mt-4 p-4 bg-gray-50 rounded border">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Name:</strong></div>
                        <div>{selectedPatient.name || `${selectedPatient.first_name} ${selectedPatient.last_name}`}</div>
                        <div><strong>DOB:</strong></div>
                        <div>{selectedPatient.date_of_birth}</div>
                        <div><strong>Email:</strong></div>
                        <div>{selectedPatient.email}</div>
                        <div><strong>Phone:</strong></div>
                        <div>{selectedPatient.phone}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Medications List */}
              {medications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Medications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {medications.map((med) => (
                        <div key={med.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                          <div className="flex-1">
                            <div className="font-medium">{med.name}</div>
                            <div className="text-sm text-gray-600">
                              {med.dose} • {med.frequency} • Qty: {med.quantity}
                            </div>
                            {med.notes && (
                              <div className="text-xs text-gray-500 mt-1">{med.notes}</div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editMedication(med.id)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeMedication(med.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right side - Add Medication Form */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Medication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Medication Form */}
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="nameType"
                          checked={currentMedication.nameType === "Generic"}
                          onChange={() => handleMedicationChange("nameType", "Generic")}
                        />
                        Generic Name
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="nameType"
                          checked={currentMedication.nameType === "Brand"}
                          onChange={() => handleMedicationChange("nameType", "Brand")}
                        />
                        Brand Name
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Medication Name"
                        value={currentMedication.name}
                        onChange={(e) => handleMedicationChange("name", e.target.value)}
                      />
                      <Input
                        placeholder="e.g., 500mg"
                        value={currentMedication.dose}
                        onChange={(e) => handleMedicationChange("dose", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="e.g., 30 tablets"
                        value={currentMedication.quantity}
                        onChange={(e) => handleMedicationChange("quantity", e.target.value)}
                      />
                      <Select
                        value={currentMedication.frequency}
                        onValueChange={(val) => handleMedicationChange("frequency", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="e.g., Once a day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Once daily">Once daily</SelectItem>
                          <SelectItem value="Twice daily">Twice daily</SelectItem>
                          <SelectItem value="Three times daily">Three times daily</SelectItem>
                          <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                          <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                          <SelectItem value="As needed">As needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Start Date</Label>
                        <Input
                          type="date"
                          value={currentMedication.startDate}
                          onChange={(e) => handleMedicationChange("startDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">End Date</Label>
                        <Input
                          type="date"
                          value={currentMedication.endDate}
                          onChange={(e) => handleMedicationChange("endDate", e.target.value)}
                        />
                      </div>
                    </div>

                    <Textarea
                      placeholder="Additional instructions or notes"
                      value={currentMedication.notes}
                      onChange={(e) => handleMedicationChange("notes", e.target.value)}
                      rows={2}
                    />

                    <Button
                      onClick={addMedication}
                      disabled={!currentMedication.name || !currentMedication.dose}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Medication
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* General Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">General Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="General instructions for the patient..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Doctor Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Doctor Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Internal notes (not visible to patient)..."
                    value={createPrescriptionNotes}
                    onChange={(e) => setCreatePrescriptionNotes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreatePrescription}
                  disabled={!selectedPatient || medications.length === 0}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Create & Send E-Prescription
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePrescription(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrescriptionManagement;
