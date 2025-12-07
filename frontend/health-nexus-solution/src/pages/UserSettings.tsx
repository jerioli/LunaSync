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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranding } from "@/contexts/BrandingContext";
import { useClinic } from "@/contexts/ClinicContext";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

const UserSettings = () => {
  const { currentUser, setCurrentUser } = useClinic();
  const { colors } = useBranding();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    appointmentReminders: true,
    systemUpdates: false,
    // Patient notifications
    medicalCertificateStatusNotifications: true,
    prescriptionStatusNotifications: true,
    appointmentStatusNotifications: true,
  });

  // Two-factor authentication setting
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const [loading, setLoading] = useState(false);

  // Parse the name field to get first and last names, but prefer existing separate fields
  useEffect(() => {
    if (currentUser) {
      setProfileData((prev) => ({
        ...prev,
        firstName:
          currentUser.first_name ||
          (currentUser.name ? currentUser.name.split(" ")[0] : "") ||
          "",
        lastName:
          currentUser.last_name ||
          (currentUser.name
            ? currentUser.name.split(" ").slice(1).join(" ")
            : "") ||
          "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      }));
    }
  }, [currentUser]);

  // Load 2FA status
  useEffect(() => {
    const load2FAStatus = async () => {
      try {
        const response = await axios.get("/auth/toggle-2fa/");
        setTwoFactorEnabled(response.data.otp_enabled);
      } catch (error) {
        console.error("Error loading 2FA status:", error);
      }
    };

    if (currentUser) {
      load2FAStatus();
    }
  }, [currentUser]);
  const handleProfileUpdate = async () => {
    if (!currentUser) return;

    // Validate required fields
    if (
      !profileData.firstName.trim() ||
      !profileData.lastName.trim() ||
      !profileData.email.trim() ||
      !profileData.phone.trim()
    ) {
      toast({
        title: "Validation Error",
        description: "All fields are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.patch(`/users/${currentUser.id}/`, {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
      });

      // Construct the full name for display
      const fullName =
        `${profileData.firstName} ${profileData.lastName}`.trim();

      // Update current user in context
      setCurrentUser({
        ...currentUser,
        name: fullName,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
      });

      // Disable editing mode after successful save
      setIsEditingProfile(false);

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (currentUser) {
      setProfileData({
        firstName:
          currentUser.first_name ||
          (currentUser.name ? currentUser.name.split(" ")[0] : "") ||
          "",
        lastName:
          currentUser.last_name ||
          (currentUser.name
            ? currentUser.name.split(" ").slice(1).join(" ")
            : "") ||
          "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      });
    }
    setIsEditingProfile(false);
  };

  const handlePasswordChange = async () => {
    if (!currentUser) return;

    // Validate required fields
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast({
        title: "Validation Error",
        description: "All password fields are required.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Password strength validation
    const passwordRegex = {
      uppercase: /[A-Z]/,
      lowercase: /[a-z]/,
      number: /[0-9]/,
      special: /[!@#$%^&*(),.?":{}|<>]/,
    };

    const missingRequirements = [];
    if (!passwordRegex.uppercase.test(passwordData.newPassword)) {
      missingRequirements.push("one uppercase letter");
    }
    if (!passwordRegex.lowercase.test(passwordData.newPassword)) {
      missingRequirements.push("one lowercase letter");
    }
    if (!passwordRegex.number.test(passwordData.newPassword)) {
      missingRequirements.push("one number");
    }
    if (!passwordRegex.special.test(passwordData.newPassword)) {
      missingRequirements.push("one special character");
    }

    if (missingRequirements.length > 0) {
      toast({
        title: "Weak Password",
        description: `Password must contain: ${missingRequirements.join(
          ", "
        )}.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post("/auth/change-password/", {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Failed to change password. Please check your current password and try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await axios.patch(`/users/${currentUser.id}/preferences/`, {
        notifications: notificationSettings,
      });

      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const response = await axios.post("/auth/toggle-2fa/", {
        enabled: enabled,
      });

      setTwoFactorEnabled(enabled);
      toast({
        title: enabled ? "2FA Enabled" : "2FA Disabled",
        description:
          response.data.message ||
          `Two-factor authentication has been ${
            enabled ? "enabled" : "disabled"
          }.`,
      });
    } catch (error: any) {
      console.error("Error toggling 2FA:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Failed to update two-factor authentication settings. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Revert the toggle on error
      setTwoFactorEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Card>
          <CardContent className="pt-6">
            <p>Please log in to access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger
            value="profile"
            className="transition-colors"
            style={{
              backgroundColor:
                activeTab === "profile" ? colors.primaryColor : undefined,
              color: activeTab === "profile" ? "white" : undefined,
            }}
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="transition-colors"
            style={{
              backgroundColor:
                activeTab === "security" ? colors.primaryColor : undefined,
              color: activeTab === "security" ? "white" : undefined,
            }}
          >
            Security
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="transition-colors"
            style={{
              backgroundColor:
                activeTab === "notifications" ? colors.primaryColor : undefined,
              color: activeTab === "notifications" ? "white" : undefined,
            }}
          >
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        firstName: e.target.value,
                      })
                    }
                    disabled={!isEditingProfile}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        lastName: e.target.value,
                      })
                    }
                    disabled={!isEditingProfile}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    disabled={!isEditingProfile}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    disabled={!isEditingProfile}
                    required
                  />
                </div>
              </div>

              {!isEditingProfile ? (
                <Button onClick={() => setIsEditingProfile(true)}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleProfileUpdate} disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with OTP
                verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require OTP verification code when logging in
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleToggle2FA}
                  disabled={loading}
                />
              </div>
              <Separator />
              <div className="text-sm text-muted-foreground">
                {twoFactorEnabled ? (
                  <p>
                    ✓ Two-factor authentication is <strong>enabled</strong>. You
                    will need to enter an OTP code sent to your email or phone
                    when logging in.
                  </p>
                ) : (
                  <p className="text-amber-600">
                    ⚠ Two-factor authentication is <strong>disabled</strong>.
                    Your account is less secure without 2FA.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  Current Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        current: !showPasswords.current,
                      })
                    }
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  New Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        new: !showPasswords.new,
                      })
                    }
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase,
                  number, and special character.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm New Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        confirm: !showPasswords.confirm,
                      })
                    }
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button onClick={handlePasswordChange} disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailNotifications: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      pushNotifications: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminders for upcoming appointments
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.appointmentReminders}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      appointmentReminders: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about system updates
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.systemUpdates}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      systemUpdates: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className="pt-2">
                <h3 className="font-semibold mb-3">Patient Notifications</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Send notifications to patients about their healthcare updates
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Medical Certificate Status Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify patients when medical certificate status changes
                  </p>
                </div>
                <Switch
                  checked={
                    notificationSettings.medicalCertificateStatusNotifications
                  }
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      medicalCertificateStatusNotifications: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Prescription Status Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify patients when prescription status changes
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.prescriptionStatusNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      prescriptionStatusNotifications: checked,
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Appointment Status Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify patients when appointment status changes
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.appointmentStatusNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      appointmentStatusNotifications: checked,
                    })
                  }
                />
              </div>
              <Button onClick={handleNotificationUpdate} disabled={loading}>
                {loading ? "Updating..." : "Update Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {currentUser.role === "doctor" && (
          <TabsContent value="doctor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Doctor-Specific Settings</CardTitle>
                <CardDescription>
                  Settings specific to your role as a doctor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-accept appointments</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically accept new appointment requests
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show availability calendar</Label>
                    <p className="text-sm text-muted-foreground">
                      Make your availability visible to receptionists
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Default consultation duration (minutes)</Label>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {currentUser.role === "receptionist" && (
          <TabsContent value="receptionist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receptionist-Specific Settings</CardTitle>
                <CardDescription>
                  Settings specific to your role as a receptionist.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show all doctors' schedules</Label>
                    <p className="text-sm text-muted-foreground">
                      View and manage schedules for all doctors
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send appointment confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send confirmation emails to patients
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show patient contact details</Label>
                    <p className="text-sm text-muted-foreground">
                      Display full patient contact information
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Default appointment reminder time</Label>
                  <Select defaultValue="24">
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 hours before</SelectItem>
                      <SelectItem value="4">4 hours before</SelectItem>
                      <SelectItem value="24">24 hours before</SelectItem>
                      <SelectItem value="48">48 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default UserSettings;
