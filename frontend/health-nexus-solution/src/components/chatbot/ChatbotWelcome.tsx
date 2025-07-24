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
<<<<<<< HEAD
      <h2 className="text-xl font-semibold mb-2">{t('chatbot.welcome')}</h2>
=======
      <h2 className="text-xl font-semibold mb-2">Welcome to Dr. MDSync</h2>
>>>>>>> origin/main
      <p className="mb-4 text-gray-600">
        {t('chatbot.greeting')}
      </p>
<<<<<<< HEAD
      <Button onClick={onStartChat} className="bg-clinic-blue hover:bg-clinic-blue/90">
        {t('chatbot.startConsultation')}
=======
      <Button onClick={onStartChat} className="bg-[#79c942] hover:bg-[#6bb33a] text-white transition-colors">
        Start Consultation
>>>>>>> origin/main
      </Button>
    </div>
  );
};
