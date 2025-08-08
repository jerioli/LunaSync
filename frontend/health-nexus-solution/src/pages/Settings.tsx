import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useBranding } from '@/contexts/BrandingContext';
import { useClinic } from '@/contexts/ClinicContext';
import { toast } from '@/hooks/use-toast';
import { useSecurity } from '@/hooks/useSecurity';
import { axiosInstance } from '@/services/api';
import React, { useEffect, useState } from 'react';

const Settings = () => {
  const { currentUser, updateClinicCustomization } = useClinic();
  const { colors, updateColors, resetColors } = useBranding();
  const { securityData, loading: securityLoading, error: securityError, refreshSecurityData } = useSecurity();
  const [generalSettings, setGeneralSettings] = useState({
    clinicName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    website: ''
  });
  const [hero, setHero] = useState({ title: '', subtitle: '' });
  const [about, setAbout] = useState({ title: '', text: '' });
  const [services, setServices] = useState([{ title: '', description: '', details: '' }]);
  const [faqs, setFaqs] = useState([{ question: '', answer: '' }]);
  const [reviews, setReviews] = useState([{ name: '', rating: 5, comment: '', date: '' }]);
  const [appointmentSettings, setAppointmentSettings] = useState({
    defaultDuration: '30',
    bufferTime: '10',
    startTime: '09:00',
    endTime: '17:00',
    allowWeekends: false,
    autoConfirm: false,
    sendReminders: true,
    reminderTime: '24'
  });
  const [loading, setLoading] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [healthcareProfessionalsPreview, setHealthcareProfessionalsPreview] = useState<string | null>(null);
  const [clinicBuildingPreview, setClinicBuildingPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAppointments, setIsEditingAppointments] = useState(false);
  const [isEditingFaqs, setIsEditingFaqs] = useState(false);
  const [isEditingHero, setIsEditingHero] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [awsCredentials, setAwsCredentials] = useState({
    name: 'AWS Textract Config',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_region: 'us-east-1',
    is_active: true
  });
  const [isEditingAws, setIsEditingAws] = useState(false);

  // Define a type for the clinic data
  type ClinicData = {
    clinic_name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    website?: string;
    hero_title?: string;
    hero_subtitle?: string;
    about_title?: string;
    about_text?: string;
    services?: { title: string; description: string; details: string }[];
    faqs?: { question: string; answer: string }[];
    reviews?: { name: string; rating: number; comment: string; date: string }[];
    logo?: string;
    healthcare_professionals_image?: string;
    clinic_building_image?: string;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser || currentUser.role !== 'admin') {
        return; // Don't fetch settings if user is not an admin
      }
      
      setLoading(true);
      try {
        const res = await axiosInstance.get('/clinic/');
        if (res.data) {
          setGeneralSettings({
            clinicName: res.data.clinic_name || '',
            address: res.data.address || '',
            city: res.data.city || '',
            state: res.data.state || '',
            zip: res.data.zip || '',
            phone: res.data.phone || '',
            email: res.data.email || '',
            website: res.data.website || ''
          });
          setHero({
            title: res.data.hero_title || '',
            subtitle: res.data.hero_subtitle || ''
          });
          setAbout({
            title: res.data.about_title || '',
            text: res.data.about_text || ''
          });
            setServices(res.data.services && res.data.services.length ? res.data.services : [{ title: '', description: '', details: '' }]);
            setFaqs(res.data.faqs && res.data.faqs.length ? res.data.faqs : [{ question: '', answer: '' }]);
            setReviews(res.data.reviews && res.data.reviews.length ? res.data.reviews : [{ name: '', rating: 5, comment: '', date: '' }]);
            setLogoPreview(res.data.logo || null);
            setHealthcareProfessionalsPreview(res.data.healthcare_professionals_image || null);
            setClinicBuildingPreview(res.data.clinic_building_image || null);
        }
        
        // Fetch AWS credentials only if user is authenticated admin
        try {
          const awsRes = await axiosInstance.get('/aws-credentials/');
          if (awsRes.data && awsRes.data.length > 0) {
            const activeCredentials = awsRes.data.find((cred: any) => cred.is_active) || awsRes.data[0];
            setAwsCredentials({
              name: activeCredentials.name || 'AWS Textract Config',
              aws_access_key_id: activeCredentials.aws_access_key_id || '',
              aws_secret_access_key: '', // Don't populate for security
              aws_region: activeCredentials.aws_region || 'us-east-1',
              is_active: activeCredentials.is_active || true
            });
          }
        } catch (awsErr) {
          console.warn('No AWS credentials found or insufficient permissions, using defaults');
        }
      } catch (err) {
        console.error('Error fetching clinic settings:', err);
        toast({ title: 'Error', description: 'Failed to fetch clinic settings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [currentUser]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can access clinic settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || currentUser.role !== 'admin') {
      toast({ title: 'Error', description: 'Unauthorized access', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      await axiosInstance.put('/clinic/', {
        clinic_name: generalSettings.clinicName,
        address: generalSettings.address,
        city: generalSettings.city,
        state: generalSettings.state,
        zip: generalSettings.zip,
        phone: generalSettings.phone,
        email: generalSettings.email,
        website: generalSettings.website
      });
      toast({
        title: 'Settings Saved',
        description: 'Your general clinic settings have been updated successfully.'
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving clinic settings:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save clinic settings';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAwsSave = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast({ title: 'Error', description: 'Unauthorized access', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      await axiosInstance.put('/clinic/', {
        aws_credentials: {
          name: awsCredentials.name,
          aws_access_key_id: awsCredentials.aws_access_key_id,
          aws_secret_access_key: awsCredentials.aws_secret_access_key,
          aws_region: awsCredentials.aws_region,
          is_active: awsCredentials.is_active
        }
      });
      toast({ title: 'AWS Credentials Saved', description: 'AWS credentials updated successfully.' });
      setIsEditingAws(false);
    } catch (err: any) {
      console.error('Error saving AWS credentials:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save AWS credentials';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings Saved",
      description: "Your appointment settings have been updated successfully."
    });
    setIsEditingAppointments(false);
  };

  // Add handlers for hero, about, services, faqs, reviews
  const handleHeroSave = async () => {
    setLoading(true);
    try {
      await axiosInstance.put('/clinic/', {
        hero_title: hero.title,
        hero_subtitle: hero.subtitle
      });
      toast({ title: 'Hero Section Saved', description: 'Hero section updated.' });
      setIsEditingHero(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save hero section', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  const handleAboutSave = async () => {
    setLoading(true);
    try {
      await axiosInstance.put('/clinic/', {
        about_title: about.title,
        about_text: about.text
      });
      toast({ title: 'About Section Saved', description: 'About section updated.' });
      setIsEditingAbout(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save about section', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  const handleServicesSave = async () => {
    setLoading(true);
    try {
      await axiosInstance.put('/clinic/', { services });
      toast({ title: 'Services Saved', description: 'Services updated.' });
      setIsEditingServices(false);
      
      // Optionally refresh the settings to ensure they persist
      const res = await axiosInstance.get('/clinic/');
      if (res.data && res.data.services) {
        setServices(res.data.services);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save services', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  const handleFaqsSave = async () => {
    setLoading(true);
    try {
      await axiosInstance.put('/clinic/', { faqs });
      // Update the clinic context with the new FAQs
      updateClinicCustomization({ faqs });
      toast({ title: 'FAQs Saved', description: 'FAQs updated.' });
      setIsEditingFaqs(false);
      
      // Optionally refresh the settings to ensure they persist
      const res = await axiosInstance.get('/clinic/');
      if (res.data && res.data.faqs) {
        setFaqs(res.data.faqs);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save FAQs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string, setPreview: (url: string) => void) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append(field, file);
    setLoading(true);
    try {
      await axiosInstance.put('/clinic/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: 'Image Updated', description: `${field.replace(/_/g, ' ')} updated successfully.` });
    } catch (err) {
      toast({ title: 'Error', description: `Failed to update ${field.replace(/_/g, ' ')}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Branding functions
  const handleBrandingUpdate = async () => {
    setBrandingLoading(true);
    try {
      // Update colors through context
      updateColors(colors);
      
      toast({
        title: "Branding Updated",
        description: "Your color preferences have been applied successfully.",
      });
    } catch (error) {
      console.error('Error updating branding:', error);
      toast({
        title: "Error",
        description: "Failed to update branding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBrandingLoading(false);
    }
  };

  const handleColorChange = (colorType: 'primaryColor' | 'secondaryColor' | 'tertiaryColor', value: string) => {
    const newColors = { ...colors, [colorType]: value };
    updateColors(newColors);
  };

  const handleResetBranding = () => {
    setBrandingLoading(true);
    try {
      resetColors();
      toast({
        title: "Colors Reset",
        description: "Branding colors have been reset to default values.",
      });
    } catch (error) {
      console.error('Error resetting branding:', error);
      toast({
        title: "Error",
        description: "Failed to reset branding colors.",
        variant: "destructive",
      });
    } finally {
      setBrandingLoading(false);
    }
  };

  const handleSecurityTestRun = async () => {
    try {
      await refreshSecurityData();
      toast({
        title: 'Security Check Complete',
        description: 'Security status has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Security Check Failed',
        description: 'Could not complete security check.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenSecurityDashboard = () => {
    // Try to open the local HTML file first, fallback to external URL
    const dashboardUrl = 'http://127.0.0.1:8000/static/encryption_test.html';
    window.open(dashboardUrl, '_blank', 'width=1200,height=800');
  };

  const handleRunBatchTests = () => {
    // Show instructions for running batch tests
    toast({
      title: 'Batch Testing',
      description: 'Use run_security_tests.bat from your capstone folder to run comprehensive tests.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clinic Settings</h1>
        <p className="text-muted-foreground">
          Manage your clinic's settings and configurations
        </p>
      </div>
      
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="homepage">Homepage</TabsTrigger>
          <TabsTrigger value="aws">AWS OCR</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security">Security Testing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <form onSubmit={handleGeneralSubmit}>
              <CardHeader>
                <CardTitle>Clinic Information</CardTitle>
                <CardDescription>
                  Manage your clinic's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="clinicName">Clinic Name</Label>
                    <Input 
                      id="clinicName" 
                      value={generalSettings.clinicName}
                      onChange={(e) => setGeneralSettings({...generalSettings, clinicName: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({...generalSettings, phone: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({...generalSettings, email: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input 
                    id="website" 
                    value={generalSettings.website}
                    onChange={(e) => setGeneralSettings({...generalSettings, website: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Address</h3>
                
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input 
                    id="address" 
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({...generalSettings, address: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={generalSettings.city}
                      onChange={(e) => setGeneralSettings({...generalSettings, city: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input 
                      id="state" 
                      value={generalSettings.state}
                      onChange={(e) => setGeneralSettings({...generalSettings, state: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">Zip Code</Label>
                    <Input 
                      id="zip" 
                      value={generalSettings.zip}
                      onChange={(e) => setGeneralSettings({...generalSettings, zip: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                {!isEditing && (
                  <Button type="button" onClick={() => setIsEditing(true)}>Edit</Button>
                )}
                {isEditing && (
                  <Button type="submit">Save Changes</Button>
                )}
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding Colors</CardTitle>
              <CardDescription>
                Customize the application colors and branding elements. Changes apply to all users across the entire application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="primaryColor"
                      type="color"
                      value={colors.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-16 h-16 rounded-lg border-2 border-border cursor-pointer"
                    />
                    <div>
                      <div className="font-medium">Primary</div>
                      <div className="text-sm text-muted-foreground">{colors.primaryColor}</div>
                      <div className="text-xs text-muted-foreground">Buttons, links, highlights</div>
                    </div>
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-3">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="secondaryColor"
                      type="color"
                      value={colors.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="w-16 h-16 rounded-lg border-2 border-border cursor-pointer"
                    />
                    <div>
                      <div className="font-medium">Secondary</div>
                      <div className="text-sm text-muted-foreground">{colors.secondaryColor}</div>
                      <div className="text-xs text-muted-foreground">Cards, backgrounds</div>
                    </div>
                  </div>
                </div>

                {/* Tertiary Color */}
                <div className="space-y-3">
                  <Label htmlFor="tertiaryColor">Tertiary Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="tertiaryColor"
                      type="color"
                      value={colors.tertiaryColor}
                      onChange={(e) => handleColorChange('tertiaryColor', e.target.value)}
                      className="w-16 h-16 rounded-lg border-2 border-border cursor-pointer"
                    />
                    <div>
                      <div className="font-medium">Tertiary</div>
                      <div className="text-sm text-muted-foreground">{colors.tertiaryColor}</div>
                      <div className="text-xs text-muted-foreground">Accents, icons</div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Color Preview */}
              <div className="space-y-3">
                <Label>Color Preview</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: colors.primaryColor + '20', borderColor: colors.primaryColor }}>
                    <div className="text-sm font-medium">Primary Color Usage</div>
                    <Button size="sm" className="mt-2" style={{ backgroundColor: colors.primaryColor }}>
                      Primary Button
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: colors.secondaryColor + '20', borderColor: colors.secondaryColor }}>
                    <div className="text-sm font-medium">Secondary Color Usage</div>
                    <Button size="sm" variant="secondary" className="mt-2" style={{ backgroundColor: colors.secondaryColor }}>
                      Secondary Button
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: colors.tertiaryColor + '20', borderColor: colors.tertiaryColor }}>
                    <div className="text-sm font-medium">Tertiary Color Usage</div>
                    <Button size="sm" variant="outline" className="mt-2" style={{ borderColor: colors.tertiaryColor, color: colors.tertiaryColor }}>
                      Tertiary Button
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleBrandingUpdate} disabled={brandingLoading}>
                  {brandingLoading ? 'Applying...' : 'Apply Colors'}
                </Button>
                <Button variant="outline" onClick={handleResetBranding} disabled={brandingLoading}>
                  Reset to Default
                </Button>
              </div>

              <Separator />

              {/* Logo and Images Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Images & Assets</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="logo">Logo</Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageChange(e, 'logo', setLogoPreview)}
                      className="mt-2"
                    />
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo Preview" className="mt-2 h-16 object-contain" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="healthcare_professionals_image">Healthcare Professionals Image</Label>
                    <Input
                      id="healthcare_professionals_image"
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageChange(e, 'healthcare_professionals_image', setHealthcareProfessionalsPreview)}
                      className="mt-2"
                    />
                    {healthcareProfessionalsPreview && (
                      <img src={healthcareProfessionalsPreview} alt="Healthcare Professionals Preview" className="mt-2 h-16 object-contain" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="clinic_building_image">Clinic Building Image</Label>
                    <Input
                      id="clinic_building_image"
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageChange(e, 'clinic_building_image', setClinicBuildingPreview)}
                      className="mt-2"
                    />
                    {clinicBuildingPreview && (
                      <img src={clinicBuildingPreview} alt="Clinic Building Preview" className="mt-2 h-16 object-contain" />
                    )}
                  </div>
                </div>
              </div>

              {/* Information */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Admin Branding Control:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Only administrators can modify application colors and branding</li>
                  <li>• Colors are applied instantly across the entire application for all users</li>
                  <li>• Changes are saved and persist across browser sessions</li>
                  <li>• Images are uploaded and stored on the server</li>
                  <li>• Use the reset button to return to default color scheme</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appointments">
          <Card>
            <form onSubmit={handleAppointmentSubmit}>
              <CardHeader>
                <CardTitle>Appointment Settings</CardTitle>
                <CardDescription>
                  Configure how appointments are scheduled and managed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-lg font-medium">Time Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Business Hours Start</Label>
                    <Input 
                      id="startTime" 
                      type="time"
                      value={appointmentSettings.startTime}
                      onChange={(e) => setAppointmentSettings({...appointmentSettings, startTime: e.target.value})}
                      disabled={!isEditingAppointments}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Business Hours End</Label>
                    <Input 
                      id="endTime" 
                      type="time"
                      value={appointmentSettings.endTime}
                      onChange={(e) => setAppointmentSettings({...appointmentSettings, endTime: e.target.value})}
                      disabled={!isEditingAppointments}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultDuration">Default Appointment Duration (minutes)</Label>
                    <Select 
                      value={appointmentSettings.defaultDuration}
                      onValueChange={(value) => setAppointmentSettings({...appointmentSettings, defaultDuration: value})}
                      disabled={!isEditingAppointments}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bufferTime">Buffer Time Between Appointments (minutes)</Label>
                    <Select 
                      value={appointmentSettings.bufferTime}
                      onValueChange={(value) => setAppointmentSettings({...appointmentSettings, bufferTime: value})}
                      disabled={!isEditingAppointments}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select buffer time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No buffer</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Scheduling Rules</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="allowWeekends">Allow Weekend Appointments</Label>
                    <p className="text-sm text-muted-foreground">Enable scheduling on Saturdays and Sundays</p>
                  </div>
                  <Switch 
                    id="allowWeekends" 
                    checked={appointmentSettings.allowWeekends}
                    onCheckedChange={(checked) => setAppointmentSettings({...appointmentSettings, allowWeekends: checked})}
                    disabled={!isEditingAppointments}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoConfirm">Auto-Confirm Appointments</Label>
                    <p className="text-sm text-muted-foreground">Automatically confirm new appointment requests</p>
                  </div>
                  <Switch 
                    id="autoConfirm" 
                    checked={appointmentSettings.autoConfirm}
                    onCheckedChange={(checked) => setAppointmentSettings({...appointmentSettings, autoConfirm: checked})}
                    disabled={!isEditingAppointments}
                  />
                </div>
                
                <Separator />
                <h3 className="text-lg font-medium">Reminders</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sendReminders">Send Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send email/SMS reminders to patients</p>
                  </div>
                  <Switch 
                    id="sendReminders" 
                    checked={appointmentSettings.sendReminders}
                    onCheckedChange={(checked) => setAppointmentSettings({...appointmentSettings, sendReminders: checked})}
                    disabled={!isEditingAppointments}
                  />
                </div>
                
                {appointmentSettings.sendReminders && (
                  <div>
                    <Label htmlFor="reminderTime">Send Reminders (hours before appointment)</Label>
                    <Select 
                      value={appointmentSettings.reminderTime}
                      onValueChange={(value) => setAppointmentSettings({...appointmentSettings, reminderTime: value})}
                      disabled={!isEditingAppointments}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reminder time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                {!isEditingAppointments && (
                  <Button type="button" onClick={() => setIsEditingAppointments(true)}>Edit</Button>
                )}
                {isEditingAppointments && (
                  <Button type="submit">Save Changes</Button>
                )}
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Add and manage FAQs that will be displayed to your patients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`faqQuestion${index}`}>Question</Label>
                    <Input 
                      id={`faqQuestion${index}`} 
                      value={faq.question}
                      onChange={(e) => setFaqs(prevFaqs => prevFaqs.map((f, i) => i === index ? { ...f, question: e.target.value } : f))}
                      disabled={!isEditingFaqs}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`faqAnswer${index}`}>Answer</Label>
                    <Textarea 
                      id={`faqAnswer${index}`} 
                      value={faq.answer}
                      onChange={(e) => setFaqs(prevFaqs => prevFaqs.map((f, i) => i === index ? { ...f, answer: e.target.value } : f))}
                      disabled={!isEditingFaqs}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFaqs(prevFaqs => prevFaqs.filter((_, i) => i !== index))} disabled={!isEditingFaqs}>
                    <span className="sr-only">Remove</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              ))}
              <Button onClick={() => setFaqs([...faqs, { question: '', answer: '' }])} disabled={!isEditingFaqs}>Add New FAQ</Button>
            </CardContent>
            <CardFooter className="flex justify-end">
              {!isEditingFaqs && (
                <Button type="button" onClick={() => setIsEditingFaqs(true)}>Edit</Button>
              )}
              {isEditingFaqs && (
                <Button onClick={handleFaqsSave}>Save FAQs</Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="aws">
          <Card>
            <CardHeader>
              <CardTitle>AWS OCR Credentials</CardTitle>
              <CardDescription>
                Configure AWS Textract credentials for lab result processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg mb-6">
                <h4 className="font-medium mb-2">🔐 Security Notice:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• AWS credentials are stored securely in the database</li>
                  <li>• Only administrators can view and modify these settings</li>
                  <li>• Secret keys are encrypted and never displayed in full</li>
                  <li>• These credentials enable OCR processing of lab results</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="awsAccessKey">AWS Access Key ID</Label>
                  <Input
                    id="awsAccessKey"
                    type="text"
                    value={awsCredentials.aws_access_key_id}
                    onChange={(e) => setAwsCredentials({...awsCredentials, aws_access_key_id: e.target.value})}
                    disabled={!isEditingAws}
                    placeholder="AKIA..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your AWS Access Key ID for Textract service
                  </p>
                </div>

                <div>
                  <Label htmlFor="awsSecretKey">AWS Secret Access Key</Label>
                  <Input
                    id="awsSecretKey"
                    type="password"
                    value={awsCredentials.aws_secret_access_key}
                    onChange={(e) => setAwsCredentials({...awsCredentials, aws_secret_access_key: e.target.value})}
                    disabled={!isEditingAws}
                    placeholder="Enter new secret key..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to keep existing secret key
                  </p>
                </div>

                <div>
                  <Label htmlFor="awsRegion">AWS Region</Label>
                  <select
                    id="awsRegion"
                    value={awsCredentials.aws_region}
                    onChange={(e) => setAwsCredentials({...awsCredentials, aws_region: e.target.value})}
                    disabled={!isEditingAws}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-east-2">US East (Ohio)</option>
                    <option value="us-west-1">US West (N. California)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">Europe (Ireland)</option>
                    <option value="eu-central-1">Europe (Frankfurt)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                    <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the AWS region closest to your location
                  </p>
                </div>

                <div>
                  <Label htmlFor="awsName">Configuration Name</Label>
                  <Input
                    id="awsName"
                    type="text"
                    value={awsCredentials.name}
                    onChange={(e) => setAwsCredentials({...awsCredentials, name: e.target.value})}
                    disabled={!isEditingAws}
                    placeholder="AWS Textract Config"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Friendly name for this AWS configuration
                  </p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">AWS Service Status</h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">AWS Textract OCR Service</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used for processing lab result documents and extracting structured data
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium mb-2">How to get AWS Credentials:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Sign in to AWS Console</li>
                  <li>Go to IAM (Identity and Access Management)</li>
                  <li>Create a new user with Textract permissions</li>
                  <li>Generate access keys for programmatic access</li>
                  <li>Copy the Access Key ID and Secret Access Key here</li>
                </ol>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              {!isEditingAws && (
                <Button type="button" onClick={() => setIsEditingAws(true)}>Edit AWS Settings</Button>
              )}
              {isEditingAws && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditingAws(false)}>Cancel</Button>
                  <Button onClick={handleAwsSave}>Save AWS Credentials</Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
          
          <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure email and SMS notifications for your clinic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <div className="space-y-4">                  <div>
                    <Label htmlFor="notificationEmail">Clinic Email Address</Label>
                    <Input 
                      id="notificationEmail" 
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({...generalSettings, email: e.target.value})}
                      placeholder="clinic@example.com"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This email address will be used as the sender for all clinic emails (appointment confirmations, reminders, review notifications, etc.)
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="sendAppointmentConfirmations">Send Appointment Confirmations</Label>
                      <p className="text-sm text-muted-foreground">Send confirmation emails when appointments are scheduled</p>
                    </div>
                    <Switch 
                      id="sendAppointmentConfirmations" 
                      checked={appointmentSettings.sendReminders}
                      onCheckedChange={(checked) => setAppointmentSettings({...appointmentSettings, sendReminders: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="sendReviewNotifications">Send Review Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send notifications when patients submit reviews</p>
                    </div>
                    <Switch 
                      id="sendReviewNotifications" 
                      defaultChecked={true}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">SMS Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    SMS notifications will be available in a future update.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleGeneralSubmit}>Save Notification Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect with third-party services and applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-10 text-muted-foreground">
                Integration settings will be implemented in the future.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔐 Security Testing & Monitoring
                </CardTitle>
                <CardDescription>
                  Test and monitor your system's security status, encryption, and compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Security Overview */}
                  {securityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      <span className="ml-2">Loading security status...</span>
                    </div>
                  ) : securityError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">⚠️ Security service unavailable: {securityError}</p>
                      <Button 
                        variant="outline" 
                        className="mt-2" 
                        onClick={refreshSecurityData}
                      >
                        Retry Connection
                      </Button>
                    </div>
                  ) : securityData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Overall Security Score */}
                      <Card className={`border-2 ${
                        securityData.overall_status.color === 'green' ? 'border-green-500 bg-green-50' :
                        securityData.overall_status.color === 'yellow' ? 'border-yellow-500 bg-yellow-50' :
                        'border-red-500 bg-red-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${
                              securityData.overall_status.color === 'green' ? 'text-green-700' :
                              securityData.overall_status.color === 'yellow' ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>
                              {securityData.overall_status.score}/100
                            </div>
                            <div className="text-sm text-gray-600">Overall Security</div>
                            <div className={`text-xs font-medium ${
                              securityData.overall_status.color === 'green' ? 'text-green-600' :
                              securityData.overall_status.color === 'yellow' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {securityData.overall_status.level}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Encryption Status */}
                      <Card className={`border ${
                        securityData.encryption.status === 'active' ? 'border-green-300' : 'border-red-300'
                      }`}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className={`text-xl font-semibold ${
                              securityData.encryption.status === 'active' ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {securityData.encryption.enabled_count}/{securityData.encryption.total_count}
                            </div>
                            <div className="text-sm text-gray-600">Encryption Active</div>
                            <div className={`text-xs ${
                              securityData.encryption.status === 'active' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {securityData.encryption.status.toUpperCase()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Backup Status */}
                      <Card className={`border ${
                        securityData.backup.status === 'completed' ? 'border-green-300' : 'border-yellow-300'
                      }`}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className={`text-lg font-semibold ${
                              securityData.backup.status === 'completed' ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {securityData.backup.last_backup ? 
                                new Date(securityData.backup.last_backup).toLocaleDateString() : 
                                'Never'
                              }
                            </div>
                            <div className="text-sm text-gray-600">Last Backup</div>
                            <div className={`text-xs ${
                              securityData.backup.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {securityData.backup.status.toUpperCase()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Security Incidents */}
                      <Card className={`border ${
                        securityData.incidents.critical > 0 ? 'border-red-300' : 
                        securityData.incidents.open > 0 ? 'border-yellow-300' : 'border-green-300'
                      }`}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className={`text-xl font-semibold ${
                              securityData.incidents.critical > 0 ? 'text-red-700' :
                              securityData.incidents.open > 0 ? 'text-yellow-700' : 'text-green-700'
                            }`}>
                              {securityData.incidents.open}
                            </div>
                            <div className="text-sm text-gray-600">Open Incidents</div>
                            <div className={`text-xs ${
                              securityData.incidents.critical > 0 ? 'text-red-600' :
                              securityData.incidents.open > 0 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {securityData.incidents.critical} CRITICAL
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}

                  <Separator />

                  {/* Security Testing Tools */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Security Testing Tools</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Quick Security Check */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">⚡ Quick Security Check</CardTitle>
                          <CardDescription>
                            Run basic security validation tests
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            className="w-full" 
                            onClick={handleSecurityTestRun}
                            disabled={securityLoading}
                          >
                            {securityLoading ? 'Running...' : 'Run Security Check'}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Visual Security Dashboard */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">📊 Visual Testing Dashboard</CardTitle>
                          <CardDescription>
                            Open comprehensive security testing interface
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={handleOpenSecurityDashboard}
                          >
                            Open Test Dashboard
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Batch Testing */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">🚀 Automated Testing</CardTitle>
                          <CardDescription>
                            Run comprehensive automated security tests
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            className="w-full" 
                            variant="secondary"
                            onClick={handleRunBatchTests}
                          >
                            View Batch Testing
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Real-time Monitoring */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">🔍 Real-time Monitor</CardTitle>
                          <CardDescription>
                            Monitor security status in real-time
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Auto-refresh:</span>
                              <Switch 
                                checked={false}
                                onCheckedChange={() => {
                                  toast({
                                    title: 'Real-time Monitoring',
                                    description: 'Feature will be implemented soon.',
                                  });
                                }}
                              />
                            </div>
                            <Button 
                              className="w-full" 
                              variant="outline" 
                              size="sm"
                              onClick={refreshSecurityData}
                            >
                              Refresh Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Security Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Security Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Encryption Details */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">🔐 Encryption Details</CardTitle>
                          <CardDescription>
                            View detailed encryption status
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {securityData?.encryption.details.length ? (
                            <div className="space-y-2">
                              {securityData.encryption.details.map((detail, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <span>{detail.type}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    detail.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {detail.enabled ? 'ENABLED' : 'DISABLED'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No encryption details available</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Security Settings */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">⚙️ Security Configuration</CardTitle>
                          <CardDescription>
                            Current security settings overview
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {securityData?.settings ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Auto Backup:</span>
                                <span className={securityData.settings.auto_backup_enabled ? 'text-green-600' : 'text-red-600'}>
                                  {securityData.settings.auto_backup_enabled ? 'ON' : 'OFF'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Audit Logging:</span>
                                <span className={securityData.settings.audit_logging_enabled ? 'text-green-600' : 'text-red-600'}>
                                  {securityData.settings.audit_logging_enabled ? 'ON' : 'OFF'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Session Timeout:</span>
                                <span>{securityData.settings.session_timeout}min</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Max Login Attempts:</span>
                                <span>{securityData.settings.max_login_attempts}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No settings data available</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Security Documentation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Security Documentation</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">📋 Testing Guide</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-3">
                            Step-by-step security testing instructions
                          </p>
                          <Button variant="outline" size="sm" className="w-full">
                            View Guide
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">🛡️ Security Policies</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-3">
                            Review security policies and compliance
                          </p>
                          <Button variant="outline" size="sm" className="w-full">
                            View Policies
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">📊 Security Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-3">
                            Generate and download security reports
                          </p>
                          <Button variant="outline" size="sm" className="w-full">
                            Generate Report
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="homepage">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Content</CardTitle>
              <CardDescription>
                Manage the main content of your clinic's homepage (Hero, About, Services)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Hero Section */}
              <div className="space-y-4 border-b pb-6">
                <h3 className="text-xl font-semibold">Hero Section</h3>
                <div>
                  <Label htmlFor="heroTitle">Title</Label>
                  <Input 
                    id="heroTitle" 
                    value={hero.title}
                    onChange={(e) => setHero({...hero, title: e.target.value})}
                    disabled={!isEditingHero}
                  />
                </div>
                <div>
                  <Label htmlFor="heroSubtitle">Subtitle</Label>
                  <Input 
                    id="heroSubtitle" 
                    value={hero.subtitle}
                    onChange={(e) => setHero({...hero, subtitle: e.target.value})}
                    disabled={!isEditingHero}
                  />
                </div>
                {!isEditingHero && (
                  <Button className="mt-2" type="button" onClick={() => setIsEditingHero(true)}>Edit</Button>
                )}
                {isEditingHero && (
                  <Button className="mt-2" onClick={handleHeroSave}>Save Hero Section</Button>
                )}
              </div>
              {/* About Section */}
              <div className="space-y-4 border-b pb-6">
                <h3 className="text-xl font-semibold">About Section</h3>
                <div>
                  <Label htmlFor="aboutTitle">Title</Label>
                  <Input 
                    id="aboutTitle" 
                    value={about.title}
                    onChange={(e) => setAbout({...about, title: e.target.value})}
                    disabled={!isEditingAbout}
                  />
                </div>
                <div>
                  <Label htmlFor="aboutText">Text</Label>
                  <Textarea 
                    id="aboutText" 
                    value={about.text}
                    onChange={(e) => setAbout({...about, text: e.target.value})}
                    disabled={!isEditingAbout}
                  />
                </div>
                {!isEditingAbout && (
                  <Button className="mt-2" type="button" onClick={() => setIsEditingAbout(true)}>Edit</Button>
                )}
                {isEditingAbout && (
                  <Button className="mt-2" onClick={handleAboutSave}>Save About Section</Button>
                )}
              </div>
              {/* Services Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Services</h3>
                {services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`serviceTitle${index}`}>Title</Label>
                      <Input 
                        id={`serviceTitle${index}`} 
                        value={service.title}
                        onChange={(e) => setServices(prevServices => prevServices.map((s, i) => i === index ? { ...s, title: e.target.value } : s))}
                        disabled={!isEditingServices}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`serviceDescription${index}`}>Description</Label>
                      <Textarea 
                        id={`serviceDescription${index}`} 
                        value={service.description}
                        onChange={(e) => setServices(prevServices => prevServices.map((s, i) => i === index ? { ...s, description: e.target.value } : s))}
                        disabled={!isEditingServices}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`serviceDetails${index}`}>Details</Label>
                      <Textarea 
                        id={`serviceDetails${index}`} 
                        value={service.details}
                        onChange={(e) => setServices(prevServices => prevServices.map((s, i) => i === index ? { ...s, details: e.target.value } : s))}
                        disabled={!isEditingServices}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setServices(prevServices => prevServices.filter((_, i) => i !== index))} disabled={!isEditingServices}>
                      <span className="sr-only">Remove</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
                <Button onClick={() => setServices([...services, { title: '', description: '', details: '' }])} disabled={!isEditingServices}>Add New Service</Button>
                {!isEditingServices && (
                  <Button className="mt-2" type="button" onClick={() => setIsEditingServices(true)}>Edit</Button>
                )}
                {isEditingServices && (
                  <Button className="mt-2" onClick={handleServicesSave}>Save Services</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
