import AppointmentCalendar from '@/components/ui/AppointmentCalendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClinic } from '@/contexts/ClinicContext';
import { axiosInstance } from '@/services/api';
import { getPatientNameFromAppointment } from '@/utils/patientNameUtils';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReceptionistDashboard = () => {
  const { patients } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [patientsCount, setPatientsCount] = useState(0);
  const [patientDetails, setPatientDetails] = useState({});
  const [localPatients, setLocalPatients] = useState([]);
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
  
  // Filter today's appointments (exclude completed and cancelled, remove duplicates)
  const todaysAppointments = appointments
    .filter(appointment => 
      appointment.date === today && 
      appointment.status !== 'completed' && 
      appointment.status !== 'cancelled'
    )
    .filter((appointment, index, self) => 
      index === self.findIndex((a) => a.id === appointment.id)
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  
  // Filter upcoming appointments (future dates)
  const upcomingAppointments = appointments
    .filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const currentDate = new Date();
      return appointment.status === 'scheduled' && appointmentDate > currentDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Show next 5 upcoming appointments
  
  // Filter pending appointments from chatbot
  const pendingAppointments = appointments
    .filter(appointment => appointment.status === 'pending')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Store pending count in localStorage for TopBar to access
  useEffect(() => {
    localStorage.setItem('pendingAppointmentsCount', pendingAppointments.length.toString());
  }, [pendingAppointments.length]);
  
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
    // You can add functionality here, like filtering appointments by date or creating a new appointment
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receptionist Dashboard</h1>
        <p className="text-muted-foreground">Manage patient appointments, check-ins, and payments.</p>
      </div>
      
      {/* Main Layout: Stats on Left, Calendar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side - Stats (With Subtle Borders) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Registered Patients */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Registered Patients</h3>
            <p className="text-sm text-muted-foreground mb-2">Manage patient appointments, check-ins, and payments.</p>
            <div className="text-3xl font-bold mb-3">{patientsCount}</div>
            <p className="text-sm text-muted-foreground mb-4">Total patient count</p>
            <Button variant="ghost" className="text-blue-600 p-0 h-auto" onClick={() => navigate('/patients')}>
              View all patients
            </Button>
          </div>

          {/* Today's Appointments */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Today's Appointments</h3>
            <p className="text-sm text-muted-foreground mb-2">Check in patients and manage today's schedule</p>
            <div className="text-3xl font-bold mb-3">{todaysAppointments.length}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {todaysAppointments.length === 0 ? "No appointments scheduled for today" : `${todaysAppointments.filter(a => a.status === 'scheduled').length} awaiting check-in`}
            </p>
            <Button variant="ghost" className="text-blue-600 p-0 h-auto" onClick={() => navigate('/appointments')}>
              View all appointments
            </Button>
          </div>

          {/* Upcoming Appointments */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Upcoming Appointments</h3>
            <p className="text-sm text-muted-foreground mb-2">Next scheduled appointments</p>
            <div className="text-3xl font-bold mb-3">{upcomingAppointments.length}</div>
            <p className="text-sm text-muted-foreground mb-4">Next 7 days</p>
            <Button variant="ghost" className="text-blue-600 p-0 h-auto" onClick={() => navigate('/appointments')}>
              View all appointments
            </Button>
          </div>
        </div>

        {/* Right Side - Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Calendar</CardTitle>
              <CardDescription>View and manage patient appointments</CardDescription>
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
        </div>
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
                  <p className="text-sm">{new Date(selectedAppointment.date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Time</label>
                  <p className="text-sm">{formatTime(selectedAppointment.time)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={selectedAppointment.status === 'scheduled' ? 'outline' : 
                               selectedAppointment.status === 'pending' ? 'secondary' :
                               selectedAppointment.status === 'completed' ? 'default' : 'destructive'}
                      className={
                        selectedAppointment.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        selectedAppointment.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        selectedAppointment.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : ''
                      }
                    >
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Doctor</label>
                  <p className="text-sm">{selectedAppointment.display_doctor_name || selectedAppointment.doctorName || 'Not assigned'}</p>
                </div>
              </div>
              
              {selectedAppointment.reason && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Reason for Visit</label>
                  <p className="text-sm">{selectedAppointment.reason}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {selectedAppointment.status === 'scheduled' && (
                  <Button size="sm">Check In Patient</Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const patientId = selectedAppointment.patientId || selectedAppointment.patient;
                    const patient = localPatients.find(p => String(p.id) === String(patientId)) || 
                                   patients.find(p => String(p.id) === String(patientId)) ||
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
                    navigate('/appointments');
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
