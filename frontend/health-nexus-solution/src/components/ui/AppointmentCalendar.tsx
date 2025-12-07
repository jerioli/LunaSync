import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Appointment {
  id: string;
  patient: string;
  date: string;
  time: string;
  status: string;
  appointment_type?: string;
  patient_name?: string;
  display_patient_name?: string;
  doctorName?: string;
  display_doctor_name?: string;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateClick?: (date: Date) => void;
  patientDetails?: Record<string, any>;
  patients?: any[];
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  onAppointmentClick,
  onDateClick,
  patientDetails = {},
  patients = [],
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<
    Appointment[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get the first day of the current month
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Get the first day of the week for the calendar grid
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Get the last day of the week for the calendar grid
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  // Generate all days to display
  const days = [];
  const currentDay = new Date(startDate);
  while (currentDay <= endDate) {
    days.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return appointments.filter((apt) => apt.date === dateStr);
  };

  // Get status color based on appointment status
  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-[#FFC107] hover:bg-[#FFB300] text-gray-800", // Amber/Yellow
      upcoming: "bg-[#2196F3] hover:bg-[#1976D2] text-white", // Blue
      scheduled: "bg-[#2196F3] hover:bg-[#1976D2] text-white", // Blue (same as upcoming)
      ongoing: "bg-[#4CAF50] hover:bg-[#388E3C] text-white", // Green
      completed: "bg-[#673AB7] hover:bg-[#512DA8] text-white", // Purple/Indigo
      "follow-up": "bg-[#FF9800] hover:bg-[#F57C00] text-white", // Orange
      cancelled: "bg-[#F44336] hover:bg-[#D32F2F] text-white", // Red
      "no-show": "bg-gray-500 hover:bg-gray-600 text-white", // Gray (fallback)
    };
    return colors[status] || "bg-gray-400 hover:bg-gray-500 text-white";
  };

  // Get patient name
  const getPatientName = (appointment: Appointment) => {
    const patientId = appointment.patient;

    // Check for direct patient name in appointment
    if (appointment.patient_name) return appointment.patient_name;
    if (appointment.display_patient_name)
      return appointment.display_patient_name;

    // Check in patients array
    const patient = patients.find((p) => String(p.id) === String(patientId));
    if (patient?.name) return patient.name;

    // Check in patientDetails
    if (patientDetails[patientId]?.name) return patientDetails[patientId].name;

    return "Unknown Patient";
  };

  // Format time to 12-hour format
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  // Handle showing more appointments for a specific day
  const handleShowMoreAppointments = (
    day: Date,
    dayAppointments: Appointment[]
  ) => {
    setSelectedDate(day);
    setSelectedDayAppointments(dayAppointments);
    setShowMoreModal(true);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = day.toDateString() === today.toDateString();

              return (
                <div
                  key={index}
                  className={`min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isCurrentMonth
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-gray-100"
                  } ${isToday ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
                  onClick={() => onDateClick?.(day)}
                >
                  <div
                    className={`text-sm font-semibold mb-1 ${
                      isCurrentMonth ? "text-gray-900" : "text-gray-400"
                    } ${isToday ? "text-blue-600" : ""}`}
                  >
                    {day.getDate()}
                  </div>

                  {/* Appointments for this day - only show time */}
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 4).map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`text-xs px-1 py-1 rounded text-white cursor-pointer transition-all duration-200 hover:opacity-80 ${getStatusColor(
                          appointment.status
                        )}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick?.(appointment);
                        }}
                      >
                        <span className="font-medium text-center block">
                          {formatTime(appointment.time)}
                        </span>
                      </div>
                    ))}

                    {/* Show "more" indicator if there are additional appointments */}
                    {dayAppointments.length > 4 && (
                      <div
                        className="text-[10px] text-gray-600 text-center py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors duration-200 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowMoreAppointments(day, dayAppointments);
                        }}
                      >
                        +{dayAppointments.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: "#FFC107" }}
              ></div>
              <span className="text-xs text-gray-600">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: "#2196F3" }}
              ></div>
              <span className="text-xs text-gray-600">Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: "#4CAF50" }}
              ></div>
              <span className="text-xs text-gray-600">Ongoing</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: "#10B981" }}
              ></div>
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: "#EF4444" }}
              ></div>
              <span className="text-xs text-gray-600">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: "#F97316" }}
              ></div>
              <span className="text-xs text-gray-600">No Show</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* More Appointments Modal */}
      <Dialog open={showMoreModal} onOpenChange={setShowMoreModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              All Appointments -{" "}
              {selectedDate?.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                onClick={() => {
                  setShowMoreModal(false);
                  onAppointmentClick?.(appointment);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">
                    {formatTime(appointment.time)}
                  </span>
                  <Badge
                    variant={
                      appointment.status === "scheduled"
                        ? "outline"
                        : "secondary"
                    }
                    className={`text-xs ${getStatusColor(
                      appointment.status
                    )} text-white border-none`}
                  >
                    {appointment.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{getPatientName(appointment)}</p>
                  {appointment.appointment_type && (
                    <p className="text-xs text-gray-500">
                      {appointment.appointment_type}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppointmentCalendar;
