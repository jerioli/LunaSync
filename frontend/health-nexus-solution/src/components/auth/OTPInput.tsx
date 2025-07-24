import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onOtpChange?: (otp: string) => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({ 
  length = 6, 
  onComplete, 
  onOtpChange,
  className,
  disabled = false,
  error = false
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;
    
    // Only allow digits
    const sanitizedValue = value.replace(/[^0-9]/g, '');
    
    if (sanitizedValue.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = sanitizedValue;
      setOtp(newOtp);
      
      const otpString = newOtp.join('');
      onOtpChange?.(otpString);
      
      // Auto-focus next input
      if (sanitizedValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Call onComplete when all fields are filled
      if (otpString.length === length) {
        onComplete(otpString);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current input is empty, focus previous input
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        onOtpChange?.(newOtp.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    
    if (pastedText.length <= length) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedText.length; i++) {
        newOtp[i] = pastedText[i];
      }
      setOtp(newOtp);
      
      const otpString = newOtp.join('');
      onOtpChange?.(otpString);
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedText.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      
      if (otpString.length === length) {
        onComplete(otpString);
      }
    }
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {otp.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "w-12 h-12 text-center text-lg font-semibold",
            error && "border-red-500 focus:border-red-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          autoComplete="off"
        />
      ))}
    </div>
  );
};

export default OTPInput;
