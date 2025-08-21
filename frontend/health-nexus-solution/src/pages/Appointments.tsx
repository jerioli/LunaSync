import NewAppointmentModal from '@/components/appointments/ScheduleAppointmentModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClinic } from '@/hooks/useClinicContext';
import { axiosInstance } from '@/services/api';
import { Calendar, CalendarCheck, Clock, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Appointments = () => {
  const { currentUser, patients, users } = useClinic();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [localPatients, setLocalPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const isReceptionist = currentUser?.role === 'receptionist';
  const isDoctor = currentUser?.role === 'doctor';

  // Consistent button class for all action buttons
  const buttonClass = "h-8 px-3 text-xs";

  // Helper function to format time
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return timeString;
    }
  };

  // Get status badge with consistent styling
  const getStatusBadge = (status: string) => {
    const variants = {
      'scheduled': { className: 'bg-blue-100 text-blue-800 hover:bg-blue-100', label: 'Upcoming' },
      'pending': { className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', label: 'Pending' },
      'ongoing': { className: 'bg-orange-100 text-orange-800 hover:bg-orange-100', label: 'Ongoing' },
      'completed': { className: 'bg-green-100 text-green-800 hover:bg-green-100', label: 'Completed' },
      'cancelled': { className: 'bg-red-100 text-red-800 hover:bg-red-100', label: 'Cancelled' },
      'no-show': { className: 'bg-red-100 text-red-800 hover:bg-red-100', label: 'No Show' }
    };
    
    const config = variants[status] || variants['scheduled'];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

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
      const response = await axiosInstance.get('appointments/list/');
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
        const response = await axiosInstance.get('patients/');
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
    } else if (activeTab === "ongoing") {
      const result = appointment.status === "ongoing";
      console.log('Ongoing filter result:', result, 'for appointment:', appointment.id);
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
  // Debug logging
  console.log('getPatientName called with:', {
    patientId,
    appointmentId: appointment?.id,
    patient_name: appointment?.patient_name,
    display_patient_name: appointment?.display_patient_name,
    status: appointment?.status,
    notes: appointment?.notes
  });

  // First check for patient_name field (from API response)
  if (appointment?.patient_name && appointment.patient_name !== 'N/A' && appointment.patient_name.trim() !== '') {
    console.log('Using patient_name:', appointment.patient_name);
    return appointment.patient_name;
  }

  // For confirmed appointments, use display_patient_name if available
  if (appointment?.display_patient_name && appointment.display_patient_name !== 'N/A' && appointment.display_patient_name.trim() !== '') {
    console.log('Using display_patient_name:', appointment.display_patient_name);
    return appointment.display_patient_name;
  }

  // For pending appointments, try to get name from notes
  if (appointment?.notes && appointment.status === 'pending') {
    const notes = appointment.notes;
    if (notes.includes('Patient Details (Pending):')) {
      try {
        const patientDetails = JSON.parse(notes.split('Patient Details (Pending):')[1].trim());
        console.log('Parsed patient details from notes:', patientDetails);
        
        // Try to construct name from individual fields in the JSON
        const nameFromFields = [
          patientDetails.firstName,
          patientDetails.middleInitial, 
          patientDetails.lastName,
          patientDetails.suffix
        ].filter(part => part && part.trim()).join(' ');
        
        if (nameFromFields.trim()) {
          console.log('Using name from individual fields:', nameFromFields);
          return nameFromFields;
        }
        
        // Fallback to the name field
        if (patientDetails.name && patientDetails.name.trim()) {
          console.log('Using name from JSON name field:', patientDetails.name);
          return patientDetails.name;
        }
      } catch (error) {
        console.error('Error parsing patient details:', error);
      }
    }
  }

  // Fallback to patient lookup by ID
  if (patientId) {
    const patient = localPatients.find(p => String(p.id) === String(patientId));
    if (patient && patient.name) return patient.name;
  }
  
  // If patientId is an object with name, use it
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
      console.log('Attempting to update appointment status:', {
        appointmentId,
        status,
        url: `appointments/update-status/${appointmentId}/`,
        payload: { status: status }
      });
      
      const response = await axiosInstance.post(`appointments/update-status/${appointmentId}/`, {
        status: status
      });
      
      console.log('Status update response:', response.data);
      
      // Update local state with the response data
      setAppointments(prev => prev.map(appt => 
        appt.id === appointmentId ? { ...appt, ...response.data } : appt
      ));
      
      const statusMessages = {
        'scheduled': "Appointment has been confirmed",
        'completed': "Appointment marked as completed",
        'cancelled': "Appointment has been cancelled",
        'no-show': "Patient marked as no-show",
        'pending': "Appointment marked as pending",
        'ongoing': "Patient has been checked in"
      };
      
      // Enhanced success message for confirmations
      if (status === 'scheduled' && response.data.email_sent) {
        toast.success("Appointment confirmed! Patient has been notified via email.");
      } else if (status === 'scheduled' && response.data.patient_created) {
        toast.success("Appointment confirmed and patient record created!");
      } else {
        toast.success(statusMessages[status]);
      }
      
      // Refresh appointments to get updated data with complete patient information
      setTimeout(async () => {
        await fetchAppointments();
      }, 500); // Small delay to ensure backend has processed the update
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Show more specific error message
      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Invalid request. The status might not be supported.';
        toast.error(`Failed to update appointment: ${errorMsg}`);
      } else {
      }
    }
  };

  // Render action buttons for each appointment
  const renderActionButtons = (appointment) => {
    if (activeTab === "upcoming" && isReceptionist) {
      return (
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className={`${buttonClass} bg-orange-600 hover:bg-orange-700`}
            onClick={() => handleStatusUpdate(appointment.id, 'ongoing')}
          >
            Check In
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, 'no-show')}
          >
            No Show
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
          >
            Cancel
          </Button>
        </div>
      );
    }

    if (activeTab === "pending" && isReceptionist) {
      return (
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, 'scheduled')}
          >
            Confirm
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
          >
            Decline
          </Button>
        </div>
      );
    }

    if (activeTab === "ongoing") {
      if (isDoctor) {
        return (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className={buttonClass}
              onClick={() => navigate(`/patients/${appointment.patientId}`)}
            >
              View Record
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className={`${buttonClass} bg-green-600 hover:bg-green-700`}
              onClick={() => handleStatusUpdate(appointment.id, 'completed')}
            >
              Complete
            </Button>
          </div>
        );
      }
      
      if (isReceptionist) {
        return (
          <Button 
            variant="outline" 
            size="sm" 
            className={buttonClass}
            onClick={() => handleStatusUpdate(appointment.id, 'scheduled')}
          >
            Return to Scheduled
          </Button>
        );
      }
    }

    return null;
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
            <TabsList className={`grid mb-4 ${isReceptionist ? 'grid-cols-5' : 'grid-cols-4'}`}>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              {isReceptionist && <TabsTrigger value="pending">Pending</TabsTrigger>}
              <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
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
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Time
                              </div>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            {getDisplayNotes(paginatedAppointments[0]?.notes) && (
                              <TableHead>Notes</TableHead>
                            )}
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {getPatientName(appointment.patientId, appointment)}
                              </TableCell>
                              <TableCell>{formatDate(appointment.date)}</TableCell>
                              <TableCell>{formatTime(appointment.time)}</TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>{getDoctorName(appointment.doctorId, appointment)}</TableCell>
                              <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                              {getDisplayNotes(appointment.notes) && (
                                <TableCell className="max-w-[200px] truncate">
                                  {getDisplayNotes(appointment.notes)}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                {renderActionButtons(appointment)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
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
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Time
                              </div>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            {getDisplayNotes(filteredAppointments[0]?.notes) && (
                              <TableHead>Notes</TableHead>
                            )}
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {getPatientName(appointment.patientId, appointment)}
                              </TableCell>
                              <TableCell>{formatDate(appointment.date)}</TableCell>
                              <TableCell>{formatTime(appointment.time)}</TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>{getDoctorName(appointment.doctorId, appointment)}</TableCell>
                              <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                              {getDisplayNotes(appointment.notes) && (
                                <TableCell className="max-w-[200px] truncate">
                                  {getDisplayNotes(appointment.notes)}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                {renderActionButtons(appointment)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
            
            <TabsContent value="ongoing" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No ongoing appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Patient
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Time
                              </div>
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Status</TableHead>
                            {getDisplayNotes(paginatedAppointments[0]?.notes) && (
                              <TableHead>Notes</TableHead>
                            )}
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {getPatientName(appointment.patientId, appointment)}
                              </TableCell>
                              <TableCell>{formatDate(appointment.date)}</TableCell>
                              <TableCell>{formatTime(appointment.time)}</TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>{getDoctorName(appointment.doctorId, appointment)}</TableCell>
                              <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                              {getDisplayNotes(appointment.notes) && (
                                <TableCell className="max-w-[200px] truncate">
                                  {getDisplayNotes(appointment.notes)}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                {renderActionButtons(appointment)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
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
            
            <TabsContent value="completed" className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p>No completed appointments found.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Patient
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Time
                            </div>
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                              {getPatientName(appointment.patientId, appointment)}
                            </TableCell>
                            <TableCell>{formatDate(appointment.date)}</TableCell>
                            <TableCell>{formatTime(appointment.time)}</TableCell>
                            <TableCell>{appointment.type}</TableCell>
                            <TableCell>{getDoctorName(appointment.doctorId, appointment)}</TableCell>
                            <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
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
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Patient
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Time
                            </div>
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                              {getPatientName(appointment.patientId, appointment)}
                            </TableCell>
                            <TableCell>{formatDate(appointment.date)}</TableCell>
                            <TableCell>{formatTime(appointment.time)}</TableCell>
                            <TableCell>{appointment.type}</TableCell>
                            <TableCell>{getDoctorName(appointment.doctorId, appointment)}</TableCell>
                            <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
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
