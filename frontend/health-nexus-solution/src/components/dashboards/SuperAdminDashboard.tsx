import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClinic } from "@/contexts/ClinicContext";
import { useBranding } from "@/contexts/BrandingContext";
import {
  Users,
  UserCog,
  Activity,
  Shield,
  TrendingUp,
  CheckCircle2,
  Clock,
  Server,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, axiosInstance } from "@/services/api";
import { useNavigate } from "react-router-dom";

interface SystemStats {
  totalUsers: number;
  totalDoctors: number;
  totalReceptionists: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  totalPatients: number;
  totalAppointments: number;
  activeAppointments: number;
  totalAuditLogs: number;
  systemHealth: "healthy" | "warning" | "critical";
}

const SuperAdminDashboard = () => {
  const { currentUser } = useClinic();
  const { colors } = useBranding();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalReceptionists: 0,
    totalAdmins: 0,
    totalSuperAdmins: 0,
    totalPatients: 0,
    totalAppointments: 0,
    activeAppointments: 0,
    totalAuditLogs: 0,
    systemHealth: "healthy",
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch various statistics in parallel
      const [
        doctors,
        receptionists,
        admins,
        superadminsResponse,
        auditLogsResponse,
      ] = await Promise.all([
        api.doctors.getAll(),
        api.receptionists.getAll(),
        api.admins.getAll(),
        axiosInstance.get("/staff/list/?role=superadmin"),
        axiosInstance.get("/audit-logs/"),
      ]);

      const superadmins = superadminsResponse.data;
      const auditLogs = auditLogsResponse.data.logs || [];

      setStats({
        totalUsers:
          doctors.length +
          receptionists.length +
          admins.length +
          superadmins.length,
        totalDoctors: doctors.length,
        totalReceptionists: receptionists.length,
        totalAdmins: admins.length,
        totalSuperAdmins: superadmins.length,
        totalPatients: 0,
        totalAppointments: 0,
        activeAppointments: 0,
        totalAuditLogs: auditLogs.length,
        systemHealth: "healthy",
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Set fallback values if fetch fails
      setStats((prev) => ({ ...prev, systemHealth: "warning" as const }));
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await axiosInstance.get("/audit-logs/", {
        params: { per_page: 50 },
      });

      const logs = response.data.audit_logs || [];

      // Filter logs to only include CREATE, UPDATE, DELETE actions (exclude viewing/reading)
      const filteredLogs = logs.filter((log: any) => {
        const action = (log.action || "").toUpperCase();
        return (
          (action.includes("CREATE") ||
            action.includes("CREATED") ||
            action.includes("REGISTERED") ||
            action.includes("UPDATE") ||
            action.includes("CHANGED") ||
            action.includes("MODIFIED") ||
            action.includes("DELETE") ||
            action.includes("REMOVED")) &&
          !(
            action.includes("VIEW") ||
            action.includes("READ") ||
            action.includes("FETCH") ||
            action.includes("GET") ||
            action.includes("LIST")
          )
        );
      });

      // Map audit logs to activity format (take first 4 after filtering)
      const activities = filteredLogs.slice(0, 4).map((log: any) => {
        let icon = CheckCircle2;
        let color = "text-blue-600";

        // Determine icon and color based on action type (case-insensitive)
        const action = (log.action || "").toUpperCase();
        if (
          action.includes("CREATE") ||
          action.includes("CREATED") ||
          action.includes("REGISTERED")
        ) {
          icon = CheckCircle2;
          color = "text-green-600";
        } else if (
          action.includes("UPDATE") ||
          action.includes("CHANGED") ||
          action.includes("MODIFIED")
        ) {
          icon = Shield;
          color = "text-blue-600";
        } else if (action.includes("DELETE") || action.includes("REMOVED")) {
          icon = Activity;
          color = "text-red-600";
        }

        // Format timestamp
        const timestamp = new Date(log.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo = "";
        if (diffDays > 0) {
          timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        } else if (diffHours > 0) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        } else if (diffMins > 0) {
          timeAgo = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
        } else {
          timeAgo = "Just now";
        }

        // Use details field for message, fall back to action
        const message = log.details || log.action || "System activity";

        return {
          type: action.toLowerCase(),
          message: message,
          timestamp: timeAgo,
          icon,
          color,
        };
      });

      setRecentActivity(activities);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      // Set empty array if fetch fails
      setRecentActivity([]);
    }
  };

  const quickStats = [
    {
      title: "Total Staff",
      value: stats.totalUsers,
      icon: Users,
      description: "All system users",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/staff",
    },
    {
      title: "Doctors",
      value: stats.totalDoctors,
      icon: Activity,
      description: "Active doctors",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/staff",
    },
    {
      title: "Receptionists",
      value: stats.totalReceptionists,
      icon: UserCog,
      description: "Active receptionists",
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/staff",
    },
    {
      title: "Admins",
      value: stats.totalAdmins,
      icon: Shield,
      description: "System administrators",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/staff",
    },
    {
      title: "Audit Logs",
      value: stats.totalAuditLogs,
      icon: Activity,
      description: "System activity records",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/audit-logs",
    },
  ];

  const staffBreakdown = [
    {
      role: "Doctors",
      count: stats.totalDoctors,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      role: "Receptionists",
      count: stats.totalReceptionists,
      icon: UserCog,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      role: "Admins",
      count: stats.totalAdmins,
      icon: Shield,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      role: "Super Admins",
      count: stats.totalSuperAdmins,
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Super Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back,{" "}
            <span className="font-semibold">{currentUser?.username}</span>
          </p>
        </div>
        <Badge
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium whitespace-nowrap self-start sm:self-auto"
          style={{ backgroundColor: colors.primaryColor, color: "white" }}
        >
          <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Super Administrator
        </Badge>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickStats.map((stat, index) => (
          <Card
            key={index}
            className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer border-none"
            onClick={() => stat.href !== "#" && navigate(stat.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Breakdown and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Staff Breakdown */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users
                className="h-5 w-5"
                style={{ color: colors.primaryColor }}
              />
              Staff Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of staff members by role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffBreakdown.map((staff, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${staff.bgColor}`}>
                    <staff.icon className={`h-5 w-5 ${staff.color}`} />
                  </div>
                  <div>
                    <p className="font-medium">{staff.role}</p>
                    <p className="text-sm text-muted-foreground">
                      Active staff members
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{staff.count}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock
                className="h-5 w-5"
                style={{ color: colors.primaryColor }}
              />
              Recent System Activity
            </CardTitle>
            <CardDescription>
              Latest administrative actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className={`p-2 rounded-full bg-white`}>
                      <activity.icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No recent activity to display
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
