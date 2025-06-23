import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  FileText, 
  Home, 
  Users, 
  Settings, 
  Bell,
  Pill,
  Image
} from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton
} from '@/components/ui/sidebar';
import { useClinic } from '@/contexts/ClinicContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export const AppSidebar = () => {
  const { currentUser } = useClinic();
  const location = useLocation();

  if (!currentUser) return null;
  const getMenuItems = () => {
    switch (currentUser.role) {
      case 'doctor':
        return [
          { title: 'Dashboard', icon: Home, path: '/' },
          { title: 'Patients', icon: Users, path: '/patients' },
          { title: 'Appointments', icon: Calendar, path: '/appointments' },
          { title: 'Prescriptions', icon: Pill, path: '/prescriptions' },
          { title: 'Lab Results', icon: Image, path: '/lab-results' },
          { title: 'My Schedule', icon: Calendar, path: '/schedule' },
          { title: 'Settings', icon: Settings, path: '/user-settings' },
        ];
      case 'receptionist':
        return [
          { title: 'Dashboard', icon: Home, path: '/' },
          { title: 'Patients', icon: Users, path: '/patients' },
          { title: 'Appointments', icon: Calendar, path: '/appointments' },
          { title: 'Settings', icon: Settings, path: '/user-settings' },
        ];
      case 'admin':
        return [
          { title: 'Dashboard', icon: Home, path: '/' },
          { title: 'Staff', icon: Users, path: '/staff' },
          { title: 'Patients', icon: Users, path: '/patients' },
          { title: 'Settings', icon: Settings, path: '/settings' },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-col items-center gap-2 p-4">
        <div className="text-xl font-bold text-clinic-blue">MedSync</div>
        <div className="flex items-center gap-2 mt-2">
          <Avatar>
            <AvatarImage src={currentUser.image} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.path} 
                      className={cn(
                        "flex items-center gap-2",
                        location.pathname === item.path ? "bg-accent text-accent-foreground" : ""
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
