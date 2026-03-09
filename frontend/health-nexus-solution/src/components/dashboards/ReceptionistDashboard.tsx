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
  Users,
  Calendar,
  CalendarCheck,
  Package,
  AlertTriangle,
  FileCheck,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ReceptionistDashboard = () => {
  const { patients } = useClinic();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [patientDetails, setPatientDetails] = useState({});
  const [localPatients, setLocalPatients] = useState([]);
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
        // Filter out completed, cancelled, and no show appointments
        const filteredAppointments = response.data.filter(
          (appointment) =>
            appointment.status !== "completed" &&
            appointment.status !== "cancelled" &&
            appointment.status !== "no show",
        );
        setAppointments(filteredAppointments);
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

  // Fetch inventory metrics
  useEffect(() => {
    const fetchInventoryMetrics = async () => {
      try {
        const response = await axiosInstance.get("/inventory/medicines/");
        if (response.data.success) {
          const medicines = response.data.data;
          setInventoryCount(medicines.length);

          // Count low stock items
          const lowStock = medicines.filter((med) => med.is_low_stock).length;
          setLowStockCount(lowStock);
        }
      } catch (error) {
        console.error("Error fetching inventory metrics:", error);
      }
    };
    fetchInventoryMetrics();
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
        console.log(
          "[Receptionist] Medical Cert Requests - All data:",
          response.data,
        );
        const pendingRequests = response.data.filter((req: any) => {
          return req.status === "pending" || req.status === "on_process";
        });
        console.log(
          "[Receptionist] Medical Cert Requests - Pending/On Process:",
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
        console.log(
          "[Receptionist] Prescription Requests - All data:",
          response.data,
        );
        const pendingRequests = response.data.filter((req: any) => {
          return req.status === "pending" || req.status === "on_process";
        });
        console.log(
          "[Receptionist] Prescription Requests - Pending/On Process:",
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

  // Filter today's appointments (exclude completed and cancelled, remove duplicates)
  const todaysAppointments = appointments
    .filter(
      (appointment) =>
        appointment.date === today &&
        appointment.status !== "completed" &&
        appointment.status !== "cancelled",
    )
    .filter(
      (appointment, index, self) =>
        index === self.findIndex((a) => a.id === appointment.id),
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  // Filter upcoming appointments (future dates)
  const upcomingAppointments = appointments
    .filter((appointment) => {
      const appointmentDate = new Date(appointment.date);
      const currentDate = new Date();
      return (
        appointment.status === "scheduled" && appointmentDate > currentDate
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Show next 5 upcoming appointments

  // Filter pending appointments from chatbot
  const pendingAppointments = appointments
    .filter((appointment) => appointment.status === "pending")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Store pending count in localStorage for TopBar to access
  useEffect(() => {
    localStorage.setItem(
      "pendingAppointmentsCount",
      pendingAppointments.length.toString(),
    );
  }, [pendingAppointments.length]);

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
    // You can add functionality here, like filtering appointments by date or creating a new appointment
  };

  // Handler for checking in a patient
  const handleCheckIn = async (appointmentId) => {
    try {
      const response = await axiosInstance.post(
        `appointments/update-status/${appointmentId}/`,
        { status: "ongoing" },
      );

      // Update the appointments list
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: "ongoing" } : appt,
        ),
      );

      // Update selected appointment if it's the one being checked in
      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment((prev) => ({ ...prev, status: "ongoing" }));
      }

      toast({
        title: "Success",
        description: "🏥 Patient has been checked in successfully",
      });
      setIsAppointmentModalOpen(false);
    } catch (error) {
      console.error("Error checking in patient:", error);
      toast({
        title: "Error",
        description: "Failed to check in patient. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receptionist Dashboard</h1>
        <p className="text-muted-foreground">
          Manage patient appointments, check-ins, and payments.
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
            <div className="text-xl font-bold">{patientsCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total patient count
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{todaysAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {todaysAppointments.length === 0
                ? "No appointments today"
                : `${
                    todaysAppointments.filter((a) => a.status === "scheduled")
                      .length
                  } awaiting check-in`}
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
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
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
            <Package className="h-4 w-4 text-muted-foreground" />
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            View and manage patient appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentCalendar
            appointments={appointments}
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
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
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
                  <div className="mt-1">
                    <Badge
                      variant={
                        selectedAppointment.status === "scheduled"
                          ? "outline"
                          : selectedAppointment.status === "pending"
                            ? "secondary"
                            : selectedAppointment.status === "completed"
                              ? "default"
                              : "destructive"
                      }
                      className={
                        selectedAppointment.status === "scheduled"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : selectedAppointment.status === "pending"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : selectedAppointment.status === "cancelled"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : ""
                      }
                    >
                      {selectedAppointment.status.charAt(0).toUpperCase() +
                        selectedAppointment.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Doctor
                  </label>
                  <p className="text-sm">
                    {selectedAppointment.display_doctor_name ||
                      selectedAppointment.doctorName ||
                      "Not assigned"}
                  </p>
                </div>
              </div>

              {selectedAppointment.reason && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Reason for Visit
                  </label>
                  <p className="text-sm">{selectedAppointment.reason}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                {selectedAppointment.status === "scheduled" && (
                  <Button
                    size="sm"
                    onClick={() => handleCheckIn(selectedAppointment.id)}
                  >
                    Check In Patient
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const patientId =
                      selectedAppointment.patientId ||
                      selectedAppointment.patient;
                    const patient =
                      localPatients.find(
                        (p) => String(p.id) === String(patientId),
                      ) ||
                      patients.find(
                        (p) => String(p.id) === String(patientId),
                      ) ||
                      patientDetails[patientId];
                    if (patient?.id) {
                      navigate(`/patients/${patient.patient_id || patient.id}`);
                      setIsAppointmentModalOpen(false);
                    }
                  }}
                >
                  View Patient Record
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate("/appointments");
                    setIsAppointmentModalOpen(false);
                  }}
                >
                  Manage Appointment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceptionistDashboard;
