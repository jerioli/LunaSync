import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ChatbotHeader } from './ChatbotHeader';
import { ChatbotWelcome } from './ChatbotWelcome';
import { ChatInput } from './ChatInput';
import { ChatMessagesContainer } from './ChatMessagesContainer';
import { useChatbotLogic } from './useChatbotLogic';

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
    handleDateTimeSelect,
    handleDateOnlySelect,
    handleTimeOnlySelect,
    handleFileUpload,
    handleFormSubmit,
    handleFormCancel,
    handleBackToMainMenu,
    startChat,
    isInputDisabled
  } = useChatbotLogic();

  return (
    <Card className="w-full shadow-lg">
      <ChatbotHeader onClose={onClose} />
      
      <CardContent className="p-0">
        {!showChat ? (
          <ChatbotWelcome onStartChat={startChat} />
        ) : (
          <ChatMessagesContainer 
            messages={messages}
            appointmentForm={appointmentForm}
            onOptionSelect={handleOptionSelect}
            onDateSelect={handleDateSelect}
            onDateTimeSelect={handleDateTimeSelect}
            onDateOnlySelect={handleDateOnlySelect}
            onTimeOnlySelect={handleTimeOnlySelect}
            onFileUpload={handleFileUpload}
            onFormSubmit={handleFormSubmit}
            onFormCancel={handleFormCancel}
            onBackToMainMenu={handleBackToMainMenu}
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
            isInputDisabled={isInputDisabled}
          />
        </CardFooter>
      )}
    </Card>
  );
};
