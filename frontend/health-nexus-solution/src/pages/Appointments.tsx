import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCheck, ClipboardList, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClinic } from '@/hooks/useClinicContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NewAppointmentModal from '@/components/appointments/ScheduleAppointmentModal';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

const Appointments = () => {
  const { currentUser, patients, users } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [localPatients, setLocalPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const isReceptionist = currentUser?.role === 'receptionist';
  const isDoctor = currentUser?.role === 'doctor';

  // Helper function to format date in readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    });
  };

  // Map backend fields to frontend expected fields
  const mapAppointments = (data) => {
    return data.map(appt => ({
      id: appt.id || `${appt.patient}-${appt.date}-${appt.time}`,
      patientId: appt.patient,
      date: appt.date,
      time: appt.time,
      status: appt.status || 'scheduled',
      type: appt.appointment_type,
      notes: appt.notes,
      doctorId: appt.doctor || null,
      doctorName: appt.doctor_name || appt.display_doctor_name || "Not Assigned",
      // Map new patient detail fields for pending appointments
      patient_name: appt.patient_name,
      patient_email: appt.patient_email,
      patient_phone: appt.patient_phone,
      patient_date_of_birth: appt.patient_date_of_birth,
      patient_gender: appt.patient_gender,
      patient_address: appt.patient_address,
      patient_marital_status: appt.patient_marital_status,
      // Add display fields for confirmed appointments
      display_patient_name: appt.display_patient_name,
      display_doctor_name: appt.display_doctor_name
    }));
  };

  // Fetch appointments from backend
  const fetchAppointments = async () => {
    try {
      const response = await axios.get('appointments/list/');
      console.log('Fetched appointments from API:', response.data);
      setAppointments(mapAppointments(response.data));
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch patients for local state
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axios.get('patients/');
        setLocalPatients(response.data);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    fetchPatients();
  }, []);

  // Filtered appointments logic
  const filteredAppointments = appointments.filter(appointment => {
    // Debug: Log all appointments being processed with detailed doctor info
    console.log('Processing appointment:', {
      id: appointment.id,
      doctorId: appointment.doctorId,
      doctorIdType: typeof appointment.doctorId,
      display_doctor_name: appointment.display_doctor_name,
      status: appointment.status,
      activeTab,
      isDoctor,
      currentUserId: currentUser?.id,
      currentUserIdType: typeof currentUser?.id,
      fullAppointment: appointment
    });

    // For doctors, only show appointments assigned to them
    if (isDoctor) {
      // Handle both string and number ID comparisons
      const appointmentDoctorId = String(appointment.doctorId);
      const currentUserId = String(currentUser?.id);
      
      // Debug logging for doctors
      console.log('Doctor filtering:', {
        appointmentId: appointment.id,
        appointmentDoctorId: appointment.doctorId,
        appointmentDoctorIdString: appointmentDoctorId,
        currentUserId: currentUser?.id,
        currentUserIdString: currentUserId,
        stringComparison: `"${appointmentDoctorId}" === "${currentUserId}"`,
        match: appointmentDoctorId === currentUserId,
        doctorIdIsFalsy: !appointment.doctorId,
        doctorIdIsNull: appointment.doctorId === null,
        doctorIdIsUndefined: appointment.doctorId === undefined,
        doctorIdIsEmptyString: appointment.doctorId === "",
        displayDoctorName: appointment.display_doctor_name,
        currentUserName: currentUser?.name
      });
      
      // Check if appointment has doctorId and it matches current user
      const doctorIdMatches = appointment.doctorId && appointmentDoctorId === currentUserId;
      
      // Also check if display_doctor_name matches current user's name (fallback)
      const doctorNameMatches = appointment.display_doctor_name && 
                               currentUser?.name && 
                               appointment.display_doctor_name === currentUser.name;
      
      console.log('Doctor matching logic:', {
        doctorIdMatches,
        doctorNameMatches,
        shouldShow: doctorIdMatches || doctorNameMatches
      });
      
      // If neither doctorId nor display name matches, don't show it to doctors
      if (!doctorIdMatches && !doctorNameMatches) {
        console.log('Filtering out: No doctor match found');
        return false;
      }
      
      console.log('Doctor filter PASSED for appointment:', appointment.id);
    }

    const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
    const today = new Date();
    
    if (activeTab === "upcoming") {
      const result = appointmentDate >= today && appointment.status === "scheduled";
      console.log('Upcoming filter result:', result, 'for appointment:', appointment.id);
      return result;
    } else if (activeTab === "pending") {
      // Only receptionists can see pending appointments
      if (!isReceptionist) {
        console.log('Filtering out pending: Not receptionist');
        return false;
      }
      const result = appointment.status === "pending";
      console.log('Pending filter result:', result, 'for appointment:', appointment.id);
      return result;
    } else if (activeTab === "completed") {
      const result = appointment.status === "completed";
      console.log('Completed filter result:', result, 'for appointment:', appointment.id);
      return result;
    } else if (activeTab === "cancelled") {
      const result = appointment.status === "cancelled" || appointment.status === "no-show";
      console.log('Cancelled filter result:', result, 'for appointment:', appointment.id);
      return result;
    }
    
    console.log('No tab match, filtering out appointment:', appointment.id);
    return false;
  });

  const totalPages = Math.ceil(filteredAppointments.length / pageSize);
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page to 1 when tab or filter changes
  useEffect(() => { setCurrentPage(1); }, [activeTab, appointments]);

 const getPatientName = (patientId, appointment) => {
  // First check for patient_name field (new structure for pending appointments)
  if (appointment?.patient_name) {
    return appointment.patient_name;
  }

  // For confirmed appointments, use display_patient_name if available
  if (appointment?.display_patient_name) {
    return appointment.display_patient_name;
  }

  // For pending appointments with old structure, try to get name from notes
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

  // Fallback to patient lookup
  const patient = localPatients.find(p => String(p.id) === String(patientId));
  if (patient && patient.name) return patient.name;
  if (typeof patientId === 'object' && patientId !== null && patientId.name) {
    return patientId.name;
  }
  return "Unknown Patient";
};

  const getDoctorName = (doctorId: string, appointment?: any) => {
    // Debug logging for getDoctorName function
    console.log('getDoctorName called with:', {
      doctorId,
      doctorIdType: typeof doctorId,
      appointmentId: appointment?.id,
      doctorName: appointment?.doctorName,
      display_doctor_name: appointment?.display_doctor_name,
      appointment_doctor_field: appointment?.doctor,
      appointment_doctorId_field: appointment?.doctorId
    });

    // First check if we have doctorName from the backend
    if (appointment?.doctorName && appointment.doctorName !== "N/A" && appointment.doctorName !== "Not Assigned") {
      console.log('Using doctorName:', appointment.doctorName);
      return appointment.doctorName;
    }

    // Fallback to display_doctor_name
    if (appointment?.display_doctor_name && appointment.display_doctor_name !== "N/A" && appointment.display_doctor_name !== "Not Assigned") {
      console.log('Using display_doctor_name:', appointment.display_doctor_name);
      return appointment.display_doctor_name;
    }

    // If no doctorId provided, return unassigned
    if (!doctorId) {
      return "Unassigned Doctor";
    }

    // Try to find doctor in users array (handle both string and number IDs)
    const doctor = users.find(u => 
      (String(u.id) === String(doctorId) || u.id === doctorId) && u.role === 'doctor'
    );
    
    if (doctor && doctor.name) {
      console.log('Found doctor in users array:', doctor.name);
      return doctor.name;
    }

    // If not found in users, try to fetch from appointments data
    const existingAppointment = appointments.find(appt => 
      String(appt.doctorId) === String(doctorId) && (appt.doctorName || appt.display_doctor_name)
    );
    
    if (existingAppointment?.doctorName && existingAppointment.doctorName !== "N/A" && existingAppointment.doctorName !== "Not Assigned") {
      console.log('Found doctor in existing appointments (doctorName):', existingAppointment.doctorName);
      return existingAppointment.doctorName;
    }
    
    if (existingAppointment?.display_doctor_name && existingAppointment.display_doctor_name !== "N/A" && existingAppointment.display_doctor_name !== "Not Assigned") {
      console.log('Found doctor in existing appointments (display_doctor_name):', existingAppointment.display_doctor_name);
      return existingAppointment.display_doctor_name;
    }

    console.log('No doctor found, returning Unassigned Doctor');
    return "Unassigned Doctor";
  };

  // Helper function to filter out patient details from notes
  const getDisplayNotes = (notes: string) => {
    if (!notes) return null;
    
    // Check if notes contain patient details
    if (notes.includes('Patient Details (Pending):')) {
      // Extract only the part before patient details
      const beforePatientDetails = notes.split('Patient Details (Pending):')[0].trim();
      // Return only if there's actual content before patient details and it's not just "none"
      return beforePatientDetails && beforePatientDetails.toLowerCase() !== 'none' ? beforePatientDetails : null;
    }
    
    // Return original notes if no patient details found and it's not just "none"
    return notes.toLowerCase() !== 'none' ? notes : null;
  };

  // Local handler for status updates
  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      const response = await axios.post(`appointments/update-status/${appointmentId}/`, {
        status: status
      });
      
      // Update local state with the response
      setAppointments(prev => prev.map(appt => 
        appt.id === appointmentId ? { ...appt, ...response.data } : appt
      ));
      
      const statusMessages = {
        'scheduled': "Appointment has been confirmed",
        'completed': "Appointment marked as completed",
        'cancelled': "Appointment has been cancelled",
        'no-show': "Patient marked as no-show",
        'pending': "Appointment marked as pending"
      };
      
      // Enhanced success message for confirmations
      if (status === 'scheduled' && response.data.email_sent) {
        toast.success("Appointment confirmed! Patient has been notified via email.");
      } else if (status === 'scheduled' && response.data.patient_created) {
        toast.success("Appointment confirmed and patient record created!");
      } else {
        toast.success(statusMessages[status]);
      }
      
      // Refresh appointments to get updated data
      await fetchAppointments();
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status. Please try again.');
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
              <CalendarCheck className="mr-2 h-4 w-4" />
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
                              <CardDescription className="text-sm text-muted-foreground">{appointment.type}</CardDescription>
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
                            <span>{formatDate(appointment.date)}</span>
                          </div>
                          <div className="flex items-center min-h-0 py-1">
                            <Clock className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="col-span-2 min-h-0 py-1">
                            <p className="text-xs font-medium leading-tight">Doctor:</p>
                            <p className="text-xs text-muted-foreground leading-tight">{getDoctorName(appointment.doctorId, appointment)}</p>
                          </div>
                          {getDisplayNotes(appointment.notes) && (
                            <div className="col-span-2 min-h-0 py-1">
                              <p className="text-xs font-medium leading-tight">Notes:</p>
                              <p className="text-xs text-muted-foreground leading-tight">{getDisplayNotes(appointment.notes)}</p>
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
                              <CardDescription className="text-sm text-muted-foreground">{appointment.type}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-1.5 py-0.5 text-xs font-medium h-5 min-w-12 flex items-center justify-center">
                            Pending
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-0.5">
                        <div className="grid grid-cols-2 gap-0.5 md:gap-1 text-sm">
                          <div className="flex items-center min-h-0 py-1">
                            <Calendar className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatDate(appointment.date)}</span>
                          </div>
                          <div className="flex items-center min-h-0 py-1">
                            <Clock className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs font-medium leading-tight">Doctor:</p>
                            <p className="text-xs text-muted-foreground leading-tight">{getDoctorName(appointment.doctorId, appointment)}</p>
                          </div>
                          {getDisplayNotes(appointment.notes) && (
                            <div className="col-span-2">
                              <p className="text-xs font-medium leading-tight">Notes:</p>
                              <p className="text-xs text-muted-foreground leading-tight">{getDisplayNotes(appointment.notes)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="flex flex-wrap gap-2 w-full justify-end">
                          <Button onClick={() => handleStatusUpdate(appointment.id, 'scheduled')}>
                            Confirm Appointment
                          </Button>
                          <Button variant="destructive" onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}>
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
                            <CardDescription className="text-sm text-muted-foreground">{appointment.type}</CardDescription>
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
                          <span>{formatDate(appointment.date)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{appointment.time}</span>
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
                            <CardDescription className="text-sm text-muted-foreground">{appointment.type}</CardDescription>
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
                          <span>{formatDate(appointment.date)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{appointment.time}</span>
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
