import { useEffect, useRef } from 'react';
import { ChatForm } from './ChatForm';
import { ChatMessage } from './ChatMessage';
import { AppointmentForm, MessageType } from './types';

interface ChatMessagesContainerProps {
  messages: MessageType[];
  appointmentForm: AppointmentForm;
  onOptionSelect: (value: string, messageKey?: string) => void;
  onDateSelect: (date: Date | undefined) => void;
  onFileUpload?: (file: File) => void;
  onFormSubmit?: (formData: Record<string, string>) => void;
}

export const ChatMessagesContainer = ({
  messages,
  appointmentForm,
  onOptionSelect,
  onDateSelect,
  onFileUpload,
  onFormSubmit
}: ChatMessagesContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-96 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id}>
          <ChatMessage 
            message={message}
            appointmentForm={appointmentForm}
            onOptionSelect={onOptionSelect}
            onDateSelect={onDateSelect}
            onFileUpload={onFileUpload}
          />
          {message.type === 'form' && message.formFields && onFormSubmit && (
            <ChatForm 
              fields={message.formFields}
              onSubmit={onFormSubmit}
            />
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
