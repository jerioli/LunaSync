import { CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Stethoscope } from 'lucide-react';

export const ChatbotHeader = () => {
  const { t } = useLanguage();
  
  return (
    <CardHeader className="bg-clinic-blue text-white flex flex-row items-center gap-2">
      <Stethoscope className="h-6 w-6 text-white" />
      <CardTitle>{t('chatbot.chatAssistant')}</CardTitle>
    </CardHeader>
  );
};
