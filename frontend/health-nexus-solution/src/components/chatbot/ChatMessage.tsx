
import React from 'react';
import { MessageType, AppointmentForm } from './types';
import { MessageSender } from './MessageSender';
import { MessageOptions } from './MessageOptions';
import { DateSelector } from './DateSelector';
import { TimeSelector } from './TimeSelector';
import { FileUpload } from './FileUpload';

interface ChatMessageProps {
  message: MessageType;
  appointmentForm: AppointmentForm;
  onOptionSelect: (value: string) => void;
  onDateSelect: (date: Date | undefined) => void;
  onFileUpload?: (file: File) => void;
}

export const ChatMessage = ({ 
  message,
  appointmentForm,
  onOptionSelect,
  onDateSelect,
  onFileUpload
}: ChatMessageProps) => {
  const isUserMessage = message.sender === 'user';
  
  return (
    <div 
      key={message.id} 
      className={`mb-4 flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isUserMessage ? 'bg-clinic-blue text-white' : 'bg-gray-100'} rounded-lg p-3`}>
        {message.sender === 'bot' && (
          <MessageSender name="MedySync" />
        )}
        
        <div className="whitespace-pre-line">{message.text}</div>
        
        {message.options && message.options.length > 0 && (
          <MessageOptions 
            options={message.options} 
            onOptionSelect={onOptionSelect}
            isDarkBackground={isUserMessage}
          />
        )}
        
        {message.dateSelector && (
          <DateSelector 
            selectedDate={appointmentForm.date} 
            onDateSelect={onDateSelect} 
          />
        )}
        
        {message.timeSelector && message.times && (
          <TimeSelector 
            times={message.times} 
            onTimeSelect={onOptionSelect} 
          />
        )}

        {message.fileUpload && onFileUpload && (
          <FileUpload 
            onFileUpload={onFileUpload} 
            label={message.fileUploadLabel || "Upload File"} 
            accept={message.fileUploadAccept}
          />
        )}
      </div>
    </div>
  );
};
