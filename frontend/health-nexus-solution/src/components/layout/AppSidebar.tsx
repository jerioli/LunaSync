import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useBranding } from "@/contexts/BrandingContext";
import { useClinic } from "@/contexts/ClinicContext";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ClipboardList,
  Database,
  FileCheck,
  FileText,
  Home,
  Image,
  Package,
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
  const { colors } = useBranding();
  const location = useLocation();
  const { setOpenMobile, state, open } = useSidebar();

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

      // Set Availability - for doctors and admins
      ["doctor", "admin"].includes(currentUser.role)
        ? { title: "Set Availability", icon: Calendar, path: "/schedule" }
        : null,

      // Scheduler - only for receptionists and admins
      ["receptionist", "admin"].includes(currentUser.role)
        ? {
            title: "Scheduler",
            icon: Calendar,
            path: "/receptionist-scheduler",
          }
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

      // SQL Query Tester - Hidden
      // currentUser.role === "superadmin"
      //   ? { title: "SQL Query Tester", icon: Database, path: "/sql-query" }
      //   : null,

      // Audit Logs - Show if user has permission
      currentUser.can_view_audit_logs
        ? { title: "Audit Logs", icon: FileText, path: "/audit-logs" }
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
    <Sidebar
      key={permissionKey}
      collapsible="icon"
      className="[&[data-state=collapsed]]:w-24"
    >
      <SidebarHeader
        className={cn("flex flex-col items-center gap-2", open ? "p-4" : "p-3")}
      >
        {/* Show favicon when collapsed, LUNASync text when expanded */}
        {open ? (
          <div className="text-3xl font-bold text-[#79c942] transition-all duration-200 opacity-100 h-auto mb-2">
            LUNASync
          </div>
        ) : (
          <div className="transition-all duration-200 opacity-100 h-auto mb-2 flex items-center justify-center mt-3">
            <img
              src="/favicon.ico"
              alt="LUNASync"
              className="w-10 h-10"
              style={{ imageRendering: "crisp-edges" }}
            />
          </div>
        )}
        <Link
          to="/user-settings"
          className={cn(
            "flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded p-2 transition-all duration-200",
            open
              ? "w-full mt-0 justify-start"
              : "w-12 h-12 justify-center mt-2",
          )}
          title="Go to Settings"
        >
          <Avatar
            className={cn(
              "transition-all duration-200",
              open ? "w-10 h-10" : "w-10 h-10",
            )}
          >
            <AvatarImage src={currentUser.image} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "transition-all duration-200",
              open ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden",
            )}
          >
            <div className="font-medium">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {currentUser.role}
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent
        className={cn("transition-all duration-200", open ? "pt-0" : "pt-4")}
      >
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "transition-all duration-200",
              open
                ? "opacity-100 h-auto mb-4"
                : "opacity-0 h-0 overflow-hidden",
            )}
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent
            className={cn(
              "transition-all duration-200",
              open ? "mt-0" : "mt-2",
            )}
          >
            <SidebarMenu>
              {menuItems.map((item) =>
                item.subItems ? (
                  <SidebarMenuItem
                    key={item.title}
                    className={cn(
                      "transition-all duration-200",
                      !open && "mb-2",
                    )}
                  >
                    {/* When sidebar is collapsed, show dropdown menu */}
                    {!open ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton
                            className="flex items-center gap-2 w-full justify-center h-14"
                            title={item.title}
                          >
                            <item.icon className="h-9 w-9 flex-shrink-0" />
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          className="ml-2"
                        >
                          {item.subItems.map((sub) => (
                            <DropdownMenuItem key={sub.title} asChild>
                              <Link
                                to={sub.path}
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={handleMenuClick}
                              >
                                <sub.icon className="h-6 w-6" />
                                <span className="text-base">{sub.title}</span>
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      /* When sidebar is expanded, show normal accordion */
                      <>
                        <SidebarMenuButton
                          className="flex items-center gap-2 w-full transition-all duration-200"
                          onClick={() => setOpenDocMgmt((v) => !v)}
                          title={item.title}
                        >
                          <item.icon className="h-7 w-7 flex-shrink-0" />
                          <span className="transition-all duration-200 opacity-100 w-auto text-lg whitespace-nowrap">
                            {item.title}
                          </span>
                          <span className="ml-auto transition-all duration-200 opacity-100 w-auto">
                            {openDocMgmt ? "▲" : "▼"}
                          </span>
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
                                      "flex items-center gap-2 hover:text-white",
                                      location.pathname === sub.path
                                        ? "text-white"
                                        : "",
                                    )}
                                    style={{
                                      backgroundColor:
                                        location.pathname === sub.path
                                          ? colors.primaryColor
                                          : undefined,
                                      ...(location.pathname !== sub.path && {
                                        transition: "background-color 0.2s",
                                      }),
                                    }}
                                    onMouseEnter={(e) => {
                                      if (location.pathname !== sub.path) {
                                        e.currentTarget.style.backgroundColor =
                                          colors.primaryColor;
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (location.pathname !== sub.path) {
                                        e.currentTarget.style.backgroundColor =
                                          "";
                                      }
                                    }}
                                    onClick={handleMenuClick}
                                    title={sub.title}
                                  >
                                    <sub.icon className="h-7 w-7 flex-shrink-0" />
                                    <span className="text-base">
                                      {sub.title}
                                    </span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem
                    key={item.title}
                    className={cn(
                      "transition-all duration-200",
                      !open && "mb-2",
                    )}
                  >
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-2 hover:text-white w-full transition-all duration-200",
                          location.pathname === item.path ? "text-white" : "",
                          !open && "justify-center h-14",
                        )}
                        style={{
                          backgroundColor:
                            location.pathname === item.path
                              ? colors.primaryColor
                              : undefined,
                          ...(location.pathname !== item.path && {
                            transition: "background-color 0.2s",
                          }),
                        }}
                        onMouseEnter={(e) => {
                          if (location.pathname !== item.path) {
                            e.currentTarget.style.backgroundColor =
                              colors.primaryColor;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (location.pathname !== item.path) {
                            e.currentTarget.style.backgroundColor = "";
                          }
                        }}
                        onClick={handleMenuClick}
                        title={!open ? item.title : undefined}
                      >
                        <item.icon className="h-8 w-8 flex-shrink-0" />
                        <span
                          className={cn(
                            "transition-all duration-200 text-lg",
                            open
                              ? "opacity-100 w-auto"
                              : "opacity-0 w-0 overflow-hidden",
                          )}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
