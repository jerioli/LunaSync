import { AuthCard, AuthCardFront } from "@/components/auth/AuthCard";
import { OTPVerification } from "@/components/auth/OTPVerification";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClinic } from "@/hooks/useClinicContext";
// import { loginWithSession } from '@/utils/sessionManager';
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API_BASE_URL = "http://localhost:8000/api";

const flipCardStyles = {
  wrapper: "relative w-full perspective-1000",
  inner:
    "relative w-full h-full transition-transform duration-500 transform-style-preserve-3d",
  front: "absolute w-full backface-hidden",
  back: "absolute w-full backface-hidden rotate-y-180",
};

const Login = () => {
  // Traditional login states
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Error states for visual feedback
  const [loginError, setLoginError] = useState("");
  const [hasLoginError, setHasLoginError] = useState(false);

  // 2FA states
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "phone">(
    "email"
  );
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const { setCurrentUser } = useClinic();
  const navigate = useNavigate();

  // Clear error state when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (hasLoginError) {
      setHasLoginError(false);
      setLoginError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (hasLoginError) {
      setHasLoginError(false);
      setLoginError("");
    }
  };

  // 2FA login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");
    setHasLoginError(false);
    try {
      // Step 1: Submit credentials to session-login endpoint
      const response = await axios.post(`${API_BASE_URL}/auth/session-login/`, {
        email,
        password,
      });
      const result = response.data;
      if (result.success && result["2fa_required"]) {
        // 2FA required, show OTP screen
        setOtpIdentifier(result.identifier);
        setIdentifierType(result.identifier_type);
        setIsOtpMode(true);
      } else if (result.success) {
        // (Should not happen in 2FA mode, but fallback)
        toast.success("Login successful!");
        setTimeout(() => navigate("/"), 100);
      } else {
        setLoginError(result.error || "Invalid username or password");
        setHasLoginError(true);
      }
    } catch (error: any) {
      setLoginError("Invalid username or password");
      setHasLoginError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerificationSuccess = (userData: any) => {
    // Store session-based user data (no JWT tokens for session auth)
    const user = {
      ...userData,
      sessionId: userData.sessionId || userData.session_id,
    };
    localStorage.setItem("user", JSON.stringify(user));
    if (userData.sessionId || userData.session_id) {
      localStorage.setItem(
        "sessionId",
        userData.sessionId || userData.session_id
      );
    }
    setCurrentUser(user);
    if (userData.force_password_change) {
      toast.success("Welcome! Please change your password to continue.");
      setTimeout(() => {
        navigate("/change-password");
      }, 100);
    } else {
      toast.success(`Welcome back, ${userData.name}!`);
      setTimeout(() => {
        navigate("/");
      }, 100);
    }
  };

  const handleBackToLogin = () => {
    setIsOtpMode(false);
    setOtpIdentifier("");
  };

  // Auto-detect identifier type
  const handleIdentifierChange = (value: string) => {
    setOtpIdentifier(value);
    if (value.includes("@")) {
      setIdentifierType("email");
    } else if (/^\+?[\d\s\-\(\)]+$/.test(value)) {
      setIdentifierType("phone");
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFlipped(true);
    setTimeout(() => {
      navigate("/forgot-password");
    }, 200); // Wait for flip animation
  };

  // 2FA OTP verification handler (calls session-verify-otp endpoint)
  const handle2FAOTPVerification = async (otpValue: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/session-verify-otp/`,
        {
          identifier: otpIdentifier,
          identifier_type: identifierType,
          otp: otpValue,
        }
      );
      const result = response.data;
      if (result.success) {
        // Store user data
        const user = {
          id: String(result.user.id),
          name: result.user.name,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role || "doctor",
          sessionId: result.session_id,
          force_password_change: result.force_password_change,
          can_manage_appointments: result.user.can_manage_appointments,
          can_manage_patients: result.user.can_manage_patients,
          can_manage_staff: result.user.can_manage_staff,
          can_view_reports: result.user.can_view_reports,
          can_manage_clinic_settings: result.user.can_manage_clinic_settings,
          can_manage_permissions: result.user.can_manage_permissions,
          can_access_integrations: result.user.can_access_integrations,
          can_view_audit_logs: result.user.can_view_audit_logs,
          can_view_usage_reports: result.user.can_view_usage_reports,
          can_access_security_testing: result.user.can_access_security_testing,
        };
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("sessionId", result.session_id);
        setCurrentUser(user);
        if (user.force_password_change) {
          toast.success("Welcome! Please change your password to continue.");
          setTimeout(() => navigate("/change-password"), 100);
        } else {
          toast.success(`Welcome back, ${user.name}!`);
          setTimeout(() => navigate("/"), 100);
        }
      } else {
        toast.error(result.error || "Invalid OTP");
      }
    } catch (error: any) {
      toast.error("Invalid OTP or login session expired. Please try again.");
      setIsOtpMode(false);
    }
  };

  // If in OTP verification mode, show OTP component for 2FA
  if (isOtpMode) {
    return (
      <OTPVerification
        identifier={otpIdentifier}
        identifierType={identifierType}
        onVerificationSuccess={() => {}}
        onBack={handleBackToLogin}
        onOTPComplete={handle2FAOTPVerification}
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
                <CardDescription>
                  Enter your credentials to continue
                </CardDescription>
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
                        hasLoginError
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
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
                          hasLoginError
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#79c942] transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                    {isLoading ? "Logging in..." : "Login"}
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
