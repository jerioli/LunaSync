import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ENV } from '@/config/env';
import { useClinic } from '@/hooks/useClinicContext';
import axios from 'axios';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE_URL = ENV.API_URL;

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { currentUser, setCurrentUser } = useClinic();
  const navigate = useNavigate();

  // Password strength validation function
  const validatePasswordStrength = (password: string) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const errors = [];
    if (!requirements.minLength) errors.push('At least 8 characters');
    if (!requirements.hasUppercase) errors.push('One uppercase letter');
    if (!requirements.hasLowercase) errors.push('One lowercase letter');
    if (!requirements.hasNumber) errors.push('One number');
    if (!requirements.hasSpecialChar) errors.push('One special character');

    return {
      isValid: Object.values(requirements).every(req => req),
      requirements,
      errors
    };
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      setIsLoading(false);
      return;
    }

    // Strong password validation
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      toast.error(`Password must have: ${passwordValidation.errors.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/change-password/`, {
        email: currentUser?.email,
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        
        // Update user context with the complete user data from backend response
        if (response.data.user) {
          const updatedUser = {
            ...response.data.user,
            // Ensure permissions are properly set
            force_password_change: false
          };
          
          setCurrentUser(updatedUser);
          
          // Update localStorage as well
          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.setItem('sessionId', response.data.session_id || '');
          
          console.log('[DEBUG] Password changed - Updated user context:', updatedUser);
        } else if (currentUser) {
          // Fallback: manually update existing user context
          const updatedUser = {
            ...currentUser,
            force_password_change: false
          };
          
          setCurrentUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        // Navigate to appropriate dashboard based on role
        navigate('/');
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to change password. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <KeyRound className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle>Change Your Password</CardTitle>
          <CardDescription>
            For security purposes, please change your temporary password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Create a strong password (8+ chars, upper, lower, number, special)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
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
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Password Strength:</div>
                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                      validatePasswordStrength(newPassword).isValid 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {validatePasswordStrength(newPassword).isValid ? 'Strong' : 'Weak'}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {(() => {
                      const validation = validatePasswordStrength(newPassword);
                      return [
                        { label: 'At least 8 characters', met: validation.requirements.minLength },
                        { label: 'One uppercase letter (A-Z)', met: validation.requirements.hasUppercase },
                        { label: 'One lowercase letter (a-z)', met: validation.requirements.hasLowercase },
                        { label: 'One number (0-9)', met: validation.requirements.hasNumber },
                        { label: 'One special character (!@#$%...)', met: validation.requirements.hasSpecialChar }
                      ].map((req, index) => (
                        <div key={index} className={`flex items-center gap-2 transition-colors ${
                          req.met ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                            req.met 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}>
                            {req.met && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                          </div>
                          <span className={req.met ? 'font-medium' : ''}>{req.label}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              
              {!newPassword && (
                <p className="text-sm text-gray-500">
                  Password must include uppercase, lowercase, number, and special character
                </p>
              )}
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
              className="w-full" 
              disabled={
                isLoading || 
                !newPassword || 
                !confirmPassword || 
                !currentPassword ||
                newPassword !== confirmPassword ||
                !validatePasswordStrength(newPassword).isValid
              }
            >
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
