import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSendMessage: () => void;
  placeholder?: string;
  isInputDisabled?: boolean;
  onCancel?: () => void;
  showCancel?: boolean;
}

export const ChatInput = ({
  input,
  setInput,
  handleSendMessage,
  placeholder,
  isInputDisabled = false,
  onCancel,
  showCancel = false,
}: ChatInputProps) => {
  return (
    <div className="flex w-full gap-2">
      <Input
        placeholder={placeholder || "Type your message..."}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) =>
          e.key === "Enter" && !isInputDisabled && handleSendMessage()
        }
        disabled={isInputDisabled}
        className="flex-1 placeholder:text-[#79c942]/70 focus-visible:ring-1 focus-visible:ring-[#79c942]/40 focus-visible:ring-offset-[#79c942]/10 border-[#79c942]/20"
      />
      {showCancel && onCancel && (
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
          title="Cancel current transaction"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
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
