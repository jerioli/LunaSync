import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSendMessage: () => void;
  placeholder?: string;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  handleSendMessage, 
  placeholder 
}: ChatInputProps) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex w-full gap-2">
      <Input
        placeholder={placeholder || t('chatbot.typeMessage')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        className="flex-1 placeholder:text-[#79c942]/70 focus-visible:ring-1 focus-visible:ring-[#79c942]/40 focus-visible:ring-offset-[#79c942]/10 border-[#79c942]/20"
      />
      <Button 
        onClick={handleSendMessage} 
        className="bg-[#79c942] hover:bg-[#6bb33a] focus-visible:ring-[#79c942]"
      >
        Send
      </Button>
    </div>
  );
};
