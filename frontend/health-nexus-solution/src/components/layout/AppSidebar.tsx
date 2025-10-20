import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useClinic } from "@/contexts/ClinicContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  FileCheck,
  FileText,
  Home,
  Image,
  Package,
  Plug,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import React from "react";
import { Link, useLocation } from "react-router-dom";

// Type definitions for menu items
interface MenuSubItem {
  title: string;
  icon: any;
  path: string;
}

interface MenuItem {
  title: string;
  icon: any;
  path: string;
  subItems?: MenuSubItem[];
}

export const AppSidebar = () => {
  const [openDocMgmt, setOpenDocMgmt] = React.useState(false);
  const { currentUser, setCurrentUser } = useClinic();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  if (!currentUser) return null;

  // Create a key based on user permissions to force re-render when permissions change
  const permissionKey = `${currentUser.can_manage_permissions}-${currentUser.can_manage_staff}-${currentUser.can_manage_patients}-${currentUser.can_manage_appointments}-${currentUser.can_manage_inventory}`;

  const getMenuItems = (): MenuItem[] => {
    // Base items available to all users
    const baseItems: MenuItem[] = [
      { title: "Dashboard", icon: Home, path: "/" },
    ];

    // Permission-based navigation items
    const permissionItems: (MenuItem | null)[] = [
      // Staff management
      currentUser.can_manage_staff
        ? { title: "Staff", icon: Users, path: "/staff" }
        : null,

      // Patient management
      currentUser.can_manage_patients
        ? { title: "Patients", icon: Users, path: "/patients" }
        : null,

      // Appointment management - default for doctors, permission-based for others
      currentUser.role === "doctor" || currentUser.can_manage_appointments
        ? { title: "Appointments", icon: Calendar, path: "/appointments" }
        : null,

      // Schedule - only for doctors
      currentUser.role === "doctor"
        ? { title: "Schedule", icon: Calendar, path: "/schedule" }
        : null,

      // Lab Results - Only for doctors and admins (not superadmin, not receptionist)
      ["doctor", "admin"].includes(currentUser.role)
        ? { title: "Lab Results", icon: Image, path: "/lab-results" }
        : null,

      // Inventory Management - default for doctors/admin, permission-based for others
      currentUser.role === "doctor" ||
      currentUser.role === "admin" ||
      currentUser.can_manage_inventory
        ? { title: "Inventory", icon: Package, path: "/inventory" }
        : null,

      // Document Management - only for receptionist, doctor, and admin (not superadmin as per requirements)
      ["receptionist", "doctor", "admin"].includes(currentUser.role)
        ? {
            title: "Document Management",
            icon: FileText,
            path: "/document-management",
            subItems: [
              {
                title: "Medical Certificates",
                icon: FileCheck,
                path: "/medical-certificates",
              },
              {
                title: "Prescription Requests",
                icon: ClipboardList,
                path: "/prescription-management",
              },
            ],
          }
        : null,

      // Clinic settings - Hide for superadmin as per requirements, show for admin with permission
      currentUser.can_manage_clinic_settings &&
      currentUser.role !== "superadmin"
        ? { title: "Clinic Settings", icon: Settings, path: "/settings" }
        : null,

      // Permission Management - Only show for superadmin
      currentUser.role === "superadmin"
        ? { title: "Permission Management", icon: Shield, path: "/permissions" }
        : null,

      // Audit Logs - Show if user has permission
      currentUser.can_view_audit_logs
        ? { title: "Audit Logs", icon: FileText, path: "/audit-logs" }
        : null,

      // Usage Reports - Show if user has permission
      currentUser.can_view_usage_reports
        ? { title: "Usage Reports", icon: BarChart3, path: "/usage-reports" }
        : null,

      // Integrations - Show if user has permission
      currentUser.can_access_integrations
        ? { title: "Integrations", icon: Plug, path: "/integrations" }
        : null,

      // Security Testing - Show if user has permission
      currentUser.can_access_security_testing
        ? { title: "Security Testing", icon: Shield, path: "/security-testing" }
        : null,
    ].filter(Boolean) as MenuItem[]; // Remove null values and cast to MenuItem[]

    // User Settings - available to all users
    const userSettingsItems: MenuItem[] = [
      { title: "User Settings", icon: Settings, path: "/user-settings" },
    ];

    // Combine all items
    return [...baseItems, ...permissionItems, ...userSettingsItems];
  };

  const menuItems = getMenuItems();

  const handleMenuClick = () => {
    setOpenMobile(false); // Close sidebar on menu click
  };
  return (
    <Sidebar key={permissionKey}>
      <SidebarHeader className="flex flex-col items-center gap-2 p-4">
        <div className="text-xl font-bold text-[#79c942]">LUNASync</div>
        <Link
          to="/user-settings"
          className="flex items-center gap-2 mt-2 cursor-pointer hover:bg-gray-100 rounded p-2 w-fit"
          title="Go to Settings"
        >
          <Avatar>
            <AvatarImage src={currentUser.image} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {currentUser.role}
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.subItems ? (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className="flex items-center gap-2"
                      onClick={() => setOpenDocMgmt((v) => !v)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                      <span className="ml-auto">{openDocMgmt ? "▲" : "▼"}</span>
                    </SidebarMenuButton>
                    {/* Sub-menu for document management */}
                    {openDocMgmt && (
                      <div className="ml-8">
                        {item.subItems.map((sub) => (
                          <SidebarMenuItem key={sub.title}>
                            <SidebarMenuButton asChild>
                              <Link
                                to={sub.path}
                                className={cn(
                                  "flex items-center gap-2 hover:bg-[#79c942] hover:text-black",
                                  location.pathname === sub.path
                                    ? "bg-[#79c942] text-black"
                                    : ""
                                )}
                                onClick={handleMenuClick}
                              >
                                <sub.icon className="h-5 w-5" />
                                <span>{sub.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    )}
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-2 hover:bg-[#79c942] hover:text-black",
                          location.pathname === item.path
                            ? "bg-[#79c942] text-black"
                            : ""
                        )}
                        onClick={handleMenuClick}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
