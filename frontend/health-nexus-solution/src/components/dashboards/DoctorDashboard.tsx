import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useClinic } from '@/contexts/ClinicContext';
import { Calendar, Clock, Users, Bell, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const { patients } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [patientDetails, setPatientDetails] = useState({});
  const navigate = useNavigate();

  // Fetch appointments from backend
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axios.get('appointments/list/');
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
        const response = await axios.get('patients/');
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
      const response = await axios.get(`patients/${id}/`);
      setPatientDetails(prev => ({ ...prev, [id]: response.data }));
    } catch (error) {
      setPatientDetails(prev => ({ ...prev, [id]: { name: 'Unknown Patient' } }));
    }
  };
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Filter today's appointments
  const todaysAppointments = appointments
    .filter(appointment => appointment.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  
  // Filter patients with upcoming follow-up appointments
  const upcomingFollowUps = appointments
    .filter(appointment => 
      appointment.status === 'scheduled' && 
      (appointment.appointment_type?.toLowerCase().includes('follow') || appointment.type?.toLowerCase().includes('follow')) &&
      new Date(appointment.date) > new Date()
    )
    .slice(0, 3);
  
  // Filter general upcoming appointments (future dates)
  const upcomingAppointments = appointments
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
  
  // Count pending lab results
  const pendingLabResults = 2; // Mock number for prototype

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
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Pending Results</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLabResults}</div>
            <p className="text-xs text-muted-foreground">Requires your review</p>
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
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
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
        
        <Card className="col-span-1">
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

