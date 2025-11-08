import { Button } from '@/components/ui/button';
import { Stethoscope } from 'lucide-react';

interface ChatbotWelcomeProps {
  onStartChat: () => void;
}

export const ChatbotWelcome = ({ onStartChat }: ChatbotWelcomeProps) => {
  return (
    <div className="p-6 text-center">
      <div className="flex justify-center mb-4">
        <Stethoscope className="h-12 w-12 text-[#79c942]" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Hi! I'm Luna.</h2>
      <p className="mb-4 text-gray-600">
        Your AI Health Assistant. I'm here to help you with health information and guide you through our services.
      </p>
      <Button onClick={onStartChat} className="bg-[#79c942] hover:bg-[#6bb33a] text-white transition-colors">
        Start Consultation
      </Button>
    </div>
  );
};
