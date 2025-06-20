import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope } from 'lucide-react';

export const ChatbotHeader = () => {
  return (
    <CardHeader className="bg-clinic-blue text-white flex flex-row items-center gap-2">
      <Stethoscope className="h-6 w-6 text-white" />
      <CardTitle>Dr. MedySync</CardTitle>
    </CardHeader>
  );
};
