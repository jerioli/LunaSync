import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Calendar, User, Clock, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useClinic } from '@/contexts/ClinicContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

export const TopBar: React.FC = () => {
  const { currentUser, setCurrentUser } = useClinic();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Map backend fields to frontend expected fields (same as Appointments page)
  const mapAppointments = (data) => {
    return data.map(appt => ({
      // Fix: Use proper template literal syntax with backticks
      id: appt.id || `${appt.patient}-${appt.date}-${appt.time}`,
      patientId: appt.patient,
      date: appt.date,
      time: appt.time,
      status: appt.status || 'scheduled',
      appointment_type: appt.appointment_type,
      notes: appt.notes,
      doctorId: appt.doctor || null,
      // Add display fields
      display_patient_name: appt.display_patient_name,
      display_doctor_name: appt.display_doctor_name,
      display_time: appt.display_time,
      display_date: appt.display_date,
      display_notes: appt.display_notes
    }));
  };

  // Listen for changes in pending appointments count
  useEffect(() => {
    const updatePendingCount = () => {
      const count = localStorage.getItem('pendingAppointmentsCount');
      setPendingCount(count ? parseInt(count) : 0);
    };

    // Initial check
    updatePendingCount();

    // Listen for storage events (when other components update the count)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pendingAppointmentsCount') {
        updatePendingCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for changes
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fetch pending appointments for notification panel
  useEffect(() => {
    const fetchPendingAppointments = async () => {
      try {
        setLoadingNotifications(true);
        const response = await axios.get('/appointments/list/');
        const data = response.data;
        console.log('All appointments:', data);
        
        if (Array.isArray(data)) {
          const mappedAppointments = mapAppointments(data);
          const pending = mappedAppointments.filter(appt => appt.status === 'pending');
          console.log('Pending appointments:', pending);
          setPendingAppointments(pending);
        } else {
          console.error('Invalid response format:', data);
          setPendingAppointments([]);
        }
      } catch (error) {
        console.error('Error fetching pending appointments:', error);
        setPendingAppointments([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    if (showNotifications) {
      fetchPendingAppointments();
    }
  }, [showNotifications]);
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');  // Clear user data
    setCurrentUser(null);             // Reset the context
    navigate('/login');              // Redirect to login page
  };
  // Handle settings navigation
  const handleSettings = () => {
    navigate('/user-settings');
  };

  // Handle notification click
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  // Handle notification item click
  const handleNotificationItemClick = () => {
    setShowNotifications(false);
    navigate('/appointments?tab=pending');
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  if (!currentUser) return null; // If no user, don't render the top bar

  return (
    <header className="sticky top-0 z-50 w-full py-2 px-4 md:py-3 md:px-6 border-b bg-white">
      <div className="flex items-center justify-between">
        {/* Left side - Only Sidebar trigger */}
        <div className="flex items-center">
          {/* SidebarTrigger with green hover */}
          <SidebarTrigger className="text-[#79c942] hover:bg-[#79c942]/10" />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative notification-dropdown">
            {/* Notification button with dynamic title based on pending count */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative text-[#79c942] hover:bg-[#79c942]/10"
              onClick={handleNotificationClick}
              title={`${pendingCount > 0 ? `${pendingCount} pending appointment request${pendingCount > 1 ? 's' : ''}` : 'No pending requests'}`}
            >
              <Bell className="h-5 w-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#79c942] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </Button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[280px] sm:w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[80vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {pendingCount > 0 ? `${pendingCount} pending appointment request${pendingCount > 1 ? 's' : ''}` : 'No pending requests'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Debug: {pendingAppointments.length} appointments loaded
                  </p>
                </div>
                
                <div className="p-2">
                  {loadingNotifications ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Loading notifications...</p>
                    </div>
                  ) : pendingAppointments.length > 0 ? (
                    pendingAppointments.map((appointment) => {
                      console.log('Rendering appointment:', appointment);
                      // Extract patient name from notes for pending appointments
                      let patientName = 'Unknown Patient';
                      if (appointment.notes && appointment.notes.includes('Patient Details (Pending):')) {
                        try {
                          const patientDetails = JSON.parse(appointment.notes.split('Patient Details (Pending):')[1].trim());
                          patientName = patientDetails.name || 'Unknown Patient';
                        } catch (error) {
                          console.error('Error parsing patient details:', error);
                          patientName = `Appointment ${appointment.id}`;
                        }
                      } else {
                        // Fallback to appointment ID if no patient details in notes
                        patientName = `Appointment ${appointment.id}`;
                      }

                      return (
                        <Card 
                          key={appointment.id} 
                          className="mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={handleNotificationItemClick}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Calendar className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    New Appointment Request
                                  </p>
                                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Pending
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  From: <span className="font-medium">{patientName}</span>
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(appointment.date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{appointment.time}</span>
                                  </div>
                                </div>
                                {appointment.appointment_type && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Type: {appointment.appointment_type}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No pending appointment requests</p>
                    </div>
                  )}
                </div>
                
                {pendingAppointments.length > 0 && (
                  <div className="p-3 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-[#79c942] text-[#79c942] hover:bg-[#79c942]/10 hover:text-[#79c942]"
                      onClick={handleNotificationItemClick}
                    >
                      View All Pending Requests
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 3. Change message icon button color to solid #79c942 */}
          <Button variant="ghost" size="icon" className="text-[#79c942] hover:bg-[#79c942]/10">
            <MessageSquare className="h-5 w-5" />
          </Button>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-[#79c942]/10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.image} alt={currentUser.name} />
                  <AvatarFallback>
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {currentUser.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSettings} className="cursor-pointer focus:bg-[#79c942]/10 focus:text-[#79c942]">
                <Settings className="mr-2 h-4 w-4 text-[#79c942]" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Logout button with green hover but red text */}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 hover:bg-[#79c942]/10 focus:bg-[#79c942]/10 focus:text-red-600 hover:text-red-600">
                <LogOut className="mr-2 h-4 w-4 text-red-600" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};