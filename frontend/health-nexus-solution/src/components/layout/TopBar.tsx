import React from 'react';
import { Bell, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClinic } from '@/contexts/ClinicContext';
import { useNavigate } from 'react-router-dom';

export const TopBar: React.FC = () => {
  const { currentUser, setCurrentUser } = useClinic();
  const navigate = useNavigate();

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');  // Clear user data
    setCurrentUser(null);             // Reset the context
    navigate('/login');              // Redirect to login page
  };

  if (!currentUser) return null; // If no user, don't render the top bar

  return (
    <header className="py-3 px-6 border-b bg-white flex items-center justify-between">
      <div className="flex items-center">
        <SidebarTrigger />
        <div className="ml-4 relative max-w-md w-64 lg:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="pl-8 bg-muted/30 border-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            3
          </span>
        </Button>
        <Button variant="ghost" size="icon">
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Avatar>
          <AvatarImage src={currentUser.image} alt={currentUser.name} />
          <AvatarFallback
            onClick={handleLogout}  // Add the logout handler here
            className="cursor-pointer hover:bg-red-100 transition rounded-full px-2 py-1"
            title="Logout"
          >
            {currentUser.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
