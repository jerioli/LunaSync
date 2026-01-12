import BulkImportModal from "@/components/bulk/BulkImportModal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
// Import sessionManager to ensure global axios configuration is applied
import {
  formatPatientNameWithInitial,
  getPatientInitial,
} from "@/utils/patientNameUtils";
import "@/utils/sessionManager";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Flag,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type SortField =
  | "name"
  | "gender"
  | "date_of_birth"
  | "email"
  | "phone"
  | "marital_status";
type SortDirection = "asc" | "desc";

const PatientsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { patients, fetchPatients, currentUser } = useClinic();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk selection states
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Red flag dialog states
  const [showRedFlagDialog, setShowRedFlagDialog] = useState(false);
  const [selectedRedFlag, setSelectedRedFlag] = useState<{
    reason: string;
    flaggedBy?: string;
    flaggedDate?: string;
  } | null>(null);

  // Role-based access control - admin, receptionist, and doctor can use bulk import
  const canUseBulkImport =
    currentUser?.role === "admin" ||
    currentUser?.role === "receptionist" ||
    currentUser?.role === "doctor";

  // Expanded rows state for mobile view
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (patientId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch patients when component mounts
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

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
  const sortedPatients = [...patients].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle different data types
    if (sortField === "date_of_birth") {
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
      (patient.marital_status || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
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

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedPatients.size === 0) {
      toast({
        title: "No patients selected",
        description: "Please select at least one patient to delete.",
        variant: "destructive",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedPatients.size} patient(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    const selectedIds = Array.from(selectedPatients);
    let successCount = 0;
    let failCount = 0;

    try {
      // Delete patients one by one
      for (const patientId of selectedIds) {
        try {
          await axios.delete(`patients/${patientId}/`);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete patient ${patientId}:`, error);
          failCount++;
        }
      }

      // Show result toast
      if (successCount > 0) {
        toast({
          title: "Patients deleted",
          description: `Successfully deleted ${successCount} patient(s).${
            failCount > 0 ? ` Failed to delete ${failCount} patient(s).` : ""
          }`,
        });
        fetchPatients(); // Refresh the list
        setSelectedPatients(new Set()); // Clear selections
      } else {
        toast({
          title: "Delete failed",
          description: "Failed to delete selected patients.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting patients.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle showing red flag reason
  const handleShowRedFlagReason = (patient: any) => {
    if (patient.is_red_flagged && patient.red_flag_reason) {
      setSelectedRedFlag({
        reason: patient.red_flag_reason,
        flaggedBy: patient.red_flagged_by_name,
        flaggedDate: patient.red_flagged_date,
      });
      setShowRedFlagDialog(true);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
          Patient Records
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {selectedPatients.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Delete Selected</span>
              <span className="sm:hidden">Delete</span> ({selectedPatients.size}
              )
            </Button>
          )}
          {canUseBulkImport && (
            <BulkImportModal
              type="patients"
              onUploadComplete={() => {
                fetchPatients(); // Refresh the patient list after successful upload
              }}
            />
          )}
          <Button
            onClick={() => navigate("/patients/add")}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add New Patient</span>
            <span className="sm:hidden">Add Patient</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
                {totalItems} patients
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
                  placeholder="Search patients..."
                  className="pl-8 text-xs sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {(searchQuery ||
                sortField !== "name" ||
                sortDirection !== "asc") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => {
                    setSearchQuery("");
                    setSortField("name");
                    setSortDirection("asc");
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
                  {/* Expand header - show when any column is hidden */}
                  <TableHead className="w-8 p-0 xl:hidden"></TableHead>

                  {/* Desktop checkbox header */}
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

                  {/* Progressively hidden columns on smaller screens */}
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
                      onClick={() => handleSort("date_of_birth")}
                    >
                      Date of Birth
                      {renderSortIcon("date_of_birth")}
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
                  <TableHead className="hidden xl:table-cell">
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                      onClick={() => handleSort("marital_status")}
                    >
                      Marital Status
                      {renderSortIcon("marital_status")}
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
                          {/* Expand button - show when any column is hidden */}
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
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                          </TableCell>

                          {/* Desktop checkbox */}
                          <TableCell className="hidden md:table-cell">
                            <Checkbox
                              checked={selectedPatients.has(patient.id)}
                              onCheckedChange={(checked) =>
                                handleSelectPatient(
                                  patient.id,
                                  checked as boolean
                                )
                              }
                              aria-label={`Select ${patient.name}`}
                            />
                          </TableCell>

                          <TableCell className="max-w-[180px]">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                                <AvatarFallback className="text-[10px] md:text-xs">
                                  {getPatientInitial(patient)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-[11px] md:text-sm flex items-center gap-1 flex-wrap">
                                  <span className="truncate">
                                    {formatPatientNameWithInitial(patient) ||
                                      patient.name}
                                  </span>
                                  {patient.is_red_flagged && (
                                    <Badge
                                      variant="destructive"
                                      className="cursor-pointer text-[9px] px-1 py-0 h-4 flex-shrink-0"
                                      onClick={() =>
                                        handleShowRedFlagReason(patient)
                                      }
                                    >
                                      <Flag className="h-2 w-2 mr-0.5" />
                                      FLAG
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] md:text-xs text-muted-foreground md:hidden truncate">
                                  ID: {patient.patient_id || patient.id}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Desktop columns - hidden on mobile */}
                          <TableCell className="capitalize text-xs sm:text-sm hidden md:table-cell">
                            {patient.gender}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                            {patient.date_of_birth
                              ? format(
                                  new Date(patient.date_of_birth),
                                  "MMM d, yyyy"
                                )
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                            <div>{patient.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {patient.phone}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-xs sm:text-sm hidden xl:table-cell">
                            {patient.marital_status || "N/A"}
                          </TableCell>

                          <TableCell className="text-right w-20">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] md:text-sm h-7 md:h-8 px-2 md:px-3"
                              onClick={() =>
                                navigate(
                                  `/patients/${
                                    patient.patient_id || patient.id
                                  }`
                                )
                              }
                            >
                              <FileText className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                              <span className="hidden md:inline">
                                View Record
                              </span>
                              <span className="md:hidden ml-1">View</span>
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expandable row - shows hidden columns based on screen size */}
                        {isExpanded && (
                          <TableRow className="xl:hidden bg-muted/50">
                            <TableCell colSpan={3} className="py-3">
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between md:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    ID:
                                  </span>
                                  <span>
                                    {patient.patient_id || patient.id}
                                  </span>
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
                                    Date of Birth:
                                  </span>
                                  <span>
                                    {patient.date_of_birth
                                      ? format(
                                          new Date(patient.date_of_birth),
                                          "MMM d, yyyy"
                                        )
                                      : "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between lg:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    Email:
                                  </span>
                                  <span className="text-right">
                                    {patient.email}
                                  </span>
                                </div>
                                <div className="flex justify-between lg:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    Phone:
                                  </span>
                                  <span>{patient.phone || "N/A"}</span>
                                </div>
                                <div className="flex justify-between xl:hidden">
                                  <span className="font-medium text-muted-foreground">
                                    Marital Status:
                                  </span>
                                  <span className="capitalize">
                                    {patient.marital_status || "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pt-2 md:hidden">
                                  <Checkbox
                                    checked={selectedPatients.has(patient.id)}
                                    onCheckedChange={(checked) =>
                                      handleSelectPatient(
                                        patient.id,
                                        checked as boolean
                                      )
                                    }
                                    id={`mobile-select-${patient.id}`}
                                  />
                                  <label
                                    htmlFor={`mobile-select-${patient.id}`}
                                    className="text-xs font-medium cursor-pointer"
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
                              No patients found
                            </p>
                            <p className="text-xs sm:text-sm">
                              Try adjusting your search term "{searchQuery}"
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm sm:text-base md:text-lg font-medium">
                              No patients registered yet
                            </p>
                            <p className="text-xs sm:text-sm">
                              Click "Add New Patient" to get started
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

          {/* Pagination Controls */}
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

      {/* Red Flag Reason Dialog */}
      <Dialog open={showRedFlagDialog} onOpenChange={setShowRedFlagDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Red Flag Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Reason:
              </Label>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-1">
                <p className="text-sm">{selectedRedFlag?.reason}</p>
              </div>
            </div>
            {selectedRedFlag?.flaggedBy && (
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Flagged by:
                </Label>
                <p className="text-sm mt-1">{selectedRedFlag.flaggedBy}</p>
              </div>
            )}
            {selectedRedFlag?.flaggedDate && (
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Date flagged:
                </Label>
                <p className="text-sm mt-1">
                  {new Date(selectedRedFlag.flaggedDate).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRedFlagDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientsList;
