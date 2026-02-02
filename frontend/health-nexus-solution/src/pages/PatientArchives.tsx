import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  Trash2,
  FileText,
  ChevronRight as ChevronRightIcon,
  Eye,
  User,
  Calendar,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "@/contexts/ClinicContext";
import "@/utils/sessionManager";
import axios from "axios";

type SortField =
  | "name"
  | "gender"
  | "date_of_birth"
  | "email"
  | "phone"
  | "deleted_at";
type SortDirection = "asc" | "desc";

interface ArchivedPatient {
  id: string;
  patient_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  marital_status?: string;
  address?: string;
  deleted_at: string;
  deleted_by?: string;
  deleted_by_email?: string;
  deleted_reason?: string;
}

const PatientArchives = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useClinic();

  const [archivedPatients, setArchivedPatients] = useState<ArchivedPatient[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("deleted_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk selection states
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(
    new Set(),
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Expanded rows state for mobile view
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // View patient details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] =
    useState<ArchivedPatient | null>(null);

  const toggleRowExpansion = (patientId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedRows(newExpanded);
  };

  const handleViewPatient = (patient: ArchivedPatient) => {
    setSelectedPatient(patient);
    setViewDialogOpen(true);
  };

  // Only admin can access archives
  const isAdmin = currentUser?.role === "admin";

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can access patient archives.",
        variant: "destructive",
      });
      navigate("/patients");
    }
  }, [currentUser, isAdmin, navigate, toast]);

  // Fetch archived patients
  const fetchArchivedPatients = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("patients/archived/");
      setArchivedPatients(response.data);
    } catch (error) {
      console.error("Error fetching archived patients:", error);
      toast({
        title: "Error",
        description: "Failed to load archived patients.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchArchivedPatients();
    }
  }, [isAdmin]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort patients
  const sortedPatients = [...archivedPatients].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle different data types
    if (sortField === "date_of_birth" || sortField === "deleted_at") {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
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

  // Filter patients based on search query
  const filteredPatients = sortedPatients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.email &&
        patient.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (patient.phone && patient.phone.includes(searchQuery)) ||
      (patient.patient_id &&
        patient.patient_id.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Pagination logic
  const totalItems = filteredPatients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection]);

  // Clear selections when page changes
  useEffect(() => {
    setSelectedPatients(new Set());
  }, [currentPage, searchQuery, sortField, sortDirection]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Render sort icon
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

  // Handle select all patients on current page
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedPatients);
      paginatedPatients.forEach((patient) => {
        newSelected.add(patient.id);
      });
      setSelectedPatients(newSelected);
    } else {
      const newSelected = new Set(selectedPatients);
      paginatedPatients.forEach((patient) => {
        newSelected.delete(patient.id);
      });
      setSelectedPatients(newSelected);
    }
  };

  // Handle individual patient selection
  const handleSelectPatient = (patientId: string, checked: boolean) => {
    const newSelected = new Set(selectedPatients);
    if (checked) {
      newSelected.add(patientId);
    } else {
      newSelected.delete(patientId);
    }
    setSelectedPatients(newSelected);
  };

  // Check if all patients on current page are selected
  const isAllSelected =
    paginatedPatients.length > 0 &&
    paginatedPatients.every((patient) => selectedPatients.has(patient.id));

  // Check if some (but not all) patients are selected
  const isSomeSelected =
    paginatedPatients.some((patient) => selectedPatients.has(patient.id)) &&
    !isAllSelected;

  // Handle bulk restore
  const handleBulkRestore = async () => {
    if (selectedPatients.size === 0) {
      toast({
        title: "No patients selected",
        description: "Please select at least one patient to restore.",
        variant: "destructive",
      });
      return;
    }

    const confirmRestore = window.confirm(
      `Are you sure you want to restore ${selectedPatients.size} patient(s)? They will be moved back to the active patient list.`,
    );

    if (!confirmRestore) return;

    setIsProcessing(true);
    const selectedIds = Array.from(selectedPatients);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const patientId of selectedIds) {
        try {
          await axios.post(`patients/${patientId}/restore/`);
          successCount++;
        } catch (error) {
          console.error(`Failed to restore patient ${patientId}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Patients restored",
          description: `Successfully restored ${successCount} patient(s).${
            failCount > 0 ? ` Failed to restore ${failCount} patient(s).` : ""
          }`,
        });
        fetchArchivedPatients();
        setSelectedPatients(new Set());
      } else {
        toast({
          title: "Restore failed",
          description: "Failed to restore selected patients.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while restoring patients.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk permanent delete
  const handleBulkPermanentDelete = async () => {
    if (selectedPatients.size === 0) {
      toast({
        title: "No patients selected",
        description:
          "Please select at least one patient to permanently archive.",
        variant: "destructive",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ WARNING: Are you sure you want to PERMANENTLY archive ${selectedPatients.size} patient(s)? This action CANNOT be undone and all patient data will be lost forever.`,
    );

    if (!confirmDelete) return;

    // Double confirmation for permanent deletion
    const doubleConfirm = window.confirm(
      "This is your final warning. Type 'ARCHIVE' in the next prompt to confirm permanent archiving.",
    );

    if (!doubleConfirm) return;

    setIsProcessing(true);
    const selectedIds = Array.from(selectedPatients);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const patientId of selectedIds) {
        try {
          await axios.delete(`patients/${patientId}/permanent/`);
          successCount++;
        } catch (error) {
          console.error(
            `Failed to permanently archive patient ${patientId}:`,
            error,
          );
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Patients permanently archived",
          description: `Successfully archived ${successCount} patient(s).${
            failCount > 0 ? ` Failed to archive ${failCount} patient(s).` : ""
          }`,
        });
        fetchArchivedPatients();
        setSelectedPatients(new Set());
      } else {
        toast({
          title: "Archive failed",
          description: "Failed to archive selected patients.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while archiving patients.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/patients")}
            className="text-xs sm:text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Patients
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Patient Archives
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              View and manage archived patient records
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {selectedPatients.size > 0 && (
            <>
              <Button
                variant="default"
                onClick={handleBulkRestore}
                disabled={isProcessing}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore ({selectedPatients.size})
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkPermanentDelete}
                disabled={isProcessing}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Archive ({selectedPatients.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
                {totalItems} archived patients
                {sortField && (
                  <span className="ml-2">
                    • Sorted by {sortField.replace("_", " ")} (
                    {sortDirection === "asc" ? "A-Z" : "Z-A"})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search archived patients..."
                  className="pl-8 text-xs sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {(searchQuery ||
                sortField !== "deleted_at" ||
                sortDirection !== "desc") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => {
                    setSearchQuery("");
                    setSortField("deleted_at");
                    setSortDirection("desc");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 p-0 xl:hidden"></TableHead>
                  <TableHead className="w-12 hidden md:table-cell">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all patients"
                      className={
                        isSomeSelected ? "data-[state=checked]:bg-primary" : ""
                      }
                    />
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                      onClick={() => handleSort("name")}
                    >
                      Name
                      {renderSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                      onClick={() => handleSort("gender")}
                    >
                      Sex
                      {renderSortIcon("gender")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                      onClick={() => handleSort("deleted_at")}
                    >
                      Archived Date
                      {renderSortIcon("deleted_at")}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                      onClick={() => handleSort("email")}
                    >
                      Contact
                      {renderSortIcon("email")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalItems > 0 ? (
                  paginatedPatients.map((patient) => {
                    const isExpanded = expandedRows.has(patient.id);
                    return (
                      <>
                        <TableRow key={patient.id}>
                          <TableCell className="xl:hidden w-8 p-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleRowExpansion(patient.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRightIcon className="h-3 w-3" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Checkbox
                              checked={selectedPatients.has(patient.id)}
                              onCheckedChange={(checked) =>
                                handleSelectPatient(
                                  patient.id,
                                  checked as boolean,
                                )
                              }
                              aria-label={`Select ${patient.name}`}
                            />
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                                <AvatarFallback className="text-[10px] md:text-xs bg-gray-200">
                                  {patient.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-[11px] md:text-sm">
                                  {patient.name}
                                </div>
                                <div className="text-[10px] md:text-xs text-muted-foreground md:hidden truncate">
                                  ID: {patient.patient_id}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-xs sm:text-sm hidden md:table-cell">
                            {patient.gender}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                            {patient.deleted_at
                              ? format(
                                  new Date(patient.deleted_at),
                                  "MMM d, yyyy",
                                )
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                            <div>{patient.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {patient.phone}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] md:text-sm h-7 md:h-8 px-2 md:px-3"
                                onClick={() => handleViewPatient(patient)}
                              >
                                <Eye className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                                <span className="hidden md:inline">View</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] md:text-sm h-7 md:h-8 px-2 md:px-3"
                                onClick={async () => {
                                  try {
                                    await axios.post(
                                      `patients/${patient.id}/restore/`,
                                    );
                                    toast({
                                      title: "Patient restored",
                                      description: `${patient.name} has been restored successfully.`,
                                    });
                                    fetchArchivedPatients();
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to restore patient.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <RotateCcw className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                                <span className="hidden md:inline">
                                  Restore
                                </span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="xl:hidden bg-muted/50">
                            <TableCell colSpan={3} className="py-3">
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between md:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    ID:
                                  </span>
                                  <span>{patient.patient_id}</span>
                                </div>
                                <div className="flex justify-between md:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    Sex:
                                  </span>
                                  <span className="capitalize">
                                    {patient.gender}
                                  </span>
                                </div>
                                <div className="flex justify-between lg:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    Archived Date:
                                  </span>
                                  <span>
                                    {patient.deleted_at
                                      ? format(
                                          new Date(patient.deleted_at),
                                          "MMM d, yyyy",
                                        )
                                      : "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between lg:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    Email:
                                  </span>
                                  <span>{patient.email}</span>
                                </div>
                                <div className="flex justify-between lg:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    Phone:
                                  </span>
                                  <span>{patient.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 pt-2 md:hidden">
                                  <Checkbox
                                    checked={selectedPatients.has(patient.id)}
                                    onCheckedChange={(checked) =>
                                      handleSelectPatient(
                                        patient.id,
                                        checked as boolean,
                                      )
                                    }
                                    id={`mobile-select-${patient.id}`}
                                  />
                                  <label
                                    htmlFor={`mobile-select-${patient.id}`}
                                    className="text-sm font-medium"
                                  >
                                    Select for bulk action
                                  </label>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery ? (
                          <>
                            <p className="text-sm sm:text-base md:text-lg font-medium">
                              No archived patients found
                            </p>
                            <p className="text-xs sm:text-sm">
                              Try adjusting your search term "{searchQuery}"
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm sm:text-base md:text-lg font-medium">
                              No archived patients
                            </p>
                            <p className="text-xs sm:text-sm">
                              Archived patients will appear here
                            </p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2 sm:px-4 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-xs sm:text-sm text-muted-foreground">Show</p>
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
                <p className="text-xs sm:text-sm text-muted-foreground">
                  entries
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center justify-center text-xs sm:text-sm font-medium whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Patient Details
            </DialogTitle>
            <DialogDescription>
              View complete information and archive traceability
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6 mt-4">
              {/* Personal Information Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Patient ID
                    </label>
                    <p className="text-sm mt-1">{selectedPatient.patient_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    <p className="text-sm mt-1 font-medium">
                      {selectedPatient.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </label>
                    <p className="text-sm mt-1">
                      {selectedPatient.date_of_birth
                        ? format(
                            new Date(selectedPatient.date_of_birth),
                            "MMMM d, yyyy",
                          )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Gender
                    </label>
                    <p className="text-sm mt-1 capitalize">
                      {selectedPatient.gender}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <p className="text-sm mt-1">
                      {selectedPatient.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p className="text-sm mt-1">
                      {selectedPatient.phone || "N/A"}
                    </p>
                  </div>
                  {selectedPatient.marital_status && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Marital Status
                      </label>
                      <p className="text-sm mt-1 capitalize">
                        {selectedPatient.marital_status}
                      </p>
                    </div>
                  )}
                  {selectedPatient.address && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Address
                      </label>
                      <p className="text-sm mt-1">{selectedPatient.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Archive Traceability Section */}
              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Archive Traceability
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Archived Date
                      </label>
                      <p className="text-sm mt-1 font-medium">
                        {selectedPatient.deleted_at
                          ? format(
                              new Date(selectedPatient.deleted_at),
                              "MMMM d, yyyy 'at' h:mm a",
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Archived By
                      </label>
                      <p className="text-sm mt-1 font-medium">
                        {selectedPatient.deleted_by || "Unknown"}
                      </p>
                      {selectedPatient.deleted_by_email && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedPatient.deleted_by_email}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedPatient.deleted_reason && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-muted-foreground">
                          Archive Reason
                        </label>
                        <p className="text-sm mt-1">
                          {selectedPatient.deleted_reason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    try {
                      await axios.post(
                        `patients/${selectedPatient.id}/restore/`,
                      );
                      toast({
                        title: "Patient restored",
                        description: `${selectedPatient.name} has been restored successfully.`,
                      });
                      setViewDialogOpen(false);
                      fetchArchivedPatients();
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to restore patient.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Patient
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientArchives;
