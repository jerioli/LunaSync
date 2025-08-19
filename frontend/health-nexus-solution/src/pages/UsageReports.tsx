import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Activity, BarChart3, HardDrive, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UsageData {
  total_users: number;
  active_users_last_30_days: number;
  user_roles_breakdown: {
    superadmin: number;
    admin: number;
    doctor: number;
    receptionist: number;
  };
  monthly_stats: {
    logins: number;
    appointments_created: number;
    patients_registered: number;
    reports_generated: number;
  };
  system_resources: {
    storage_used_gb: number;
    storage_limit_gb: number;
    api_calls_today: number;
    average_response_time_ms: number;
  };
}

const UsageReports = () => {
  const { currentUser } = useClinic();
  const { toast } = useToast();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const response = await api.usageReports.get();
      setUsageData(response.usage_data);
    } catch (error) {
      console.error('Error fetching usage data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch usage reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser?.can_view_usage_reports) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to view usage reports.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading usage reports...</div>;
  }

  if (!usageData) {
    return <div className="flex items-center justify-center h-full">No usage data available.</div>;
  }

  const storageUsagePercentage = (usageData.system_resources.storage_used_gb / usageData.system_resources.storage_limit_gb) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Usage Reports
          </h1>
          <p className="text-muted-foreground">
            Monitor system usage and performance metrics
          </p>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.total_users}</div>
            <p className="text-xs text-muted-foreground">
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.active_users_last_30_days}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.system_resources.api_calls_today.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.system_resources.average_response_time_ms}ms</div>
            <p className="text-xs text-muted-foreground">
              Average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Roles Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>User Roles Distribution</CardTitle>
          <CardDescription>Breakdown of users by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Super Admins</span>
                <span className="text-sm text-muted-foreground">{usageData.user_roles_breakdown.superadmin}</span>
              </div>
              <Progress value={(usageData.user_roles_breakdown.superadmin / usageData.total_users) * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Admins</span>
                <span className="text-sm text-muted-foreground">{usageData.user_roles_breakdown.admin}</span>
              </div>
              <Progress value={(usageData.user_roles_breakdown.admin / usageData.total_users) * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Doctors</span>
                <span className="text-sm text-muted-foreground">{usageData.user_roles_breakdown.doctor}</span>
              </div>
              <Progress value={(usageData.user_roles_breakdown.doctor / usageData.total_users) * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Receptionists</span>
                <span className="text-sm text-muted-foreground">{usageData.user_roles_breakdown.receptionist}</span>
              </div>
              <Progress value={(usageData.user_roles_breakdown.receptionist / usageData.total_users) * 100} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity</CardTitle>
          <CardDescription>Key metrics for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{usageData.monthly_stats.logins.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Logins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{usageData.monthly_stats.appointments_created.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Appointments Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{usageData.monthly_stats.patients_registered.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Patients Registered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{usageData.monthly_stats.reports_generated.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Reports Generated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            System Resources
          </CardTitle>
          <CardDescription>Current system resource utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage Usage</span>
                <span className="text-sm text-muted-foreground">
                  {usageData.system_resources.storage_used_gb}GB / {usageData.system_resources.storage_limit_gb}GB
                </span>
              </div>
              <Progress value={storageUsagePercentage} />
              <p className="text-xs text-muted-foreground mt-1">
                {storageUsagePercentage.toFixed(1)}% of total storage used
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageReports;
