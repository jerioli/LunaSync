import { OTPVerification } from '@/components/auth/OTPVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClinic } from '@/hooks/useClinicContext';
import axios from 'axios';
import { Eye, EyeOff, Mail, Phone, Shield } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000/api';

const Login = () => {
  // Traditional login states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP login states
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [activeTab, setActiveTab] = useState('password');
  
  const { setCurrentUser } = useClinic();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log('Starting login process with:', { email, password });
      
      // Validate credentials with backend first
      console.log('Attempting login request to:', `${API_BASE_URL}/login/`);
      const response = await axios.post(`${API_BASE_URL}/login/`, {
        email: email,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('Login response:', response.data);

      if (response.data.success) {
        const user = {
          id: String(response.data.id),
          name: response.data.name || response.data.username,
          username: response.data.username,
          email: response.data.email,
          role: response.data.role || 'doctor',
          accessToken: response.data.access,
          refreshToken: response.data.refresh
        };
        console.log('Creating user object:', user);

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        setCurrentUser(user);
        
        toast.success(`Welcome back, ${user.name}`);
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        config: error.config
      });
      toast.error('Failed to login. Please try again.');
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
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', userData.accessToken);
    localStorage.setItem('refreshToken', userData.refreshToken);
    setCurrentUser(userData);
    
    toast.success(`Welcome back, ${userData.name}`);
    navigate('/');
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
    <div className="min-h-screen flex items-center justify-center bg-clinic-gray dark:bg-gray-900 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-clinic-blue opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-clinic-teal opacity-10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-clinic-blue">MedSync</h1>
          <p className="text-gray-500">Staff Login Portal</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Choose your preferred login method</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Password
                </TabsTrigger>
                <TabsTrigger value="otp" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  OTP
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="password" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <Link 
                        to="/forgot-password" 
                        className="text-sm text-clinic-blue hover:text-clinic-blue/80"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="otp" className="space-y-4 mt-6">
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      Email or Phone Number
                    </Label>
                    <div className="relative">
                      <Input 
                        id="identifier" 
                        placeholder="Enter your email or phone number"
                        value={otpIdentifier}
                        onChange={(e) => handleIdentifierChange(e.target.value)}
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {identifierType === 'email' ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {identifierType === 'email' 
                        ? 'We\'ll send a verification code to your email' 
                        : 'We\'ll send a verification code via SMS'
                      }
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSendingOtp || !otpIdentifier}>
                    {isSendingOtp ? 'Sending OTP...' : `Send OTP via ${identifierType === 'email' ? 'Email' : 'SMS'}`}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
