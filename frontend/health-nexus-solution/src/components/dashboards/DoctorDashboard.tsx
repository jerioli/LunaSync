
import React from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { Calendar, Clock, Users, Bell, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const { appointments, patients } = useClinic();
  const navigate = useNavigate();
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Filter today's appointments
  const todaysAppointments = appointments
    .filter(appointment => appointment.date === today && appointment.status === 'scheduled')
    .sort((a, b) => a.time.localeCompare(b.time));
  
  // Filter patients with upcoming follow-up appointments
  const upcomingFollowUps = appointments
    .filter(appointment => 
      appointment.status === 'scheduled' && 
      appointment.type.toLowerCase().includes('follow') &&
      new Date(appointment.date) > new Date()
    )
    .slice(0, 3);
  
  // Count total patients
  const totalPatients = patients.length;
  
  // Count today's appointments
  const totalTodaysAppointments = todaysAppointments.length;
  
  // Count pending lab results
  const pendingLabResults = 2; // Mock number for prototype
  
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
            <p className="text-xs text-muted-foreground">{totalTodaysAppointments === 0 ? 'No appointments today' : `First at ${todaysAppointments[0]?.time || 'N/A'}`}</p>
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
            <CardDescription>You have {totalTodaysAppointments} appointments scheduled for today</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {todaysAppointments.length > 0 ? (
                todaysAppointments.map((appointment) => {
                  const patient = patients.find(p => p.id === appointment.patientId);
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{patient?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient?.name}</div>
                          <div className="text-sm text-muted-foreground">{appointment.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">{appointment.time}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${patient?.id}`)}>
                          View
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
            <CardTitle>Follow-up Reminders</CardTitle>
            <CardDescription>Upcoming follow-up appointments</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {upcomingFollowUps.length > 0 ? (
                upcomingFollowUps.map((appointment) => {
                  const patient = patients.find(p => p.id === appointment.patientId);
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{patient?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient?.name}</div>
                          <div className="text-sm text-muted-foreground">{appointment.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>
                          {new Date(appointment.date).toLocaleDateString()}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${patient?.id}`)}>
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No upcoming follow-up appointments
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <Button variant="ghost" className="w-full" onClick={() => navigate('/appointments')}>
              View all follow-ups
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DoctorDashboard;
