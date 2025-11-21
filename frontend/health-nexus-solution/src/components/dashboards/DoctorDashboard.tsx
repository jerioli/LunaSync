import AppointmentCalendar from "@/components/ui/AppointmentCalendar";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClinic } from "@/contexts/ClinicContext";
import { axiosInstance } from "@/services/api";
import { getPatientNameFromAppointment } from "@/utils/patientNameUtils";
import { Bell, Calendar as CalendarIcon, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DoctorDashboard = () => {
  const { patients, currentUser } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [patientDetails, setPatientDetails] = useState({});
  const [localPatients, setLocalPatients] = useState([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const navigate = useNavigate();

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

  // Helper function to get patient name from appointment data
  const getPatientName = (patientId, appointment) => {
    return getPatientNameFromAppointment(patientId, appointment);
  };

  // Fetch appointments from backend
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axiosInstance.get("appointments/list/");
        setAppointments(response.data);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };
    fetchAppointments();
  }, []);
  // Fetch patients count from backend
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axiosInstance.get("patients/");
        setPatientsCount(
          Array.isArray(response.data) ? response.data.length : 0
        );
        setLocalPatients(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setPatientsCount(0);
        setLocalPatients([]);
        console.error("Error fetching patients:", error);
      }
    };
    fetchPatients();
  }, []);

  // Helper to fetch patient details by ID if not found in local patients
  const fetchPatientById = async (id) => {
    if (!id || patientDetails[id]) return;
    try {
      const response = await axiosInstance.get(`patients/${id}/`);
      setPatientDetails((prev) => ({ ...prev, [id]: response.data }));
    } catch (error) {
      setPatientDetails((prev) => ({
        ...prev,
        [id]: { name: "Unknown Patient" },
      }));
    }
  };

  // Get today's date in YYYY-MM-DD format using Philippine timezone
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  // Determine current doctor's ID (supports different field names)
  const doctorId = currentUser?.id;

  // Scope appointments based on user role
  const appointmentsForDoctor = appointments.filter((appt) => {
    const apptDoctorId = appt.doctorId || appt.doctor;

    // Debug: Log all appointments for this doctor
    console.log("Doctor appointments check:", {
      appointmentId: appt.id,
      status: appt.status,
      date: appt.date,
      doctorId: apptDoctorId,
      currentDoctorId: doctorId,
      userRole: currentUser?.role,
    });

    // If user is a receptionist or admin, show all appointments
    if (currentUser?.role === "receptionist" || currentUser?.role === "admin") {
      return true;
    }

    // If no doctor ID available, show all appointments
    if (!doctorId) return true;

    // For doctors, only show their own appointments
    return String(apptDoctorId) === String(doctorId);
  });

  // Filter today's appointments for the doctor (exclude completed, cancelled, and no-show, remove duplicates)
  const todaysAppointments = appointmentsForDoctor
    .filter(
      (appointment) =>
        appointment.date === today &&
        appointment.status !== "completed" &&
        appointment.status !== "cancelled" &&
        appointment.status !== "no-show"
    )
    .filter(
      (appointment, index, self) =>
        index === self.findIndex((a) => a.id === appointment.id)
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  // Filter patients with upcoming follow-up appointments
  const upcomingFollowUps = appointmentsForDoctor
    .filter(
      (appointment) =>
        appointment.status === "scheduled" &&
        (appointment.appointment_type?.toLowerCase().includes("follow") ||
          appointment.type?.toLowerCase().includes("follow")) &&
        new Date(appointment.date) > new Date()
    )
    .slice(0, 3);

  // Filter general upcoming appointments (future dates)
  const upcomingAppointments = appointmentsForDoctor
    .filter((appointment) => {
      const appointmentDate = new Date(appointment.date);
      const currentDate = new Date();
      return (
        appointment.status === "scheduled" && appointmentDate > currentDate
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Show next 5 upcoming appointments

  // Count total patients
  const totalPatients = patientsCount;

  // Count today's appointments
  const totalTodaysAppointments = todaysAppointments.length;

  useEffect(() => {
    // For each appointment today, ensure we have the patient name
    todaysAppointments.forEach((appt) => {
      const patientId = appt.patientId || appt.patient;
      if (
        patientId &&
        !patients.find((p) => String(p.id) === String(patientId)) &&
        !patientDetails[patientId]
      ) {
        fetchPatientById(patientId);
      }
    });

    // For each upcoming appointment, ensure we have the patient name
    upcomingAppointments.forEach((appt) => {
      const patientId = appt.patientId || appt.patient;
      if (
        patientId &&
        !patients.find((p) => String(p.id) === String(patientId)) &&
        !patientDetails[patientId]
      ) {
        fetchPatientById(patientId);
      }
    });
    // eslint-disable-next-line
  }, [todaysAppointments, upcomingAppointments]);

  // Handler for when an appointment is clicked in the calendar
  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  // Handler for when a date is clicked in the calendar
  const handleDateClick = (date) => {
    console.log("Date clicked:", date);
    setSelectedDate(date);
    // You can add functionality here, like filtering appointments by date or creating a new appointment
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here's an overview of today's schedule.
        </p>
      </div>

      {/* Main Layout: Stats on Left, Calendar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side - Stats Cards (Vertical Layout) */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Registered Patients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPatients}</div>
              <p className="text-xs text-muted-foreground">Total in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Appointments
              </CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalTodaysAppointments}
              </div>
              <p className="text-xs text-muted-foreground">
                {
                  todaysAppointments.filter((a) => a.status === "scheduled")
                    .length
                }{" "}
                scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Appointments
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingAppointments.length}
              </div>
              <p className="text-xs text-muted-foreground">Next 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Calendar</CardTitle>
              <CardDescription>
                View and manage your appointment schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentCalendar
                appointments={appointmentsForDoctor.filter((appointment) => {
                  // Debug: Log appointment details
                  console.log("Calendar filter - Appointment:", {
                    id: appointment.id,
                    status: appointment.status,
                    date: appointment.date,
                    time: appointment.time,
                    patient: appointment.patient || appointment.patientId,
                  });

                  // Explicitly include scheduled appointments
                  const status = appointment.status?.toLowerCase() || "";

                  // Always include scheduled appointments
                  if (status === "scheduled") {
                    console.log(
                      "Including scheduled appointment:",
                      appointment.id
                    );
                    return true;
                  }

                  // Exclude completed, cancelled, no-show, and pending to keep calendar clean
                  const excludedStatuses = [
                    "completed",
                    "cancelled",
                    "no-show",
                    "pending",
                  ];
                  const shouldInclude = !excludedStatuses.includes(status);

                  console.log(
                    "Should include appointment:",
                    shouldInclude,
                    "Status:",
                    appointment.status,
                    "Lowercase status:",
                    status
                  );
                  return shouldInclude;
                })}
                onAppointmentClick={handleAppointmentClick}
                onDateClick={handleDateClick}
                patientDetails={patientDetails}
                patients={patients}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Details Modal */}
      <Dialog
        open={isAppointmentModalOpen}
        onOpenChange={setIsAppointmentModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Patient Name
                  </label>
                  <p className="text-sm">
                    {getPatientName(
                      selectedAppointment.patientId ||
                        selectedAppointment.patient,
                      selectedAppointment
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Appointment Type
                  </label>
                  <p className="text-sm">
                    {selectedAppointment.appointment_type ||
                      selectedAppointment.type ||
                      "Consultation"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Date
                  </label>
                  <p className="text-sm">
                    {new Date(selectedAppointment.date).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Time
                  </label>
                  <p className="text-sm">
                    {formatTime(selectedAppointment.time)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Status
                  </label>
                  <Badge
                    variant={
                      selectedAppointment.status === "scheduled"
                        ? "outline"
                        : "secondary"
                    }
                  >
                    {selectedAppointment.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Doctor
                  </label>
                  <p className="text-sm">
                    {selectedAppointment.display_doctor_name ||
                      selectedAppointment.doctorName ||
                      currentUser?.name ||
                      "N/A"}
                  </p>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Notes
                  </label>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAppointmentModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const patientId =
                      selectedAppointment.patientId ||
                      selectedAppointment.patient;
                    let patient = patients.find(
                      (p) => String(p.id) === String(patientId)
                    );
                    if (!patient && patientDetails[patientId]) {
                      patient = patientDetails[patientId];
                    }
                    if (patient?.id) {
                      navigate(`/patients/${patient.patient_id || patient.id}`);
                    }
                    setIsAppointmentModalOpen(false);
                  }}
                >
                  View Patient Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorDashboard;
