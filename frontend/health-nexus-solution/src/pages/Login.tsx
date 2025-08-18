import { AuthCard, AuthCardFront } from '@/components/auth/AuthCard';
import { OTPVerification } from '@/components/auth/OTPVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClinic } from '@/hooks/useClinicContext';
import { loginWithSession } from '@/utils/sessionManager';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000/api';

const flipCardStyles = {
  wrapper: "relative w-full perspective-1000",
  inner: "relative w-full h-full transition-transform duration-500 transform-style-preserve-3d",
  front: "absolute w-full backface-hidden",
  back: "absolute w-full backface-hidden rotate-y-180"  
};

const Login = () => {
  // Traditional login states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Error states for visual feedback
  const [loginError, setLoginError] = useState('');
  const [hasLoginError, setHasLoginError] = useState(false);
  
  // OTP login states
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [activeTab, setActiveTab] = useState('password');
  const [isFlipped, setIsFlipped] = useState(false);
  
  const { setCurrentUser } = useClinic();
  const navigate = useNavigate();

  // Clear error state when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (hasLoginError) {
      setHasLoginError(false);
      setLoginError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (hasLoginError) {
      setHasLoginError(false);
      setLoginError('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    setHasLoginError(false);
    
    try {
      console.log('Attempting session-based login...');
      
      // Use the new session-based authentication
      const result = await loginWithSession({ email, password });
      
      if (result.success) {
        console.log('=== Session Login Success ===');
        console.log('Full result received:', result);
        console.log('force_password_change value:', result.force_password_change);
        console.log('force_password_change type:', typeof result.force_password_change);
        
        const user = {
          id: String(result.user.id),
          name: result.user.name,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role || 'doctor',
          sessionId: result.session_id,
          force_password_change: result.force_password_change // Include force_password_change
        };
        
        console.log('Session login successful:', user);
        console.log('User force_password_change value:', user.force_password_change);
        console.log('User force_password_change type:', typeof user.force_password_change);
        
        // Store user data (no JWT tokens needed for session-based auth)
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('sessionId', result.session_id);
        setCurrentUser(user);
        
        // Check if user needs to change password
        console.log('Checking force_password_change condition...');
        if (user.force_password_change) {
          console.log('User needs to change password - navigating directly');
          toast.success('Welcome! Please change your password to continue.');
          
          // Navigate directly to change-password page
          setTimeout(() => {
            navigate('/change-password');
          }, 100);
        } else {
          console.log('Normal login flow - redirecting to dashboard');
          toast.success(`Welcome back, ${user.name}!`);
          
          // Use setTimeout to ensure state is updated before navigation
          setTimeout(() => {
            navigate('/');
          }, 100);
        }
      } else {
        // Set error state for invalid credentials
        setLoginError('Invalid username or password');
        setHasLoginError(true);
      }
    } catch (error: any) {
      console.error('Session login error:', error);
      
      // Set error state for any login failure
      setLoginError('Invalid username or password');
      setHasLoginError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Login Functions
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingOtp(true);
    
    try {
      // Validate identifier format
      if (identifierType === 'email' && !otpIdentifier.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
      
      if (identifierType === 'phone' && !/^\+?[\d\s\-\(\)]{10,}$/.test(otpIdentifier)) {
        toast.error('Please enter a valid phone number');
        return;
      }

      // Send OTP request to backend
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp/`, {
        identifier: otpIdentifier,
        identifier_type: identifierType
      });

      if (response.data.success) {
        toast.success(`OTP sent to your ${identifierType}`);
        setIsOtpMode(true);
      } else {
        toast.error(response.data.error || 'Failed to send OTP');
      }

    } catch (error: any) {
      console.error('Send OTP error:', error);
      if (error.response?.status === 404) {
        toast.error('No user found with this email or phone number');
      } else {
        toast.error(error.response?.data?.error || 'Failed to send OTP');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOTPVerificationSuccess = (userData: any) => {
    console.log('=== OTP Verification Success ===');
    console.log('Full userData received:', userData);
    console.log('force_password_change value:', userData.force_password_change);
    console.log('force_password_change type:', typeof userData.force_password_change);
    
    // Store session-based user data (no JWT tokens for session auth)
    const user = {
      ...userData,
      sessionId: userData.sessionId || userData.session_id
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    if (userData.sessionId || userData.session_id) {
      localStorage.setItem('sessionId', userData.sessionId || userData.session_id);
    }
    setCurrentUser(user);
    
    // Check if user needs to change password
    console.log('Checking force_password_change condition...');
    if (userData.force_password_change) {
      console.log('User needs to change password - navigating directly');
      toast.success('Welcome! Please change your password to continue.');
      
      // Navigate directly to change-password page
      setTimeout(() => {
        navigate('/change-password');
      }, 100);
    } else {
      console.log('Normal login flow - redirecting to dashboard');
      toast.success(`Welcome back, ${userData.name}!`);
      
      // Use setTimeout to ensure state is updated before navigation
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
  };

  const handleBackToLogin = () => {
    setIsOtpMode(false);
    setOtpIdentifier('');
  };

  // Auto-detect identifier type
  const handleIdentifierChange = (value: string) => {
    setOtpIdentifier(value);
    if (value.includes('@')) {
      setIdentifierType('email');
    } else if (/^\+?[\d\s\-\(\)]+$/.test(value)) {
      setIdentifierType('phone');
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFlipped(true);
    setTimeout(() => {
      navigate('/forgot-password');
    }, 200); // Wait for flip animation
  };

  // If in OTP verification mode, show OTP component
  if (isOtpMode) {
    return (
      <OTPVerification
        identifier={otpIdentifier}
        identifierType={identifierType}
        onVerificationSuccess={handleOTPVerificationSuccess}
        onBack={handleBackToLogin}
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
          <div className="w-full max-w-md px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#79c942]">MDSync</h1>
              <p className="text-gray-500">Staff Login Portal</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your credentials to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="email">Email or Username</Label>
                    <Input 
                      id="email" 
                      placeholder="Enter your email or username"
                      value={email}
                      onChange={handleEmailChange}
                      required
                      className={`focus-visible:ring-[#79c942] focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        hasLoginError ? 'border-red-500 focus-visible:ring-red-500' : ''
                      }`}
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password" 
                        value={password}
                        onChange={handlePasswordChange}
                        required
                        className={`focus-visible:ring-[#79c942] focus-visible:ring-2 focus-visible:ring-offset-2 ${
                          hasLoginError ? 'border-red-500 focus-visible:ring-red-500' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#79c942] transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        type="button"
                        variant="link"
                        className="text-[#79c942] hover:text-[#68ab38] underline-offset-4 hover:underline"
                        onClick={handleForgotPassword}
                      >
                        Forgot password?
                      </Button>
                    </div>
                  </div>
                  
                  {/* Error message display */}
                  {hasLoginError && (
                    <div className="text-red-500 text-sm text-center mt-2">
                      {loginError}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-[#79c942] hover:bg-[#68ab38] text-white transition-colors" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
      </AuthCardFront>
    </AuthCard>
    </div>
  );
};

export default Login;
