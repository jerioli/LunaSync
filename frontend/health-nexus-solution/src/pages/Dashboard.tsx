import AdminDashboard from '@/components/dashboards/AdminDashboard';
import DoctorDashboard from '@/components/dashboards/DoctorDashboard';
import ReceptionistDashboard from '@/components/dashboards/ReceptionistDashboard';
import { useEffect, useState } from 'react';


const Dashboard = () => {
  
  const [currentUser, setCurrentUser] = useState(null);
  console.log('Dashboard loaded:', currentUser);
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  if (!currentUser) {
    return <div>Loading...</div>;
  }
  

  switch (currentUser.role.toLowerCase()) {
    case 'doctor':
      return <DoctorDashboard />;
    case 'receptionist':
      return <ReceptionistDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'superadmin':
      return <AdminDashboard />; // Superadmin uses the same dashboard as admin but with extended permissions
    default:
      return <div>Unknown role</div>;
  }
};

export default Dashboard;
