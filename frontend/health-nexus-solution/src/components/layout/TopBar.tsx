import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useBranding } from "@/contexts/BrandingContext";
import { useClinic } from "@/contexts/ClinicContext";
import { logoutSession } from "@/utils/sessionManager";
import axios from "axios";
import {
  Bell,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  LogOut,
  Pill,
  Settings,
  UserCheck,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const TopBar: React.FC = () => {
  const { currentUser, setCurrentUser } = useClinic();
  const { colors } = useBranding(); // Import branding context
  const navigate = useNavigate();
  const [totalNotificationCount, setTotalNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    new Set(),
  );
  const [displayedNotifications, setDisplayedNotifications] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const NOTIFICATIONS_PER_PAGE = 10;

  // Real-time clock state for Philippine time
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time for Philippine timezone (UTC+8)
  const formatPhilippineTime = () => {
    const phTime = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(currentTime);

    return phTime;
  };

  // Format date for Philippine timezone
  const formatPhilippineDate = () => {
    const phDate = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(currentTime);

    return phDate;
  };

  // Load read notifications from localStorage on component mount
  useEffect(() => {
    const storedReadNotifications = localStorage.getItem("readNotifications");
    if (storedReadNotifications) {
      try {
        const readIds = JSON.parse(storedReadNotifications);
        setReadNotifications(new Set(readIds));
      } catch (error) {
        console.error("Error parsing read notifications:", error);
      }
    }
  }, []);

  // Save read notifications to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "readNotifications",
      JSON.stringify(Array.from(readNotifications)),
    );
  }, [readNotifications]);

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setReadNotifications((prev) => {
      const newSet = new Set(prev);
      newSet.add(notificationId);
      return newSet;
    });
  };

  // Update displayed notifications based on active tab and pagination
  useEffect(() => {
    if (notifications.length === 0) {
      setDisplayedNotifications([]);
      setHasMoreNotifications(false);
      return;
    }

    const filteredNotifications =
      activeTab === "unread"
        ? notifications.filter(
            (n) => n.isUnread && !readNotifications.has(n.id),
          )
        : notifications.map((n) => ({
            ...n,
            isUnread: n.isUnread && !readNotifications.has(n.id),
          }));

    // For pagination, we accumulate notifications instead of replacing them
    if (currentPage === 1) {
      // First page - replace displayed notifications
      const firstPageNotifications = filteredNotifications.slice(
        0,
        NOTIFICATIONS_PER_PAGE,
      );
      setDisplayedNotifications(firstPageNotifications);
    } else {
      // Subsequent pages - add to existing displayed notifications
      const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
      const endIndex = currentPage * NOTIFICATIONS_PER_PAGE;
      const newNotifications = filteredNotifications.slice(
        startIndex,
        endIndex,
      );

      setDisplayedNotifications((prev) => {
        // Avoid duplicates by checking if notifications already exist
        const existingIds = new Set(prev.map((n) => n.id));
        const uniqueNewNotifications = newNotifications.filter(
          (n) => !existingIds.has(n.id),
        );
        return [...prev, ...uniqueNewNotifications];
      });
    }

    const totalAvailable = filteredNotifications.length;
    const currentlyLoaded = Math.min(
      currentPage * NOTIFICATIONS_PER_PAGE,
      totalAvailable,
    );
    setHasMoreNotifications(currentlyLoaded < totalAvailable);
  }, [notifications, activeTab, readNotifications, currentPage]);

  const mapNotifications = (
    appointmentData,
    medCertData = [],
    prescriptionData = [],
    medicineData = [],
  ) => {
    const notifications = [];
    const isReceptionist = currentUser?.role === "receptionist";
    const isDoctor = currentUser?.role === "doctor";

    // Medicine expiration notifications (for both doctors and receptionists who can manage inventory)
    const canManageMedicines =
      currentUser?.role === "doctor" ||
      currentUser?.role === "admin" ||
      currentUser?.can_manage_inventory;

    if (canManageMedicines && Array.isArray(medicineData)) {
      // Expired medicines - highest priority
      medicineData
        .filter((med) => med.is_expired)
        .forEach((med) => {
          notifications.push({
            id: `medicine-expired-${med.id}`,
            type: "medicine_expired",
            title: "⚠️ Medicine Expired",
            message: `${med.name} (${med.dosage}) has expired - Remove from inventory`,
            time: getRelativeTime(med.expiration_date || new Date()),
            icon: AlertTriangle,
            iconColor: "#dc2626",
            isUnread: true,
            data: med,
          });
        });

      // Near expiration medicines
      medicineData
        .filter((med) => med.is_near_expiration && !med.is_expired)
        .forEach((med) => {
          const monthsUntilExpiry = med.months_until_expiry || 0;
          notifications.push({
            id: `medicine-expiring-${med.id}`,
            type: "medicine_expiring",
            title: "📅 Medicine Expiring Soon",
            message: `${med.name} (${med.dosage}) expires in ${monthsUntilExpiry} month${monthsUntilExpiry !== 1 ? "s" : ""}`,
            time: getRelativeTime(med.expiration_date || new Date()),
            icon: Clock,
            iconColor: "#f59e0b",
            isUnread: true,
            data: med,
          });
        });
    }

    if (isReceptionist) {
      // For receptionist: show pending appointment requests, med cert requests, and prescription requests
      if (Array.isArray(appointmentData)) {
        appointmentData
          .filter((appt) => appt.status === "pending")
          .forEach((appt) => {
            let patientName = "Unknown Patient";
            if (
              appt.notes &&
              appt.notes.includes("Patient Details (Pending):")
            ) {
              try {
                const patientDetails = JSON.parse(
                  appt.notes.split("Patient Details (Pending):")[1].trim(),
                );
                patientName = patientDetails.name || "Unknown Patient";
              } catch (error) {
                patientName = `Appointment ${appt.id}`;
              }
            }

            notifications.push({
              id: `appointment-${appt.id}`,
              type: "appointment_request",
              title: "New Appointment Request",
              message: `From: ${patientName}`,
              time: getRelativeTime(appt.created_at || new Date()),
              date: appt.date,
              appointmentTime: appt.time,
              appointmentType: appt.appointment_type,
              icon: Calendar,
              iconColor: "#3b82f6",
              isUnread: true,
              data: appt,
            });
          });
      }

      // Add medical certificate requests
      if (Array.isArray(medCertData)) {
        medCertData
          .filter(
            (cert) => cert.status === "pending" || cert.status === "submitted",
          )
          .forEach((cert) => {
            notifications.push({
              id: `medcert-${cert.id}`,
              type: "medcert_request",
              title: "Medical Certificate Request",
              message: `From: ${cert.patient_name || "Unknown Patient"}`,
              time: getRelativeTime(cert.created_at || new Date()),
              icon: FileText,
              iconColor: "#10b981",
              isUnread: true,
              data: cert,
            });
          });
      }

      // Add prescription requests
      if (Array.isArray(prescriptionData)) {
        prescriptionData
          .filter(
            (presc) =>
              presc.status === "pending" || presc.status === "submitted",
          )
          .forEach((presc) => {
            notifications.push({
              id: `prescription-${presc.id}`,
              type: "prescription_request",
              title: "Prescription Request",
              message: `From: ${presc.patient_name || "Unknown Patient"} - ${
                presc.medication_name
              }`,
              time: getRelativeTime(presc.created_at || new Date()),
              icon: Pill,
              iconColor: "#f59e0b",
              isUnread: true,
              data: presc,
            });
          });
      }
    } else if (isDoctor) {
      // For doctor: show approved appointments, checked-in patients, ongoing appointments, and receptionist-approved requests
      if (Array.isArray(appointmentData)) {
        appointmentData
          .filter(
            (appt) =>
              appt.status === "approved" ||
              appt.status === "checked_in" ||
              appt.status === "ongoing",
          )
          .forEach((appt) => {
            const isCheckedIn = appt.status === "checked_in";
            const isOngoing = appt.status === "ongoing";
            let patientName = "Unknown Patient";
            if (
              appt.notes &&
              appt.notes.includes("Patient Details (Pending):")
            ) {
              try {
                const patientDetails = JSON.parse(
                  appt.notes.split("Patient Details (Pending):")[1].trim(),
                );
                patientName = patientDetails.name || "Unknown Patient";
              } catch (error) {
                patientName = `Appointment ${appt.id}`;
              }
            }

            notifications.push({
              id: `appointment-${appt.id}`,
              type: isCheckedIn
                ? "patient_checkedin"
                : isOngoing
                  ? "appointment_ongoing"
                  : "appointment_approved",
              title: isCheckedIn
                ? "Patient Checked In"
                : isOngoing
                  ? "Appointment Ongoing"
                  : "Appointment Approved",
              message: `Patient: ${patientName}${
                isCheckedIn
                  ? " is ready for consultation"
                  : isOngoing
                    ? " appointment is now in progress"
                    : ""
              }`,
              time: getRelativeTime(
                appt.updated_at || appt.created_at || new Date(),
              ),
              date: appt.date,
              appointmentTime: appt.time,
              appointmentType: appt.appointment_type,
              icon: isCheckedIn ? UserCheck : isOngoing ? Clock : CheckSquare,
              iconColor: isCheckedIn
                ? "#059669"
                : isOngoing
                  ? "#f97316"
                  : "#3b82f6",
              isUnread: isCheckedIn || isOngoing,
              data: appt,
            });
          });
      }

      // Add receptionist-approved medical certificates (ready for doctor review)
      if (Array.isArray(medCertData)) {
        medCertData
          .filter(
            (cert) =>
              cert.status === "approved" ||
              cert.status === "ready" ||
              cert.status === "on_process",
          )
          .forEach((cert) => {
            const isOnProcess = cert.status === "on_process";
            notifications.push({
              id: `medcert-${cert.id}`,
              type: isOnProcess ? "medcert_on_process" : "medcert_approved",
              title: isOnProcess
                ? "Medical Certificate Needs Review"
                : "Medical Certificate Ready",
              message: `For: ${cert.patient_name || "Unknown Patient"}${
                isOnProcess ? " - Being processed, awaiting doctor review" : ""
              }`,
              time: getRelativeTime(
                cert.updated_at || cert.created_at || new Date(),
              ),
              icon: isReceptionistApproved ? FileText : CheckSquare,
              iconColor: isReceptionistApproved ? "#dc2626" : "#10b981",
              isUnread: isReceptionistApproved,
              data: cert,
            });
          });
      }

      // Add receptionist-approved prescriptions (ready for doctor review)
      if (Array.isArray(prescriptionData)) {
        prescriptionData
          .filter(
            (presc) =>
              presc.status === "approved" ||
              presc.status === "ready" ||
              presc.status === "receptionist_approved",
          )
          .forEach((presc) => {
            const isReceptionistApproved =
              presc.status === "receptionist_approved";
            notifications.push({
              id: `prescription-${presc.id}`,
              type: isReceptionistApproved
                ? "prescription_receptionist_approved"
                : "prescription_approved",
              title: isReceptionistApproved
                ? "Prescription Needs Review"
                : "Prescription Ready",
              message: `For: ${presc.patient_name || "Unknown Patient"} - ${
                presc.medication_name
              }${
                isReceptionistApproved
                  ? " - Approved by receptionist, awaiting doctor review"
                  : ""
              }`,
              time: getRelativeTime(
                presc.updated_at || presc.created_at || new Date(),
              ),
              icon: isReceptionistApproved ? Pill : CheckSquare,
              iconColor: isReceptionistApproved ? "#dc2626" : "#f59e0b",
              isUnread: isReceptionistApproved,
              data: presc,
            });
          });
      }
    }

    // Sort by most recent first
    return notifications.sort(
      (a, b) =>
        new Date(
          b.data.created_at || b.data.updated_at || new Date(),
        ).getTime() -
        new Date(
          a.data.created_at || a.data.updated_at || new Date(),
        ).getTime(),
    );
  };

  // Helper function to get relative time
  const getRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  // Listen for changes in notification count
  useEffect(() => {
    const updateNotificationCount = () => {
      const count = localStorage.getItem("totalNotificationCount");
      setTotalNotificationCount(count ? parseInt(count) : 0);
      const unread = localStorage.getItem("unreadNotificationCount");
      setUnreadCount(unread ? parseInt(unread) : 0);
    };

    // Initial check
    updateNotificationCount();

    // Listen for storage events (when other components update the count)
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "totalNotificationCount" ||
        e.key === "unreadNotificationCount"
      ) {
        updateNotificationCount();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check periodically for changes
    const interval = setInterval(updateNotificationCount, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fetch notifications for notification panel
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);

        // Fetch appointments
        const appointmentsResponse = await axios.get("/appointments/list/");
        const appointmentsData = appointmentsResponse.data;

        // Fetch medical certificates
        let medCertData = [];
        try {
          const medCertResponse = await axios.get("/medical-certificates/");
          medCertData = medCertResponse.data;
        } catch (error) {
          console.warn("Could not fetch medical certificates:", error);
        }

        // Fetch prescription requests
        let prescriptionData = [];
        try {
          const prescriptionResponse = await axios.get(
            "/prescription-requests/",
          );
          prescriptionData = prescriptionResponse.data;
        } catch (error) {
          console.warn("Could not fetch prescription requests:", error);
        }

        // Fetch medicine inventory for expiration notifications
        let medicineData = [];
        try {
          const medicineResponse = await axios.get("/inventory/medicines/");
          if (medicineResponse.data.success) {
            medicineData = medicineResponse.data.data;
          }
        } catch (error) {
          console.warn("Could not fetch medicine inventory:", error);
        }

        console.log("Fetched data:", {
          appointmentsData,
          medCertData,
          prescriptionData,
          medicineData,
        });

        if (Array.isArray(appointmentsData)) {
          const mappedNotifications = mapNotifications(
            appointmentsData,
            medCertData,
            prescriptionData,
            medicineData,
          );
          setNotifications(mappedNotifications);

          // Update counts
          const totalCount = mappedNotifications.length;
          const actualUnreadCount = mappedNotifications.filter(
            (n) => n.isUnread && !readNotifications.has(n.id),
          ).length;

          setTotalNotificationCount(totalCount);
          setUnreadCount(actualUnreadCount);

          // Store in localStorage for other components
          localStorage.setItem("totalNotificationCount", totalCount.toString());
          localStorage.setItem(
            "unreadNotificationCount",
            actualUnreadCount.toString(),
          );
        } else {
          console.error(
            "Invalid appointments response format:",
            appointmentsData,
          );
          setNotifications([]);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (showNotifications) {
      fetchNotifications();
      setCurrentPage(1); // Reset pagination when opening
    }
  }, [showNotifications, currentUser?.role, readNotifications]);
  // Handle logout
  const handleLogout = async () => {
    try {
      // Call the session-based logout
      await logoutSession();
      console.log("Session logout successful");
    } catch (error) {
      console.error("Session logout failed:", error);
      // Continue with local cleanup even if server logout fails
    }

    // Clear local storage and context
    localStorage.removeItem("user");
    localStorage.removeItem("sessionId");
    setCurrentUser(null);
    navigate("/login");
  };
  // Handle settings navigation
  const handleSettings = () => {
    navigate("/user-settings");
  };

  // Handle notification click
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  // Handle notification item click
  const handleNotificationItemClick = (notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);

    setShowNotifications(false);

    // Navigate based on notification type and user role
    switch (notification.type) {
      case "appointment_request":
        navigate("/appointments?tab=pending");
        break;
      case "medcert_request":
        navigate("/medical-certificates?tab=pending");
        break;
      case "prescription_request":
        navigate("/prescription-requests?tab=pending");
        break;
      case "appointment_approved":
      case "patient_checkedin":
      case "appointment_ongoing":
        navigate("/appointments?tab=approved");
        break;
      case "medcert_approved":
      case "medcert_receptionist_approved":
        navigate("/medical-certificates?tab=approved");
        break;
      case "prescription_approved":
      case "prescription_receptionist_approved":
        navigate("/prescription-requests?tab=approved");
        break;
      case "medicine_expired":
      case "medicine_expiring":
        navigate("/inventory");
        break;
      default:
        navigate("/appointments");
    }
  };

  // Handle scroll for infinite loading
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 5;

    if (isNearBottom && !loadingMore && hasMoreNotifications) {
      setLoadingMore(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setLoadingMore(false);
      }, 500); // Small delay to show loading state
    }
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".notification-dropdown")) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  if (!currentUser) return null; // If no user, don't render the top bar

  return (
    <header className="sticky top-0 z-50 w-full py-2 px-4 md:py-3 md:px-6 border-b bg-background">
      <div className="flex items-center justify-between">
        {/* Left side - Only Sidebar trigger */}
        <div className="flex items-center">
          {/* SidebarTrigger with dynamic primary color */}
          <SidebarTrigger
            className="hover:bg-opacity-10"
            style={
              {
                color: colors.primaryColor,
                "--hover-bg": `${colors.primaryColor}1a`, // 10% opacity
              } as any
            }
          />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Philippine Time Clock */}
          <div className="hidden sm:flex flex-col items-end mr-2 text-sm">
            <div
              className="font-semibold text-gray-700"
              style={{ color: colors.primaryColor }}
            >
              {formatPhilippineTime()}
            </div>
            <div className="text-xs text-gray-500">
              {formatPhilippineDate()}
            </div>
          </div>

          <div className="relative notification-dropdown">
            {/* Notification button with dynamic primary color */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-opacity-10"
              onClick={handleNotificationClick}
              title={`${
                totalNotificationCount > 0
                  ? `${totalNotificationCount} notification${
                      totalNotificationCount > 1 ? "s" : ""
                    }${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`
                  : "No notifications"
              }`}
              style={
                {
                  color: colors.primaryColor,
                  "--hover-bg": `${colors.primaryColor}1a`,
                } as any
              }
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse"
                  style={{ backgroundColor: colors.primaryColor }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[380px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Notifications
                  </h3>

                  {/* Tabs */}
                  <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
                    <button
                      className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === "all"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      onClick={() => {
                        setActiveTab("all");
                        setCurrentPage(1);
                      }}
                    >
                      All
                    </button>
                    <button
                      className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors relative ${
                        activeTab === "unread"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      onClick={() => {
                        setActiveTab("unread");
                        setCurrentPage(1);
                      }}
                    >
                      Unread
                      {unreadCount > 0 && (
                        <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div
                  className="max-h-[400px] overflow-y-auto"
                  onScroll={handleScroll}
                >
                  {loadingNotifications ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">
                        Loading notifications...
                      </p>
                    </div>
                  ) : (
                    (() => {
                      if (displayedNotifications.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              {activeTab === "unread"
                                ? "No unread notifications"
                                : "No notifications"}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {displayedNotifications.map((notification) => {
                            const IconComponent = notification.icon;
                            const isRead = readNotifications.has(
                              notification.id,
                            );
                            const showAsUnread =
                              notification.isUnread && !isRead;

                            return (
                              <div
                                key={notification.id}
                                className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                                  showAsUnread ? "bg-blue-50" : ""
                                }`}
                                onClick={() =>
                                  handleNotificationItemClick(notification)
                                }
                              >
                                <div className="flex items-start space-x-3">
                                  {/* Icon */}
                                  <div
                                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{
                                      backgroundColor: `${notification.iconColor}15`,
                                    }}
                                  >
                                    <IconComponent
                                      className="w-5 h-5"
                                      style={{ color: notification.iconColor }}
                                    />
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p
                                          className={`text-sm leading-tight ${
                                            showAsUnread
                                              ? "font-semibold text-gray-900"
                                              : "font-medium text-gray-700"
                                          }`}
                                        >
                                          {notification.title}
                                        </p>
                                        <p
                                          className={`text-sm mt-1 leading-tight ${
                                            showAsUnread
                                              ? "text-gray-700"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          {notification.message}
                                        </p>

                                        {/* Additional details for appointments */}
                                        {(notification.date ||
                                          notification.appointmentTime) && (
                                          <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                                            {notification.date && (
                                              <div className="flex items-center space-x-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                  {new Date(
                                                    notification.date,
                                                  ).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )}
                                            {notification.appointmentTime && (
                                              <div className="flex items-center space-x-1">
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                  {notification.appointmentTime}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {notification.appointmentType && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Type: {notification.appointmentType}
                                          </p>
                                        )}
                                      </div>

                                      {/* Time and unread indicator */}
                                      <div className="flex flex-col items-end ml-2">
                                        <span className="text-xs text-gray-400">
                                          {notification.time}
                                        </span>
                                        {showAsUnread && (
                                          <div
                                            className="w-2 h-2 rounded-full mt-1"
                                            style={{
                                              backgroundColor:
                                                colors.primaryColor,
                                            }}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Loading more indicator */}
                          {loadingMore && (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
                              <p className="text-xs text-gray-500">
                                Loading more...
                              </p>
                            </div>
                          )}

                          {/* End of list indicator */}
                          {!hasMoreNotifications &&
                            displayedNotifications.length >
                              NOTIFICATIONS_PER_PAGE && (
                              <div className="text-center py-4">
                                <p className="text-xs text-gray-400">
                                  You've seen all notifications
                                </p>
                              </div>
                            )}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full hover:bg-opacity-10"
                style={
                  {
                    "--hover-bg": `${colors.primaryColor}1a`,
                  } as any
                }
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.image} alt={currentUser.name} />
                  <AvatarFallback
                    className="text-white font-medium"
                    style={{ backgroundColor: colors.primaryColor }}
                  >
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUser.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {currentUser.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSettings}
                className="cursor-pointer hover:bg-opacity-10"
                style={
                  {
                    "--hover-bg": `${colors.primaryColor}1a`,
                    "--focus-color": colors.primaryColor,
                  } as any
                }
              >
                <Settings
                  className="mr-2 h-4 w-4"
                  style={{ color: colors.primaryColor }}
                />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Logout button with green hover but red text */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 hover:bg-opacity-10 focus:text-red-600 hover:text-red-600"
                style={
                  {
                    "--hover-bg": `${colors.primaryColor}1a`,
                  } as React.CSSProperties & Record<string, any>
                }
              >
                <LogOut className="mr-2 h-4 w-4 text-red-600" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
