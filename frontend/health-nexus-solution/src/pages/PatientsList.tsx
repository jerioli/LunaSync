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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patient Records</h1>
        <div className="flex gap-2">
          {selectedPatients.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedPatients.size})
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
          <Button onClick={() => navigate("/patients/add")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Patient
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mt-1">
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
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  className="pl-8"
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
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
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("name")}
                  >
                    Name
                    {renderSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("gender")}
                  >
                    Sex
                    {renderSortIcon("gender")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("date_of_birth")}
                  >
                    Date of Birth
                    {renderSortIcon("date_of_birth")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort("email")}
                  >
                    Contact
                    {renderSortIcon("email")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
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
                paginatedPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPatients.has(patient.id)}
                        onCheckedChange={(checked) =>
                          handleSelectPatient(patient.id, checked as boolean)
                        }
                        aria-label={`Select ${patient.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getPatientInitial(patient)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {formatPatientNameWithInitial(patient) ||
                              patient.name}
                            {patient.is_red_flagged && (
                              <Badge
                                variant="destructive"
                                className="cursor-pointer text-xs"
                                onClick={() => handleShowRedFlagReason(patient)}
                              >
                                <Flag className="h-3 w-3 mr-1" />
                                FLAGGED
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {patient.patient_id || patient.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {patient.gender}
                    </TableCell>
                    <TableCell>
                      {patient.date_of_birth
                        ? format(new Date(patient.date_of_birth), "MMM d, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div>{patient.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {patient.phone}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {patient.marital_status || "N/A"}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/patients/${patient.patient_id || patient.id}`
                          )
                        }
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Record
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchQuery ? (
                        <>
                          <p className="text-lg font-medium">
                            No patients found
                          </p>
                          <p className="text-sm">
                            Try adjusting your search term "{searchQuery}"
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-medium">
                            No patients registered yet
                          </p>
                          <p className="text-sm">
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
