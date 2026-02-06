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
import {
  getPatientNameFromAppointment,
  isPatientSoftDeletedById,
} from "@/utils/patientNameUtils";
import {
  Bell,
  Calendar as CalendarIcon,
  Users,
  FileText,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DoctorDashboard = () => {
  const { patients, currentUser } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [patientDetails, setPatientDetails] = useState({});
  const [localPatients, setLocalPatients] = useState([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [nearExpirationCount, setNearExpirationCount] = useState(0);
  const [medCertRequestCount, setMedCertRequestCount] = useState(0);
  const [prescriptionRequestCount, setPrescriptionRequestCount] = useState(0);
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

  // Fetch inventory count
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await axiosInstance.get("inventory/medicines/");
        if (response.data.success) {
          setInventoryCount(
            Array.isArray(response.data.data) ? response.data.data.length : 0,
          );
        } else {
          setInventoryCount(0);
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
        setInventoryCount(0);
      }
    };
    fetchInventory();
  }, []);

  // Fetch low stock items
  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const response = await axiosInstance.get("inventory/low-stock/");
        if (response.data) {
          setLowStockCount(response.data.count || 0);
        } else {
          setLowStockCount(0);
        }
      } catch (error) {
        console.error("Error fetching low stock items:", error);
        setLowStockCount(0);
      }
    };
    fetchLowStock();
  }, []);

  // Fetch expired and near expiration items
  useEffect(() => {
    const fetchMedicineStats = async () => {
      try {
        const response = await axiosInstance.get("inventory/medicines/stats/");
        if (response.data && response.data.success) {
          setExpiredCount(response.data.stats.expired_count || 0);
          setNearExpirationCount(
            response.data.stats.near_expiration_count || 0,
          );
        } else {
          setExpiredCount(0);
          setNearExpirationCount(0);
        }
      } catch (error) {
        console.error("Error fetching medicine stats:", error);
        setExpiredCount(0);
        setNearExpirationCount(0);
      }
    };
    fetchMedicineStats();
  }, []);

  // Fetch medical certificate requests count
  useEffect(() => {
    const fetchMedCertRequests = async () => {
      try {
        const response = await axiosInstance.get("/medical-certificates/");
        console.log("Medical Cert Requests - All data:", response.data);
        const pendingRequests = response.data.filter((req: any) => {
          const isPending =
            req.status === "pending" || req.status === "on_process";

          // Check if patient is archived by matching name and DOB
          const patient = localPatients.find((p) => {
            const patientName = (p.name || "").toLowerCase().trim();
            const requestName = (req.patient_name || "").toLowerCase().trim();
            const patientDOB = p.date_of_birth;
            const requestDOB = req.date_of_birth;
            return patientName === requestName && patientDOB === requestDOB;
          });

          // If patient not found or is_deleted is true, exclude the request
          const isPatientActive = patient && !patient.is_deleted;

          return isPending && isPatientActive;
        });
        console.log(
          "Medical Cert Requests - Pending/On Process (Active Patients):",
          pendingRequests,
        );
        setMedCertRequestCount(pendingRequests.length);
      } catch (error) {
        console.error("Error fetching medical cert requests:", error);
        setMedCertRequestCount(0);
      }
    };
    fetchMedCertRequests();
  }, [localPatients]);

  // Fetch prescription requests count
  useEffect(() => {
    const fetchPrescriptionRequests = async () => {
      try {
        const response = await axiosInstance.get(
          "/medical-documents/prescription-requests/",
        );
        console.log("Prescription Requests - All data:", response.data);
        const pendingRequests = response.data.filter((req: any) => {
          const isPending =
            req.status === "pending" || req.status === "on_process";

          // Check if patient is archived by matching name and DOB
          const patient = localPatients.find((p) => {
            const patientName = (p.name || "").toLowerCase().trim();
            const requestName = (req.patient_name || "").toLowerCase().trim();
            const patientDOB = p.date_of_birth;
            const requestDOB = req.date_of_birth;
            return patientName === requestName && patientDOB === requestDOB;
          });

          // If patient not found or is_deleted is true, exclude the request
          const isPatientActive = patient && !patient.is_deleted;

          return isPending && isPatientActive;
        });
        console.log(
          "Prescription Requests - Pending/On Process (Active Patients):",
          pendingRequests,
        );
        setPrescriptionRequestCount(pendingRequests.length);
      } catch (error) {
        console.error("Error fetching prescription requests:", error);
        setPrescriptionRequestCount(0);
      }
    };
    fetchPrescriptionRequests();
  }, [localPatients]);

  // Fetch patients count from backend
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axiosInstance.get("patients/");
        setPatientsCount(
          Array.isArray(response.data) ? response.data.length : 0,
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
        appointment.status !== "no-show",
    )
    .filter(
      (appointment, index, self) =>
        index === self.findIndex((a) => a.id === appointment.id),
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  // Filter patients with upcoming follow-up appointments
  const upcomingFollowUps = appointmentsForDoctor
    .filter(
      (appointment) =>
        appointment.status === "scheduled" &&
        (appointment.appointment_type?.toLowerCase().includes("follow") ||
          appointment.type?.toLowerCase().includes("follow")) &&
        new Date(appointment.date) > new Date(),
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

      {/* Stats Cards at Top (Horizontal Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/patients")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium">
              Registered Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{totalPatients}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total in system
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/appointments")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium">
              Today's Appointments
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{totalTodaysAppointments}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {
                todaysAppointments.filter((a) => a.status === "scheduled")
                  .length
              }{" "}
              scheduled
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/appointments")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium">
              Upcoming Appointments
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">
              {upcomingAppointments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Next 7 days</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/inventory")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Inventory Items
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{inventoryCount}</div>
            <div className="flex items-center gap-1 mt-0.5">
              {(lowStockCount > 0 ||
                expiredCount > 0 ||
                nearExpirationCount > 0) && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              )}
              <p
                className={`text-xs ${lowStockCount > 0 || expiredCount > 0 || nearExpirationCount > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}`}
              >
                {lowStockCount > 0 ||
                expiredCount > 0 ||
                nearExpirationCount > 0 ? (
                  <>
                    {expiredCount > 0 && `${expiredCount} expired`}
                    {expiredCount > 0 &&
                      (lowStockCount > 0 || nearExpirationCount > 0) &&
                      ", "}
                    {nearExpirationCount > 0 &&
                      `${nearExpirationCount} near expiry`}
                    {nearExpirationCount > 0 && lowStockCount > 0 && ", "}
                    {lowStockCount > 0 && `${lowStockCount} low stock`}
                  </>
                ) : (
                  "All items sufficiently stocked"
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/medical-certificates")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Medical Cert Requests
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{medCertRequestCount}</div>
            <p
              className={`text-xs mt-0.5 ${
                medCertRequestCount > 0
                  ? "text-orange-600 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {medCertRequestCount > 0
                ? `${medCertRequestCount} pending approval`
                : "No pending requests"}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/prescription-requests")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Prescription Refills
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{prescriptionRequestCount}</div>
            <p
              className={`text-xs mt-0.5 ${
                prescriptionRequestCount > 0
                  ? "text-orange-600 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {prescriptionRequestCount > 0
                ? `${prescriptionRequestCount} pending approval`
                : "No pending requests"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Below */}
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
                console.log("Including scheduled appointment:", appointment.id);
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
                status,
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
                      selectedAppointment,
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
                      { year: "numeric", month: "long", day: "numeric" },
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
                      (p) => String(p.id) === String(patientId),
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
