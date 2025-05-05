import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCheck, ClipboardList, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';

const Appointments = () => {
  const { currentUser, appointments, patients, users, updateAppointment } = useClinic();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  const isReceptionist = currentUser?.role === 'receptionist';
  const isDoctor = currentUser?.role === 'doctor';
  
  // Filter appointments based on tab and user role
  const filteredAppointments = appointments.filter(appointment => {
    // For doctor, only show their appointments
    if (isDoctor && appointment.doctorId !== currentUser?.id) {
      return false;
    }

    const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
    const today = new Date();
    
    if (activeTab === "upcoming") {
      return appointmentDate >= today && appointment.status === "scheduled";
    } else if (activeTab === "pending" && isReceptionist) {
      return appointment.status === "pending";
    } else if (activeTab === "completed") {
      return appointment.status === "completed";
    } else if (activeTab === "cancelled") {
      return appointment.status === "cancelled" || appointment.status === "no-show";
    }
    
    return false;
  });

  // Get patient name by ID
  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : "Unknown Patient";
  };

  // Get doctor name by ID
  const getDoctorName = (doctorId: string) => {
    const doctor = users.find(u => u.id === doctorId && u.role === 'doctor');
    return doctor ? doctor.name : "Unassigned Doctor";
  };

  // Get patient avatar by ID
  const getPatientAvatar = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name.charAt(0) : "?";
  };

  const handleStatusUpdate = (appointmentId: string, status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'pending') => {
    updateAppointment(appointmentId, { status });
    
    const statusMessages = {
      scheduled: "Appointment has been confirmed",
      completed: "Appointment marked as completed",
      cancelled: "Appointment has been cancelled",
      'no-show': "Patient marked as no-show",
      pending: "Appointment marked as pending"
    };
    
    toast.success(statusMessages[status]);
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
            <Button>
              <CalendarCheck className="mr-2 h-4 w-4" />
              Schedule New Appointment
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
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
                filteredAppointments.map(appointment => (
                  <Card key={appointment.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback>{getPatientAvatar(appointment.patientId)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{getPatientName(appointment.patientId)}</CardTitle>
                            <CardDescription>{appointment.type}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Upcoming
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{new Date(appointment.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{appointment.time}</span>
                        </div>
                        {!isDoctor && (
                          <div className="col-span-2">
                            <p className="text-sm font-medium">Doctor:</p>
                            <p className="text-sm text-muted-foreground">{getDoctorName(appointment.doctorId)}</p>
                          </div>
                        )}
                        {appointment.notes && (
                          <div className="col-span-2">
                            <p className="text-sm font-medium">Notes:</p>
                            <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="flex flex-wrap gap-2 w-full justify-end">
                        {isDoctor && (
                          <Button variant="outline" onClick={() => handleStatusUpdate(appointment.id, 'completed')}>
                            Mark Complete
                          </Button>
                        )}
                        {isReceptionist && (
                          <>
                            <Button variant="outline" onClick={() => handleStatusUpdate(appointment.id, 'no-show')}>
                              No Show
                            </Button>
                            <Button variant="destructive" onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}>
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))
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
                      <CardHeader className="pb-3">
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarFallback>{getPatientAvatar(appointment.patientId)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{getPatientName(appointment.patientId)}</CardTitle>
                              <CardDescription>{appointment.type}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Pending
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{new Date(appointment.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm font-medium">Doctor:</p>
                            <p className="text-sm text-muted-foreground">{getDoctorName(appointment.doctorId)}</p>
                          </div>
                          {appointment.notes && (
                            <div className="col-span-2">
                              <p className="text-sm font-medium">Notes:</p>
                              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
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
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback>{getPatientAvatar(appointment.patientId)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{getPatientName(appointment.patientId)}</CardTitle>
                            <CardDescription>{appointment.type}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Completed
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{new Date(appointment.date).toLocaleDateString()}</span>
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
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback>{getPatientAvatar(appointment.patientId)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{getPatientName(appointment.patientId)}</CardTitle>
                            <CardDescription>{appointment.type}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {appointment.status === "cancelled" ? "Cancelled" : "No Show"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{new Date(appointment.date).toLocaleDateString()}</span>
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
        
        {/* Chatbot or Schedule Info Column */}
        <div>
          {isDoctor ? (
            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Your upcoming appointments for today</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Today's appointments for doctor would go here */}
                <p className="text-center text-muted-foreground py-4">No appointments for today</p>
              </CardContent>
            </Card>
          ) : (
            <AppointmentChatbot />
          )}
        </div>
      </div>
    </div>
  );
};

export default Appointments;
