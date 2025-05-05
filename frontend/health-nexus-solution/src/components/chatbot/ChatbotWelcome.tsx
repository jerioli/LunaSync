
import React from 'react';
import { Button } from '@/components/ui/button';

interface ChatbotWelcomeProps {
  onStartChat: () => void;
}

export const ChatbotWelcome = ({ onStartChat }: ChatbotWelcomeProps) => {
  return (
    <div className="p-6 text-center">
      <p className="mb-4 text-gray-600">
        Welcome to MedySync Chat Assistant. I can help you schedule appointments, check your medical records, and answer questions.
      </p>
      <Button onClick={onStartChat}>Start Chat</Button>
    </div>
  );
};
