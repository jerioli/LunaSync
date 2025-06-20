import React, { useRef, useEffect } from 'react';
import { MessageType, AppointmentForm } from './types';
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
import DatePicker from 'react-datepicker';
interface ChatMessagesContainerProps {
  messages: MessageType[];
  appointmentForm: AppointmentForm;
  onOptionSelect: (value: string) => void;
  onDateSelect: (date: Date | undefined) => void;
  onFileUpload?: (file: File) => void;
}

export const ChatMessagesContainer = ({
  messages,
  appointmentForm,
  onOptionSelect,
  onDateSelect,
  onFileUpload
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
          {/* Render options if present */}
          {message.type === 'options' && message.options && (
            <div className="flex gap-2 mt-2">
              {message.options.map(option => (
                <Button key={option.value} onClick={() => onOptionSelect(option.value)}>
                  {option.label}
                </Button>
              ))}
            </div>
          )}
          {/* Render date picker if needed */}
          {message.type === 'date' && (
            <DatePicker onSelect={onDateSelect} />
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
