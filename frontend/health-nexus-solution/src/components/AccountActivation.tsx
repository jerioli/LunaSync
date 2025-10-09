import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

interface ActivationParams extends Record<string, string | undefined> {
  uid: string;
  token: string;
}

const AccountActivation: React.FC = () => {
  const { uid, token } = useParams<ActivationParams>();
  const navigate = useNavigate();

  // Handle case where uid or token might be undefined
  if (!uid || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Invalid Activation Link
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                The activation link is malformed. Please contact your
                administrator for a new activation link.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Captcha states
  const [showCaptcha, setShowCaptcha] = useState(true);
  const [captchaKey, setCaptchaKey] = useState("");
  const [captchaImageUrl, setCaptchaImageUrl] = useState("");
  const [userCaptchaResponse, setUserCaptchaResponse] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const passwordRequirements = [
    { regex: /.{8,}/, text: "At least 8 characters" },
    { regex: /[A-Z]/, text: "One uppercase letter" },
    { regex: /[a-z]/, text: "One lowercase letter" },
    { regex: /\d/, text: "One number" },
    {
      regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      text: "One special character",
    },
  ];

  // Generate visual captcha from backend
  const generateCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/captcha/generate/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setCaptchaKey(data.captcha_key);
        setCaptchaImageUrl(data.captcha_image_url);
      } else {
        toast.error('Failed to generate captcha');
      }
    } catch (error) {
      console.error('Error generating captcha:', error);
      toast.error('Error generating captcha');
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    generateCaptcha(); // Generate captcha first
    if (uid && token) {
      validateActivationLink();
    }
  }, [uid, token]);

  const validateActivationLink = async () => {
    try {
      console.log('Validating activation link:', { uid, token });
      const response = await fetch(
        `http://localhost:8000/api/activate/${uid}/${token}/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      console.log('Activation validation response:', { status: response.status, data });

      if (data.success) {
        setIsValid(true);
        setUserInfo(data);
      } else {
        setIsValid(false);
        console.error('Activation validation failed:', data.message);
        toast.error(data.message || "Invalid or expired activation link");
      }
    } catch (error) {
      console.error("Error validating activation link:", error);
      setIsValid(false);
      toast.error("Error validating activation link");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCaptchaVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userCaptchaResponse.trim()) {
      toast.error("Please enter the captcha text");
      return;
    }

    setCaptchaLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/captcha/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captcha_key: captchaKey,
          captcha_response: userCaptchaResponse.trim()
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setCaptchaVerified(true);
        setShowCaptcha(false);
        toast.success("Captcha verified successfully!");
      } else {
        toast.error(data.error || "Invalid captcha response");
        await generateCaptcha(); // Generate new captcha
        setUserCaptchaResponse(""); // Clear user input
      }
    } catch (error) {
      console.error('Error verifying captcha:', error);
      toast.error('Error verifying captcha');
      await generateCaptcha(); // Generate new captcha on error
      setUserCaptchaResponse("");
    } finally {
      setCaptchaLoading(false);
    }
  };

  const refreshCaptcha = async () => {
    await generateCaptcha();
    setUserCaptchaResponse("");
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Validate license number for doctors
    if (userInfo && userInfo.role === 'doctor' && !licenseNo.trim()) {
      toast.error("Medical license number is required for doctor accounts");
      return;
    }

    // Check password requirements
    const unmetRequirements = passwordRequirements.filter(
      (req) => !req.regex.test(password)
    );
    if (unmetRequirements.length > 0) {
      toast.error(
        `Password must have: ${unmetRequirements
          .map((req) => req.text)
          .join(", ")}`
      );
      return;
    }

    setIsSubmitting(true);

      try {
      const requestBody: any = {
        new_password: password,
        confirm_password: confirmPassword,
      };

      // Add license number for doctors
      if (userInfo && userInfo.role === 'doctor') {
        requestBody.license_number = licenseNo;
      }

      const response = await fetch(
        `http://localhost:8000/api/activate/${uid}/${token}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Account activated successfully! You can now log in.");
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        toast.error(data.error || "Failed to activate account");
      }
    } catch (error) {
      console.error("Error activating account:", error);
      toast.error("Error activating account");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Validating activation link...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Invalid Activation Link
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                This activation link is either invalid or has expired. Please
                contact your administrator for a new activation link.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show captcha verification before activation form
  if (isValid && showCaptcha && !captchaVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Security Verification
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please complete the captcha to proceed with account activation
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form onSubmit={handleCaptchaVerification} className="space-y-6">
              <div className="text-center">
                <div className="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
                  {captchaLoading ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading captcha...</span>
                    </div>
                  ) : captchaImageUrl ? (
                    <img 
                      src={captchaImageUrl} 
                      alt="Captcha" 
                      className="mx-auto border rounded"
                      style={{ maxWidth: '200px', height: 'auto' }}
                    />
                  ) : (
                    <div className="text-gray-600 h-20 flex items-center justify-center">
                      Captcha not loaded
                    </div>
                  )}
                  <div className="text-sm text-gray-600 mt-2">
                    Enter the text shown in the image above
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="captchaResponse"
                  className="block text-sm font-medium text-gray-700"
                >
                  Captcha Text
                </label>
                <div className="mt-1 flex">
                  <input
                    id="captchaResponse"
                    name="captchaResponse"
                    type="text"
                    required
                    value={userCaptchaResponse}
                    onChange={(e) => setUserCaptchaResponse(e.target.value)}
                    className="flex-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-l-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter the captcha text"
                    disabled={captchaLoading}
                  />
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    disabled={captchaLoading}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    title="Refresh captcha"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!userCaptchaResponse || captchaLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {captchaLoading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Activate Your Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete your account setup by creating a secure password
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {userInfo && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-800">
                Account Information
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <strong>Username:</strong> {userInfo.username}
                </p>
                <p>
                  <strong>Email:</strong> {userInfo.email}
                </p>
                {userInfo.role && (
                  <p>
                    <strong>Role:</strong> {userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleActivation} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg
                    className={`h-5 w-5 text-gray-400 ${
                      showPassword ? "hidden" : "block"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <svg
                    className={`h-5 w-5 text-gray-400 ${
                      showPassword ? "block" : "hidden"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <svg
                    className={`h-5 w-5 text-gray-400 ${
                      showConfirmPassword ? "hidden" : "block"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <svg
                    className={`h-5 w-5 text-gray-400 ${
                      showConfirmPassword ? "block" : "hidden"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* License Number field - only for doctors */}
            {userInfo && userInfo.role === 'doctor' && (
              <div>
                <label
                  htmlFor="licenseNo"
                  className="block text-sm font-medium text-gray-700"
                >
                  Medical License Number
                </label>
                <div className="mt-1">
                  <input
                    id="licenseNo"
                    name="licenseNo"
                    type="text"
                    required
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your medical license number"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your medical license number is required for doctor account activation
                </p>
              </div>
            )}

            {/* Password Requirements */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Password Requirements:
              </h4>
              <ul className="text-xs space-y-1">
                {passwordRequirements.map((req, index) => (
                  <li
                    key={index}
                    className={`flex items-center ${
                      req.regex.test(password)
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    <svg
                      className={`h-3 w-3 mr-2 ${
                        req.regex.test(password)
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {req.text}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={
                  isSubmitting || password !== confirmPassword || !password
                }
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Activating Account...
                  </div>
                ) : (
                  "Activate Account"
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountActivation;
