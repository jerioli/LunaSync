import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, User, CalendarCheck, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useClinic } from '@/hooks/useClinicContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NewAppointmentModal from '@/components/appointments/ScheduleAppointmentModal';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

axios.defaults.baseURL = 'http://127.0.0.1:8000/api/';

const Appointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, patients, users } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [localPatients, setLocalPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading] = useState(true);
  
  const isReceptionist = currentUser?.role === 'receptionist';
  const isDoctor = currentUser?.role === 'doctor';

  // Map backend fields to frontend expected fields
  const mapAppointments = (data) => {
    return data.map(appt => ({
      id: appt.id || `${appt.patient}-${appt.date}-${appt.time}`,
      patientId: appt.patient,
      date: appt.date,
      time: appt.time,
      status: appt.status || 'scheduled',
      appointment_type: appt.appointment_type,
      notes: appt.notes,
      doctorId: appt.doctor || null,
      // Add display fields
      display_patient_name: appt.display_patient_name,
      display_doctor_name: appt.display_doctor_name,
      display_time: appt.display_time,
      display_date: appt.display_date,
      display_notes: appt.display_notes
    }));
  };

  // Fetch appointments from backend
  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('appointments/list/');
      console.log('Fetched appointments:', response.data);
      if (Array.isArray(response.data)) {
        const mappedAppointments = mapAppointments(response.data);
        setAppointments(mappedAppointments);
        
        // Update pending count for notifications
        const pendingCount = mappedAppointments.filter(appt => appt.status === 'pending').length;
        localStorage.setItem('pendingAppointmentsCount', pendingCount.toString());
      } else {
        console.error('Invalid response format:', response.data);
        toast.error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.detail || 'Failed to fetch appointments. Please try again later.');
      } else {
        toast.error('Failed to fetch appointments. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    if (location.search) {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab && ['upcoming', 'pending', 'completed', 'cancelled'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [location.search]);

  // Update pending count whenever appointments change
  useEffect(() => {
    const pendingCount = appointments.filter(appt => appt.status === 'pending').length;
    localStorage.setItem('pendingAppointmentsCount', pendingCount.toString());
  }, [appointments]);

  // Fetch patients for local state
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axios.get('patients/list/');
        console.log('Fetched patients:', response.data);
        setLocalPatients(response.data);
      } catch (error) {
        console.error('Error fetching patients:', error);
        toast.error('Failed to fetch patients. Please try again later.');
      }
    };
    fetchPatients();
  }, []);

  // Filtered appointments logic
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
    const today = new Date();
    
    if (activeTab === "upcoming") {
      return appointmentDate >= today && appointment.status === "scheduled";
    } else if (activeTab === "pending" && isReceptionist) {
      return appointment.status === "pending" && appointmentDate >= today;
    } else if (activeTab === "completed") {
      return appointment.status === "completed";
    } else if (activeTab === "cancelled") {
      return appointment.status === "cancelled" || appointment.status === "no-show";
    }
    
    return false;
  });

  const totalPages = Math.ceil(filteredAppointments.length / pageSize);
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page to 1 when tab or filter changes
  useEffect(() => { setCurrentPage(1); }, [activeTab, appointments]);

  const getPatientName = (patientId, appointment) => {
    // For pending appointments, try to get name from notes
    if (appointment?.notes && appointment.status === 'pending') {
      const notes = appointment.notes;
      if (notes.includes('Patient Details (Pending):')) {
        try {
          const patientDetails = JSON.parse(notes.split('Patient Details (Pending):')[1].trim());
          return patientDetails.name;
        } catch (error) {
          console.error('Error parsing patient details:', error);
        }
      }
    }

    // For confirmed appointments, use display_patient_name if available
    if (appointment?.display_patient_name) {
      return appointment.display_patient_name;
    }

    // Fallback to patient lookup
    const patient = localPatients.find(p => String(p.id) === String(patientId));
    if (patient && patient.name) return patient.name;
    if (typeof patientId === 'object' && patientId !== null && patientId.name) {
      return patientId.name;
    }
    return "Unknown Patient";
  };

  const getDoctorName = (doctorId, appointment) => {
    if (appointment?.display_doctor_name) {
      return appointment.display_doctor_name;
    }
    const doctor = users.find(u => u.id === doctorId && u.role === 'doctor');
    return doctor ? doctor.name : "Unassigned Doctor";
  };

  // Helper function to extract only user notes from appointment notes
  const getUserNotes = (notes) => {
    if (!notes) return null;
    
    // If notes contain patient details section, extract only the user notes part
    if (notes.includes('Patient Details (Pending):')) {
      const parts = notes.split('Patient Details (Pending):');
      return parts[0].trim() || null;
    }
    
    return notes;
  };

  // Local handler for status updates
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      let response;
      
      // For pending appointments being confirmed, use the approve endpoint
      if (newStatus === 'scheduled') {
        // Check if this is a pending appointment that needs patient creation
        const appointment = appointments.find(appt => appt.id === appointmentId);
        if (appointment && appointment.status === 'pending') {
          response = await axios.post(`appointments/approve/${appointmentId}/`);
          // Refresh appointments list to get updated patient information
          await fetchAppointments();
        } else {
          // For non-pending appointments, use the regular update-status endpoint
          response = await axios.post(`appointments/update-status/${appointmentId}/`, {
            status: newStatus
          });
          // Update local state with the updated appointment
          setAppointments(prev => prev.map(appt => 
            appt.id === appointmentId ? { ...appt, status: newStatus } : appt
          ));
        }
      } else {
        // For other status updates, use the regular update-status endpoint
        response = await axios.post(`appointments/update-status/${appointmentId}/`, {
          status: newStatus
        });
        // Update local state with the updated appointment
        setAppointments(prev => prev.map(appt => 
          appt.id === appointmentId ? { ...appt, status: newStatus } : appt
        ));
      }

      const statusMessages = {
        'scheduled': "Appointment has been confirmed and confirmation email sent to patient",
        'completed': "Appointment marked as completed",
        'cancelled': "Appointment has been cancelled",
        'no-show': "Patient marked as no-show",
        'pending': "Appointment marked as pending"
      };

      toast.success(statusMessages[newStatus]);
      
      // Update pending count for notifications
      const updatedAppointments = appointments.map(appt => 
        appt.id === appointmentId ? { ...appt, status: newStatus } : appt
      );
      const pendingCount = updatedAppointments.filter(appt => appt.status === 'pending').length;
      localStorage.setItem('pendingAppointmentsCount', pendingCount.toString());
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update appointment status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Manage and view appointments
          </p>
        </div>
        
        {isReceptionist && (
          <div className="flex space-x-2">
            <Button onClick={() => setShowNewAppointmentModal(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule New Appointment
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 md:max-w-7xl mx-auto">
        <div>
          <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              {isReceptionist && <TabsTrigger value="pending">Pending</TabsTrigger>}
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No upcoming appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedAppointments.map(appointment => (
                    <Card key={appointment.id}>
                      <CardHeader className="pb-2 min-h-0">
                        <div className="flex justify-between items-center min-h-0">
                          <div className="flex items-center min-h-0">
                            <div>
                              <CardTitle className="text-[1.1rem] font-semibold leading-tight">{getPatientName(appointment.patientId, appointment)}</CardTitle>
                              <CardDescription className="text-sm text-muted-foreground">{appointment.appointment_type}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0.5 text-xs font-medium h-5 min-w-12 flex items-center justify-center">
                            Upcoming
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-0.5">
                        <div className="grid grid-cols-2 gap-1 md:gap-2 text-sm">
                          <div className="flex items-center min-h-0 py-1">
                            <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{appointment.display_date || new Date(appointment.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center min-h-0 py-1">
                            <Clock className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{appointment.display_time || appointment.time}</span>
                          </div>
                          <div className="col-span-2 min-h-0 py-1">
                            <p className="text-xs font-medium leading-tight">Doctor:</p>
                            <p className="text-xs text-muted-foreground leading-tight">{getDoctorName(appointment.doctorId, appointment)}</p>
                          </div>
                          {getUserNotes(appointment.notes) && (
                            <div className="col-span-2 min-h-0 py-1">
                              <p className="text-xs font-medium leading-tight">Notes:</p>
                              <p className="text-xs text-muted-foreground leading-tight">{getUserNotes(appointment.notes)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="py-1 px-2">
                        <div className="flex flex-wrap gap-1 w-full justify-end">
                          {isDoctor && (
                            <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => handleStatusUpdate(appointment.id, 'completed')}>
                              Mark Complete
                            </Button>
                          )}
                          {isReceptionist && (
                            <>
                              <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => handleStatusUpdate(appointment.id, 'no-show')}>
                                No Show
                              </Button>
                              <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}>
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                  {totalPages > 1 && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            aria-disabled={currentPage === 1}
                            tabIndex={currentPage === 1 ? -1 : 0}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <PaginationItem key={i + 1}>
                            <PaginationLink
                              isActive={currentPage === i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              href="#"
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            aria-disabled={currentPage === totalPages}
                            tabIndex={currentPage === totalPages ? -1 : 0}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </TabsContent>
            
            {isReceptionist && (
              <TabsContent value="pending" className="space-y-4">
                {filteredAppointments.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p>No pending appointment requests.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredAppointments.map(appointment => (
                    <Card key={appointment.id}>
                      <CardHeader className="pb-2 min-h-0">
                        <div className="flex justify-between items-center min-h-0">
                          <div className="flex items-center min-h-0">
                            <div>
                              <CardTitle className="text-[1.1rem] font-semibold leading-tight">{getPatientName(appointment.patientId, appointment)}</CardTitle>
                              <CardDescription className="text-sm text-muted-foreground">{appointment.appointment_type}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-1.5 py-0.5 text-xs font-medium h-5 min-w-12 flex items-center justify-center">
                            Pending
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-0.5 md:gap-1 text-sm">
                          <div className="flex items-center min-h-0 py-1">
                            <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{appointment.display_date || new Date(appointment.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center min-h-0 py-1">
                            <Clock className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{appointment.display_time || appointment.time}</span>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs font-medium leading-tight">Doctor:</p>
                            <p className="text-xs text-muted-foreground leading-tight">
                              {getDoctorName(appointment.doctorId, appointment)}
                            </p>
                          </div>
                          {getUserNotes(appointment.display_notes) && (
                            <div className="col-span-2">
                              <p className="text-xs font-medium leading-tight">Notes:</p>
                              <p className="text-xs text-muted-foreground leading-tight whitespace-pre-line">
                                {getUserNotes(appointment.display_notes)}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="flex flex-wrap gap-2 w-full justify-end">
                          <Button onClick={() => handleStatusUpdate(appointment.id, 'scheduled')}>
                            Confirm Appointment
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-6 px-2 text-xs" 
                            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                          >
                            Decline
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </TabsContent>
            )}
            
            <TabsContent value="completed" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No completed appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredAppointments.map(appointment => (
                  <Card key={appointment.id}>
                    <CardHeader className="pb-2 min-h-0">
                      <div className="flex justify-between items-center min-h-0">
                        <div className="flex items-center min-h-0">
                          
                          <div>
                            <CardTitle className="text-[1.1rem] font-semibold leading-tight">{getPatientName(appointment.patientId, appointment)}</CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">{appointment.appointment_type}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-1.5 py-0.5 text-xs font-medium h-5 min-w-12 flex items-center justify-center">
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{appointment.display_date || new Date(appointment.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{appointment.display_time || appointment.time}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="cancelled" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No cancelled appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredAppointments.map(appointment => (
                  <Card key={appointment.id}>
                    <CardHeader className="pb-2 min-h-0">
                      <div className="flex justify-between items-center min-h-0">
                        <div className="flex items-center min-h-0">
                          
                          <div>
                            <CardTitle className="text-[1.1rem] font-semibold leading-tight">{getPatientName(appointment.patientId, appointment)}</CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">{appointment.appointment_type}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-1.5 py-0.5 text-xs font-medium h-5 min-w-12 flex items-center justify-center">
                          {appointment.status === "cancelled" ? "Cancelled" : "No Show"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{appointment.display_date || new Date(appointment.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{appointment.display_time || appointment.time}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* New Appointment Modal */}
      <NewAppointmentModal 
        open={showNewAppointmentModal} 
        onOpenChange={setShowNewAppointmentModal} 
       
      />
    </div>
  );
};

export default Appointments;
