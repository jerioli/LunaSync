
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinic } from '@/contexts/ClinicContext';
import { axiosInstance } from '@/services/api';
import { Bell, Calendar as CalendarIcon, Clock, FileText, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const { patients, currentUser } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [patientDetails, setPatientDetails] = useState({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const navigate = useNavigate();

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
      } catch (error) {
        setPatientsCount(0);
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
  
  // Helper to add days (used for demo legend when no data)
  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
  };

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
  
  // Build lists for calendar modifiers
  const todayDateOnly = new Date();
  todayDateOnly.setHours(0,0,0,0);

  const todayScheduledDates = Array.from(new Set(
    appointmentsForDoctor
      .filter(a => a.status === 'scheduled' && a.date === today)
      .map(a => a.date)
  )).map(d => new Date(`${d}T00:00:00`));

  const upcomingScheduledDates = Array.from(new Set(
    appointmentsForDoctor
      .filter(a => a.status === 'scheduled' && a.date > today)
      .map(a => a.date)
  )).map(d => new Date(`${d}T00:00:00`));

  // If there are no appointments, create mock dates to demonstrate legend
  const useMockLegend = todayScheduledDates.length === 0 && upcomingScheduledDates.length === 0;
  const mockTodayDates = [addDays(new Date(), 0)];
  const mockUpcomingDates = [addDays(new Date(), 2), addDays(new Date(), 5)];

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
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view and plan</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full rounded-md border"
              classNames={{
                months: "w-full",
                month: "w-full",
                table: "w-full",
                head_row: "grid grid-cols-7",
                head_cell: "text-muted-foreground rounded-md font-normal text-[0.8rem] text-center",
                row: "grid grid-cols-7 w-full mt-2",
                cell: "p-0",
                day: "w-full h-10 sm:h-12 md:h-14 flex items-center justify-center aria-selected:opacity-100"
              }}
              modifiers={{
                todayAppointments: useMockLegend ? mockTodayDates : todayScheduledDates,
                upcomingAppointments: useMockLegend ? mockUpcomingDates : upcomingScheduledDates,
              }}
              modifiersClassNames={{
                todayAppointments: "relative bg-primary/20",
                upcomingAppointments: "relative bg-accent/40",
              }}
              disabled={(date) => date < new Date()}
            />
            <div className="flex items-center gap-4 px-6 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-primary/20" />
                <span>Today's scheduled appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-accent/40" />
                <span>Upcoming scheduled appointments</span>
              </div>
              {useMockLegend && (
                <span className="text-muted-foreground">(mock legend example)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 order-2 lg:order-1">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>Manage today's patient consultations</CardDescription>
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
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{patient?.name ? patient.name.charAt(0) : '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient?.name || 'Unknown Patient'}</div>
                          <div className="text-sm text-muted-foreground">{consultationType}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">{appointment.time}</span>
                          </div>
                          <Badge 
                            variant={appointment.status === 'scheduled' ? 'outline' : 'secondary'}
                            className="mt-1"
                          >
                            {appointment.status === 'scheduled' ? 'Awaiting consultation' : 'Completed'}
                          </Badge>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${patient?.id}`)}>
                          View Patient
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
        
        <Card className="col-span-1 order-1 lg:order-2">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Next scheduled appointments</CardDescription>
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
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{patient?.name ? patient.name.charAt(0) : '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient?.name || 'Unknown Patient'}</div>
                          <div className="text-sm text-muted-foreground">{consultationType}</div>
                        </div>
                      </div>                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{new Date(appointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                          <div className="text-sm text-muted-foreground">{appointment.time}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${patient?.id}`)}>
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
    </div>
  );
};

export default DoctorDashboard;
