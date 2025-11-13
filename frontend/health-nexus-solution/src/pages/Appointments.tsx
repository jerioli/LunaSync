import NewAppointmentModal from "@/components/appointments/ScheduleAppointmentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
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
import { useClinic } from "@/hooks/useClinicContext";
import { axiosInstance } from "@/services/api";
import { getPatientNameFromAppointment } from "@/utils/patientNameUtils";
import { Calendar, CalendarCheck, Clock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Appointments = () => {
  const { currentUser, patients, users } = useClinic();
  const { colors } = useBranding();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [localPatients, setLocalPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const isReceptionist = currentUser?.role === "receptionist";
  const isDoctor = currentUser?.role === "doctor";
  const isAdmin = currentUser?.role === "admin";
  const canManageAppointments = isReceptionist || isAdmin; // Both receptionists and admins can manage appointments

  // Consistent button class for all action buttons
  const buttonClass = "h-8 px-3 text-xs";

  // Helper function to check if appointment is overdue (past scheduled date/time)
  const isAppointmentOverdue = (
    appointmentDate: string,
    appointmentTime: string
  ) => {
    const appointmentDateTime = new Date(
      `${appointmentDate}T${appointmentTime}`
    );
    const now = new Date();

    // Add a grace period of 2 hours before marking as overdue
    // This prevents immediate deletion of recently scheduled appointments
    const gracePeriodMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const overdueTime = appointmentDateTime.getTime() + gracePeriodMs;

    // Only consider appointments overdue if they're more than 2 hours past their scheduled time
    return now.getTime() > overdueTime;
  };

  // Helper function to check if appointment can be completed (must be today's date)
  const canCompleteAppointment = (appointmentDate: string) => {
    const appointmentDateObj = new Date(appointmentDate);
    const today = new Date();

    // Compare only the date part (ignore time)
    const appointmentDateOnly = new Date(
      appointmentDateObj.getFullYear(),
      appointmentDateObj.getMonth(),
      appointmentDateObj.getDate()
    );
    const todayDateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return appointmentDateOnly.getTime() === todayDateOnly.getTime();
  };

  // Helper function to format time
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      console.error("Error formatting time:", timeString, error);
      return timeString;
    }
  };

  // Get status badge with consistent styling
  const getStatusBadge = (status: string, appointment?: any) => {
    const variants = {
      scheduled: {
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
        label: "Upcoming",
      },
      pending: {
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        label: "Pending",
      },
      ongoing: {
        className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
        label: "Ongoing",
      },
      completed: {
        className: "bg-green-100 text-green-800 hover:bg-green-100",
        label: "Completed",
      },
      cancelled: {
        className: "bg-red-100 text-red-800 hover:bg-red-100",
        label: "Cancelled",
      },
      "no-show": {
        className: "bg-red-100 text-red-800 hover:bg-red-100",
        label: "No Show",
      },
    };

    let config = variants[status] || variants["scheduled"];

    // Check if appointment is overdue and add visual indicator
    if (
      appointment &&
      (status === "pending" || status === "scheduled" || status === "ongoing")
    ) {
      const isOverdue = isAppointmentOverdue(
        appointment.date,
        appointment.time
      );
      if (isOverdue) {
        config = {
          className: "bg-red-200 text-red-900 hover:bg-red-200 animate-pulse",
          label: `${config.label} (Overdue)`,
        };
      }
    }

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Helper function to format date in readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  };

  // Map backend fields to frontend expected fields
  const mapAppointments = (data) => {
    return data.map((appt) => ({
      id: appt.id || `${appt.patient}-${appt.date}-${appt.time}`,
      patientId: appt.patient,
      date: appt.date,
      time: appt.time,
      status: appt.status || "scheduled",
      type: appt.appointment_type,
      notes: appt.notes,
      doctorId: appt.doctor || null,
      doctorName:
        appt.doctor_name || appt.display_doctor_name || "Not Assigned",
      // Map new patient detail fields for pending appointments
      patient_name: appt.patient_name,
      patient_email: appt.patient_email,
      patient_phone: appt.patient_phone,
      patient_date_of_birth: appt.patient_date_of_birth,
      patient_gender: appt.patient_gender,
      patient_address: appt.patient_address,
      patient_marital_status: appt.patient_marital_status,
      // Add display fields for confirmed appointments
      display_patient_name: appt.display_patient_name,
      display_doctor_name: appt.display_doctor_name,
    }));
  };

  // Fetch appointments from backend
  const fetchAppointments = async () => {
    try {
      console.log("=== FETCHING APPOINTMENTS ===");
      console.log("Current user:", currentUser);
      console.log("User role:", currentUser?.role);
      console.log("Is admin:", isAdmin);
      console.log("Can manage appointments:", canManageAppointments);

      const response = await axiosInstance.get("appointments/list/");
      console.log("Fetched appointments from API:", response.data);
      console.log("Number of appointments:", response.data.length);

      // Log pending appointments specifically
      const pendingAppointments = response.data.filter(
        (apt) => apt.status === "pending"
      );
      console.log("Pending appointments found:", pendingAppointments.length);
      console.log("Pending appointments:", pendingAppointments);

      const mappedAppointments = mapAppointments(response.data);
      console.log("Mapped appointments:", mappedAppointments);
      console.log("Mapped appointments with details:", mappedAppointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        patientName: apt.patient_name || apt.display_patient_name
      })));

      // Check for overdue appointments and delete them BEFORE setting state
      // Only do this if user can manage appointments (receptionist/admin)
      if (canManageAppointments) {
        console.log("Checking for overdue appointments...");
        
        // Identify overdue appointments that need to be deleted
        const overdueAppointments = mappedAppointments.filter((appointment) => {
          const isOverdue = isAppointmentOverdue(appointment.date, appointment.time);
          
          // Only delete appointments that are:
          // 1. Truly overdue (past their time + grace period)
          // 2. In pending or ongoing status (not scheduled appointments)
          // 3. Not from today (to avoid deleting same-day appointments)
          const appointmentDate = new Date(appointment.date);
          const today = new Date();
          const isFromToday = appointmentDate.toDateString() === today.toDateString();
          
          const shouldDelete = isOverdue && 
            !isFromToday && // Don't delete today's appointments
            (appointment.status === "pending" || appointment.status === "ongoing"); // Only delete pending/ongoing, not scheduled
          
          if (shouldDelete) {
            console.log(`Appointment ${appointment.id} is overdue and will be deleted - Date: ${appointment.date}, Time: ${appointment.time}, Status: ${appointment.status}`);
          }
          
          return shouldDelete;
        });

        // Delete overdue appointments from backend
        const deletionPromises = overdueAppointments.map(async (appointment) => {
          try {
            console.log(`Auto-deleting overdue appointment ${appointment.id}`);
            await axiosInstance.delete(`appointments/delete/${appointment.id}/`);
            console.log(`Successfully deleted appointment ${appointment.id}`);
            return appointment.id;
          } catch (error) {
            console.error(`Failed to delete overdue appointment ${appointment.id}:`, error);
            // Return the ID anyway so we can filter it from local state
            return appointment.id;
          }
        });

        // Wait for all deletions to complete
        const deletedIds = await Promise.all(deletionPromises);
        
        // Filter out deleted appointments from the mapped appointments
        const validAppointments = mappedAppointments.filter(
          appointment => !deletedIds.includes(appointment.id)
        );

        // Set state with only valid (non-overdue) appointments
        setAppointments(validAppointments);

        // Show notification if any appointments were deleted
        if (overdueAppointments.length > 0) {
          console.log(`${overdueAppointments.length} overdue appointments were automatically deleted`);
          toast.info(
            `${overdueAppointments.length} overdue appointment(s) were automatically deleted`
          );
        }
      } else {
        // If user can't manage appointments, just set the appointments as-is
        setAppointments(mappedAppointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  useEffect(() => {
    fetchAppointments();

    // Set up periodic check for overdue appointments (every 5 minutes)
    // Only for users who can manage appointments
    if (canManageAppointments) {
      const intervalId = setInterval(async () => {
        console.log("Periodic check for overdue appointments...");
        
        // Get current appointments from state
        const currentAppointments = appointments;
        
        // Identify overdue appointments that need to be deleted
        const overdueAppointments = currentAppointments.filter((appointment) => {
          const isOverdue = isAppointmentOverdue(appointment.date, appointment.time);
          
          // Only delete appointments that are:
          // 1. Truly overdue (past their time + grace period)
          // 2. In pending or ongoing status (not scheduled appointments)
          // 3. Not from today (to avoid deleting same-day appointments)
          const appointmentDate = new Date(appointment.date);
          const today = new Date();
          const isFromToday = appointmentDate.toDateString() === today.toDateString();
          
          const shouldDelete = isOverdue && 
            !isFromToday && // Don't delete today's appointments
            (appointment.status === "pending" || appointment.status === "ongoing"); // Only delete pending/ongoing, not scheduled
          
          return shouldDelete;
        });

        if (overdueAppointments.length > 0) {
          // Delete overdue appointments from backend
          const deletionPromises = overdueAppointments.map(async (appointment) => {
            try {
              console.log(`Periodic deletion of overdue appointment ${appointment.id}`);
              await axiosInstance.delete(`appointments/delete/${appointment.id}/`);
              console.log(`Successfully deleted appointment ${appointment.id}`);
              return appointment.id;
            } catch (error) {
              console.error(`Failed to delete overdue appointment ${appointment.id}:`, error);
              return appointment.id; // Return ID anyway to remove from local state
            }
          });

          // Wait for all deletions and update local state immediately
          const deletedIds = await Promise.all(deletionPromises);
          
          setAppointments(prev => 
            prev.filter(appointment => !deletedIds.includes(appointment.id))
          );

          console.log(`Periodic check: ${overdueAppointments.length} overdue appointments deleted`);
          toast.info(
            `${overdueAppointments.length} overdue appointment(s) were automatically deleted`
          );
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      // Cleanup interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, [canManageAppointments]);

  // Fetch patients for local state
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axiosInstance.get("patients/");
        setLocalPatients(response.data);
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };
    fetchPatients();
  }, []);

  // Filtered appointments logic
  const filteredAppointments = appointments.filter((appointment) => {
    // Debug: Log all appointments being processed with detailed doctor info
    console.log("Processing appointment:", {
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorIdType: typeof appointment.doctorId,
      display_doctor_name: appointment.display_doctor_name,
      status: appointment.status,
      activeTab,
      isDoctor,
      currentUserId: currentUser?.id,
      currentUserIdType: typeof currentUser?.id,
      fullAppointment: appointment,
    });

    // For doctors, only show appointments assigned to them
    if (isDoctor) {
      // Handle both string and number ID comparisons
      const appointmentDoctorId = String(appointment.doctorId);
      const currentUserId = String(currentUser?.id);

      // Debug logging for doctors
      console.log("Doctor filtering:", {
        appointmentId: appointment.id,
        appointmentDoctorId: appointment.doctorId,
        appointmentDoctorIdString: appointmentDoctorId,
        currentUserId: currentUser?.id,
        currentUserIdString: currentUserId,
        stringComparison: `"${appointmentDoctorId}" === "${currentUserId}"`,
        match: appointmentDoctorId === currentUserId,
        doctorIdIsFalsy: !appointment.doctorId,
        doctorIdIsNull: appointment.doctorId === null,
        doctorIdIsUndefined: appointment.doctorId === undefined,
        doctorIdIsEmptyString: appointment.doctorId === "",
        displayDoctorName: appointment.display_doctor_name,
        currentUserName: currentUser?.name,
      });

      // Check if appointment has doctorId and it matches current user
      const doctorIdMatches =
        appointment.doctorId && appointmentDoctorId === currentUserId;

      // Also check if display_doctor_name matches current user's name (fallback)
      const doctorNameMatches =
        appointment.display_doctor_name &&
        currentUser?.name &&
        appointment.display_doctor_name === currentUser.name;

      console.log("Doctor matching logic:", {
        doctorIdMatches,
        doctorNameMatches,
        shouldShow: doctorIdMatches || doctorNameMatches,
      });

      // If neither doctorId nor display name matches, don't show it to doctors
      if (!doctorIdMatches && !doctorNameMatches) {
        console.log("Filtering out: No doctor match found");
        return false;
      }

      console.log("Doctor filter PASSED for appointment:", appointment.id);
    }

    const appointmentDate = new Date(appointment.date + "T" + appointment.time);
    const today = new Date();

    if (activeTab === "upcoming") {
      // For upcoming appointments, check if the date is today or future, regardless of time
      const appointmentDateOnly = new Date(appointment.date);
      const todayDateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const result =
        appointmentDateOnly >= todayDateOnly &&
        appointment.status === "scheduled";
      console.log(
        "Upcoming filter result:",
        result,
        "for appointment:",
        appointment.id
      );
      console.log(
        "Appointment date only:",
        appointmentDateOnly,
        "Today date only:",
        todayDateOnly
      );
      console.log("Appointment status:", appointment.status);
      return result;
    } else if (activeTab === "pending") {
      // Only receptionists and admins can see pending appointments
      console.log("=== PENDING FILTER DEBUG ===");
      console.log("Current user role:", currentUser?.role);
      console.log("isReceptionist:", isReceptionist);
      console.log("isAdmin:", isAdmin);
      console.log("canManageAppointments:", canManageAppointments);
      console.log("Appointment status:", appointment.status);
      console.log("Appointment ID:", appointment.id);

      if (!canManageAppointments) {
        console.log("Filtering out pending: Cannot manage appointments");
        return false;
      }
      const result = appointment.status === "pending";
      console.log(
        "Pending filter result:",
        result,
        "for appointment:",
        appointment.id
      );
      console.log("=== END PENDING FILTER DEBUG ===");
      return result;
    } else if (activeTab === "ongoing") {
      const result = appointment.status === "ongoing";
      console.log(
        "Ongoing filter result:",
        result,
        "for appointment:",
        appointment.id
      );
      return result;
    } else if (activeTab === "completed") {
      const result = appointment.status === "completed";
      console.log(
        "Completed filter result:",
        result,
        "for appointment:",
        appointment.id
      );
      return result;
    } else if (activeTab === "followup") {
      // Only receptionists and admins can see follow-up appointments
      if (!canManageAppointments) {
        console.log("Filtering out followup: Cannot manage appointments");
        return false;
      }
      // Show appointments that are completed and have follow-up type or need follow-up
      const result =
        appointment.status === "completed" &&
        (appointment.appointment_type?.toLowerCase().includes("follow") ||
          appointment.type?.toLowerCase().includes("follow") ||
          appointment.notes?.toLowerCase().includes("follow"));
      console.log(
        "Follow-up filter result:",
        result,
        "for appointment:",
        appointment.id
      );
      return result;
    } else if (activeTab === "cancelled") {
      const result =
        appointment.status === "cancelled" || appointment.status === "no-show";
      console.log(
        "Cancelled filter result:",
        result,
        "for appointment:",
        appointment.id
      );
      return result;
    }

    console.log("No tab match, filtering out appointment:", appointment.id);
    return false;
  });

  const totalPages = Math.ceil(filteredAppointments.length / pageSize);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Debug pagination for pending appointments
  if (activeTab === "pending") {
    console.log("=== PAGINATION DEBUG ===");
    console.log("Filtered appointments count:", filteredAppointments.length);
    console.log("Current page:", currentPage);
    console.log("Page size:", pageSize);
    console.log("Paginated appointments count:", paginatedAppointments.length);
    console.log("Paginated appointments:", paginatedAppointments);
    console.log("=== END PAGINATION DEBUG ===");
  }

  // Reset page to 1 when tab or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, appointments]);

  const getPatientName = (patientId, appointment) => {
    return getPatientNameFromAppointment(patientId, appointment);
  };

  const getDoctorName = (doctorId: string, appointment?: any) => {
    // Debug logging for getDoctorName function
    console.log("getDoctorName called with:", {
      doctorId,
      doctorIdType: typeof doctorId,
      appointmentId: appointment?.id,
      doctorName: appointment?.doctorName,
      display_doctor_name: appointment?.display_doctor_name,
      appointment_doctor_field: appointment?.doctor,
      appointment_doctorId_field: appointment?.doctorId,
    });

    // First check if we have doctorName from the backend
    if (
      appointment?.doctorName &&
      appointment.doctorName !== "N/A" &&
      appointment.doctorName !== "Not Assigned"
    ) {
      console.log("Using doctorName:", appointment.doctorName);
      return appointment.doctorName;
    }

    // Fallback to display_doctor_name
    if (
      appointment?.display_doctor_name &&
      appointment.display_doctor_name !== "N/A" &&
      appointment.display_doctor_name !== "Not Assigned"
    ) {
      console.log(
        "Using display_doctor_name:",
        appointment.display_doctor_name
      );
      return appointment.display_doctor_name;
    }

    // If no doctorId provided, return unassigned
    if (!doctorId) {
      return "Unassigned Doctor";
    }

    // Try to find doctor in users array (handle both string and number IDs)
    const doctor = users.find(
      (u) =>
        (String(u.id) === String(doctorId) || u.id === doctorId) &&
        u.role === "doctor"
    );

    if (doctor && doctor.name) {
      console.log("Found doctor in users array:", doctor.name);
      return doctor.name;
    }

    // If not found in users, try to fetch from appointments data
    const existingAppointment = appointments.find(
      (appt) =>
        String(appt.doctorId) === String(doctorId) &&
        (appt.doctorName || appt.display_doctor_name)
    );

    if (
      existingAppointment?.doctorName &&
      existingAppointment.doctorName !== "N/A" &&
      existingAppointment.doctorName !== "Not Assigned"
    ) {
      console.log(
        "Found doctor in existing appointments (doctorName):",
        existingAppointment.doctorName
      );
      return existingAppointment.doctorName;
    }

    if (
      existingAppointment?.display_doctor_name &&
      existingAppointment.display_doctor_name !== "N/A" &&
      existingAppointment.display_doctor_name !== "Not Assigned"
    ) {
      console.log(
        "Found doctor in existing appointments (display_doctor_name):",
        existingAppointment.display_doctor_name
      );
      return existingAppointment.display_doctor_name;
    }

    console.log("No doctor found, returning Unassigned Doctor");
    return "Unassigned Doctor";
  };

  // Helper function to filter out patient details from notes
  const getDisplayNotes = (notes: string) => {
    if (!notes) return null;

    // Check if notes contain patient details
    if (notes.includes("Patient Details (Pending):")) {
      // Extract only the part before patient details
      const beforePatientDetails = notes
        .split("Patient Details (Pending):")[0]
        .trim();
      // Return only if there's actual content before patient details and it's not just "none"
      return beforePatientDetails &&
        beforePatientDetails.toLowerCase() !== "none"
        ? beforePatientDetails
        : null;
    }

    // Return original notes if no patient details found and it's not just "none"
    return notes.toLowerCase() !== "none" ? notes : null;
  };

  // Local handler for status updates
  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      console.log("Attempting to update appointment status:", {
        appointmentId,
        status,
        url: `appointments/update-status/${appointmentId}/`,
        payload: { status: status },
      });

      const response = await axiosInstance.post(
        `appointments/update-status/${appointmentId}/`,
        {
          status: status,
        }
      );

      console.log("Status update response:", response.data);

      // Update local state with the response data
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, ...response.data } : appt
        )
      );

      const statusMessages = {
        scheduled: "Appointment has been confirmed",
        completed: "Appointment marked as completed",
        cancelled: "Appointment has been cancelled",
        "no-show": "Patient marked as no-show",
        pending: "Appointment marked as pending",
        ongoing: "Patient has been checked in",
      };

      // Enhanced success message for confirmations
      if (status === "scheduled" && response.data.email_sent) {
        toast.success(
          "Appointment confirmed! Patient has been notified via email."
        );
      } else if (status === "scheduled" && response.data.patient_created) {
        toast.success("Appointment confirmed and patient record created!");
      } else {
        toast.success(statusMessages[status]);
      }

      // Refresh appointments to get updated data with complete patient information
      setTimeout(async () => {
        await fetchAppointments();
      }, 500); // Small delay to ensure backend has processed the update
    } catch (error) {
      console.error("Error updating appointment status:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      // Show more specific error message
      if (error.response?.status === 400) {
        const errorMsg =
          error.response?.data?.detail ||
          error.response?.data?.error ||
          "Invalid request. The status might not be supported.";
        toast.error(`Failed to update appointment: ${errorMsg}`);
      } else {
      }
    }
  };

  // Handler for scheduling follow-up appointments
  const handleScheduleFollowUp = async (appointment) => {
    try {
      // Create a follow-up appointment
      const followUpData = {
        patient: appointment.patientId || appointment.patient,
        doctor: appointment.doctorId || appointment.doctor,
        date: "", // Will be set by the scheduling modal
        time: "", // Will be set by the scheduling modal
        appointment_type: "Follow-up",
        notes: `Follow-up for appointment on ${appointment.date}`,
        status: "pending",
      };

      // For now, we'll show a toast and open the new appointment modal
      // In a full implementation, you might want to create a dedicated follow-up scheduling modal
      toast.success("Opening appointment scheduler for follow-up");
      setShowNewAppointmentModal(true);
    } catch (error) {
      console.error("Error scheduling follow-up:", error);
      toast.error("Failed to schedule follow-up appointment");
    }
  };

  // Render action buttons for each appointment
  const renderActionButtons = (appointment) => {
    if (activeTab === "upcoming" && canManageAppointments) {
      return (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, "ongoing")}
          >
            Check In
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, "no-show")}
          >
            No Show
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, "cancelled")}
          >
            Cancel
          </Button>
        </div>
      );
    }

    if (activeTab === "pending" && canManageAppointments) {
      return (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, "scheduled")}
          >
            Confirm
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, "cancelled")}
          >
            Decline
          </Button>
        </div>
      );
    }

    if (activeTab === "ongoing") {
      if (isDoctor || isAdmin) {
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={buttonClass}
              onClick={() => {
                const patient = patients.find(p => p.id === appointment.patientId);
                const patientIdentifier = patient?.patient_id || appointment.patientId;
                navigate(`/patients/${patientIdentifier}?from=ongoing&appointmentId=${appointment.id}`);
              }}
            >
              View Record
            </Button>
            <Button
              variant="default"
              size="sm"
              className={`${buttonClass} bg-green-600 hover:bg-green-700`}
              onClick={() => handleStatusUpdate(appointment.id, "completed")}
            >
              Complete
            </Button>
          </div>
        );
      }
      // Removed receptionist actions from ongoing tab - only doctors and admins can manage ongoing appointments
    }

    if (activeTab === "completed") {
      if (isDoctor) {
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={buttonClass}
              onClick={() => {
                const patient = patients.find(p => p.id === appointment.patientId);
                const patientIdentifier = patient?.patient_id || appointment.patientId;
                navigate(`/patients/${patientIdentifier}`);
              }}
            >
              View Record
            </Button>
            <Button
              variant="default"
              size="sm"
              className={`${buttonClass} bg-blue-600 hover:bg-blue-700`}
              onClick={() => handleScheduleFollowUp(appointment)}
            >
              Schedule Follow-up
            </Button>
          </div>
        );
      } else if (canManageAppointments) {
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={buttonClass}
              onClick={() => {
                const patient = patients.find(p => p.id === appointment.patientId);
                const patientIdentifier = patient?.patient_id || appointment.patientId;
                navigate(`/patients/${patientIdentifier}`);
              }}
            >
              View Record
            </Button>
            <Button
              variant="default"
              size="sm"
              className={`${buttonClass} bg-blue-600 hover:bg-blue-700`}
              onClick={() => handleScheduleFollowUp(appointment)}
            >
              Schedule Follow-up
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={buttonClass}
              onClick={() => handleStatusUpdate(appointment.id, "scheduled")}
            >
              Reschedule
            </Button>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage and view appointments</p>
        </div>

        {canManageAppointments && (
          <div className="flex space-x-2">
            <Button onClick={() => setShowNewAppointmentModal(true)}>
              <CalendarCheck className="mr-2 h-4 w-4" />
              Schedule New Appointment
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 md:max-w-7xl mx-auto">
        <div>
          <Tabs
            defaultValue="pending"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList
              className={`grid mb-4 ${
                canManageAppointments ? "grid-cols-6" : "grid-cols-4"
              }`}
            >
              {canManageAppointments && (
                <TabsTrigger 
                  value="pending" 
                  className="hover:bg-primary/10 transition-colors"
                  style={{
                    backgroundColor: activeTab === 'pending' ? colors.primaryColor : undefined,
                    color: activeTab === 'pending' ? 'white' : undefined
                  }}
                >
                  Pending
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="upcoming" 
                className="hover:bg-primary/10 transition-colors"
                style={{
                  backgroundColor: activeTab === 'upcoming' ? colors.primaryColor : undefined,
                  color: activeTab === 'upcoming' ? 'white' : undefined
                }}
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="ongoing" 
                className="hover:bg-primary/10 transition-colors"
                style={{
                  backgroundColor: activeTab === 'ongoing' ? colors.primaryColor : undefined,
                  color: activeTab === 'ongoing' ? 'white' : undefined
                }}
              >
                Ongoing
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="hover:bg-primary/10 transition-colors"
                style={{
                  backgroundColor: activeTab === 'completed' ? colors.primaryColor : undefined,
                  color: activeTab === 'completed' ? 'white' : undefined
                }}
              >
                Completed
              </TabsTrigger>
              {canManageAppointments && (
                <TabsTrigger 
                  value="followup" 
                  className="hover:bg-primary/10 transition-colors"
                  style={{
                    backgroundColor: activeTab === 'followup' ? colors.primaryColor : undefined,
                    color: activeTab === 'followup' ? 'white' : undefined
                  }}
                >
                  Follow-up
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="cancelled" 
                className="hover:bg-primary/10 transition-colors"
                style={{
                  backgroundColor: activeTab === 'cancelled' ? colors.primaryColor : undefined,
                  color: activeTab === 'cancelled' ? 'white' : undefined
                }}
              >
                Cancelled
              </TabsTrigger>
            </TabsList>

            {canManageAppointments && (
              <TabsContent value="pending" className="space-y-4">
                {filteredAppointments.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p>No pending appointment requests.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Time
                              </div>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            {getDisplayNotes(
                              paginatedAppointments[0]?.notes
                            ) && <TableHead>Notes</TableHead>}
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {getPatientName(
                                  appointment.patientId,
                                  appointment
                                )}
                                {/* Show "New Patient" badge for first-time patients from portal/chatbot */}
                                {appointment.patient_name && !appointment.patientId && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    New Patient
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(appointment.date)}
                              </TableCell>
                              <TableCell>
                                {formatTime(appointment.time)}
                              </TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>
                                {getDoctorName(
                                  appointment.doctorId,
                                  appointment
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(appointment.status)}
                              </TableCell>
                              {getDisplayNotes(appointment.notes) && (
                                <TableCell className="max-w-[200px] truncate">
                                  {getDisplayNotes(appointment.notes)}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                {renderActionButtons(appointment)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            <TabsContent value="upcoming" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No upcoming appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Time
                              </div>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            {getDisplayNotes(
                              paginatedAppointments[0]?.notes
                            ) && <TableHead>Notes</TableHead>}
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {getPatientName(
                                  appointment.patientId,
                                  appointment
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(appointment.date)}
                              </TableCell>
                              <TableCell>
                                {formatTime(appointment.time)}
                              </TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>
                                {getDoctorName(
                                  appointment.doctorId,
                                  appointment
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(appointment.status)}
                              </TableCell>
                              {getDisplayNotes(appointment.notes) && (
                                <TableCell className="max-w-[200px] truncate">
                                  {getDisplayNotes(appointment.notes)}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                {renderActionButtons(appointment)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  {totalPages > 1 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            aria-disabled={currentPage === 1}
                            tabIndex={currentPage === 1 ? -1 : 0}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <PaginationItem key={i + 1}>
                            <PaginationLink
                              isActive={currentPage === i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              href="#"
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            aria-disabled={currentPage === totalPages}
                            tabIndex={currentPage === totalPages ? -1 : 0}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="ongoing" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No ongoing appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Time
                              </div>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            {getDisplayNotes(
                              paginatedAppointments[0]?.notes
                            ) && <TableHead>Notes</TableHead>}
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {getPatientName(
                                  appointment.patientId,
                                  appointment
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(appointment.date)}
                              </TableCell>
                              <TableCell>
                                {formatTime(appointment.time)}
                              </TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>
                                {getDoctorName(
                                  appointment.doctorId,
                                  appointment
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(appointment.status)}
                              </TableCell>
                              {getDisplayNotes(appointment.notes) && (
                                <TableCell className="max-w-[200px] truncate">
                                  {getDisplayNotes(appointment.notes)}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                {renderActionButtons(appointment)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  {totalPages > 1 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            aria-disabled={currentPage === 1}
                            tabIndex={currentPage === 1 ? -1 : 0}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <PaginationItem key={i + 1}>
                            <PaginationLink
                              isActive={currentPage === i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              href="#"
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            aria-disabled={currentPage === totalPages}
                            tabIndex={currentPage === totalPages ? -1 : 0}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No completed appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Patient
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Time
                            </div>
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                              {getPatientName(
                                appointment.patientId,
                                appointment
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDate(appointment.date)}
                            </TableCell>
                            <TableCell>
                              {formatTime(appointment.time)}
                            </TableCell>
                            <TableCell>{appointment.type}</TableCell>
                            <TableCell>
                              {getDoctorName(appointment.doctorId, appointment)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(appointment.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {isReceptionist && (
              <TabsContent value="followup" className="space-y-4">
                {filteredAppointments.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p>No follow-up appointments found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Time
                              </div>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {getPatientName(
                                  appointment.patientId,
                                  appointment
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(appointment.date)}
                              </TableCell>
                              <TableCell>
                                {formatTime(appointment.time)}
                              </TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>
                                {getDoctorName(
                                  appointment.doctorId,
                                  appointment
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(appointment.status)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className={buttonClass}
                                  onClick={() =>
                                    handleScheduleFollowUp(appointment)
                                  }
                                >
                                  Schedule New Follow-up
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            <TabsContent value="cancelled" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No cancelled appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Patient
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Time
                            </div>
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                              {getPatientName(
                                appointment.patientId,
                                appointment
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDate(appointment.date)}
                            </TableCell>
                            <TableCell>
                              {formatTime(appointment.time)}
                            </TableCell>
                            <TableCell>{appointment.type}</TableCell>
                            <TableCell>
                              {getDoctorName(appointment.doctorId, appointment)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(appointment.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        open={showNewAppointmentModal}
        onOpenChange={setShowNewAppointmentModal}
      />
    </div>
  );
};

export default Appointments;
