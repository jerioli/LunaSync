
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinic } from '@/contexts/ClinicContext';
import { useSecurity } from '@/hooks/useSecurity';
import { CreditCard, Package, ShieldAlert, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart as ReBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AdminDashboard = () => {
  const { users, patients, inventory, payments } = useClinic();
  const { securityData, loading: securityLoading } = useSecurity();
  const navigate = useNavigate();
  
  // Count staff by role
  const staffCounts = {
    doctors: users.filter(user => user.role === 'doctor').length,
    receptionists: users.filter(user => user.role === 'receptionist').length,
    admins: users.filter(user => user.role === 'admin').length,
  };
  
  
  
  // Calculate total pending amount
  const totalPendingAmount = payments
    .filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  // Get low stock items
  const lowStockItems = inventory.filter(item => item.quantity <= item.threshold);
  
  // Mock data for patient registrations chart
  const patientRegistrationsData = [
    { month: 'Jan', count: 12 },
    { month: 'Feb', count: 19 },
    { month: 'Mar', count: 15 },
    { month: 'Apr', count: 22 },
    { month: 'May', count: 18 },
    { month: 'Jun', count: 24 },
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitor clinic operations, staff, and finances.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffCounts.doctors + staffCounts.receptionists + staffCounts.admins}</div>
            <p className="text-xs text-muted-foreground">
              {staffCounts.doctors} doctors, {staffCounts.receptionists} receptionists
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">Registered in the system</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
         
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
      
      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Patient Registrations</CardTitle>
            <CardDescription>New patient registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={patientRegistrationsData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <div className="flex gap-2 w-full">
              <Button variant="ghost" className="flex-1" onClick={() => navigate('/patients')}>
                View all patients
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Staff Management</CardTitle>
            <CardDescription>Manage staff accounts and roles</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {users
                .filter(user => user.role !== 'patient')
                .slice(0, 3)
                .map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{user.role}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Manage</Button>
                  </div>
                ))}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <div className="flex gap-2 w-full">
              <Button variant="ghost" className="flex-1" onClick={() => navigate('/staff')}>
                Manage all staff
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>System Security</CardTitle>
            <CardDescription>Data protection and security status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              {securityLoading ? (
                <div className="text-center py-4">Loading security data...</div>
              ) : securityData ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-accent" />
                      <span>Data Encryption</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${
                        securityData.encryption.status === 'Active' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {securityData.encryption.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-accent" />
                      <span>Backup Status</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${
                        securityData.backup.status === 'Up to date' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {securityData.backup.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-accent" />
                      <span>Last Security Audit</span>
                    </div>
                    <Badge 
                      variant="outline"
                      className={`${
                        securityData.last_audit.status.includes('days ago') && 
                        parseInt(securityData.last_audit.status) <= 30
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {securityData.last_audit.status}
                    </Badge>
                  </div>
                  {securityData.overall_status && (
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Security Score</span>
                        <Badge 
                          variant="outline"
                          className={`bg-${securityData.overall_status.color}-100 text-${securityData.overall_status.color}-800 border-${securityData.overall_status.color}-200`}
                        >
                          {securityData.overall_status.score}/100 - {securityData.overall_status.level}
                        </Badge>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-accent" />
                      <span>Data Encryption</span>
                    </div>
                    <Badge variant="outline" className="bg-accent/10 text-accent">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-accent" />
                      <span>Backup Status</span>
                    </div>
                    <Badge variant="outline" className="bg-accent/10 text-accent">Up to date</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-accent" />
                      <span>Last Security Audit</span>
                    </div>
                    <Badge variant="outline">7 days ago</Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <Button variant="ghost" className="w-full" onClick={() => navigate('/settings')}>
              Security settings
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>System Usage</CardTitle>
            <CardDescription>User activity monitoring</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Electronic Health Records</span>
                  <span className="text-sm font-medium">65%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Appointment Scheduling</span>
                  <span className="text-sm font-medium">82%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">E-Prescriptions</span>
                  <span className="text-sm font-medium">47%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '47%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <Button variant="ghost" className="w-full" onClick={() => navigate('/reports')}>
              View detailed reports
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
