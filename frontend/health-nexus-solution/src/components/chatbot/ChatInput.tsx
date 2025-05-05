
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSendMessage: () => void;
  placeholder: string;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  handleSendMessage, 
  placeholder 
}: ChatInputProps) => {
  return (
    <div className="flex w-full gap-2">
      <Input
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        className="flex-1"
      />
      <Button onClick={handleSendMessage}>Send</Button>
    </div>
  );
};
