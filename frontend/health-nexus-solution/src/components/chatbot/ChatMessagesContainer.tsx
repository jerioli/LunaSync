import { useEffect, useRef } from 'react';
import { ChatForm } from './ChatForm';
import { ChatMessage } from './ChatMessage';
import { AppointmentForm, MessageType } from './types';

interface ChatMessagesContainerProps {
  messages: MessageType[];
  appointmentForm: AppointmentForm;
  onOptionSelect: (value: string, messageKey?: string) => void;
  onDateSelect: (date: Date | undefined) => void;
  onDateTimeSelect?: (date: Date, time: string) => void;
  onDateOnlySelect?: (date: Date) => void; // For separate date picker
  onTimeOnlySelect?: (time: string) => void; // For separate time picker
  onFileUpload?: (file: File) => void;
  onFormSubmit?: (formData: Record<string, string>) => void;
  onFormCancel?: () => void;
  onBackToMainMenu?: () => void; // For FAQ accordion
}

export const ChatMessagesContainer = ({
  messages,
  appointmentForm,
  onOptionSelect,
  onDateSelect,
  onDateTimeSelect,
  onDateOnlySelect,
  onTimeOnlySelect,
  onFileUpload,
  onFormSubmit,
  onFormCancel,
  onBackToMainMenu
}: ChatMessagesContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-96 overflow-y-auto p-4" style={{ overflowX: 'visible' }}>
      {messages.map((message) => (
        <div key={message.id}>
          <ChatMessage 
            message={message}
            appointmentForm={appointmentForm}
            onOptionSelect={onOptionSelect}
            onDateSelect={onDateSelect}
            onDateTimeSelect={onDateTimeSelect}
            onDateOnlySelect={onDateOnlySelect}
            onTimeOnlySelect={onTimeOnlySelect}
            onFileUpload={onFileUpload}
            onBackToMainMenu={onBackToMainMenu}
          />
          {message.type === 'form' && message.formFields && onFormSubmit && (
            <ChatForm 
              fields={message.formFields}
              onSubmit={onFormSubmit}
              onCancel={message.showCancelOption ? onFormCancel : undefined}
              showCancelButton={message.showCancelOption}
            />
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
