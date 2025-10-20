import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8000/api';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidAccess, setIsValidAccess] = useState(true);
  const [verifiedIdentifier, setVerifiedIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const navigate = useNavigate();
  const { uidb64, token } = useParams();

  useEffect(() => {
    // Check if this is an OTP-based reset (from forgot password flow)
    const storedIdentifier = sessionStorage.getItem('verified_identifier');
    const storedType = sessionStorage.getItem('verified_identifier_type') as 'email' | 'phone';
    
    if (storedIdentifier && storedType) {
      // OTP-based reset flow
      setVerifiedIdentifier(storedIdentifier);
      setIdentifierType(storedType);
      setIsValidAccess(true);
    } else if (uidb64 && token) {
      // Traditional email link reset flow
      setIsValidAccess(true);
    } else {
      // No valid reset method
      setIsValidAccess(false);
      toast.error('Invalid reset access');
      navigate('/forgot-password');
    }
  }, [uidb64, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      let response;
      
      if (verifiedIdentifier) {
        // OTP-based reset flow
        response = await axios.post<{ success: boolean; message?: string }>(
          `${API_BASE_URL}/auth/reset-password-otp/`,
          {
            identifier: verifiedIdentifier,
            identifier_type: identifierType,
            new_password: newPassword
          }
        );
      } else if (uidb64 && token) {
        // Traditional email link reset flow
        response = await axios.post<{ success: boolean; message?: string }>(
          `${API_BASE_URL}/password-reset-confirm/${uidb64}/${token}/`,
          {
            new_password: newPassword
          }
        );
      } else {
        throw new Error('Invalid reset method');
      }
      
      if (response.data.success) {
        toast.success('Password has been reset successfully');
        // Clear the stored identifier after successful reset
        sessionStorage.removeItem('verified_identifier');
        sessionStorage.removeItem('verified_identifier_type');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Reset password error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
      if (error.response?.status === 400) {
        setIsValidAccess(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidAccess) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "linear-gradient(to bottom, #fff 0%, #79c942 300%)",
        }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <KeyRound className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle>Invalid Reset Access</CardTitle>
            <CardDescription>
              This password reset access is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/forgot-password')} 
              className="w-full bg-[#79c942] hover:bg-[#68ab38]"
            >
              Request New Reset Code
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom, #fff 0%, #79c942 300%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#79c942]">MDSync</h1>
          <p className="text-gray-500">Create your new password</p>
        </div>
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-green-100">
                <KeyRound className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {verifiedIdentifier 
                ? `Enter your new password for ${identifierType === 'email' ? 'email' : 'phone'}: ${verifiedIdentifier}`
                : 'Enter your new password below.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="focus-visible:ring-[#79c942] focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="focus-visible:ring-[#79c942] focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#79c942] hover:bg-[#68ab38] text-white transition-colors" 
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword; 