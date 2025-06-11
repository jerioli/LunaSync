import React from 'react';
import { Button } from '@/components/ui/button';
import { Stethoscope } from 'lucide-react';

interface ChatbotWelcomeProps {
  onStartChat: () => void;
}

export const ChatbotWelcome = ({ onStartChat }: ChatbotWelcomeProps) => {
  return (
    <div className="p-6 text-center">
      <div className="flex justify-center mb-4">
        <Stethoscope className="h-12 w-12 text-clinic-blue" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Welcome to Dr. MedySync</h2>
      <p className="mb-4 text-gray-600">
        I'm your virtual healthcare assistant. I can help you schedule appointments, 
        request medical records, and answer your healthcare-related questions. 
        How may I assist you today?
      </p>
      <Button onClick={onStartChat} className="bg-clinic-blue hover:bg-clinic-blue/90">
        Start Consultation
      </Button>
    </div>
  );
};
