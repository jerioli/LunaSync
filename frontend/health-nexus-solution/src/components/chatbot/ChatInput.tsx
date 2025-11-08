import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSendMessage: () => void;
  placeholder?: string;
  isInputDisabled?: boolean;
}

export const ChatInput = ({ 
  input, 
  setInput, 
  handleSendMessage, 
  placeholder,
  isInputDisabled = false
}: ChatInputProps) => {
  return (
    <div className="flex w-full gap-2">
      <Input
        placeholder={placeholder || 'Type your message...'}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !isInputDisabled && handleSendMessage()}
        disabled={isInputDisabled}
        className="flex-1 placeholder:text-[#79c942]/70 focus-visible:ring-1 focus-visible:ring-[#79c942]/40 focus-visible:ring-offset-[#79c942]/10 border-[#79c942]/20"
      />
      <Button 
        onClick={handleSendMessage} 
        disabled={isInputDisabled}
        className="bg-[#79c942] hover:bg-[#6bb33a] focus-visible:ring-[#79c942] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </Button>
    </div>
  );
};
