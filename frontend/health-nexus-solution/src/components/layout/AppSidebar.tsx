import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  useSidebar
} from '@/components/ui/sidebar';
import { useClinic } from '@/contexts/ClinicContext';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  ClipboardList,
  FileCheck,
  FileText,
  Home,
  Image,
  Plug,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const AppSidebar = () => {
  const [openDocMgmt, setOpenDocMgmt] = React.useState(false);
  const { currentUser } = useClinic();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  if (!currentUser) return null;
  const getMenuItems = () => {
    switch (currentUser.role) {
      case 'doctor':
        return [
          { title: 'Dashboard', icon: Home, path: '/' },
          { title: 'Patients', icon: Users, path: '/patients' },
          { title: 'Appointments', icon: Calendar, path: '/appointments' },
          { title: 'Lab Results', icon: Image, path: '/lab-results' },
          { title: 'My Schedule', icon: Calendar, path: '/schedule' },
          {
            title: 'Document Management',
            icon: FileText,
            subItems: [
              { title: 'Medical Certificates', icon: FileCheck, path: '/medical-certificates' },
              { title: 'Prescription Requests', icon: ClipboardList, path: '/prescription-management' },
            ],
          },
          { title: 'User Settings', icon: Settings, path: '/user-settings' },
        ];
      case 'receptionist':
        return [
          { title: 'Dashboard', icon: Home, path: '/' },
          { title: 'Patients', icon: Users, path: '/patients' },
          { title: 'Appointments', icon: Calendar, path: '/appointments' },
          {
            title: 'Document Management',
            icon: FileText,
            subItems: [
              { title: 'Medical Certificates', icon: FileCheck, path: '/medical-certificates' },
              { title: 'Prescription Requests', icon: ClipboardList, path: '/prescription-management' },
            ],
          },
          { title: 'User Settings', icon: Settings, path: '/user-settings' },
          
        ];
      case 'admin':
        return [
          { title: 'Dashboard', icon: Home, path: '/' },
          { title: 'Staff', icon: Users, path: '/staff' },
           { title: 'Appointments', icon: Calendar, path: '/appointments' },
          { title: 'Patients', icon: Users, path: '/patients' },
          { title: 'Lab Results', icon: Image, path: '/lab-results' },
          {
            title: 'Document Management',
            icon: FileText,
            subItems: [
              { title: 'Medical Certificates', icon: FileCheck, path: '/medical-certificates' },
              { title: 'Prescription Requests', icon: ClipboardList, path: '/prescription-management' },
            ],
          },
          { title: 'ClinicSettings', icon: Settings, path: '/settings' },
          { title: 'User Settings', icon: Settings, path: '/user-settings' },
        ];
      case 'superadmin':
        return [
          { title: 'Dashboard', icon: Home, path: '/' },
          { title: 'Staff', icon: Users, path: '/staff' },
          { title: 'Permission Management', icon: Shield, path: '/permissions' },
          { title: 'Audit Logs', icon: FileText, path: '/audit-logs' },
          { title: 'Usage Reports', icon: BarChart3, path: '/usage-reports' },
          { title: 'Integrations', icon: Plug, path: '/integrations' },
          { title: 'Security Testing', icon: Shield, path: '/security-testing' },
          { title: 'User Settings', icon: Settings, path: '/user-settings' }
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const handleMenuClick = () => {
    setOpenMobile(false); // Close sidebar on menu click
  };
  return (
    <Sidebar>
      <SidebarHeader className="flex flex-col items-center gap-2 p-4">
  <div className="text-xl font-bold text-[#79c942]">LUNASync</div>
        <Link to="/user-settings" className="flex items-center gap-2 mt-2 cursor-pointer hover:bg-gray-100 rounded p-2 w-fit" title="Go to Settings">
          <Avatar>
            <AvatarImage src={currentUser.image} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                item.subItems ? (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton className="flex items-center gap-2" onClick={() => setOpenDocMgmt((v) => !v)}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                      <span className="ml-auto">{openDocMgmt ? '▲' : '▼'}</span>
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
                                  location.pathname === sub.path ? "bg-[#79c942] text-black" : ""
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
                          location.pathname === item.path ? "bg-[#79c942] text-black" : ""
                        )}
                        onClick={handleMenuClick}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
