
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';

const Index = () => {
  const navigate = useNavigate();
  const { currentUser } = useClinic();

  useEffect(() => {
    // Small delay to ensure context is properly initialized
    const timer = setTimeout(() => {
      if (currentUser) {
        navigate('/');
      } else {
        navigate('/portal');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-gray">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Loading HealthNexus...</h1>
        <p className="text-xl text-gray-600">Please wait while we load your clinic management system.</p>
      </div>
    </div>
  );
};

export default Index;
