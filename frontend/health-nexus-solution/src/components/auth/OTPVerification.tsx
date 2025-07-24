import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { ArrowLeft, Mail, Phone, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { OTPInput } from './OTPInput';

interface OTPVerificationProps {
  identifier: string; // email or phone
  identifierType: 'email' | 'phone';
  onVerificationSuccess: (userData: any) => void;
  onBack: () => void;
  className?: string;
}

const API_BASE_URL = 'http://localhost:8000/api';

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  identifier,
  identifierType,
  onVerificationSuccess,
  onBack,
  className
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOTPComplete = async (otpValue: string) => {
    setOtp(otpValue);
    await verifyOTP(otpValue);
  };

  const verifyOTP = async (otpValue: string) => {
    setIsVerifying(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp/`, {
        identifier,
        identifier_type: identifierType,
        otp: otpValue
      });

      if (response.data.success) {
        const userData = {
          id: String(response.data.user.id),
          name: response.data.user.name || response.data.user.username,
          username: response.data.user.username,
          email: response.data.user.email,
          phone: response.data.user.phone,
          role: response.data.user.role || 'doctor',
          accessToken: response.data.user.accessToken,
          refreshToken: response.data.user.refreshToken
        };

        toast.success('Login successful!');
        onVerificationSuccess(userData);
      } else {
        setError(response.data.error || 'Invalid OTP');
        toast.error('Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to verify OTP';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp/`, {
        identifier,
        identifier_type: identifierType
      });

      if (response.data.success) {
        toast.success(`New OTP sent to your ${identifierType}`);
        setTimeLeft(300); // Reset timer
        setCanResend(false);
        setOtp('');
      } else {
        toast.error(response.data.error || 'Failed to resend OTP');
      }
      
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (otpValue: string) => {
    setOtp(otpValue);
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleManualVerify = () => {
    if (otp.length === 6) {
      verifyOTP(otp);
    } else {
      toast.error('Please enter a complete 6-digit OTP');
    }
  };

  const maskedIdentifier = identifierType === 'email' 
    ? identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : identifier.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-gray dark:bg-gray-900 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-clinic-blue opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-clinic-teal opacity-10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-clinic-blue">MedSync</h1>
          <p className="text-gray-500">Verify Your Identity</p>
        </div>
        
        <Card className={className}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              {identifierType === 'email' ? (
                <Mail className="h-6 w-6 text-blue-600" />
              ) : (
                <Phone className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to<br />
              <span className="font-semibold text-foreground">{maskedIdentifier}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <OTPInput
                length={6}
                onComplete={handleOTPComplete}
                onOtpChange={handleOtpChange}
                disabled={isVerifying}
                error={!!error}
                className="mb-4"
              />
              
              {error && (
                <div className="text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <Button 
                onClick={handleManualVerify}
                disabled={isVerifying || otp.length !== 6}
                className="w-full"
              >
                {isVerifying ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>

            <div className="text-center space-y-3">
              <div className="text-sm text-gray-600">
                {timeLeft > 0 ? (
                  <>Code expires in {formatTime(timeLeft)}</>
                ) : (
                  <span className="text-red-600">Code expired</span>
                )}
              </div>
              
              <Button
                variant="ghost"
                onClick={handleResendOTP}
                disabled={!canResend || isResending}
                className="text-blue-600 hover:text-blue-700"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Resend ${identifierType === 'email' ? 'Email' : 'SMS'}`
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OTPVerification;
