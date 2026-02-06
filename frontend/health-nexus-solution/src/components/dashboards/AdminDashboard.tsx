import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import { useSecurity } from "@/hooks/useSecurity";
import { axiosInstance } from "@/services/api";
import {
  getPatientNameFromAppointment,
  isPatientSoftDeletedById,
} from "@/utils/patientNameUtils";
import {
  AlertTriangle,
  Calendar,
  FileCheck,
  FileText,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AdminDashboard = () => {
  const { users, labResults } = useClinic();
  const { securityData, loading: securityLoading } = useSecurity();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [localPatients, setLocalPatients] = useState([]);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [patientDetails, setPatientDetails] = useState({});
  const [staff, setStaff] = useState([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const [nearExpirationCount, setNearExpirationCount] = useState(0);
  const [medCertRequestCount, setMedCertRequestCount] = useState(0);
  const [prescriptionRequestCount, setPrescriptionRequestCount] = useState(0);

  // Helper function to get patient name from appointment data
  const getPatientName = (patientId, appointment) => {
    return getPatientNameFromAppointment(patientId, appointment);
  };

  // Fetch inventory count
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await axiosInstance.get("inventory/medicines/");
        if (response.data.success) {
          setInventoryCount(
            Array.isArray(response.data.data) ? response.data.data.length : 0,
          );
          console.log("Inventory fetched:", response.data.data.length);
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
          console.log("Low stock items:", response.data.count);
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
          console.log("Expired items:", response.data.stats.expired_count);
          console.log(
            "Near expiration items:",
            response.data.stats.near_expiration_count,
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
        console.log("[Admin] Medical Cert Requests - All data:", response.data);
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
          "[Admin] Medical Cert Requests - Pending/On Process (Active Patients):",
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
        console.log("[Admin] Prescription Requests - All data:", response.data);
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
          "[Admin] Prescription Requests - Pending/On Process (Active Patients):",
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

  // Fetch staff from backend
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await axiosInstance.get("staff/list/");
        // Filter out patients to get only staff (though endpoint should only return staff)
        const staffMembers = response.data.filter(
          (user) => user.role !== "patient",
        );
        setStaff(staffMembers);
        console.log("Staff fetched:", staffMembers);
      } catch (error) {
        console.error("Error fetching staff:", error);
        setStaff([]);
      }
    };
    fetchStaff();
  }, []);

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

  // Count staff by role (excluding patients) - use staff state instead of users
  const staffCounts = {
    doctors: staff.filter((user) => user.role === "doctor").length,
    receptionists: staff.filter((user) => user.role === "receptionist").length,
    admins: staff.filter((user) => user.role === "admin").length,
    total: staff.length,
  };

  // Get today's date in YYYY-MM-DD format using Philippine timezone
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  // Calculate recent appointments (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate >= thirtyDaysAgo;
  }).length;

  // Calculate today's appointments
  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === today,
  ).length;

  // Calculate pending confirmations (only appointments with 'pending' status)
  const pendingConfirmations = appointments.filter(
    (appointment) => appointment.status === "pending",
  ).length;

  // Calculate new patients this week
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const newPatientsThisWeek = localPatients.filter((patient) => {
    const dateField =
      patient.created_at ||
      patient.date_registered ||
      patient.dateRegistered ||
      patient.created ||
      patient.registration_date;

    if (!dateField) return false;

    try {
      const patientDate = new Date(dateField);
      return patientDate >= sevenDaysAgo;
    } catch (e) {
      return false;
    }
  }).length;

  // Calculate lab results metrics
  const totalLabResults = labResults.length;
  const recentLabResults = labResults.filter((result) => {
    const resultDate = new Date(result.date);
    return resultDate >= thirtyDaysAgo;
  }).length;

  // Calculate patient registrations by month from actual data
  const patientRegistrationsData = (() => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Debug: Log patient data
    console.log("Total patients:", localPatients.length);
    console.log("Sample patient:", localPatients[0]);

    // Get last 6 months
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;

      // Count patients registered in this month
      const count = localPatients.filter((patient) => {
        // Try multiple date field names
        const dateField =
          patient.created_at ||
          patient.date_registered ||
          patient.dateRegistered ||
          patient.created ||
          patient.registration_date;

        if (!dateField) {
          console.log("Patient without date:", patient.id || patient);
          return false;
        }

        try {
          const patientDate = new Date(dateField);
          const matches =
            patientDate.getMonth() === monthIndex &&
            patientDate.getFullYear() === year;

          if (matches) {
            console.log(
              `Patient registered in ${monthNames[monthIndex]} ${year}:`,
              patient.id,
              dateField,
            );
          }

          return matches;
        } catch (e) {
          console.error("Error parsing date:", dateField, e);
          return false;
        }
      }).length;

      console.log(`${monthNames[monthIndex]} ${year}: ${count} patients`);

      monthsData.push({
        month: monthNames[monthIndex],
        count: count,
        fullDate: `${monthNames[monthIndex]} ${year}`,
      });
    }

    return monthsData;
  })();

  // Handler for when an appointment is clicked in the calendar
  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  // Handler for when a date is clicked in the calendar
  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  // Get completed appointments with patient details
  const completedAppointments = appointments
    .filter((apt) => apt.status === "completed")
    .slice(0, 5)
    .map((apt) => {
      // Find patient in localPatients array
      const patient = localPatients.find(
        (p) => String(p.id) === String(apt.patient),
      );

      return {
        id: apt.id,
        patientName: getPatientName(apt.patient, apt),
        age:
          patient?.age || patient?.date_of_birth
            ? patient?.age ||
              new Date().getFullYear() -
                new Date(patient.date_of_birth).getFullYear()
            : "N/A",
        appointmentType: apt.appointment_type || "General Checkup",
        doctorName: apt.display_doctor_name || apt.doctorName || "Dr. Unknown",
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Medical Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, Dr. Admin! Here's your clinic overview.
        </p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/patients")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{patientsCount}</div>
            <p className="text-xs text-green-600 mt-0.5">
              {newPatientsThisWeek > 0
                ? `+${newPatientsThisWeek} new this week`
                : "No new patients this week"}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/appointments")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{todayAppointments}</div>
            <p className="text-xs text-blue-600 mt-0.5">
              {pendingConfirmations > 0
                ? `${pendingConfirmations} pending confirmation${pendingConfirmations !== 1 ? "s" : ""}`
                : "No pending confirmations"}
            </p>
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
          onClick={() => navigate("/staff")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Available Doctors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{staffCounts.doctors}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              All on duty today
            </p>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Patient Visits Line Chart */}
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Patient Visits Overview</CardTitle>
            <CardDescription className="mt-1">
              Monthly patient registration trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={patientRegistrationsData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      padding: "8px 12px",
                    }}
                    labelStyle={{
                      color: "#1f2937",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Completed Appointments Table */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl">Recent Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Patient Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Age
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Appointment Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Doctor
                  </th>
                </tr>
              </thead>
              <tbody>
                {completedAppointments.length > 0 ? (
                  completedAppointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">{apt.patientName}</td>
                      <td className="py-3 px-4 text-sm">{apt.age}</td>
                      <td className="py-3 px-4 text-sm text-blue-600">
                        {apt.appointmentType}
                      </td>
                      <td className="py-3 px-4 text-sm text-blue-600">
                        {apt.doctorName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No completed appointments yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
