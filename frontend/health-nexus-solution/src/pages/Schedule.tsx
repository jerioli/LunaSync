import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ENV } from "@/config/env";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Info,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";

const API_BASE_URL = ENV.API_URL;

interface ScheduleSlot {
  date: string;
  time: string;
  available: boolean;
  is_booked?: boolean;
}

interface ExistingAvailability {
  id: number;
  date: string;
  doctor_id: number;
  is_available: boolean;
  max_appointments: number;
  time_slots: {
    id: number;
    start_time: string;
    end_time: string;
    is_booked: boolean;
    is_effectively_booked?: boolean; // New field from backend
    appointment_status?: string; // Add optional appointment status
    appointment_id?: number; // Add optional appointment ID
  }[];
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

// Function to get all dates in range
const getDatesInRange = (start: string, end: string): string[] => {
  const result: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
};

const Schedule: React.FC = () => {
  const { toast } = useToast();
  const { currentUser } = useClinic();
  const [isLoading, setIsLoading] = useState(false);

  // Schedule generation states
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);

  // Calendar view state
  const [viewDate, setViewDate] = useState(new Date());
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [startTimeOpen, setStartTimeOpen] = useState(false);
  const [endTimeOpen, setEndTimeOpen] = useState(false);
  const [allDay, setAllDay] = useState(false);

  // Existing availability management with pagination
  const [existingAvailability, setExistingAvailability] = useState<
    ExistingAvailability[]
  >([]);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [showExistingAvailability, setShowExistingAvailability] =
    useState(false);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const generateTimeSlots = () => {
    const slots = [];
    // Start from 8:00 AM (hour 8) to 6:00 PM (hour 18)
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 20) {
        const timeStr = `${String(hour).padStart(2, "0")}:${String(
          minute
        ).padStart(2, "0")}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const generateScheduleSlots = (
    date: string,
    start: string,
    end: string
  ): ScheduleSlot[] => {
    const slots: ScheduleSlot[] = [];
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute <= endMinute)
    ) {
      // Skip lunch break (12:00 PM to 1:00 PM)
      if (currentHour === 12) {
        currentHour = 13;
        currentMinute = 0;
        continue;
      }

      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(
        currentMinute
      ).padStart(2, "0")}`;
      const formattedTime = formatTime(timeStr);

      slots.push({
        date,
        time: formattedTime,
        available: true,
      });

      // Add 20 minutes for next slot
      currentMinute += 20;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = currentMinute - 60;
      }
    }

    return slots;
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes.padStart(2, "0")} ${ampm}`;
  };

  // Helper function to determine if a slot is effectively booked
  const isSlotBooked = (slot: any) => {
    // First check if backend provides is_effectively_booked
    if (slot.is_effectively_booked !== undefined) {
      return slot.is_effectively_booked;
    }

    // Fallback: Consider slot booked if:
    // 1. is_booked is true, OR
    // 2. appointment_status is 'ongoing', 'scheduled', 'pending', or 'completed'
    if (slot.is_booked) return true;
    if (slot.appointment_status) {
      const busyStatuses = ["ongoing", "scheduled", "pending", "completed"];
      return busyStatuses.includes(slot.appointment_status.toLowerCase());
    }
    return false;
  };

  // Helper function to get booking status display
  const getBookingStatusDisplay = (slot: any) => {
    if (slot.appointment_status) {
      return (
        slot.appointment_status.charAt(0).toUpperCase() +
        slot.appointment_status.slice(1)
      );
    }
    return slot.is_booked ? "Booked" : "Available";
  };

  const convertDisplayTimeTo24Hour = (displayTime: string): string => {
    const [time, ampm] = displayTime.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let hour24 = hours;

    if (ampm === "PM" && hours !== 12) {
      hour24 = hours + 12;
    } else if (ampm === "AM" && hours === 12) {
      hour24 = 0;
    }

    return `${hour24.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const handleGenerateSlots = () => {
    console.log("=== AUTO-FILL SLOTS DEBUG ===");
    console.log("Function called - handleGenerateSlots");
    console.log("Form values:", { startDate, endDate, startTime, endTime });

    if (!startDate || !endDate || !startTime || !endTime) {
      console.log("❌ Missing required fields");
      toast({
        title: "Missing fields",
        description: "Please fill in all date and time fields.",
      });
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      console.log("❌ End date is before start date");
      toast({
        title: "Invalid date range",
        description: "End date must be after or equal to start date.",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ All fields present and valid, generating dates...");
    const dates = getDatesInRange(startDate, endDate);
    console.log("Generated dates:", dates);

    console.log("Generating time slots for each date...");
    const generatedSlots = dates.flatMap((date) =>
      generateScheduleSlots(date, startTime, endTime)
    );
    console.log("Generated slots:", generatedSlots);

    console.log("Setting schedule slots in state...");
    setScheduleSlots(generatedSlots);

    console.log("✅ Auto-fill complete, showing toast");
    toast({
      title: "Schedule Generated",
      description: `Created ${generatedSlots.length} time slots with 20-minute buffers`,
    });
    console.log("=== AUTO-FILL SLOTS DEBUG END ===");
  };

  // Load existing availability with pagination
  const loadExistingAvailability = async (page: number = 1) => {
    if (!currentUser) return;

    try {
      setIsLoadingExisting(true);

      // Get doctor's ID from database
      const doctorsResponse = await axios.get(`${API_BASE_URL}/doctors/`);
      const doctors: any[] = doctorsResponse.data;

      // Try multiple ways to find the doctor - ID first (most reliable), then username, then email
      let doctor = doctors.find((d) => d.id === currentUser.id);

      if (!doctor && currentUser.username) {
        doctor = doctors.find((d) => d.username === currentUser.username);
      }

      if (!doctor && currentUser.email) {
        doctor = doctors.find((d) => d.email && d.email === currentUser.email);
      }

      if (!doctor) {
        console.error("Doctor lookup failed:", {
          currentUser: currentUser,
          doctorsFound: doctors.length,
          searchCriteria: {
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email,
          },
        });
        throw new Error("Doctor not found in database");
      }

      // Fetch paginated availability
      const response = await axios.get(`${API_BASE_URL}/availability/`, {
        params: {
          doctor_id: doctor.id,
          page: page,
          page_size: pagination.itemsPerPage,
          ordering: "-date", // Show newest first
          _t: Date.now(), // Cache buster to ensure fresh data
        },
      });

      const data = response.data;

      // Debug logging to check booking status
      console.log("API Response:", data);
      if (data.results) {
        data.results.forEach((availability: any) => {
          console.log(
            `Date: ${availability.date}, Time Slots:`,
            availability.time_slots
          );
          availability.time_slots.forEach((slot: any) => {
            console.log(
              `  ${slot.start_time}-${slot.end_time}: ${
                slot.is_booked ? "BOOKED" : "AVAILABLE"
              }${
                slot.appointment_status
                  ? ` (Status: ${slot.appointment_status})`
                  : ""
              }`
            );
          });
        });
      }

      // Handle both paginated and non-paginated responses
      if (data.results) {
        // Paginated response
        setExistingAvailability(data.results);
        setPagination((prev) => ({
          ...prev,
          currentPage: page,
          totalPages: Math.ceil(data.count / prev.itemsPerPage),
          totalItems: data.count,
        }));
      } else {
        // Non-paginated response - implement client-side pagination
        const startIndex = (page - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        const paginatedData = data.slice(startIndex, endIndex);

        setExistingAvailability(paginatedData);
        setPagination((prev) => ({
          ...prev,
          currentPage: page,
          totalPages: Math.ceil(data.length / prev.itemsPerPage),
          totalItems: data.length,
        }));
      }
    } catch (error: any) {
      console.error("Error loading existing availability:", error);
      toast({
        title: "Error",
        description: "Failed to load existing availability",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // Check if availability already exists for a specific date
  const checkExistingAvailability = async (
    date: string,
    doctorId: number
  ): Promise<boolean> => {
    try {
      console.log(
        `🔍 Checking availability for date: ${date}, doctor_id: ${doctorId}`
      );

      // Use the same API call as loadExistingAvailability but check for specific date
      const response = await axios.get(`${API_BASE_URL}/availability/`, {
        params: {
          doctor_id: doctorId,
          page_size: 1000, // Get a large number to check all records
        },
      });

      console.log(`📡 Full availability API response:`, response.data);

      let availabilityRecords = [];
      if (response.data.results) {
        // Paginated response
        availabilityRecords = response.data.results;
      } else {
        // Non-paginated response
        availabilityRecords = response.data;
      }

      // Check if any record matches the specific date
      const existsForDate = availabilityRecords.some(
        (record: any) => record.date === date
      );
      console.log(
        `📊 Date ${date} exists: ${existsForDate} (found ${availabilityRecords.length} total records)`
      );

      if (existsForDate) {
        const matchingRecord = availabilityRecords.find(
          (record: any) => record.date === date
        );
        console.log(`📋 Matching record for ${date}:`, matchingRecord);
      }

      return existsForDate;
    } catch (error) {
      console.error("❌ Error checking existing availability:", error);
      return false;
    }
  };

  // Delete existing availability
  const deleteAvailability = async (availabilityId: number) => {
    try {
      setIsLoadingExisting(true);
      await axios.delete(`${API_BASE_URL}/availability/${availabilityId}/`);

      toast({
        title: "Success",
        description: "Availability deleted successfully",
      });

      // Reload the current page
      await loadExistingAvailability(pagination.currentPage);
    } catch (error: any) {
      console.error("Error deleting availability:", error);
      toast({
        title: "Error",
        description: "Failed to delete availability",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExisting(false);
    }
  };

  const savePattern = async () => {
    console.log("=== SAVE PATTERN DEBUG ===");
    console.log("Function called - savePattern");
    console.log("Form values:", { startDate, endDate, startTime, endTime });
    console.log("Current user:", currentUser);

    if (!startDate || !endDate || !startTime || !endTime || !currentUser) {
      console.log("❌ Missing required fields or user");
      console.log("Missing:", {
        startDate: !startDate,
        endDate: !endDate,
        startTime: !startTime,
        endTime: !endTime,
        currentUser: !currentUser,
      });
      toast({
        title: "Missing fields",
        description: "Please fill in all date and time fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      console.log("❌ End date is before start date");
      toast({
        title: "Invalid date range",
        description: "End date must be after or equal to start date.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("✅ All fields present and valid, starting save process...");
      setIsLoading(true);

      // Get doctor's ID
      console.log("Fetching doctor information...");
      const doctorsResponse = await axios.get(`${API_BASE_URL}/doctors/`);
      console.log("Doctors API response:", doctorsResponse.data);
      const doctors = doctorsResponse.data;

      // Try multiple identification strategies due to encrypted emails
      console.log("Looking for doctor with currentUser:", {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
      });

      let doctor = doctors.find((d) => d.id === currentUser.id);
      if (!doctor) {
        console.log("Doctor not found by ID, trying username...");
        doctor = doctors.find((d) => d.username === currentUser.username);
      }
      if (!doctor && currentUser.email) {
        console.log("Doctor not found by username, trying email...");
        doctor = doctors.find((d) => d.email && d.email === currentUser.email);
      }

      if (!doctor) {
        console.log("❌ Doctor not found using any method");
        console.log(
          "Available doctors:",
          doctors.map((d) => ({
            id: d.id,
            username: d.username,
            email: d.email,
          }))
        );
        console.log("Searching for:", {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
        });
        throw new Error("Doctor not found in database");
      }

      console.log("✅ Found doctor:", doctor);

      // Generate all dates in the range
      console.log("Generating dates in range...");
      const dates = getDatesInRange(startDate, endDate);
      console.log("Generated dates:", dates);

      console.log("✅ Checking for existing availability...");
      // Check for existing availability and filter out duplicates
      const existingDates: string[] = [];
      const newDates: string[] = [];

      for (const date of dates) {
        console.log(`Checking if availability exists for date: ${date}`);
        const exists = await checkExistingAvailability(date, doctor.id);
        console.log(`Date ${date} exists: ${exists}`);
        if (exists) {
          existingDates.push(date);
        } else {
          newDates.push(date);
        }
      }

      console.log("Existing dates:", existingDates);
      console.log("New dates to create:", newDates);

      if (existingDates.length > 0) {
        console.log("⚠️ Found duplicate dates, will skip them");
        toast({
          title: "Duplicate dates found",
          description: `Skipping ${
            existingDates.length
          } dates that already have availability: ${existingDates
            .slice(0, 3)
            .join(", ")}${existingDates.length > 3 ? "..." : ""}`,
          variant: "default",
        });
      }

      if (newDates.length === 0) {
        console.log("❌ No new dates to save");
        toast({
          title: "No new dates to save",
          description: "All selected dates already have availability set up.",
          variant: "default",
        });
        return;
      }

      console.log(
        `✅ Creating availability for ${newDates.length} new dates...`
      );
      // Create availability and time slots for new dates only
      let successCount = 0;
      for (const date of newDates) {
        try {
          console.log(`Creating availability for date: ${date}`);
          // Create availability for this date
          const availabilityData = {
            doctor_id: Number(doctor.id),
            date: date,
            is_available: true,
            max_appointments: 8,
          };

          console.log("Posting availability data:", availabilityData);
          const availabilityResponse = await axios.post(
            `${API_BASE_URL}/availability/`,
            availabilityData
          );
          console.log("Availability response:", availabilityResponse.data);
          const createdAvailability = availabilityResponse.data;

          if (
            !createdAvailability ||
            typeof createdAvailability.id !== "number"
          ) {
            console.warn(`❌ Failed to create availability for ${date}`);
            continue;
          }

          console.log(
            `✅ Created availability ${createdAvailability.id} for ${date}`
          );
          // Generate time slots for this date
          const daySlots = generateScheduleSlots(date, startTime, endTime);
          console.log(
            `Generated ${daySlots.length} time slots for ${date}:`,
            daySlots
          );

          // Create time slots
          for (const slot of daySlots) {
            console.log(`Creating time slot: ${slot.time} for ${date}`);
            const startTime24 = convertDisplayTimeTo24Hour(slot.time);

            // Calculate end time (20 minutes later)
            const [hours, minutes] = startTime24.split(":").map(Number);
            const endTimeMinutes = hours * 60 + minutes + 20;
            const endHours = Math.floor(endTimeMinutes / 60);
            const endMins = endTimeMinutes % 60;
            const endTime24 = `${endHours.toString().padStart(2, "0")}:${endMins
              .toString()
              .padStart(2, "0")}`;

            const timeSlotData = {
              start_time: startTime24,
              end_time: endTime24,
              is_booked: false,
            };

            console.log("Posting time slot data:", timeSlotData);
            const timeSlotResponse = await axios.post(
              `${API_BASE_URL}/availability/${createdAvailability.id}/create_time_slot/`,
              timeSlotData
            );
            console.log("Time slot response:", timeSlotResponse.data);
          }

          console.log(`✅ Successfully created all time slots for ${date}`);
          successCount++;
        } catch (dateError) {
          console.error(
            `❌ Failed to create availability for ${date}:`,
            dateError
          );
        }
      }

      console.log(
        `✅ Completed creation process. Success count: ${successCount}/${newDates.length}`
      );
      // Refresh the existing availability list
      console.log("Refreshing existing availability list...");
      await loadExistingAvailability(pagination.currentPage);

      console.log("✅ Showing success toast");
      toast({
        title: "Pattern Saved",
        description: `Successfully created availability for ${successCount} out of ${newDates.length} new dates (${startTime}-${endTime})`,
      });
      console.log("=== SAVE PATTERN DEBUG END ===");
    } catch (error: any) {
      console.error("❌ Error saving pattern:", error);
      console.error("Error details:", error.response?.data);
      toast({
        title: "Error",
        description:
          error.response?.data?.detail ||
          error.message ||
          "Failed to save pattern",
        variant: "destructive",
      });
    } finally {
      console.log("Setting loading to false");
      setIsLoading(false);
    }
  };

  // Load existing availability on component mount
  useEffect(() => {
    if (currentUser?.role === "doctor") {
      loadExistingAvailability(1);
    }
  }, [currentUser]);

  if (currentUser?.role !== "doctor") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only doctors can access the schedule management page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">My Schedule</h1>
        <p className="text-muted-foreground mb-6">
          Set your availability, recurring patterns, and manage slots. Desktop
          shows calendar grid, mobile shows list view.
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Generate Schedule
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            View Schedule
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Generate Schedule */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Generate Schedule
              </CardTitle>
              <CardDescription>
                Create recurring availability patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Date Range Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Date Range</h3>
                    <div className="flex gap-4">
                      {/* Start Date Picker */}
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Select a day
                        </Label>
                        <Popover
                          open={startCalendarOpen}
                          onOpenChange={setStartCalendarOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal bg-gray-50 hover:bg-gray-100 border-gray-200"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-sm">
                                  {new Date(startDate).toLocaleDateString(
                                    "en-US",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-4">
                              {/* Calendar Header */}
                              <div className="flex items-center justify-between mb-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setViewDate(
                                      new Date(
                                        viewDate.getFullYear(),
                                        viewDate.getMonth() - 1
                                      )
                                    )
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="font-semibold">
                                  {viewDate.toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setViewDate(
                                      new Date(
                                        viewDate.getFullYear(),
                                        viewDate.getMonth() + 1
                                      )
                                    )
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Calendar Grid */}
                              <div className="space-y-2">
                                {/* Day headers */}
                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                                  <div>M</div>
                                  <div>T</div>
                                  <div>W</div>
                                  <div>T</div>
                                  <div>F</div>
                                  <div>S</div>
                                  <div>S</div>
                                </div>

                                {/* Calendar days */}
                                <div className="grid grid-cols-7 gap-1">
                                  {(() => {
                                    const {
                                      daysInMonth,
                                      startingDayOfWeek,
                                      year,
                                      month,
                                    } = getDaysInMonth(viewDate);
                                    const days = [];

                                    // Adjust starting day (Sunday = 0, but we want Monday = 0)
                                    const adjustedStart =
                                      startingDayOfWeek === 0
                                        ? 6
                                        : startingDayOfWeek - 1;

                                    // Empty cells before first day
                                    for (let i = 0; i < adjustedStart; i++) {
                                      days.push(
                                        <div
                                          key={`empty-${i}`}
                                          className="h-8"
                                        />
                                      );
                                    }

                                    // Actual days
                                    for (
                                      let day = 1;
                                      day <= daysInMonth;
                                      day++
                                    ) {
                                      const dateStr = `${year}-${String(
                                        month + 1
                                      ).padStart(2, "0")}-${String(
                                        day
                                      ).padStart(2, "0")}`;
                                      const isSelected = dateStr === startDate;
                                      const isToday = dateStr === todayStr;

                                      days.push(
                                        <Button
                                          key={day}
                                          variant="ghost"
                                          className={`h-8 w-8 p-0 font-normal ${
                                            isSelected
                                              ? "bg-blue-500 text-white hover:bg-blue-600"
                                              : isToday
                                              ? "bg-blue-100 text-blue-600"
                                              : "hover:bg-gray-100"
                                          }`}
                                          onClick={() => {
                                            setStartDate(dateStr);
                                            setStartCalendarOpen(false);
                                          }}
                                        >
                                          {day}
                                        </Button>
                                      );
                                    }

                                    return days;
                                  })()}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setStartCalendarOpen(false)}
                                >
                                  Remove
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                                  onClick={() => setStartCalendarOpen(false)}
                                >
                                  Done
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* End Date Picker */}
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          End with
                        </Label>
                        <Popover
                          open={endCalendarOpen}
                          onOpenChange={setEndCalendarOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal bg-gray-50 hover:bg-gray-100 border-gray-200"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-sm">
                                  {new Date(endDate).toLocaleDateString(
                                    "en-US",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-4">
                              {/* Calendar Header */}
                              <div className="flex items-center justify-between mb-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setViewDate(
                                      new Date(
                                        viewDate.getFullYear(),
                                        viewDate.getMonth() - 1
                                      )
                                    )
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="font-semibold">
                                  {viewDate.toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setViewDate(
                                      new Date(
                                        viewDate.getFullYear(),
                                        viewDate.getMonth() + 1
                                      )
                                    )
                                  }
                                  className="h-8 w-8 p-0"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Calendar Grid */}
                              <div className="space-y-2">
                                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                                  <div>M</div>
                                  <div>T</div>
                                  <div>W</div>
                                  <div>T</div>
                                  <div>F</div>
                                  <div>S</div>
                                  <div>S</div>
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                  {(() => {
                                    const {
                                      daysInMonth,
                                      startingDayOfWeek,
                                      year,
                                      month,
                                    } = getDaysInMonth(viewDate);
                                    const days = [];
                                    const adjustedStart =
                                      startingDayOfWeek === 0
                                        ? 6
                                        : startingDayOfWeek - 1;

                                    for (let i = 0; i < adjustedStart; i++) {
                                      days.push(
                                        <div
                                          key={`empty-${i}`}
                                          className="h-8"
                                        />
                                      );
                                    }

                                    for (
                                      let day = 1;
                                      day <= daysInMonth;
                                      day++
                                    ) {
                                      const dateStr = `${year}-${String(
                                        month + 1
                                      ).padStart(2, "0")}-${String(
                                        day
                                      ).padStart(2, "0")}`;
                                      const isSelected = dateStr === endDate;
                                      const isToday = dateStr === todayStr;

                                      days.push(
                                        <Button
                                          key={day}
                                          variant="ghost"
                                          className={`h-8 w-8 p-0 font-normal ${
                                            isSelected
                                              ? "bg-blue-500 text-white hover:bg-blue-600"
                                              : isToday
                                              ? "bg-blue-100 text-blue-600"
                                              : "hover:bg-gray-100"
                                          }`}
                                          onClick={() => {
                                            setEndDate(dateStr);
                                            setEndCalendarOpen(false);
                                          }}
                                        >
                                          {day}
                                        </Button>
                                      );
                                    }

                                    return days;
                                  })()}
                                </div>
                              </div>

                              <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setEndCalendarOpen(false)}
                                >
                                  Remove
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                                  onClick={() => setEndCalendarOpen(false)}
                                >
                                  Done
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Time Range Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Time Range</h3>

                    {/* All day checkbox - single for both times */}
                    <div className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        id="allDay"
                        checked={allDay}
                        onChange={(e) => setAllDay(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label
                        htmlFor="allDay"
                        className="text-sm cursor-pointer"
                      >
                        All day
                      </Label>
                    </div>

                    <div className="flex gap-4">
                      {/* Start Time Picker */}
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Start time
                        </Label>
                        <Popover
                          open={startTimeOpen}
                          onOpenChange={setStartTimeOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal bg-gray-50 hover:bg-gray-100 border-gray-200"
                              disabled={allDay}
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-semibold">
                                  {formatTime(startTime)}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="start">
                            <div className="p-3">
                              {/* Time slots list */}
                              <div className="max-h-64 overflow-y-auto space-y-1">
                                {timeSlots.map((time) => {
                                  const isSelected = time === startTime;
                                  return (
                                    <button
                                      key={time}
                                      onClick={() => {
                                        setStartTime(time);
                                        setStartTimeOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                        isSelected
                                          ? "bg-blue-500 text-white font-medium"
                                          : "hover:bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {formatTime(time)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* End Time Picker */}
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          End with
                        </Label>
                        <Popover
                          open={endTimeOpen}
                          onOpenChange={setEndTimeOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal bg-gray-50 hover:bg-gray-100 border-gray-200"
                              disabled={allDay}
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-semibold">
                                  {formatTime(endTime)}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="start">
                            <div className="p-3">
                              <div className="max-h-64 overflow-y-auto space-y-1">
                                {timeSlots.map((time) => {
                                  const isSelected = time === endTime;
                                  return (
                                    <button
                                      key={time}
                                      onClick={() => {
                                        if (time < startTime) {
                                          toast({
                                            title: "Invalid time range",
                                            description:
                                              "End time must be after start time.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        setEndTime(time);
                                        setEndTimeOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                        isSelected
                                          ? "bg-blue-500 text-white font-medium"
                                          : "hover:bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {formatTime(time)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recurring Pattern Section - REMOVED */}

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                  <Button
                    onClick={handleGenerateSlots}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    <CalendarCheck className="h-4 w-4" />
                    Preview Slots
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={savePattern}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" />
                        Save Schedule
                      </>
                    )}
                  </Button>
                </div>

                {/* Preview Generated Slots */}
                {scheduleSlots.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Preview: {scheduleSlots.length} slots generated
                    </h4>
                    <p className="text-blue-700 text-sm">
                      Slots will be created with 20-minute intervals, excluding
                      lunch break (12:00 PM - 1:00 PM). Click "Save Schedule" to
                      confirm and create these slots.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: View Schedule */}
        <TabsContent value="view" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Schedule Overview
                  </CardTitle>
                  <CardDescription>
                    View and manage your existing availability
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={showExistingAvailability ? "default" : "secondary"}
                  >
                    {pagination.totalItems} slots
                  </Badge>
                  {showExistingAvailability && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Refreshing schedule...",
                          description: "Loading latest booking information",
                        });
                        loadExistingAvailability(pagination.currentPage);
                      }}
                      disabled={isLoadingExisting}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          isLoadingExisting ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowExistingAvailability(!showExistingAvailability);
                      if (!showExistingAvailability) {
                        loadExistingAvailability(1);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    {showExistingAvailability ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Load Schedule
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {showExistingAvailability && (
              <CardContent>
                {isLoadingExisting ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                  </div>
                ) : existingAvailability.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      No availability slots found
                    </p>
                    <p className="text-sm">
                      Create your first schedule using the Generate tab
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Enhanced Table with better styling */}
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="font-semibold">
                              Date
                            </TableHead>
                            <TableHead className="font-semibold">Day</TableHead>
                            <TableHead className="font-semibold">
                              Time Slots{" "}
                              <span className="text-xs text-muted-foreground">
                                (click to view)
                              </span>
                            </TableHead>
                            <TableHead className="font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {existingAvailability.map((availability) => {
                            const date = new Date(availability.date);
                            const dayName = date.toLocaleDateString("en-US", {
                              weekday: "short",
                            });
                            const formattedDate = date.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            );

                            const bookedSlots = availability.time_slots.filter(
                              (slot) => isSlotBooked(slot)
                            ).length;
                            const totalSlots = availability.time_slots.length;

                            return (
                              <TableRow
                                key={availability.id}
                                className="hover:bg-muted/30"
                              >
                                <TableCell className="font-medium">
                                  {formattedDate}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="capitalize"
                                  >
                                    {dayName}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  <div className="flex items-center gap-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 px-3 hover:bg-muted/50 hover:border-primary/40 transition-all cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                              {totalSlots} slots
                                            </span>
                                            <Badge
                                              variant={
                                                bookedSlots > 0
                                                  ? "destructive"
                                                  : "default"
                                              }
                                              className="text-xs"
                                            >
                                              {bookedSlots}/{totalSlots}
                                            </Badge>
                                            <Info className="h-3 w-3 opacity-60" />
                                          </div>
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-80 p-4"
                                        align="start"
                                      >
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-sm">
                                              Time Slots - {formattedDate}
                                            </h4>
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {totalSlots} total
                                            </Badge>
                                          </div>

                                          <div className="max-h-64 overflow-y-auto space-y-1">
                                            {availability.time_slots.map(
                                              (slot, index) => (
                                                <div
                                                  key={index}
                                                  className={`flex items-center justify-between p-2 rounded-md border ${
                                                    isSlotBooked(slot)
                                                      ? "bg-red-50 border-red-200"
                                                      : "bg-green-50 border-green-200"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div
                                                      className={`w-2 h-2 rounded-full ${
                                                        isSlotBooked(slot)
                                                          ? "bg-red-500"
                                                          : "bg-green-500"
                                                      }`}
                                                    />
                                                    <span className="text-sm font-mono">
                                                      {formatTime(
                                                        slot.start_time
                                                      )}{" "}
                                                      -{" "}
                                                      {formatTime(
                                                        slot.end_time
                                                      )}
                                                    </span>
                                                  </div>
                                                  <Badge
                                                    variant={
                                                      isSlotBooked(slot)
                                                        ? "destructive"
                                                        : "default"
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {getBookingStatusDisplay(
                                                      slot
                                                    )}
                                                  </Badge>
                                                </div>
                                              )
                                            )}
                                          </div>

                                          <div className="pt-2 border-t">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                              <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                  <span>
                                                    Available (
                                                    {totalSlots - bookedSlots})
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                  <span>
                                                    Booked ({bookedSlots})
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      availability.is_available
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="capitalize"
                                  >
                                    {availability.is_available
                                      ? "Available"
                                      : "Unavailable"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteAvailability(availability.id)
                                      }
                                      disabled={bookedSlots > 0}
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      title={
                                        bookedSlots > 0
                                          ? "Cannot delete availability with booked slots"
                                          : "Delete availability"
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Enhanced Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing{" "}
                          {(pagination.currentPage - 1) *
                            pagination.itemsPerPage +
                            1}{" "}
                          to{" "}
                          {Math.min(
                            pagination.currentPage * pagination.itemsPerPage,
                            pagination.totalItems
                          )}{" "}
                          of {pagination.totalItems} slots
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              loadExistingAvailability(
                                pagination.currentPage - 1
                              )
                            }
                            disabled={pagination.currentPage <= 1}
                            className="flex items-center gap-1"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>

                          <div className="flex items-center gap-1">
                            {[...Array(Math.min(5, pagination.totalPages))].map(
                              (_, i) => {
                                const pageNum =
                                  Math.max(1, pagination.currentPage - 2) + i;
                                if (pageNum <= pagination.totalPages) {
                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={
                                        pageNum === pagination.currentPage
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() =>
                                        loadExistingAvailability(pageNum)
                                      }
                                      className="w-8 h-8 p-0"
                                    >
                                      {pageNum}
                                    </Button>
                                  );
                                }
                                return null;
                              }
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              loadExistingAvailability(
                                pagination.currentPage + 1
                              )
                            }
                            disabled={
                              pagination.currentPage >= pagination.totalPages
                            }
                            className="flex items-center gap-1"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Schedule;
