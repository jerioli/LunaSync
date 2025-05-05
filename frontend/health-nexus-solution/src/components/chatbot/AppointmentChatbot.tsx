
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useChatbotLogic } from './useChatbotLogic';
import { ChatbotHeader } from './ChatbotHeader';
import { ChatbotWelcome } from './ChatbotWelcome';
import { ChatInput } from './ChatInput';
import { ChatMessagesContainer } from './ChatMessagesContainer';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppointmentChatbotProps {
  onClose?: () => void;
}

export const AppointmentChatbot = ({ onClose }: AppointmentChatbotProps) => {
  const {
    messages,
    input,
    setInput,
    showChat,
    appointmentForm,
    handleSendMessage,
    handleOptionSelect,
    handleDateSelect,
    handleFileUpload,
    startChat
  } = useChatbotLogic();

  return (
    <Card className="w-full shadow-lg">
      <div className="flex justify-between items-center p-4 border-b">
        <ChatbotHeader />
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <CardContent className="p-0">
        {!showChat ? (
          <ChatbotWelcome onStartChat={startChat} />
        ) : (
          <ChatMessagesContainer 
            messages={messages}
            appointmentForm={appointmentForm}
            onOptionSelect={handleOptionSelect}
            onDateSelect={handleDateSelect}
            onFileUpload={handleFileUpload}
          />
        )}
      </CardContent>
      
      {showChat && (
        <CardFooter className="p-2 border-t">
          <ChatInput
            input={input}
            setInput={setInput}
            handleSendMessage={handleSendMessage}
            placeholder={input === '' ? "Say hi to start..." : "Type your message..."}
          />
        </CardFooter>
      )}
    </Card>
  );
};
