import { AuthCard, AuthCardFront } from '@/components/auth/AuthCard';
import { OTPVerification } from '@/components/auth/OTPVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ENV } from '@/config/env';
import axios from 'axios';
import { Info, Mail, Phone } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE_URL = ENV.API_URL;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const navigate = useNavigate();

  // Replace single otpIdentifier with separate states for email and phone
  const [emailIdentifier, setEmailIdentifier] = useState('');
  const [phoneIdentifier, setPhoneIdentifier] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentIdentifier = activeTab === 'email' ? emailIdentifier : phoneIdentifier;
    
    if (!currentIdentifier) {
      toast.error(`Please enter your ${activeTab === 'email' ? 'email address' : 'phone number'}`);
      return;
    }

    // Validate phone number if phone tab is active
    if (activeTab === 'phone') {
      const digitsOnly = currentIdentifier.replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        toast.error('Please enter a valid 11-digit phone number');
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp/`, {
        identifier: currentIdentifier,
        identifier_type: activeTab
      });
      
      if (response.data.success) {
        toast.success(`Verification code sent to your ${activeTab}`);
        setIsOtpMode(true);
      }
    } catch (error: any) {
      console.error('Password reset error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifierChange = (value: string) => {
    if (activeTab === 'phone') {
      // Only allow numeric input and limit to 11 digits
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 11) {
        setPhoneIdentifier(digitsOnly);
      }
    } else {
      setEmailIdentifier(value);
    }
  };

  const handleBackToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFlipped(true);
    setTimeout(() => {
      navigate('/login');
    }, 200);
  };

  const handleVerificationSuccess = (userData: any) => {
    toast.success('Verification successful!');
    // For password reset flow, we need to pass the verified identifier
    // Store it temporarily in sessionStorage for the reset password page
    sessionStorage.setItem('verified_identifier', activeTab === 'email' ? emailIdentifier : phoneIdentifier);
    sessionStorage.setItem('verified_identifier_type', activeTab);
    navigate('/reset-password');
  };

  // If in OTP verification mode, show OTP component
  if (isOtpMode) {
    return (
      <OTPVerification
        identifier={activeTab === 'email' ? emailIdentifier : phoneIdentifier}
        identifierType={activeTab}
        onVerificationSuccess={handleVerificationSuccess}
        onBack={() => setIsOtpMode(false)}
      />
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: "linear-gradient(to bottom, #fff 0%, #79c942 300%)",
      }}
    >
    <AuthCard isFlipped={isFlipped}>
      <AuthCardFront>
        <div className="text-center mb-8">
                      <h1 className="text-3xl font-bold text-[#79c942]">LUNASync</h1>
                      <p className="text-gray-500">Recover your account</p>
                    </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Choose how you want to receive the OTP verification code:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full" onValueChange={(value) => setActiveTab(value as 'email' | 'phone')}>
              <TabsList className="grid w-[320px] grid-cols-2 gap-4 mb-6 mx-auto"> {/* Added mx-auto and w-[320px] */}
                <TabsTrigger 
                  value="email" 
                  className="flex items-center justify-center gap-2 data-[state=active]:bg-[#79c942] data-[state=active]:text-white hover:bg-[#79c942]/50 w-[150px]" // Added justify-center
                >
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger 
                  value="phone" 
                  className="flex items-center justify-center gap-2 data-[state=active]:bg-[#79c942] data-[state=active]:text-white hover:bg-[#79c942]/50 w-[150px]" // Added justify-center
                >
                  <Phone className="h-4 w-4" />
                  Phone
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">
                    {activeTab === 'email' ? 'Email Address' : 'Phone Number'}
                  </Label>
                  <Input 
                    id="identifier" 
                    type={activeTab === 'email' ? 'email' : 'tel'}
                    placeholder={activeTab === 'email' ? 'Enter your email' : 'Enter your phone number'}
                    value={activeTab === 'email' ? emailIdentifier : phoneIdentifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    required
                    inputMode={activeTab === 'phone' ? 'numeric' : 'email'}
                    className="focus-visible:ring-[#79c942] focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                  {activeTab === 'phone' && (
  <div className="flex flex-col space-y-1">
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <Info className="h-3 w-3" />
      <span>Enter 11 digits phone number</span>
    </div>
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <Info className="h-3 w-3" />
      <span>Enter your valid and registered phone number in your account</span>
    </div>
  </div>
)}
{activeTab === 'email' && (
  <div className="flex flex-col space-y-1">
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <Info className="h-3 w-3" />
      <span>Enter your valid and registered email address in your account</span>
    </div>
  </div>
)}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#79c942] hover:bg-[#68ab38] text-white transition-colors" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Instructions'}
                </Button>
                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-[#79c942] hover:text-[#68ab38] underline-offset-4 hover:underline"
                    onClick={handleBackToLogin}
                  >
                    Back to Login
                  </Button>
                </div>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </AuthCardFront>
    </AuthCard>
    </div>
  );
};

export default ForgotPassword;