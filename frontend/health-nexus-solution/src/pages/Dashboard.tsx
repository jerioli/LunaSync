import { useEffect, useState } from 'react';
import DoctorDashboard from '@/components/dashboards/DoctorDashboard';
import ReceptionistDashboard from '@/components/dashboards/ReceptionistDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';


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
    default:
      return <div>Unknown role</div>;
  }
};

export default Dashboard;
