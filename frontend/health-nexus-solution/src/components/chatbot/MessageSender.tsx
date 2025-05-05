
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BotMessageSquare } from 'lucide-react';

interface MessageSenderProps {
  name: string;
}

export const MessageSender = ({ name }: MessageSenderProps) => {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Avatar className="h-6 w-6">
        <AvatarFallback>
          <BotMessageSquare className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <span className="font-semibold">{name}</span>
    </div>
  );
};
