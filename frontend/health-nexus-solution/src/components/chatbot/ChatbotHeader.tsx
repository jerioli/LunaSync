
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { BotMessageSquare } from 'lucide-react';

export const ChatbotHeader = () => {
  return (
    <CardHeader className="bg-clinic-blue text-white flex flex-row items-center gap-2">
      <BotMessageSquare className="h-6 w-6 text-white" />
      <CardTitle>MedySync Assistant</CardTitle>
    </CardHeader>
  );
};
