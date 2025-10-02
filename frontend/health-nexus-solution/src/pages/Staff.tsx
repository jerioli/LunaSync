import React, { useEffect, useState } from "react";

import StaffDetailModal from "@/components/StaffDetailModal";
import StaffEditModal from "@/components/StaffEditModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import {
  Admin,
  api,
  axiosInstance,
  Doctor,
  Receptionist,
  StaffMember,
} from "@/services/api";
import {
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit,
  Eye,
  Mail,
  Phone,
  Search,
  Trash,
  Trash2,
  UserPlus,
} from "lucide-react";

export type Role =
  | "doctor"
  | "receptionist"
  | "admin"
  | "patient"
  | "superadmin";

type SortField = "name" | "email" | "phone" | "username" | "is_active";
type SortDirection = "asc" | "desc";

const StaffPage = () => {
  const { currentUser } = useClinic();
  const { toast } = useToast();
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting states for each tab
  const [doctorSort, setDoctorSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({ field: "name", direction: "asc" });
  const [receptionistSort, setReceptionistSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({ field: "name", direction: "asc" });
  const [adminSort, setAdminSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({ field: "name", direction: "asc" });
  const [superAdminSort, setSuperAdminSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({ field: "name", direction: "asc" });
  const [newStaff, setNewStaff] = useState({
    first_name: "",
    last_name: "",
    middle_initial: "",
    suffix: "",
    username: "",
    email: "",
    phone: "",
    role: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [receptionistsList, setReceptionistsList] = useState<Receptionist[]>(
    []
  );
  const [isLoadingReceptionists, setIsLoadingReceptionists] = useState(false);
  const [adminsList, setAdminsList] = useState<Admin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [superAdminsList, setSuperAdminsList] = useState<StaffMember[]>([]);
  const [isLoadingSuperAdmins, setIsLoadingSuperAdmins] = useState(false);

  // Tab state
  const [currentTab, setCurrentTab] = useState("doctors");

  // Modal states
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  // Bulk delete states
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(
    new Set()
  );
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Email validation state
  const [emailValidationError, setEmailValidationError] = useState("");

  // Pagination states
  const [doctorPage, setDoctorPage] = useState(1);
  const [receptionistPage, setReceptionistPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [superAdminPage, setSuperAdminPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Helper function to format full name
  const formatFullName = (user: { 
    first_name: string; 
    last_name: string; 
    middle_initial?: string | null; 
    suffix?: string | null; 
  }) => {
    const parts = [user.first_name];
    if (user.middle_initial) {
      parts.push(user.middle_initial + '.');
    }
    parts.push(user.last_name);
    if (user.suffix) {
      parts.push(user.suffix);
    }
    return parts.join(' ');
  };

  // Sorting helper functions
  const handleSort = (
    field: SortField,
    currentSort: { field: SortField; direction: SortDirection },
    setSortState: React.Dispatch<
      React.SetStateAction<{ field: SortField; direction: SortDirection }>
    >
  ) => {
    if (currentSort.field === field) {
      setSortState({
        field,
        direction: currentSort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortState({ field, direction: "asc" });
    }
  };

  const sortData = <
    T extends {
      name?: string;
      email?: string;
      phone?: string;
      username?: string;
      is_active?: boolean;
    }
  >(
    data: T[],
    sortConfig: { field: SortField; direction: SortDirection }
  ): T[] => {
    return [...data].sort((a, b) => {
      let aValue: any = a[sortConfig.field];
      let bValue: any = b[sortConfig.field];

      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortConfig.direction === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const renderSortIcon = (
    field: SortField,
    currentSort: { field: SortField; direction: SortDirection }
  ) => {
    if (currentSort.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return currentSort.direction === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  // Fetch staff from backend
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await axiosInstance.get("/staff/list/");
        setStaff(response.data);
      } catch (error) {
        console.error("Error fetching staff:", error);
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      try {
        const response = await api.doctors.getAll();
        setDoctorsList(response);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    const fetchReceptionists = async () => {
      setIsLoadingReceptionists(true);
      try {
        const response = await api.receptionists.getAll();
        setReceptionistsList(response);
      } catch (error) {
        console.error("Error fetching receptionists:", error);
      } finally {
        setIsLoadingReceptionists(false);
      }
    };
    fetchReceptionists();
  }, []);

  useEffect(() => {
    const fetchAdmins = async () => {
      setIsLoadingAdmins(true);
      try {
        const response = await api.admins.getAll();
        setAdminsList(response);
      } catch (error) {
        console.error("Error fetching admins:", error);
      } finally {
        setIsLoadingAdmins(false);
      }
    };
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (currentUser?.role === "superadmin") {
      const fetchSuperAdmins = async () => {
        setIsLoadingSuperAdmins(true);
        try {
          const response = await axiosInstance.get(
            "/staff/list/?role=superadmin"
          );
          setSuperAdminsList(response.data);
        } catch (error) {
          console.error("Error fetching super admins:", error);
          toast({
            title: "Error",
            description: "Failed to fetch super administrators",
            variant: "destructive",
          });
        } finally {
          setIsLoadingSuperAdmins(false);
        }
      };
      fetchSuperAdmins();
    }
  }, [currentUser?.role, toast]);

  if (!["admin", "superadmin"].includes(currentUser?.role || "")) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators and superadmins can access the staff
              management page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Function to refresh all staff lists
  const refreshStaffLists = async () => {
    // Refresh doctors
    setIsLoadingDoctors(true);
    try {
      const doctorsResponse = await api.doctors.getAll();
      setDoctorsList(doctorsResponse);
    } catch (error) {
      console.error("Error refreshing doctors:", error);
    } finally {
      setIsLoadingDoctors(false);
    }

    // Refresh receptionists
    setIsLoadingReceptionists(true);
    try {
      const receptionistsResponse = await api.receptionists.getAll();
      setReceptionistsList(receptionistsResponse);
    } catch (error) {
      console.error("Error refreshing receptionists:", error);
    } finally {
      setIsLoadingReceptionists(false);
    }

    // Refresh admins
    setIsLoadingAdmins(true);
    try {
      const adminsResponse = await api.admins.getAll();
      setAdminsList(adminsResponse);
    } catch (error) {
      console.error("Error refreshing admins:", error);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  // Filter staff by role and search term
  const filterStaff = (role: string) => {
    return staff.filter(
      (user) =>
        user.role === role &&
        (formatFullName(user)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  };

  // Filter doctors by search term
  const filterDoctors = () => {
    return doctorsList.filter(
      (doctor) =>
        formatFullName(doctor)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doctor.email && doctor.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Filter receptionists by search term
  const filterReceptionists = () => {
    return receptionistsList.filter(
      (receptionist) =>
        formatFullName(receptionist)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (receptionist.email && receptionist.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Filter admins by search term
  const filterAdmins = () => {
    return adminsList.filter(
      (admin) =>
        formatFullName(admin)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (admin.email && admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const doctors = filterStaff("doctor");
  const filteredDoctors = sortData(
    filterDoctors().map((doctor) => ({
      ...doctor,
      name: formatFullName(doctor),
    })),
    doctorSort
  );
  const receptionists = filterStaff("receptionist");
  const filteredReceptionists = sortData(
    filterReceptionists().map((receptionist) => ({
      ...receptionist,
      name: formatFullName(receptionist),
    })),
    receptionistSort
  );
  const admins = filterStaff("admin");
  const filteredAdmins = sortData(
    filterAdmins().map((admin) => ({
      ...admin,
      name: formatFullName(admin),
    })),
    adminSort
  );

  // Filter and sort super admins
  const filteredSuperAdmins = sortData(
    superAdminsList
      .filter(
        (admin) =>
          formatFullName(admin)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (admin.email && admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .map((admin) => ({
        ...admin,
        name: formatFullName(admin),
      })),
    superAdminSort
  );

  // Pagination logic for each tab
  const paginateData = (data: any[], currentPage: number) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      data: data.slice(startIndex, endIndex),
      totalItems: data.length,
      totalPages: Math.ceil(data.length / itemsPerPage),
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, data.length),
    };
  };

  const doctorPagination = paginateData(filteredDoctors, doctorPage);
  const receptionistPagination = paginateData(
    filteredReceptionists,
    receptionistPage
  );
  const adminPagination = paginateData(filteredAdmins, adminPage);
  const superAdminPagination = paginateData(
    filteredSuperAdmins,
    superAdminPage
  );

  // Reset pages when search or sort changes
  useEffect(() => {
    setDoctorPage(1);
    setReceptionistPage(1);
    setAdminPage(1);
    setSuperAdminPage(1);
  }, [searchTerm, doctorSort, receptionistSort, adminSort, superAdminSort]);

  const handlePageChange = (tab: string, page: number) => {
    switch (tab) {
      case "doctors":
        setDoctorPage(page);
        break;
      case "receptionists":
        setReceptionistPage(page);
        break;
      case "admins":
        setAdminPage(page);
        break;
      case "superadmins":
        setSuperAdminPage(page);
        break;
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setDoctorPage(1);
    setReceptionistPage(1);
    setAdminPage(1);
    setSuperAdminPage(1);
  };

  // Handle dialog open/close state change
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Clear form and validation errors when dialog is closed
      setNewStaff({
        first_name: "",
        last_name: "",
        middle_initial: "",
        suffix: "",
        username: "",
        email: "",
        phone: "",
        role: "",
        password: "",
      });
      setEmailValidationError("");
    }
  };

  // Handle input changes for the form
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setNewStaff((prev) => ({ ...prev, [id]: value }));

    // Clear email validation error when user starts typing in email field
    if (id === "email") {
      setEmailValidationError("");
    }
  };

  // Check if email already exists
  const checkEmailExists = (email: string): boolean => {
    if (!email) return false;

    const emailLower = email.toLowerCase();

    // Check in all staff lists
    const existsInDoctors = doctorsList.some(
      (doctor) => doctor.email && doctor.email.toLowerCase() === emailLower
    );
    const existsInReceptionists = receptionistsList.some(
      (receptionist) => receptionist.email && receptionist.email.toLowerCase() === emailLower
    );
    const existsInAdmins = adminsList.some(
      (admin) => admin.email && admin.email.toLowerCase() === emailLower
    );
    const existsInSuperAdmins = superAdminsList.some(
      (admin) => admin.email && admin.email.toLowerCase() === emailLower
    );

    return (
      existsInDoctors ||
      existsInReceptionists ||
      existsInAdmins ||
      existsInSuperAdmins
    );
  };

  // Generate a strong password that meets all security requirements
  const generateStrongPassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    // Ensure at least one character from each required category
    let password = "";
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill the rest with random characters from all categories
    const allChars = lowercase + uppercase + numbers + specialChars;
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Clear any previous validation errors
    setEmailValidationError("");

    // Validate email doesn't already exist
    if (checkEmailExists(newStaff.email)) {
      setEmailValidationError(
        "This email is already in use by another staff member"
      );
      toast({
        title: "Validation Error",
        description: "This email is already in use by another staff member",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Generate a strong temporary password
      const tempPassword = generateStrongPassword();

      const response = await axiosInstance.post("/staff/", {
        username: newStaff.username || newStaff.email, // Use username or fallback to email
        email: newStaff.email,
        phone: newStaff.phone, // Include phone number
        password: tempPassword, // Use auto-generated password
        first_name: newStaff.first_name,
        last_name: newStaff.last_name,
        middle_initial: newStaff.middle_initial || null,
        suffix: newStaff.suffix || null,
        role: newStaff.role,
        is_active: true, // Always set to active
        is_staff: newStaff.role !== "doctor", // Doctors are not Django staff by default
        is_superuser: false, // Admins can't create superusers - only superadmins can
        send_email: true, // Flag to send email with credentials
        temp_password: tempPassword, // Send temp password for email
      });
      console.log("Staff added successfully:", response.data);

      toast({
        title: "Success",
        description:
          "Staff member added successfully! Login credentials have been sent to their email.",
        variant: "default",
      });
      setIsDialogOpen(false); // Close the dialog (this will trigger form reset)

      // Refresh the staff lists without reloading the page
      await refreshStaffLists();
    } catch (error) {
      console.error(
        "Error adding staff:",
        error.response?.data || error.message
      );
      toast({
        title: "Error",
        description: `Failed to add staff member: ${
          error.response?.data?.error || error.message
        }`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle viewing staff details
  const handleViewDetails = async (
    staffMember: Doctor | Receptionist | Admin | StaffMember
  ) => {
    try {
      const details = await api.staff.getDetails(staffMember.id);
      setSelectedStaff(details);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error("Error fetching staff details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch staff details. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle editing staff
  const handleEditStaff = async (
    staffMember: Doctor | Receptionist | Admin | StaffMember
  ) => {
    try {
      const details = await api.staff.getDetails(staffMember.id);
      setSelectedStaff(details);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Error fetching staff details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch staff details. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle staff update
  const handleStaffUpdate = () => {
    setIsDetailModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedStaff(null);
    refreshStaffLists();
  };

  // Handle delete confirmation
  const handleDeleteClick = (staffMember: Doctor | Receptionist | Admin) => {
    setStaffToDelete(staffMember as StaffMember);
    setIsDeleteDialogOpen(true);
  };

  // Handle staff deletion
  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;

    try {
      await api.staff.delete(staffToDelete.id);
      setIsDeleteDialogOpen(false);
      setStaffToDelete(null);
      refreshStaffLists();
      toast({
        title: "Staff deleted",
        description: `${formatFullName(staffToDelete)} has been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast({
        title: "Error",
        description: "Failed to delete staff member. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Bulk delete functions
  const getAllStaffIds = () => {
    const allIds: Set<number> = new Set();
    doctorsList.forEach((doctor) => allIds.add(doctor.id));
    receptionistsList.forEach((receptionist) => allIds.add(receptionist.id));
    adminsList.forEach((admin) => allIds.add(admin.id));
    return allIds;
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedStaffIds(new Set());
      setIsSelectAll(false);
    } else {
      const allIds = getAllStaffIds();
      setSelectedStaffIds(allIds);
      setIsSelectAll(true);
    }
  };

  const handleStaffSelect = (staffId: number, checked: boolean) => {
    setSelectedStaffIds((prev) => {
      const newSelection = new Set(prev);
      if (checked) {
        newSelection.add(staffId);
      } else {
        newSelection.delete(staffId);
      }

      const allIds = getAllStaffIds();
      setIsSelectAll(newSelection.size === allIds.size);
      return newSelection;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedStaffIds.size === 0) {
      toast({
        title: "No selection",
        description: "Please select staff members to delete.",
        variant: "destructive",
      });
      return;
    }

    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const response = await axiosInstance.post("/api/bulk/staff/delete/", {
        staff_ids: Array.from(selectedStaffIds),
      });

      setIsBulkDeleteDialogOpen(false);
      setSelectedStaffIds(new Set());
      setIsSelectAll(false);
      refreshStaffLists();

      toast({
        title: "Bulk deletion completed",
        description: `Successfully deleted ${response.data.deleted_count} staff members.`,
      });
    } catch (error: any) {
      console.error("Error in bulk delete:", error);
      toast({
        title: "Bulk deletion failed",
        description:
          error.response?.data?.error ||
          "Failed to delete selected staff members.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSelectAllDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const response = await axiosInstance.post("/api/bulk/staff/delete/", {
        select_all: true,
      });

      setIsBulkDeleteDialogOpen(false);
      setSelectedStaffIds(new Set());
      setIsSelectAll(false);
      refreshStaffLists();

      toast({
        title: "Bulk deletion completed",
        description: `Successfully deleted ${response.data.deleted_count} staff members.`,
      });
    } catch (error: any) {
      console.error("Error in select all delete:", error);
      toast({
        title: "Bulk deletion failed",
        description:
          error.response?.data?.error || "Failed to delete all staff members.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Staff Management
          </h1>
          <p className="text-muted-foreground">
            Manage clinic staff members, including doctors, receptionists, and
            administrators
          </p>
        </div>

        <div className="flex gap-2">
          {/* Bulk Actions Bar */}
          {selectedStaffIds.size > 0 && currentTab !== "admins" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
              <span className="text-sm text-blue-700 font-medium">
                {selectedStaffIds.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStaffIds(new Set())}
                className="h-8"
              >
                Clear Selection
              </Button>
            </div>
          )}

          {currentTab !== "admins" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-9"
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              {isSelectAll ? "Deselect All" : "Select All"}
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new doctor or receptionist account. All staff members
                  are created as active. A temporary password will be sent to
                  their email.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                {/* First Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="first_name" className="text-right">
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    placeholder="e.g., John"
                    className="col-span-3"
                    value={newStaff.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Middle Initial */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="middle_initial" className="text-right">
                    Middle Initial
                  </Label>
                  <Input
                    id="middle_initial"
                    placeholder="e.g., A"
                    className="col-span-3"
                    value={newStaff.middle_initial}
                    onChange={handleInputChange}
                    maxLength={1}
                  />
                </div>

                {/* Last Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="last_name" className="text-right">
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    placeholder="e.g., Doe"
                    className="col-span-3"
                    value={newStaff.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Suffix */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="suffix" className="text-right">
                    Suffix
                  </Label>
                  <Input
                    id="suffix"
                    placeholder="e.g., Jr., Sr., III"
                    className="col-span-3"
                    value={newStaff.suffix}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Username */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="e.g., johndoe"
                    className="col-span-3"
                    value={newStaff.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                {/* Email */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., johndoe@example.com"
                      className={`w-full ${
                        emailValidationError ? "border-red-500" : ""
                      }`}
                      value={newStaff.email}
                      onChange={handleInputChange}
                      required
                    />
                    {emailValidationError && (
                      <p className="text-red-500 text-sm mt-1">
                        {emailValidationError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., (555) 123-4567"
                    className="col-span-3"
                    value={newStaff.phone}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Role */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <select
                    id="role"
                    className="col-span-3 border rounded-md p-2"
                    value={newStaff.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="admin">Admin</option>
                    {currentUser?.role === "superadmin" && (
                      <option value="superadmin">Super Admin</option>
                    )}
                  </select>
                </div>

                {/* Submit Button */}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Staff Member"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList
          className={`grid w-full ${
            currentUser?.role === "superadmin" ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="receptionists">Receptionists</TabsTrigger>
          <TabsTrigger value="admins">Administrators</TabsTrigger>
          {currentUser?.role === "superadmin" && (
            <TabsTrigger value="superadmins">Super Admins</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="doctors" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Doctors</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {doctorPagination.startIndex}-
                    {doctorPagination.endIndex} of {doctorPagination.totalItems}{" "}
                    doctors
                    {doctorSort.field && (
                      <span className="ml-2">
                        • Sorted by {doctorSort.field.replace("_", " ")} (
                        {doctorSort.direction === "asc" ? "A-Z" : "Z-A"})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search doctors..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {(searchTerm ||
                    doctorSort.field !== "name" ||
                    doctorSort.direction !== "asc") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setDoctorSort({ field: "name", direction: "asc" });
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDoctors ? (
                <div className="text-center py-6 text-muted-foreground">
                  Loading doctors...
                </div>
              ) : doctorPagination.totalItems === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm ? (
                      <>
                        <p className="text-lg font-medium">No doctors found</p>
                        <p className="text-sm">
                          Try adjusting your search term "{searchTerm}"
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">
                          No doctors registered yet
                        </p>
                        <p className="text-sm">
                          Click "Add New Staff" to get started
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            isSelectAll &&
                            filteredDoctors.every((doctor) =>
                              selectedStaffIds.has(doctor.id)
                            )
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newSelection = new Set(selectedStaffIds);
                              filteredDoctors.forEach((doctor) =>
                                newSelection.add(doctor.id)
                              );
                              setSelectedStaffIds(newSelection);
                            } else {
                              const newSelection = new Set(selectedStaffIds);
                              filteredDoctors.forEach((doctor) =>
                                newSelection.delete(doctor.id)
                              );
                              setSelectedStaffIds(newSelection);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort("name", doctorSort, setDoctorSort)
                          }
                        >
                          Doctor
                          {renderSortIcon("name", doctorSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort("email", doctorSort, setDoctorSort)
                          }
                        >
                          Email
                          {renderSortIcon("email", doctorSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort("phone", doctorSort, setDoctorSort)
                          }
                        >
                          Phone
                          {renderSortIcon("phone", doctorSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort("is_active", doctorSort, setDoctorSort)
                          }
                        >
                          Status
                          {renderSortIcon("is_active", doctorSort)}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorPagination.data.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStaffIds.has(doctor.id)}
                            onCheckedChange={(checked) =>
                              handleStaffSelect(doctor.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={doctor.image}
                                alt={formatFullName(doctor)}
                              />
                              <AvatarFallback>
                                {doctor.first_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{formatFullName(doctor)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            {doctor.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            {doctor.phone || "Not provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              doctor.is_active !== false
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              doctor.is_active !== false
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {doctor.is_active !== false ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(doctor)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStaff(doctor)}
                              title="Edit Staff"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(doctor)}
                              title="Delete Staff"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination Controls for Doctors */}
              {doctorPagination.totalItems > 0 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">Show</p>
                    <select
                      value={itemsPerPage.toString()}
                      onChange={(e) => handleItemsPerPageChange(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                    <p className="text-sm text-muted-foreground">entries</p>
                  </div>

                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                      Page {doctorPage} of {doctorPagination.totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange("doctors", doctorPage - 1)
                        }
                        disabled={doctorPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange("doctors", doctorPage + 1)
                        }
                        disabled={doctorPage >= doctorPagination.totalPages}
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
        </TabsContent>

        <TabsContent value="receptionists" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Receptionists</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {receptionistPagination.startIndex}-
                    {receptionistPagination.endIndex} of{" "}
                    {receptionistPagination.totalItems} receptionists
                    {receptionistSort.field && (
                      <span className="ml-2">
                        • Sorted by {receptionistSort.field.replace("_", " ")} (
                        {receptionistSort.direction === "asc" ? "A-Z" : "Z-A"})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search receptionists..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {(searchTerm ||
                    receptionistSort.field !== "name" ||
                    receptionistSort.direction !== "asc") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setReceptionistSort({
                          field: "name",
                          direction: "asc",
                        });
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReceptionists ? (
                <div className="text-center py-6 text-muted-foreground">
                  Loading receptionists...
                </div>
              ) : receptionistPagination.totalItems === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm ? (
                      <>
                        <p className="text-lg font-medium">
                          No receptionists found
                        </p>
                        <p className="text-sm">
                          Try adjusting your search term "{searchTerm}"
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">
                          No receptionists registered yet
                        </p>
                        <p className="text-sm">
                          Click "Add New Staff" to get started
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            isSelectAll &&
                            filteredReceptionists.every((receptionist) =>
                              selectedStaffIds.has(receptionist.id)
                            )
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newSelection = new Set(selectedStaffIds);
                              filteredReceptionists.forEach((receptionist) =>
                                newSelection.add(receptionist.id)
                              );
                              setSelectedStaffIds(newSelection);
                            } else {
                              const newSelection = new Set(selectedStaffIds);
                              filteredReceptionists.forEach((receptionist) =>
                                newSelection.delete(receptionist.id)
                              );
                              setSelectedStaffIds(newSelection);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort(
                              "name",
                              receptionistSort,
                              setReceptionistSort
                            )
                          }
                        >
                          Receptionist
                          {renderSortIcon("name", receptionistSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort(
                              "email",
                              receptionistSort,
                              setReceptionistSort
                            )
                          }
                        >
                          Email
                          {renderSortIcon("email", receptionistSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort(
                              "phone",
                              receptionistSort,
                              setReceptionistSort
                            )
                          }
                        >
                          Phone
                          {renderSortIcon("phone", receptionistSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort(
                              "is_active",
                              receptionistSort,
                              setReceptionistSort
                            )
                          }
                        >
                          Status
                          {renderSortIcon("is_active", receptionistSort)}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receptionistPagination.data.map((receptionist) => (
                      <TableRow key={receptionist.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStaffIds.has(receptionist.id)}
                            onCheckedChange={(checked) =>
                              handleStaffSelect(
                                receptionist.id,
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={receptionist.image}
                                alt={formatFullName(receptionist)}
                              />
                              <AvatarFallback>
                                {receptionist.first_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{formatFullName(receptionist)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            {receptionist.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            {receptionist.phone || "Not provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              receptionist.is_active !== false
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              receptionist.is_active !== false
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {receptionist.is_active !== false
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(receptionist)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStaff(receptionist)}
                              title="Edit Staff"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(receptionist)}
                              title="Delete Staff"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination Controls for Receptionists */}
              {receptionistPagination.totalItems > 0 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">Show</p>
                    <select
                      value={itemsPerPage.toString()}
                      onChange={(e) => handleItemsPerPageChange(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                    <p className="text-sm text-muted-foreground">entries</p>
                  </div>

                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                      Page {receptionistPage} of{" "}
                      {receptionistPagination.totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange(
                            "receptionists",
                            receptionistPage - 1
                          )
                        }
                        disabled={receptionistPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handlePageChange(
                            "receptionists",
                            receptionistPage + 1
                          )
                        }
                        disabled={
                          receptionistPage >= receptionistPagination.totalPages
                        }
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
        </TabsContent>

        <TabsContent value="admins" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Administrators</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {filteredAdmins.length} of {adminsList.length}{" "}
                    administrators
                    {adminSort.field && (
                      <span className="ml-2">
                        • Sorted by {adminSort.field.replace("_", " ")} (
                        {adminSort.direction === "asc" ? "A-Z" : "Z-A"})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    View-only access. Contact superadmin for administrative
                    changes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search administrators..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {(searchTerm ||
                    adminSort.field !== "name" ||
                    adminSort.direction !== "asc") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setAdminSort({ field: "name", direction: "asc" });
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAdmins ? (
                <div className="text-center py-6 text-muted-foreground">
                  Loading administrators...
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm ? (
                      <>
                        <p className="text-lg font-medium">
                          No administrators found
                        </p>
                        <p className="text-sm">
                          Try adjusting your search term "{searchTerm}"
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">
                          No administrators registered yet
                        </p>
                        <p className="text-sm">
                          Contact superadmin to add administrators
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
                          onClick={() =>
                            handleSort("name", adminSort, setAdminSort)
                          }
                        >
                          Administrator
                          {renderSortIcon("name", adminSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort("email", adminSort, setAdminSort)
                          }
                        >
                          Email
                          {renderSortIcon("email", adminSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort("phone", adminSort, setAdminSort)
                          }
                        >
                          Phone
                          {renderSortIcon("phone", adminSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort("is_active", adminSort, setAdminSort)
                          }
                        >
                          Status
                          {renderSortIcon("is_active", adminSort)}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={admin.image}
                                alt={formatFullName(admin)}
                              />
                              <AvatarFallback>
                                {admin.first_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{formatFullName(admin)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            {admin.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            {admin.phone || "Not provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              admin.is_active !== false
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              admin.is_active !== false
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {admin.is_active !== false ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(admin)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStaff(admin)}
                              title="Edit Administrator"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Superadmins Tab Content */}
        <TabsContent value="superadmins" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Super Administrators</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {filteredSuperAdmins.length} of{" "}
                    {superAdminsList.length} super administrators
                    {superAdminSort.field && (
                      <span className="ml-2">
                        • Sorted by {superAdminSort.field.replace("_", " ")} (
                        {superAdminSort.direction === "asc" ? "A-Z" : "Z-A"})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search super administrators..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {(searchTerm ||
                    superAdminSort.field !== "name" ||
                    superAdminSort.direction !== "asc") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSuperAdminSort({ field: "name", direction: "asc" });
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSuperAdmins ? (
                <div className="text-center py-6 text-muted-foreground">
                  Loading super administrators...
                </div>
              ) : filteredSuperAdmins.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm ? (
                      <>
                        <p className="text-lg font-medium">
                          No super administrators found
                        </p>
                        <p className="text-sm">
                          Try adjusting your search term "{searchTerm}"
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">
                          No super administrators registered yet
                        </p>
                        <p className="text-sm">Contact system administrator</p>
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
                          onClick={() =>
                            handleSort(
                              "name",
                              superAdminSort,
                              setSuperAdminSort
                            )
                          }
                        >
                          Super Administrator
                          {renderSortIcon("name", superAdminSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort(
                              "email",
                              superAdminSort,
                              setSuperAdminSort
                            )
                          }
                        >
                          Email
                          {renderSortIcon("email", superAdminSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort(
                              "phone",
                              superAdminSort,
                              setSuperAdminSort
                            )
                          }
                        >
                          Phone
                          {renderSortIcon("phone", superAdminSort)}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() =>
                            handleSort(
                              "is_active",
                              superAdminSort,
                              setSuperAdminSort
                            )
                          }
                        >
                          Status
                          {renderSortIcon("is_active", superAdminSort)}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuperAdmins.map((superAdmin) => (
                      <TableRow key={superAdmin.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={superAdmin.image}
                                alt={formatFullName(superAdmin)}
                              />
                              <AvatarFallback>
                                {superAdmin.first_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{formatFullName(superAdmin)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            {superAdmin.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            {superAdmin.phone || "Not provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              superAdmin.is_active !== false
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              superAdmin.is_active !== false
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {superAdmin.is_active !== false
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(superAdmin)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Staff Detail Modal */}
      <StaffDetailModal
        staff={selectedStaff}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* Staff Edit Modal */}
      <StaffEditModal
        staff={selectedStaff}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleStaffUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {staffToDelete?.first_name}{" "}
              {staffToDelete?.last_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStaff}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Staff Members</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStaffIds.size} staff
              member(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? "Deleting..." : "Delete Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPage;
