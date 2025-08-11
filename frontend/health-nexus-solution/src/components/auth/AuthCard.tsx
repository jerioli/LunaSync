import { cn } from "@/lib/utils";
import React from "react";

interface AuthCardProps {
  children: React.ReactNode;
  isFlipped: boolean;
  className?: string;
}

export const AuthCard = ({ children, isFlipped, className }: AuthCardProps) => {
  return (
    <div className="min-h-[250px] flex items-center justify-center relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
      </div>
      <div className="w-full max-w-md px-4">
        <div className="flip-card-container">
          <div className={cn("flip-card", isFlipped && "flipped", className)}>
            {children}
          </div>
        </div>
      </div>

       <style>{`
        .flip-card-container {
          perspective: 1000px;
          width: 100%;
        }

        .flip-card {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.3s;
          transform-style: preserve-3d;
        }

        .flip-card.flipped {
          transform: rotateY(180deg);
        }

        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flip-card-front {
          transform: rotateY(0deg);
        }

        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export const AuthCardFront = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flip-card-front", className)}>
    {children}
  </div>
);

export const AuthCardBack = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flip-card-back", className)}>
    {children}
  </div>
);