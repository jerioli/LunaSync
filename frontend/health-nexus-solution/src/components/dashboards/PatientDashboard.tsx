import PatientAppointmentModal from '@/components/appointments/PatientAppointmentModal';
import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinic } from '@/contexts/ClinicContext';
import { Calendar, FileText, MessageSquare, Pill } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const { currentUser, appointments, users, prescriptions, labResults } = useClinic();
  const navigate = useNavigate();
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  if (!currentUser || currentUser.role !== 'patient') {
    return <div>Loading...</div>;
  }
  
  // Get patient ID based on current user
  const patientId = currentUser.id;
  
  // Get upcoming appointments for the patient
  const upcomingAppointments = appointments
    .filter(appointment => 
      appointment.patientId === patientId && 
      appointment.status === 'scheduled' &&
      new Date(appointment.date) >= new Date()
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Get past appointments for the patient
  const pastAppointments = appointments
    .filter(appointment => 
      appointment.patientId === patientId && 
      (appointment.status === 'completed' || new Date(appointment.date) < new Date())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Get patient prescriptions
  const patientPrescriptions = prescriptions
    .filter(prescription => prescription.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Get patient lab results
  const patientLabResults = labResults
    .filter(result => result.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Patient Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {currentUser.name}. View your appointments and medical information.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments.length}</div>            <p className="text-xs text-muted-foreground">
              {upcomingAppointments.length > 0 
                ? `Next on ${new Date(upcomingAppointments[0].date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` 
                : 'No upcoming appointments'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientPrescriptions.length}</div>
            <p className="text-xs text-muted-foreground">Active medications</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lab Results</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientLabResults.length}</div>
            <p className="text-xs text-muted-foreground">Available for review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Unread messages</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => {
                  const doctor = users.find(u => u.id === appointment.doctorId);
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={doctor?.image} alt={doctor?.name} />
                          <AvatarFallback>{doctor?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{doctor?.name}</div>
                          <div className="text-sm text-muted-foreground">{appointment.type}</div>
                        </div>
                      </div>                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{new Date(appointment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                          <div className="text-sm text-muted-foreground">{appointment.time}</div>
                        </div>
                        <Button size="sm" variant="outline">Reschedule</Button>
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
            <Button className="w-full" onClick={() => setShowAppointmentModal(true)}>
              Request new appointment
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Prescriptions</CardTitle>
            <CardDescription>Your active medications</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {patientPrescriptions.length > 0 ? (
                patientPrescriptions.slice(0, 3).map((prescription) => {
                  const doctor = users.find(u => u.id === prescription.doctorId);
                  
                  return (
                    <div key={prescription.id} className="p-4">                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Prescribed by {doctor?.name}</div>
                        <Badge variant="outline">{new Date(prescription.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Badge>
                      </div>
                      <div className="space-y-2 mt-2">
                        {prescription.medications.map((med, index) => (
                          <div key={index} className="bg-muted/30 p-2 rounded">
                            <div className="font-medium">{med.name} ({med.dosage})</div>
                            <div className="text-sm text-muted-foreground">
                              {med.frequency} for {med.duration}
                            </div>
                          </div>
                        ))}
                      </div>
                      {prescription.instructions && (
                        <div className="mt-3 text-sm">
                          <span className="font-medium">Instructions: </span>
                          {prescription.instructions}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No prescriptions available
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <Button variant="ghost" className="w-full" onClick={() => navigate('/my-prescriptions')}>
              View all prescriptions
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lab Results</CardTitle>
          <CardDescription>Your recent laboratory test results</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {patientLabResults.length > 0 ? (
              patientLabResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{result.type}</div>
                    <div className="text-sm text-muted-foreground">{new Date(result.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.notes && (
                      <Badge variant="outline" className="bg-muted/30">
                        Has notes
                      </Badge>
                    )}
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No lab results available
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <Button variant="ghost" className="w-full" onClick={() => navigate('/medical-records')}>
            View all medical records
          </Button>
        </CardFooter>
      </Card>
      
      <div className="grid grid-cols-1">
        <AppointmentChatbot />
      </div>
      
      {/* Patient Appointment Modal */}
      <PatientAppointmentModal 
        open={showAppointmentModal} 
        onOpenChange={setShowAppointmentModal} 
      />
    </div>
  );
};

export default PatientDashboard;
