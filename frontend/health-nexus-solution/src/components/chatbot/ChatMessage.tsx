import { DatePopover } from './DatePopover';
import { DateSelector } from './DateSelector';
import DateTimePicker from './DateTimePicker';
import { FAQAccordion } from './FAQAccordion';
import { FileUpload } from './FileUpload';
import { MessageOptions } from './MessageOptions';
import { MessageSender } from './MessageSender';
import { TimePopover } from './TimePopover';
import { TimeSelector } from './TimeSelector';
import { TypingIndicator } from './TypingIndicator';
import { AppointmentForm, MessageType } from './types';

interface ChatMessageProps {
  message: MessageType;
  appointmentForm: AppointmentForm;
  onOptionSelect: (value: string, messageKey?: string) => void;
  onDateSelect: (date: Date | undefined) => void;
  onDateTimeSelect?: (date: Date, time: string) => void;
  onDateOnlySelect?: (date: Date) => void; // For separate date picker
  onTimeOnlySelect?: (time: string) => void; // For separate time picker
  onFileUpload?: (file: File) => void;
  onBackToMainMenu?: () => void; // For FAQ accordion
}

export const ChatMessage = ({ 
  message,
  appointmentForm,
  onOptionSelect,
  onDateSelect,
  onDateTimeSelect,
  onDateOnlySelect,
  onTimeOnlySelect,
  onFileUpload,
  onBackToMainMenu
}: ChatMessageProps) => {
  const isUserMessage = message.sender === 'user';
  
  // Handle typing indicator
  if (message.type === 'typing' || message.isTyping) {
    return (
      <div className="mb-4 flex justify-start">
        <div className="max-w-[80%] bg-gray-100 rounded-lg p-3">
          <MessageSender name="Luna" />
          <TypingIndicator />
        </div>
      </div>
    );
  }
  
  return (
    <div 
      key={message.id} 
      className={`mb-4 flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`${message.type === 'datetime-picker' ? 'max-w-[95%] w-full' : 'max-w-[80%]'} ${isUserMessage ? 'bg-[#79c942] text-white' : 'bg-gray-100'} rounded-lg p-3`}>
        {message.sender === 'bot' && (
          <MessageSender name="Luna" />
        )}
        
        <div className="whitespace-pre-line">{message.text}</div>
        
        {message.options && message.options.length > 0 && (
          <MessageOptions 
            options={message.options} 
            onOptionSelect={onOptionSelect}
            isDarkBackground={isUserMessage}
            messageKey={message.messageKey}
          />
        )}

        {message.type === 'datetime-picker' && message.availableDates && message.getTimeSlotsForDate && (
          <DateTimePicker 
            availableDates={message.availableDates}
            selectedDate={appointmentForm.date}
            getTimeSlotsForDate={message.getTimeSlotsForDate}
            onDateTimeSelect={onDateTimeSelect}
            onDateOnlySelect={onDateOnlySelect}
            dateOnlyMode={message.dateOnlyMode || false}
            timeOnlyMode={message.timeOnlyMode || false}
          />
        )}


        
        {message.dateSelector && (
          message.availableDates ? (
            <DatePopover 
              availableDates={message.availableDates}
              selectedDate={message.selectedDate || appointmentForm.date} 
              onDateSelect={(date) => onDateSelect(date)}
              disabled={message.timesDisabled || false}
            />
          ) : (
            <DateSelector 
              selectedDate={appointmentForm.date} 
              onDateSelect={onDateSelect} 
            />
          )
        )}
        
        {message.timeSelector && message.times && (
          message.times.length > 0 ? (
            <TimePopover 
              times={message.times}
              selectedTime={message.selectedTime}
              onTimeSelect={(value) => onOptionSelect(value, message.messageKey)}
              disabled={message.timesDisabled || false}
            />
          ) : (
            <TimeSelector 
              times={message.times} 
              onTimeSelect={(value) => onOptionSelect(value, message.messageKey)}
              disabled={message.timesDisabled || false}
            />
          )
        )}

        {message.type === 'faq-accordion' && message.faqs && onBackToMainMenu && (
          <FAQAccordion 
            faqs={message.faqs}
            onBackToMainMenu={onBackToMainMenu}
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
