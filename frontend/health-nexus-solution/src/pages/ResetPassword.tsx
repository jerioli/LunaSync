import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);
  const navigate = useNavigate();
  const { uidb64, token } = useParams();

  useEffect(() => {
    if (!uidb64 || !token) {
      setIsValidToken(false);
      toast.error('Invalid reset link');
      navigate('/forgot-password');
    }
  }, [uidb64, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uidb64 || !token) return;

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/password-reset-confirm/${uidb64}/${token}/`, {
        new_password: newPassword
      });
      
      if (response.data.success) {
        toast.success('Password has been reset successfully');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Reset password error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
      if (error.response?.status === 400) {
        setIsValidToken(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clinic-gray">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500">Invalid or expired reset link</p>
            <Button 
              onClick={() => navigate('/forgot-password')} 
              className="w-full mt-4"
            >
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-gray relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-clinic-blue opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-clinic-teal opacity-10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-clinic-blue">MedSync</h1>
          <p className="text-gray-500">Reset Password</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
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