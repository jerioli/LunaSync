import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import {
  updateCurrentUserPermission,
  refreshCurrentUserPermissions,
} from "@/utils/userPermissions";
import {
  RefreshCw,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface UserPermissions {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  permissions: {
    can_manage_appointments: boolean;
    can_manage_patients: boolean;
    can_manage_staff: boolean;
    can_view_reports: boolean;
    can_manage_clinic_settings: boolean;
    can_manage_inventory: boolean;
    can_manage_permissions: boolean;
    can_view_audit_logs: boolean;
  };
}

const PermissionManagement = () => {
  const { currentUser, setCurrentUser } = useClinic();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
    // Refresh current user data to get permissions
    refreshCurrentUser();
  }, []);

  const refreshCurrentUser = async () => {
    const result = await refreshCurrentUserPermissions(
      currentUser,
      setCurrentUser,
    );
    return result;
  };

  const fetchUsers = async () => {
    try {
      const response = await api.permissions.getAll();
      // Filter out superadmin users - backend already filters inactive users
      const filteredUsers = response.users.filter(
        (user: UserPermissions) => user.role !== "superadmin",
      );
      setUsers(filteredUsers);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (
    userId: number,
    permissionKey: string,
    value: boolean,
  ) => {
    try {
      setSaving(true);
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const updatedPermissions = {
        ...user.permissions,
        [permissionKey]: value,
      };

      await api.permissions.update(userId, updatedPermissions);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, permissions: updatedPermissions } : u,
        ),
      );

      // Always refresh current user permissions after any change
      console.log("About to refresh current user permissions...");
      await refreshCurrentUser();
      console.log("Current user permissions refreshed!");

      toast({
        title: "Permission Updated",
        description: `Permission ${permissionKey} updated successfully`,
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  console.log("PermissionManagement - currentUser:", currentUser);
  console.log(
    "PermissionManagement - can_manage_permissions:",
    currentUser?.can_manage_permissions,
  );

  // Allow access for superadmin, admin, doctors with permission, or users with can_manage_permissions
  const hasPermissionAccess =
    currentUser?.role === "superadmin" ||
    currentUser?.role === "admin" ||
    (currentUser?.role === "doctor" && currentUser?.can_manage_permissions) ||
    currentUser?.can_manage_permissions;

  if (!hasPermissionAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to manage user permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "admin":
        return "bg-red-50 text-red-700 border-red-200";
      case "doctor":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "receptionist":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const permissionLabels = {
    can_manage_appointments: "Manage Appointments",
    can_manage_patients: "Manage Patients",
    can_manage_staff: "Manage Staff",
    can_view_reports: "View Reports",
    can_manage_clinic_settings: "Manage Clinic Settings",
    can_manage_inventory: "Manage Inventory",
    can_manage_permissions: "Manage Permissions",
    can_view_audit_logs: "View Audit Logs",
  };

  // Pagination calculations
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permission Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage user permissions and access controls
          </p>
        </div>
        <Button
          onClick={refreshCurrentUser}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh My Permissions</span>
          <span className="sm:hidden">Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Permissions
          </CardTitle>
          <CardDescription>
            Configure permissions for each user role and individual users
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Accordion type="single" collapsible className="space-y-3">
            {paginatedUsers.map((user) => (
              <AccordionItem
                key={user.id}
                value={`user-${user.id}`}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-3">
                  <div className="flex items-start gap-3 w-full pr-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm sm:text-base truncate">
                          {user.username}
                        </div>
                        <Badge
                          className={`${getRoleBadgeColor(user.role)} flex-shrink-0 whitespace-nowrap`}
                        >
                          {user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="pt-2 space-y-2">
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <Switch
                          checked={
                            user.permissions[
                              key as keyof typeof user.permissions
                            ]
                          }
                          onCheckedChange={(checked) =>
                            updatePermission(user.id, key, checked)
                          }
                          disabled={
                            saving ||
                            (user.role === "superadmin" &&
                              currentUser?.role !== "superadmin")
                          }
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, users.length)}{" "}
                of {users.length} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Previous</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ),
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline mr-2">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionManagement;
