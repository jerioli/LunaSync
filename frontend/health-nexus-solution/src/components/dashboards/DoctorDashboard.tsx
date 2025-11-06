
import AppointmentCalendar from '@/components/ui/AppointmentCalendar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClinic } from '@/contexts/ClinicContext';
import { axiosInstance } from '@/services/api';
import { getPatientNameFromAppointment } from '@/utils/patientNameUtils';
import { Bell, CalendarDays, Calendar as CalendarIcon, Clock, FileText, List, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const { patients, currentUser } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [patientDetails, setPatientDetails] = useState({});
  const [localPatients, setLocalPatients] = useState([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const navigate = useNavigate();

  // Helper function to format time
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
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
        const response = await axiosInstance.get('appointments/list/');
        setAppointments(response.data);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };
    fetchAppointments();
  }, []);
  // Fetch patients count from backend
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axiosInstance.get('patients/');
        setPatientsCount(Array.isArray(response.data) ? response.data.length : 0);
        setLocalPatients(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setPatientsCount(0);
        setLocalPatients([]);
        console.error('Error fetching patients:', error);
      }
    };
    fetchPatients();
  }, []);

  // Helper to fetch patient details by ID if not found in local patients
  const fetchPatientById = async (id) => {
    if (!id || patientDetails[id]) return;
    try {
      const response = await axiosInstance.get(`patients/${id}/`);
      setPatientDetails(prev => ({ ...prev, [id]: response.data }));
    } catch (error) {
      setPatientDetails(prev => ({ ...prev, [id]: { name: 'Unknown Patient' } }));
    }
  };
  
  // Get today's date in YYYY-MM-DD format using Philippine timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  
  // Determine current doctor's ID (supports different field names)
  const doctorId = currentUser?.id;

  // Scope appointments based on user role
  const appointmentsForDoctor = appointments.filter(appt => {
    const apptDoctorId = appt.doctorId || appt.doctor;
    
    // Debug: Log all appointments for this doctor
    console.log('Doctor appointments check:', {
      appointmentId: appt.id,
      status: appt.status,
      date: appt.date,
      doctorId: apptDoctorId,
      currentDoctorId: doctorId,
      userRole: currentUser?.role
    });
    
    // If user is a receptionist or admin, show all appointments
    if (currentUser?.role === 'receptionist' || currentUser?.role === 'admin') {
      return true;
    }
    
    // If no doctor ID available, show all appointments
    if (!doctorId) return true;
    
    // For doctors, only show their own appointments
    return String(apptDoctorId) === String(doctorId);
  });

  // Filter today's appointments for the doctor (exclude completed and cancelled, remove duplicates)
  const todaysAppointments = appointmentsForDoctor
    .filter(appointment => 
      appointment.date === today && 
      appointment.status !== 'completed' && 
      appointment.status !== 'cancelled'
    )
    .filter((appointment, index, self) => 
      index === self.findIndex((a) => a.id === appointment.id)
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  
  // Filter patients with upcoming follow-up appointments
  const upcomingFollowUps = appointmentsForDoctor
    .filter(appointment => 
      appointment.status === 'scheduled' && 
      (appointment.appointment_type?.toLowerCase().includes('follow') || appointment.type?.toLowerCase().includes('follow')) &&
      new Date(appointment.date) > new Date()
    )
    .slice(0, 3);
  
  // Filter general upcoming appointments (future dates)
  const upcomingAppointments = appointmentsForDoctor
    .filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const currentDate = new Date();
      return appointment.status === 'scheduled' && appointmentDate > currentDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Show next 5 upcoming appointments
  
  // Count total patients
  const totalPatients = patientsCount;
  
  // Count today's appointments
  const totalTodaysAppointments = todaysAppointments.length;

  useEffect(() => {
    // For each appointment today, ensure we have the patient name
    todaysAppointments.forEach(appt => {
      const patientId = appt.patientId || appt.patient;
      if (patientId && !patients.find(p => String(p.id) === String(patientId)) && !patientDetails[patientId]) {
        fetchPatientById(patientId);
      }
    });
    
    // For each upcoming appointment, ensure we have the patient name
    upcomingAppointments.forEach(appt => {
      const patientId = appt.patientId || appt.patient;
      if (patientId && !patients.find(p => String(p.id) === String(patientId)) && !patientDetails[patientId]) {
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
    console.log('Date clicked:', date);
    setSelectedDate(date);
    // You can add functionality here, like filtering appointments by date or creating a new appointment
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's an overview of today's schedule.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            <p className="text-xs text-muted-foreground">+2 new this week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTodaysAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {todaysAppointments.filter(a => a.status === 'scheduled').length} awaiting consultation
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingFollowUps.length}</div>
            <p className="text-xs text-muted-foreground">Upcoming this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Document Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting your approval</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Schedule Management</CardTitle>
            <CardDescription>View and manage your appointments</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendar View
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-6 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Today's Appointments</CardTitle>
                      <CardDescription>Your scheduled consultations for today</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {todaysAppointments.length > 0 ? (
                          todaysAppointments.map((appointment) => {
                            const patientId = appointment.patientId || appointment.patient;
                            let patient = patients.find(p => String(p.id) === String(patientId));
                            if (!patient && patientDetails[patientId]) {
                              patient = patientDetails[patientId];
                            }
                            const consultationType = appointment.appointment_type || appointment.type || 'Consultation';
                            const patientName = getPatientName(patientId, appointment);
                            return (
                              <div key={appointment.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarFallback>{patientName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{patientName}</div>
                                    <div className="text-sm text-muted-foreground">{consultationType}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span className="text-sm">{formatTime(appointment.time)}</span>
                                    </div>
                                    <Badge 
                                      variant={appointment.status === 'scheduled' ? 'outline' : 'secondary'}
                                      className="mt-1"
                                    >
                                      {appointment.status === 'scheduled' ? 'Awaiting consultation' : 'Completed'}
                                    </Badge>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${patient?.patient_id || patient?.id}`)}>
                                    View Record
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            No appointments scheduled for today
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/50 px-6 py-3">
                      <Button variant="ghost" className="w-full" onClick={() => navigate('/appointments')}>
                        View all appointments
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Appointments</CardTitle>
                      <CardDescription>Your next scheduled appointments</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {upcomingAppointments.length > 0 ? (
                          upcomingAppointments.map((appointment) => {
                            const patientId = appointment.patientId || appointment.patient;
                            let patient = patients.find(p => String(p.id) === String(patientId));
                            if (!patient && patientDetails[patientId]) {
                              patient = patientDetails[patientId];
                            }
                            const consultationType = appointment.type || appointment.appointment_type || 'Consultation';
                            const patientName = getPatientName(patientId, appointment);
                            return (
                              <div key={appointment.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarFallback>{patientName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">{patientName}</div>
                                    <div className="text-sm text-muted-foreground">{consultationType}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="font-medium">{new Date(appointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    <div className="text-sm text-muted-foreground">{formatTime(appointment.time)}</div>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${patient?.patient_id || patient?.id}`)}>
                                    View Patient
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            No upcoming appointments
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/50 px-6 py-3">
                      <Button variant="ghost" className="w-full" onClick={() => navigate('/appointments')}>
                        View all appointments
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="calendar" className="space-y-6">
                <AppointmentCalendar
                  appointments={appointmentsForDoctor.filter(appointment => {
                    // Debug: Log appointment details
                    console.log('Calendar filter - Appointment:', {
                      id: appointment.id,
                      status: appointment.status,
                      date: appointment.date,
                      time: appointment.time,
                      patient: appointment.patient || appointment.patientId
                    });
                    
                    // Explicitly include scheduled appointments
                    const status = appointment.status?.toLowerCase() || '';
                    
                    // Always include scheduled appointments
                    if (status === 'scheduled') {
                      console.log('Including scheduled appointment:', appointment.id);
                      return true;
                    }
                    
                    // Exclude completed, cancelled, and pending
                    const excludedStatuses = ['completed', 'cancelled', 'pending'];
                    const shouldInclude = !excludedStatuses.includes(status);
                    
                    console.log('Should include appointment:', shouldInclude, 'Status:', appointment.status, 'Lowercase status:', status);
                    return shouldInclude;
                  })}
                  onAppointmentClick={handleAppointmentClick}
                  onDateClick={handleDateClick}
                  patientDetails={patientDetails}
                  patients={patients}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Patient Name</label>
                  <p className="text-sm">{getPatientName(selectedAppointment.patientId || selectedAppointment.patient, selectedAppointment)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Appointment Type</label>
                  <p className="text-sm">{selectedAppointment.appointment_type || selectedAppointment.type || 'Consultation'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Date</label>
                  <p className="text-sm">{new Date(selectedAppointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Time</label>
                  <p className="text-sm">{formatTime(selectedAppointment.time)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <Badge variant={selectedAppointment.status === 'scheduled' ? 'outline' : 'secondary'}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Doctor</label>
                  <p className="text-sm">{selectedAppointment.display_doctor_name || selectedAppointment.doctorName || currentUser?.name || 'N/A'}</p>
                </div>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Notes</label>
                  <p className="text-sm whitespace-pre-wrap">{selectedAppointment.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAppointmentModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  const patientId = selectedAppointment.patientId || selectedAppointment.patient;
                  let patient = patients.find(p => String(p.id) === String(patientId));
                  if (!patient && patientDetails[patientId]) {
                    patient = patientDetails[patientId];
                  }
                  if (patient?.id) {
                    navigate(`/patients/${patient.patient_id || patient.id}`);
                  }
                  setIsAppointmentModalOpen(false);
                }}>
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
