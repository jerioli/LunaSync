import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Stethoscope } from 'lucide-react';

interface ChatbotWelcomeProps {
  onStartChat: () => void;
}

export const ChatbotWelcome = ({ onStartChat }: ChatbotWelcomeProps) => {
  const { t } = useLanguage();
  
  return (
    <div className="p-6 text-center">
      <div className="flex justify-center mb-4">
        <Stethoscope className="h-12 w-12 text-[#79c942]" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Welcome to Dr. MDSync</h2>
      <p className="mb-4 text-gray-600">
        {t('chatbot.greeting')}
      </p>
      <Button onClick={onStartChat} className="bg-[#79c942] hover:bg-[#6bb33a] text-white transition-colors">
        Start Consultation
      </Button>
    </div>
  );
};
