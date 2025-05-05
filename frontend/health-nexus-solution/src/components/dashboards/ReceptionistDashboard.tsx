
import React from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Package, CreditCard, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReceptionistDashboard = () => {
  const { appointments, patients, payments, inventory } = useClinic();
  const navigate = useNavigate();
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Filter today's appointments
  const todaysAppointments = appointments
    .filter(appointment => appointment.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  
  // Get pending payments
  const pendingPayments = payments.filter(payment => payment.status === 'pending');
  
  // Get low stock items
  const lowStockItems = inventory.filter(item => item.quantity <= item.threshold);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receptionist Dashboard</h1>
        <p className="text-muted-foreground">Manage patient appointments, check-ins, and payments.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {todaysAppointments.filter(a => a.status === 'scheduled').length} awaiting check-in
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">Total patient records</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
            <CardDescription>Check in patients and manage today's schedule</CardDescription>
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
                          <Badge 
                            variant={appointment.status === 'scheduled' ? 'outline' : 'secondary'}
                            className="mt-1"
                          >
                            {appointment.status === 'scheduled' ? 'Not checked in' : 'Checked in'}
                          </Badge>
                        </div>
                        {appointment.status === 'scheduled' && (
                          <Button size="sm">Check in</Button>
                        )}
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
            <CardTitle>Pending Payments</CardTitle>
            <CardDescription>Process outstanding payments</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {pendingPayments.length > 0 ? (
                pendingPayments.map((payment) => {
                  const patient = patients.find(p => p.id === payment.patientId);
                  const appointment = appointments.find(a => a.id === payment.appointmentId);
                  
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{patient?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient?.name}</div>
                          <div className="text-sm text-muted-foreground">{appointment?.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">${payment.amount.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">{payment.method}</div>
                        </div>
                        <Button size="sm">Process</Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No pending payments
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <Button variant="ghost" className="w-full" onClick={() => navigate('/payments')}>
              View all payments
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Inventory</CardTitle>
          <CardDescription>Items that need to be restocked</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {lowStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-6">Item</th>
                      <th className="text-left py-3 px-6">Category</th>
                      <th className="text-left py-3 px-6">Quantity</th>
                      <th className="text-left py-3 px-6">Threshold</th>
                      <th className="text-left py-3 px-6">Last Restocked</th>
                      <th className="text-left py-3 px-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="py-3 px-6">{item.name}</td>
                        <td className="py-3 px-6">{item.category}</td>
                        <td className="py-3 px-6 font-medium">{item.quantity} {item.unit}</td>
                        <td className="py-3 px-6">{item.threshold} {item.unit}</td>
                        <td className="py-3 px-6">{item.lastRestocked}</td>
                        <td className="py-3 px-6">
                          <Button size="sm" variant="outline">Restock</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No items with low stock
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <Button variant="ghost" className="w-full" onClick={() => navigate('/inventory')}>
            Manage inventory
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReceptionistDashboard;
