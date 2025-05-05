import { useContext } from 'react';
import { ClinicContext } from '@/contexts/ClinicContext';
import { ClinicContextType } from '@/types/clinic';

export const useClinic = (): ClinicContextType => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};