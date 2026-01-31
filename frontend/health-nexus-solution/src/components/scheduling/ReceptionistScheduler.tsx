import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/services/api";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization?: string;
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean | number | string; // Can be boolean, number (0/1), or string ("true"/"false", "yes"/"no", etc.)
  appointment_id?: number;
  patient_name?: string;
  patient_gender?: string;
  status?: string; // appointment status: pending, scheduled, ongoing, completed, cancelled, no-show
}

interface DoctorAvailability {
  doctor_id: number;
  doctor_name: string;
  doctor_specialization?: string;
  date: string;
  is_available: boolean;
  time_slots: TimeSlot[];
}

interface DayData {
  date: Date;
  dateStr: string;
  availability: Record<number, DoctorAvailability>; // key: doctor_id
}

const ReceptionistScheduler: React.FC = () => {
  const { toast } = useToast();
  const { currentUser } = useClinic();
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [allTimeSlots, setAllTimeSlots] = useState<string[]>([]);

  // Format time to 12-hour format
  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  // Get hour from time string (e.g., "08:00:00" -> "08:00 AM")
  const getHourLabel = (time: string): string => {
    try {
      const [hours] = time.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:00 ${ampm}`;
    } catch {
      return time;
    }
  };

  // Group time slots by hour
  const groupSlotsByHour = (): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};

    allTimeSlots.forEach((slot) => {
      const hourLabel = getHourLabel(slot);
      if (!grouped[hourLabel]) {
        grouped[hourLabel] = [];
      }
      grouped[hourLabel].push(slot);
    });

    return grouped;
  };

  // Get appointment color based on status
  const getAppointmentColor = (status?: string): string => {
    if (status === "cancelled") {
      return "bg-red-100 text-red-800 border-red-200";
    } else if (status === "no-show") {
      return "bg-orange-100 text-orange-800 border-orange-200";
    } else {
      // pending, scheduled, ongoing, completed - all show green
      return "bg-green-100 text-green-800 border-green-200";
    }
  };

  // Fetch doctors list
  const fetchDoctors = async () => {
    try {
      console.log("Fetching doctors list...");
      const response = await axiosInstance.get("/doctors/");
      console.log("Doctors response:", response.data);
      setDoctors(response.data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast({
        title: "Error",
        description: "Failed to fetch doctors list",
        variant: "destructive",
      });
    }
  };

  // Fetch day availability data
  const fetchDayAvailability = async (date: Date) => {
    setIsLoading(true);
    try {
      // Format date to YYYY-MM-DD without timezone conversion (same as chatbot)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const availability: Record<number, DoctorAvailability> = {};
      const timeSlotSet = new Set<string>();

      console.log(`Fetching availability for ${dateStr}`);
      console.log(`Current selected date in scheduler:`, selectedDate);
      console.log(`Formatted date string being used:`, dateStr);

      // Fetch availability for each doctor on this date
      for (const doctor of doctors) {
        try {
          console.log(
            `Fetching availability for doctor ${doctor.id} (${doctor.first_name} ${doctor.last_name})`,
          );

          // Fetch existing appointments for this doctor on this date
          const appointmentsByTime: Record<string, any> = {};

          try {
            // Fetch all appointments for this doctor on this date (don't filter by status in API)
            const appointmentsResponse = await axiosInstance.get(
              "/appointments/",
              {
                params: {
                  doctor_id: doctor.id.toString(),
                  date: dateStr, // Use 'date' parameter (not appointment_date)
                  _t: Date.now(), // Cache busting parameter
                },
              },
            );

            console.log(
              `Appointments response for doctor ${doctor.id}:`,
              appointmentsResponse.data,
            );

            // Store appointments by time slot - filter for pending, scheduled and ongoing status on frontend
            if (Array.isArray(appointmentsResponse.data)) {
              console.log(
                `All appointments for doctor ${doctor.id} before filtering:`,
                appointmentsResponse.data,
              );

              // Check each appointment and log its fields
              appointmentsResponse.data.forEach((apt) => {
                console.log(`Appointment ${apt.id} fields:`, {
                  id: apt.id,
                  time: apt.time,
                  appointment_time: apt.appointment_time,
                  status: apt.status,
                  date: apt.date,
                  patient_name: apt.patient_name,
                  display_patient_name: apt.display_patient_name,
                });
              });

              const filteredAppointments = appointmentsResponse.data
                .filter((apt) => apt.appointment_time || apt.time) // Check both appointment_time and time fields
                .filter((apt) => {
                  const shouldInclude =
                    apt.status === "pending" ||
                    apt.status === "scheduled" ||
                    apt.status === "ongoing" ||
                    apt.status === "cancelled" ||
                    apt.status === "no-show";
                  console.log(
                    `Appointment ${apt.id}: status=${apt.status}, time=${
                      apt.appointment_time || apt.time
                    }, include=${shouldInclude}`,
                  );
                  return shouldInclude;
                }); // Include pending, scheduled, ongoing, cancelled, and no-show

              console.log(
                `Filtered appointments for doctor ${doctor.id}:`,
                filteredAppointments,
              );

              filteredAppointments.forEach((apt) => {
                const timeStr = apt.appointment_time || apt.time; // Use whichever field has the time
                if (timeStr && timeStr.includes(":")) {
                  appointmentsByTime[timeStr] = {
                    patient_name:
                      apt.patient_name ||
                      apt.display_patient_name ||
                      `${apt.patient?.first_name || ""} ${
                        apt.patient?.last_name || ""
                      }`.trim() ||
                      "Patient",
                    patient_gender:
                      apt.patient?.gender ||
                      apt.patient_gender ||
                      apt.gender ||
                      "",
                    appointment_id: apt.id,
                    status: apt.status, // Include status (pending, scheduled, ongoing, cancelled, no-show)
                  };
                  console.log(
                    `Added appointment to time slot ${timeStr}:`,
                    appointmentsByTime[timeStr],
                  );
                }
              });

              console.log(
                `Booked time slots for doctor ${doctor.id}:`,
                Object.keys(appointmentsByTime),
              );
              console.log(
                `Appointment details for doctor ${doctor.id}:`,
                appointmentsByTime,
              );
            }
          } catch (appointmentError) {
            console.error(
              `Error fetching appointments for doctor ${doctor.id}:`,
              appointmentError,
            );
            // Continue even if appointment fetch fails - we'll rely on is_booked from availability
          }

          const response = await axiosInstance.get(`/availability/`, {
            params: {
              doctor_id: doctor.id.toString(),
              date: dateStr,
              _t: Date.now(), // Cache busting parameter - same as chatbot
            },
          });

          console.log(
            `Time slots API response for doctor ${doctor.id}:`,
            response.data,
          );

          if (Array.isArray(response.data) && response.data.length > 0) {
            const availabilityData = response.data[0];

            // Check if availability has time_slots array (same as ScheduleAppointmentModal)
            if (
              !availabilityData ||
              !availabilityData.time_slots ||
              !Array.isArray(availabilityData.time_slots)
            ) {
              console.log(
                `No time slots in availability for doctor ${doctor.id}:`,
                availabilityData,
              );
              console.log(
                `Doctor ${doctor.id} availability data structure:`,
                JSON.stringify(availabilityData, null, 2),
              );

              // Create slots only from existing appointments, don't generate standard schedule
              if (Object.keys(appointmentsByTime).length > 0) {
                console.log(
                  `Creating slots from appointments only for doctor ${doctor.id}`,
                );
                const appointmentTimeSlots: TimeSlot[] = Object.keys(
                  appointmentsByTime,
                ).map((timeStr, index) => {
                  const appointment = appointmentsByTime[timeStr];
                  return {
                    id: index + 1,
                    start_time: timeStr,
                    end_time: timeStr,
                    is_booked: true,
                    patient_name: appointment.patient_name,
                    patient_gender: appointment.patient_gender,
                    appointment_id: appointment.appointment_id,
                    status: appointment.status, // Include status
                  };
                });

                availability[doctor.id] = {
                  doctor_id: doctor.id,
                  doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                  doctor_specialization: doctor.specialization,
                  date: dateStr,
                  is_available: true,
                  time_slots: appointmentTimeSlots,
                };

                // Add appointment time slots to the set
                appointmentTimeSlots.forEach((slot) => {
                  timeSlotSet.add(slot.start_time);
                });

                console.log(
                  `Created ${appointmentTimeSlots.length} time slots from appointments for doctor ${doctor.id}`,
                );
              } else {
                // No schedule and no appointments - show as not available
                availability[doctor.id] = {
                  doctor_id: doctor.id,
                  doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                  doctor_specialization: doctor.specialization,
                  date: dateStr,
                  is_available: false,
                  time_slots: [],
                };
              }
              continue;
            }

            console.log(
              `Raw time slots for doctor ${doctor.id}:`,
              availabilityData.time_slots,
            );

            // Log all time slots before filtering (same as ScheduleAppointmentModal)
            console.log(
              `All time slots before filtering for doctor ${doctor.id}:`,
              availabilityData.time_slots.map((slot: TimeSlot) => ({
                start: slot.start_time,
                end: slot.end_time,
                booked: slot.is_booked,
              })),
            );

            // Process time slots - map through all and mark booked ones
            let filteredTimeSlots: TimeSlot[] = [];
            if (
              availabilityData.time_slots &&
              Array.isArray(availabilityData.time_slots)
            ) {
              filteredTimeSlots = availabilityData.time_slots
                .map((slot: TimeSlot) => {
                  // Check if slot is marked as booked in the availability data (same as ScheduleAppointmentModal)
                  const isBookedValue = slot.is_booked as any;
                  const isBookedInAvailability = Boolean(
                    isBookedValue === true ||
                    isBookedValue === 1 ||
                    isBookedValue === "true" ||
                    isBookedValue === "1" ||
                    isBookedValue === "True" ||
                    isBookedValue === "TRUE" ||
                    isBookedValue === "yes" ||
                    isBookedValue === "YES" ||
                    isBookedValue === "Yes",
                  );

                  // Also check if this time slot has an existing appointment (same as ScheduleAppointmentModal)
                  const isBookedByAppointment = Object.keys(
                    appointmentsByTime,
                  ).includes(slot.start_time);

                  // Mark as booked if either source indicates it
                  const isBooked =
                    isBookedInAvailability || isBookedByAppointment;

                  if (isBooked) {
                    slot.is_booked = true;

                    // If booked by appointment, populate patient details
                    if (
                      isBookedByAppointment &&
                      appointmentsByTime[slot.start_time]
                    ) {
                      const appointment = appointmentsByTime[slot.start_time];
                      // Mark with patient info for all appointment statuses
                      slot.patient_name = appointment.patient_name;
                      slot.patient_gender = appointment.patient_gender;
                      slot.appointment_id = appointment.appointment_id;
                      slot.status = appointment.status; // Add status to slot
                      console.log(
                        `Time slot ${slot.start_time} is booked by appointment (${appointment.status}):`,
                        appointment,
                      );
                    }
                  }

                  return slot;
                })
                .filter((slot: TimeSlot) => {
                  // Skip lunch break (12:00 PM to 1:00 PM) - same logic as ScheduleAppointmentModal
                  const [hours] = slot.start_time.split(":");
                  const hour = parseInt(hours);
                  const isLunchBreak = hour === 12;

                  if (isLunchBreak) {
                    console.log(
                      `Filtering out lunch break slot for doctor ${doctor.id}: ${slot.start_time} - ${slot.end_time}`,
                    );
                  }

                  // Include all slots that are NOT lunch break (we want to show booked slots too in the scheduler)
                  return !isLunchBreak;
                });

              // Log after filtering (same as ScheduleAppointmentModal) - but note we keep ALL slots including booked ones
              console.log(
                `Available (unbooked) slots after filtering for doctor ${doctor.id}:`,
                filteredTimeSlots
                  .filter((slot) => !slot.is_booked)
                  .map((slot) => ({
                    start: slot.start_time,
                    end: slot.end_time,
                    booked: slot.is_booked,
                  })),
              );

              // Also log booked slots separately
              console.log(
                `Booked slots for doctor ${doctor.id}:`,
                filteredTimeSlots
                  .filter((slot) => slot.is_booked)
                  .map((slot) => ({
                    start: slot.start_time,
                    end: slot.end_time,
                    patient: slot.patient_name,
                    gender: slot.patient_gender,
                  })),
              );
            }

            console.log(
              `Filtered time slots for doctor ${doctor.id}:`,
              filteredTimeSlots,
            );

            availability[doctor.id] = {
              doctor_id: doctor.id,
              doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
              doctor_specialization: doctor.specialization,
              date: dateStr,
              is_available: availabilityData.is_available || false,
              time_slots: filteredTimeSlots,
            };

            // Collect all unique time slots
            filteredTimeSlots.forEach((slot: TimeSlot) => {
              timeSlotSet.add(slot.start_time);
            });
          } else {
            // No availability data returned - only show appointments if they exist
            if (Object.keys(appointmentsByTime).length > 0) {
              console.log(
                `No availability data but found appointments for doctor ${doctor.id}, creating slots from appointments only`,
              );
              const appointmentTimeSlots: TimeSlot[] = Object.keys(
                appointmentsByTime,
              ).map((timeStr, index) => {
                const appointment = appointmentsByTime[timeStr];
                return {
                  id: index + 1,
                  start_time: timeStr,
                  end_time: timeStr,
                  is_booked: true,
                  patient_name: appointment.patient_name,
                  patient_gender: appointment.patient_gender,
                  appointment_id: appointment.appointment_id,
                };
              });

              availability[doctor.id] = {
                doctor_id: doctor.id,
                doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                doctor_specialization: doctor.specialization,
                date: dateStr,
                is_available: true,
                time_slots: appointmentTimeSlots,
              };

              // Add appointment time slots to the set
              appointmentTimeSlots.forEach((slot) => {
                timeSlotSet.add(slot.start_time);
              });

              console.log(
                `Created ${appointmentTimeSlots.length} time slots from appointments for doctor ${doctor.id}`,
              );
            } else {
              // No availability data and no appointments - show as not available
              availability[doctor.id] = {
                doctor_id: doctor.id,
                doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                doctor_specialization: doctor.specialization,
                date: dateStr,
                is_available: false,
                time_slots: [],
              };
            }
          }
        } catch (error: any) {
          console.error(
            `Error fetching availability for doctor ${doctor.id}:`,
            error,
          );
          availability[doctor.id] = {
            doctor_id: doctor.id,
            doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
            doctor_specialization: doctor.specialization,
            date: dateStr,
            is_available: false,
            time_slots: [],
          };
        }
      }

      // Sort time slots chronologically
      const sortedTimeSlots = Array.from(timeSlotSet).sort();
      console.log(`Final sorted time slots for all doctors:`, sortedTimeSlots);
      console.log(`Total unique time slots found:`, sortedTimeSlots.length);
      setAllTimeSlots(sortedTimeSlots);

      setDayData({
        date,
        dateStr,
        availability,
      });

      // Log final availability summary
      console.log(`Final availability summary for ${dateStr}:`);
      Object.values(availability).forEach((doctorAvail) => {
        console.log(
          `- ${doctorAvail.doctor_name}: ${doctorAvail.time_slots.length} time slots, is_available: ${doctorAvail.is_available}`,
        );
      });
    } catch (error) {
      console.error("Error fetching day availability:", error);
      toast({
        title: "Error",
        description: "Failed to fetch availability data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Initialize component
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Fetch data when date or doctors change
  useEffect(() => {
    if (doctors.length > 0) {
      fetchDayAvailability(selectedDate);
    }
  }, [selectedDate, doctors]);

  if (currentUser?.role !== "receptionist" && currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only receptionists and admins can access the scheduling view.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto mt-4 md:mt-8 space-y-4 md:space-y-6 px-2 md:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Doctors' Schedule</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View available dates and times for all doctors
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2 justify-between sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousDay}
                  className="h-8 px-2 md:px-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous Day</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextDay}
                  className="h-8 px-2 md:px-4"
                >
                  <span className="hidden sm:inline">Next Day</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold text-sm md:text-base">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="h-8 w-full sm:w-auto"
            >
              Today
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-2 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">
                  Loading schedule...
                </p>
              </div>
            </div>
          ) : dayData && doctors.length > 0 ? (
            <div className="overflow-x-auto -mx-2 md:mx-0">
              {/* Schedule Grid */}
              <div className="min-w-max">
                {/* Header Row - Doctors */}
                <div
                  className="grid gap-1 mb-1"
                  style={{
                    gridTemplateColumns: `100px repeat(${doctors.length}, minmax(180px, 1fr))`,
                  }}
                >
                  {/* Time column header */}
                  <div className="bg-gray-100 border border-gray-300 p-2 font-semibold text-center text-sm">
                    Time
                  </div>

                  {/* Doctor columns */}
                  {doctors.map((doctor) => (
                    <div
                      key={doctor.id}
                      className="bg-blue-50 border border-blue-200 p-2"
                    >
                      <div className="font-semibold text-center text-sm">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </div>
                      {doctor.specialization && (
                        <div className="text-xs text-center text-muted-foreground truncate">
                          {doctor.specialization}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Time Slots Rows - Grouped by Hour */}
                {allTimeSlots.length > 0
                  ? (() => {
                      const groupedSlots = groupSlotsByHour();
                      const hourLabels = Object.keys(groupedSlots);

                      return hourLabels.map((hourLabel) => {
                        const slotsInHour = groupedSlots[hourLabel];

                        return (
                          <div
                            key={hourLabel}
                            className="grid gap-1 mb-1"
                            style={{
                              gridTemplateColumns: `100px repeat(${doctors.length}, minmax(180px, 1fr))`,
                            }}
                          >
                            {/* Hour label - spans the height of all slots in this hour */}
                            <div className="bg-gray-50 border border-gray-300 p-2 font-medium text-center flex items-center justify-center text-sm">
                              {hourLabel}
                            </div>

                            {/* Doctor columns with sub-slots */}
                            {doctors.map((doctor) => {
                              const doctorAvailability =
                                dayData.availability[doctor.id];

                              return (
                                <div
                                  key={`${doctor.id}-${hourLabel}`}
                                  className="border border-gray-300 p-1 min-h-[80px]"
                                >
                                  <div className="flex flex-col gap-1">
                                    {slotsInHour.map((timeSlot) => {
                                      const slot =
                                        doctorAvailability?.time_slots?.find(
                                          (s) => s.start_time === timeSlot,
                                        );

                                      return (
                                        <div
                                          key={`${doctor.id}-${timeSlot}`}
                                          className="min-h-[35px] flex items-center justify-center"
                                        >
                                          {slot ? (
                                            slot.is_booked ? (
                                              // Booked - show patient name with status-based color
                                              <div
                                                className={cn(
                                                  "w-full h-full flex items-center justify-center rounded px-1 py-1 border text-xs",
                                                  getAppointmentColor(
                                                    slot.status,
                                                  ),
                                                )}
                                              >
                                                <div className="text-center truncate">
                                                  <div className="font-medium">
                                                    {slot.patient_name ||
                                                      "Patient"}
                                                  </div>
                                                  <div className="text-[10px] opacity-75">
                                                    {formatTime(
                                                      slot.start_time,
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              // Available - show time
                                              <div className="text-center text-xs text-muted-foreground">
                                                <div className="text-[11px]">
                                                  {formatTime(slot.start_time)}
                                                </div>
                                              </div>
                                            )
                                          ) : (
                                            // No slot / Not available
                                            <div className="text-center text-xs text-gray-300">
                                              -
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()
                  : // Check if there are any appointments across all doctors
                    (() => {
                      const hasAnyAppointments = Object.values(
                        dayData.availability,
                      ).some(
                        (doctorAvail) =>
                          doctorAvail.time_slots.length > 0 &&
                          doctorAvail.time_slots.some((slot) => slot.is_booked),
                      );

                      if (hasAnyAppointments) {
                        // Don't show any message - there are appointments but no regular schedule
                        return null;
                      } else {
                        // No appointments and no schedule - show message
                        return (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>No schedules or appointments for this date</p>
                            <p className="text-sm mt-2">
                              Doctors need to set up their schedules
                            </p>
                          </div>
                        );
                      }
                    })()}
              </div>

              {/* Legend */}
              <div className="border-t pt-4 mt-4 px-2 md:px-0">
                <h3 className="text-sm font-medium mb-2">Legend</h3>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-200 rounded flex-shrink-0"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded flex-shrink-0"></div>
                    <span>Cancelled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded flex-shrink-0"></div>
                    <span>No Show</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded flex-shrink-0"></div>
                    <span>Not Available</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No doctors available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceptionistScheduler;
