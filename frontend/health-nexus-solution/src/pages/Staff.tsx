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
import { useBranding } from "@/contexts/BrandingContext";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit,
  Eye,
  Mail,
  Phone,
  Search,
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
  const { colors } = useBranding();
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
    [],
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

  // Email validation state
  const [emailValidationError, setEmailValidationError] = useState("");

  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      parts.push(user.middle_initial + ".");
    }
    parts.push(user.last_name);
    if (user.suffix) {
      parts.push(user.suffix);
    }
    return parts.join(" ");
  };

  // Sorting helper functions
  const handleSort = (
    field: SortField,
    currentSort: { field: SortField; direction: SortDirection },
    setSortState: React.Dispatch<
      React.SetStateAction<{ field: SortField; direction: SortDirection }>
    >,
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
    },
  >(
    data: T[],
    sortConfig: { field: SortField; direction: SortDirection },
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
    currentSort: { field: SortField; direction: SortDirection },
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
            "/staff/list/?role=superadmin",
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
          (user.email &&
            user.email.toLowerCase().includes(searchTerm.toLowerCase()))),
    );
  };

  // Filter doctors by search term
  const filterDoctors = () => {
    return doctorsList.filter(
      (doctor) =>
        formatFullName(doctor)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doctor.email &&
          doctor.email.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  };

  // Filter receptionists by search term
  const filterReceptionists = () => {
    return receptionistsList.filter(
      (receptionist) =>
        formatFullName(receptionist)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (receptionist.email &&
          receptionist.email.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  };

  // Filter admins by search term
  const filterAdmins = () => {
    return adminsList.filter(
      (admin) =>
        formatFullName(admin)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (admin.email &&
          admin.email.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  };

  const doctors = filterStaff("doctor");
  const filteredDoctors = sortData(
    filterDoctors().map((doctor) => ({
      ...doctor,
      name: formatFullName(doctor),
    })),
    doctorSort,
  );
  const receptionists = filterStaff("receptionist");
  const filteredReceptionists = sortData(
    filterReceptionists().map((receptionist) => ({
      ...receptionist,
      name: formatFullName(receptionist),
    })),
    receptionistSort,
  );
  const admins = filterStaff("admin");
  const filteredAdmins = sortData(
    filterAdmins().map((admin) => ({
      ...admin,
      name: formatFullName(admin),
    })),
    adminSort,
  );

  // Filter and sort super admins
  const filteredSuperAdmins = sortData(
    superAdminsList
      .filter(
        (admin) =>
          formatFullName(admin)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (admin.email &&
            admin.email.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      .map((admin) => ({
        ...admin,
        name: formatFullName(admin),
      })),
    superAdminSort,
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
    receptionistPage,
  );
  const adminPagination = paginateData(filteredAdmins, adminPage);
  const superAdminPagination = paginateData(
    filteredSuperAdmins,
    superAdminPage,
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    let { id, value } = e.target;

    // Remove numbers from name fields
    if (id === "first_name" || id === "last_name" || id === "middle_initial") {
      value = value.replace(/[0-9]/g, "");
    }

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
      (doctor) => doctor.email && doctor.email.toLowerCase() === emailLower,
    );
    const existsInReceptionists = receptionistsList.some(
      (receptionist) =>
        receptionist.email && receptionist.email.toLowerCase() === emailLower,
    );
    const existsInAdmins = adminsList.some(
      (admin) => admin.email && admin.email.toLowerCase() === emailLower,
    );
    const existsInSuperAdmins = superAdminsList.some(
      (admin) => admin.email && admin.email.toLowerCase() === emailLower,
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
        "This email is already in use by another staff member",
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
    } catch (error: any) {
      console.error(
        "Error adding staff:",
        error.response?.data || error.message,
      );

      let errorTitle = "Error";
      let errorDescription = "Failed to add staff member. Please try again.";

      if (error.response?.data) {
        const errorData = error.response.data;

        // Handle specific error cases
        if (errorData.email) {
          errorTitle = "Email Error";
          errorDescription = Array.isArray(errorData.email)
            ? errorData.email[0]
            : errorData.email;
          setEmailValidationError(errorDescription);

          // Check for specific email already exists message
          if (
            errorDescription.toLowerCase().includes("already") ||
            errorDescription.toLowerCase().includes("exists") ||
            errorDescription.toLowerCase().includes("in use")
          ) {
            errorTitle = "Email Already Exists";
            errorDescription =
              "This email address is already registered in the system.";
          }
        } else if (errorData.username) {
          errorTitle = "Username Error";
          errorDescription = Array.isArray(errorData.username)
            ? errorData.username[0]
            : errorData.username;

          // Check for username already exists
          if (
            errorDescription.toLowerCase().includes("already") ||
            errorDescription.toLowerCase().includes("exists")
          ) {
            errorTitle = "Username Already Exists";
            errorDescription =
              "This username is already taken. Please choose a different username.";
          }
        } else if (errorData.phone) {
          errorTitle = "Phone Number Error";
          errorDescription = Array.isArray(errorData.phone)
            ? errorData.phone[0]
            : errorData.phone;
        } else if (errorData.first_name || errorData.last_name) {
          errorTitle = "Name Validation Error";
          const nameError = errorData.first_name || errorData.last_name;
          errorDescription = Array.isArray(nameError)
            ? nameError[0]
            : nameError;
        } else if (errorData.error) {
          errorDescription = errorData.error;
        } else if (errorData.detail) {
          errorDescription = errorData.detail;
        } else if (errorData.message) {
          errorDescription = errorData.message;
        } else {
          // Try to extract any field errors
          const fieldErrors = Object.entries(errorData)
            .filter(
              ([key, value]) =>
                typeof value === "string" || Array.isArray(value),
            )
            .map(([key, value]) => {
              const errorMsg = Array.isArray(value) ? value[0] : value;
              const fieldName = key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
              return `${fieldName}: ${errorMsg}`;
            });

          if (fieldErrors.length > 0) {
            errorTitle = "Validation Error";
            errorDescription = fieldErrors.join(". ");
          }
        }
      } else if (error.message) {
        if (error.message.toLowerCase().includes("network")) {
          errorTitle = "Network Error";
          errorDescription =
            "Unable to connect to the server. Please check your internet connection.";
        } else {
          errorDescription = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle viewing staff details
  const handleViewDetails = async (
    staffMember: Doctor | Receptionist | Admin | StaffMember,
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
    staffMember: Doctor | Receptionist | Admin | StaffMember,
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

  // Handle delete staff confirmation dialog
  const handleDeleteClick = (
    staffMember: Doctor | Receptionist | Admin | StaffMember,
  ) => {
    setStaffToDelete(staffMember as StaffMember);
    setIsDeleteDialogOpen(true);
  };

  // Handle staff archiving
  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;

    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/staff/${staffToDelete.id}/`);

      toast({
        title: "Success",
        description: "Staff member has been deactivated successfully.",
        variant: "default",
      });

      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setStaffToDelete(null);

      // Refresh the staff lists
      await refreshStaffLists();
    } catch (error: any) {
      console.error("Error archiving staff:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to archive staff member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
            Staff Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage clinic staff members, including doctors, receptionists, and
            administrators
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Add New Staff Member
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Create a new doctor or receptionist account. All staff members
                  are created as active. A temporary password will be sent to
                  their email.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 py-2 sm:py-4">
                {/* First Name */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="first_name"
                    className="text-left sm:text-right text-sm"
                  >
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    placeholder="e.g., John"
                    className="col-span-1 sm:col-span-3 text-sm"
                    value={newStaff.first_name}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key >= "0" && e.key <= "9") {
                        e.preventDefault();
                      }
                    }}
                    required
                  />
                </div>

                {/* Middle Initial */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="middle_initial"
                    className="text-left sm:text-right text-sm"
                  >
                    Middle Initial
                  </Label>
                  <Input
                    id="middle_initial"
                    placeholder="e.g., A"
                    className="col-span-1 sm:col-span-3 text-sm"
                    value={newStaff.middle_initial}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key >= "0" && e.key <= "9") {
                        e.preventDefault();
                      }
                    }}
                    maxLength={1}
                  />
                </div>

                {/* Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="last_name"
                    className="text-left sm:text-right text-sm"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    placeholder="e.g., Doe"
                    className="col-span-1 sm:col-span-3 text-sm"
                    value={newStaff.last_name}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key >= "0" && e.key <= "9") {
                        e.preventDefault();
                      }
                    }}
                    required
                  />
                </div>

                {/* Suffix */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="suffix"
                    className="text-left sm:text-right text-sm"
                  >
                    Suffix
                  </Label>
                  <Input
                    id="suffix"
                    placeholder="e.g., Jr., Sr., III"
                    className="col-span-1 sm:col-span-3 text-sm"
                    value={newStaff.suffix}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Username */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="username"
                    className="text-left sm:text-right text-sm"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    placeholder="e.g., johndoe"
                    className="col-span-1 sm:col-span-3 text-sm"
                    value={newStaff.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                {/* Email */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="email"
                    className="text-left sm:text-right text-sm"
                  >
                    Email
                  </Label>
                  <div className="col-span-1 sm:col-span-3">
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., johndoe@example.com"
                      className={`w-full text-sm ${
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
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="phone"
                    className="text-left sm:text-right text-sm"
                  >
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., (555) 123-4567"
                    className="col-span-1 sm:col-span-3 text-sm"
                    value={newStaff.phone}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Role */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2">
                  <Label
                    htmlFor="role"
                    className="text-left sm:text-right text-sm"
                  >
                    Role
                  </Label>
                  <select
                    id="role"
                    className="col-span-1 sm:col-span-3 border rounded-md p-2 text-sm"
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
                    {(currentUser?.role === "superadmin" ||
                      currentUser?.role === "admin") && (
                      <option value="superadmin">Super Admin</option>
                    )}
                  </select>
                </div>

                {/* Submit Button */}
                <DialogFooter className="sm:justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? "Adding..." : "Add Staff Member"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={setCurrentTab}
        className="space-y-4"
      >
        <TabsList
          className={`grid w-full text-xs sm:text-sm ${
            currentUser?.role === "superadmin"
              ? "grid-cols-2 sm:grid-cols-4"
              : "grid-cols-3"
          }`}
        >
          <TabsTrigger
            value="doctors"
            className="transition-colors"
            style={{
              backgroundColor:
                currentTab === "doctors" ? colors.primaryColor : undefined,
              color: currentTab === "doctors" ? "white" : undefined,
            }}
          >
            Doctors
          </TabsTrigger>
          <TabsTrigger
            value="receptionists"
            className="transition-colors"
            style={{
              backgroundColor:
                currentTab === "receptionists"
                  ? colors.primaryColor
                  : undefined,
              color: currentTab === "receptionists" ? "white" : undefined,
            }}
          >
            Receptionists
          </TabsTrigger>
          <TabsTrigger
            value="admins"
            className="transition-colors"
            style={{
              backgroundColor:
                currentTab === "admins" ? colors.primaryColor : undefined,
              color: currentTab === "admins" ? "white" : undefined,
            }}
          >
            Administrators
          </TabsTrigger>
          {currentUser?.role === "superadmin" && (
            <TabsTrigger
              value="superadmins"
              className="transition-colors"
              style={{
                backgroundColor:
                  currentTab === "superadmins"
                    ? colors.primaryColor
                    : undefined,
                color: currentTab === "superadmins" ? "white" : undefined,
              }}
            >
              Super Admins
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="doctors" className="space-y-4 mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Doctors</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search doctors..."
                      className="pl-8 text-sm"
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
            <CardContent className="p-0">
              {isLoadingDoctors ? (
                <div className="text-center py-6 text-muted-foreground p-4">
                  Loading doctors...
                </div>
              ) : doctorPagination.totalItems === 0 ? (
                <div className="text-center py-8 p-4">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("name", doctorSort, setDoctorSort)
                            }
                          >
                            Doctor
                            {renderSortIcon("name", doctorSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("email", doctorSort, setDoctorSort)
                            }
                          >
                            Email
                            {renderSortIcon("email", doctorSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("phone", doctorSort, setDoctorSort)
                            }
                          >
                            Phone
                            {renderSortIcon("phone", doctorSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("is_active", doctorSort, setDoctorSort)
                            }
                          >
                            Status
                            {renderSortIcon("is_active", doctorSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doctorPagination.data.map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                <AvatarImage
                                  src={doctor.image}
                                  alt={formatFullName(doctor)}
                                />
                                <AvatarFallback>
                                  {doctor.first_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-xs sm:text-sm">
                                  {formatFullName(doctor)}
                                </div>
                                {/* Show email on mobile when column is hidden */}
                                <div className="text-xs text-muted-foreground md:hidden">
                                  {doctor.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              {doctor.email}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              {doctor.phone || "Not provided"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={
                                doctor.is_active !== false
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={
                                doctor.is_active !== false
                                  ? "bg-green-50 text-green-700 border-green-200 text-xs"
                                  : "bg-red-50 text-red-700 border-red-200 text-xs"
                              }
                            >
                              {doctor.is_active !== false
                                ? "Active"
                                : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(doctor)}
                                title="View Details"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStaff(doctor)}
                                title="Edit Staff"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(doctor)}
                                title="Delete Staff"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls for Doctors */}
              {doctorPagination.totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show
                    </p>
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
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      entries
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center justify-center text-xs sm:text-sm font-medium whitespace-nowrap">
                      Page {doctorPage} of {doctorPagination.totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          handlePageChange("doctors", doctorPage - 1)
                        }
                        disabled={doctorPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          handlePageChange("doctors", doctorPage + 1)
                        }
                        disabled={doctorPage >= doctorPagination.totalPages}
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
        </TabsContent>

        <TabsContent value="receptionists" className="space-y-4 mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    Receptionists
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search receptionists..."
                      className="pl-8 text-sm"
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
            <CardContent className="p-0">
              {isLoadingReceptionists ? (
                <div className="text-center py-6 text-muted-foreground p-4">
                  Loading receptionists...
                </div>
              ) : receptionistPagination.totalItems === 0 ? (
                <div className="text-center py-8 p-4">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "name",
                                receptionistSort,
                                setReceptionistSort,
                              )
                            }
                          >
                            Receptionist
                            {renderSortIcon("name", receptionistSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "email",
                                receptionistSort,
                                setReceptionistSort,
                              )
                            }
                          >
                            Email
                            {renderSortIcon("email", receptionistSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "phone",
                                receptionistSort,
                                setReceptionistSort,
                              )
                            }
                          >
                            Phone
                            {renderSortIcon("phone", receptionistSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "is_active",
                                receptionistSort,
                                setReceptionistSort,
                              )
                            }
                          >
                            Status
                            {renderSortIcon("is_active", receptionistSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receptionistPagination.data.map((receptionist) => (
                        <TableRow key={receptionist.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                <AvatarImage
                                  src={receptionist.image}
                                  alt={formatFullName(receptionist)}
                                />
                                <AvatarFallback>
                                  {receptionist.first_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-xs sm:text-sm">
                                  {formatFullName(receptionist)}
                                </div>
                                {/* Show email on mobile when column is hidden */}
                                <div className="text-xs text-muted-foreground md:hidden">
                                  {receptionist.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              {receptionist.email}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              {receptionist.phone || "Not provided"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={
                                receptionist.is_active !== false
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={
                                receptionist.is_active !== false
                                  ? "bg-green-50 text-green-700 border-green-200 text-xs"
                                  : "bg-red-50 text-red-700 border-red-200 text-xs"
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
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStaff(receptionist)}
                                title="Edit Staff"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(receptionist)}
                                title="Delete Staff"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls for Receptionists */}
              {receptionistPagination.totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show
                    </p>
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
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      entries
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center justify-center text-xs sm:text-sm font-medium whitespace-nowrap">
                      Page {receptionistPage} of{" "}
                      {receptionistPagination.totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          handlePageChange(
                            "receptionists",
                            receptionistPage - 1,
                          )
                        }
                        disabled={receptionistPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          handlePageChange(
                            "receptionists",
                            receptionistPage + 1,
                          )
                        }
                        disabled={
                          receptionistPage >= receptionistPagination.totalPages
                        }
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
        </TabsContent>

        <TabsContent value="admins" className="space-y-4 mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    Administrators
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Showing {filteredAdmins.length} of {adminsList.length}{" "}
                    administrators
                    {adminSort.field && (
                      <span className="ml-2">
                        • Sorted by {adminSort.field.replace("_", " ")} (
                        {adminSort.direction === "asc" ? "A-Z" : "Z-A"})
                      </span>
                    )}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    View-only access. Contact superadmin for administrative
                    changes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search administrators..."
                      className="pl-8 text-sm"
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
            <CardContent className="p-0">
              {isLoadingAdmins ? (
                <div className="text-center py-6 text-muted-foreground p-4">
                  Loading administrators...
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="text-center py-8 p-4">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("name", adminSort, setAdminSort)
                            }
                          >
                            Administrator
                            {renderSortIcon("name", adminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("email", adminSort, setAdminSort)
                            }
                          >
                            Email
                            {renderSortIcon("email", adminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("phone", adminSort, setAdminSort)
                            }
                          >
                            Phone
                            {renderSortIcon("phone", adminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort("is_active", adminSort, setAdminSort)
                            }
                          >
                            Status
                            {renderSortIcon("is_active", adminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                <AvatarImage
                                  src={admin.image}
                                  alt={formatFullName(admin)}
                                />
                                <AvatarFallback>
                                  {admin.first_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-xs sm:text-sm">
                                  {formatFullName(admin)}
                                </div>
                                {/* Show email on mobile when column is hidden */}
                                <div className="text-xs text-muted-foreground md:hidden">
                                  {admin.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              {admin.email}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              {admin.phone || "Not provided"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={
                                admin.is_active !== false
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={
                                admin.is_active !== false
                                  ? "bg-green-50 text-green-700 border-green-200 text-xs"
                                  : "bg-red-50 text-red-700 border-red-200 text-xs"
                              }
                            >
                              {admin.is_active !== false
                                ? "Active"
                                : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(admin)}
                                title="View Details"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStaff(admin)}
                                title="Edit Administrator"
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              {currentUser?.role === "superadmin" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(admin)}
                                  title="Delete Administrator"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Superadmins Tab Content */}
        <TabsContent value="superadmins" className="space-y-4 mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    Super Administrators
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search super administrators..."
                      className="pl-8 text-sm"
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
            <CardContent className="p-0">
              {isLoadingSuperAdmins ? (
                <div className="text-center py-6 text-muted-foreground p-4">
                  Loading super administrators...
                </div>
              ) : filteredSuperAdmins.length === 0 ? (
                <div className="text-center py-8 p-4">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "name",
                                superAdminSort,
                                setSuperAdminSort,
                              )
                            }
                          >
                            Super Administrator
                            {renderSortIcon("name", superAdminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "email",
                                superAdminSort,
                                setSuperAdminSort,
                              )
                            }
                          >
                            Email
                            {renderSortIcon("email", superAdminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "phone",
                                superAdminSort,
                                setSuperAdminSort,
                              )
                            }
                          >
                            Phone
                            {renderSortIcon("phone", superAdminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            className="h-auto p-0 font-semibold hover:bg-transparent text-xs sm:text-sm"
                            onClick={() =>
                              handleSort(
                                "is_active",
                                superAdminSort,
                                setSuperAdminSort,
                              )
                            }
                          >
                            Status
                            {renderSortIcon("is_active", superAdminSort)}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuperAdmins.map((superAdmin) => (
                        <TableRow key={superAdmin.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                <AvatarImage
                                  src={superAdmin.image}
                                  alt={formatFullName(superAdmin)}
                                />
                                <AvatarFallback>
                                  {superAdmin.first_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-xs sm:text-sm">
                                  {formatFullName(superAdmin)}
                                </div>
                                {/* Show email on mobile when column is hidden */}
                                <div className="text-xs text-muted-foreground md:hidden">
                                  {superAdmin.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                              {superAdmin.email}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center text-xs sm:text-sm">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              {superAdmin.phone || "Not provided"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={
                                superAdmin.is_active !== false
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={
                                superAdmin.is_active !== false
                                  ? "bg-green-50 text-green-700 border-green-200 text-xs"
                                  : "bg-red-50 text-red-700 border-red-200 text-xs"
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
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(superAdmin)}
                                title="Delete Staff"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
        <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to deactivate this staff member?
            </DialogDescription>
          </DialogHeader>

          {staffToDelete && (
            <div className="py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action will deactivate the
                  staff member's account. They will no longer be able to access
                  the system.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Name:
                  </span>
                  <span className="text-sm font-semibold">
                    {formatFullName(staffToDelete)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Email:
                  </span>
                  <span className="text-sm">{staffToDelete.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Role:
                  </span>
                  <span className="text-sm capitalize">
                    {staffToDelete.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setStaffToDelete(null);
              }}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStaff}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? "Deactivating..." : "Deactivate Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPage;
