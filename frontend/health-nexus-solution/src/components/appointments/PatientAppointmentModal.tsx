import { useToast } from '@/components/ui/use-toast';
import { api } from '@/services/api';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  image?: string;
  specialization?: string;
}

interface TimeSlot {
  id: string;
  value: string;
  label: string;
  isAvailable: boolean;
}

interface AppointmentFormData {
  date: Date | undefined;
  time: string;
  type: string;
  doctorId: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  maritalStatus: string;
}

interface PatientAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PatientAppointmentModal: React.FC<PatientAppointmentModalProps> = ({
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDateString, setSelectedDateString] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(1);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    date: undefined,
    time: '',
    type: '',
    doctorId: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    maritalStatus: ''
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setFormSubmitted(false);
      setFormData({
        date: undefined,
        time: '',
        type: '',
        doctorId: '',
        name: '',
        email: '',
        phone: '',
        notes: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        maritalStatus: ''
      });
      setSelectedDateString('');
      setAvailableDates([]);
      setAvailableTimeSlots([]);
      fetchDoctors();
    }
  }, [open]);

  // When a doctor is selected, fetch available dates
  useEffect(() => {
    if (formData.doctorId) {
      fetchAvailableDatesForDoctor(formData.doctorId);
    }
  }, [formData.doctorId]);

  // When a date is selected, fetch available time slots
  useEffect(() => {
    if (formData.doctorId && formData.date) {
      fetchAvailableTimeSlots(formData.doctorId, formData.date);
    }
  }, [formData.doctorId, formData.date]);

  const fetchDoctors = async () => {
    try {
      setIsLoadingDoctors(true);
      const response = await api.doctors.getAll();
      setDoctors(response);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch doctors. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const fetchAvailableDatesForDoctor = async (doctorId: string) => {
    try {
      setIsLoadingDates(true);
      const response = await api.availability.getAvailableDates(doctorId);
      
      if (!response || !Array.isArray(response)) {
        setAvailableDates([]);
        return;
      }

      // Convert date strings to Date objects
      const dates = response.map((dateStr: string) => new Date(dateStr));
      setAvailableDates(dates);
    } catch (error) {
      console.error('Error fetching available dates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available dates. Please try again.",
        variant: "destructive"
      });
      setAvailableDates([]);
    } finally {
      setIsLoadingDates(false);
    }
  };

  const fetchAvailableTimeSlots = async (doctorId: string, date: Date) => {
    try {
      setIsLoadingTimeSlots(true);
      
      // Format date to YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      setSelectedDateString(dateString);
      
      const response = await api.availability.getTimeSlots(doctorId, dateString);
      
      if (!Array.isArray(response) || response.length === 0) {
        setAvailableTimeSlots([]);
        return;
      }

      // Get the first availability object
      const availability = response[0];
      
      if (!availability || !availability.time_slots || !Array.isArray(availability.time_slots)) {
        setAvailableTimeSlots([]);
        return;
      }
      
      // Filter out booked slots and format for display
      const availableSlots = availability.time_slots
        .filter(slot => !slot.is_booked)
        .map(slot => ({
          id: String(slot.id),
          value: slot.start_time.includes(':') ? 
            (slot.start_time.split(':').length === 3 ? slot.start_time : `${slot.start_time}:00`) : 
            `${slot.start_time}:00:00`,
          label: `${slot.start_time} - ${slot.end_time}`,
          isAvailable: !slot.is_booked
        }));

      setAvailableTimeSlots(availableSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available time slots. Please try again.",
        variant: "destructive"
      });
      setAvailableTimeSlots([]);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const filteredValue = value.replace(/[^\d-]/g, '');
    setFormData(prev => ({ ...prev, dateOfBirth: filteredValue }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 11;
  };

  const validateDateOfBirth = (dob: string) => {
    const date = new Date(dob);
    const today = new Date();
    return date < today && !isNaN(date.getTime());
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.doctorId || !formData.date || !formData.time || !formData.type) {
          toast({
            title: "Missing Information",
            description: "Please select a doctor, date, time, and appointment type.",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      case 2:
        if (!formData.name || !formData.email || !formData.phone || 
            !formData.dateOfBirth || !formData.gender) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required personal information fields.",
            variant: "destructive"
          });
          return false;
        }
        
        if (!validateEmail(formData.email)) {
          toast({
            title: "Invalid Email",
            description: "Please enter a valid email address.",
            variant: "destructive"
          });
          return false;
        }
        
        if (!validatePhone(formData.phone)) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid 11-digit phone number.",
            variant: "destructive"
          });
          return false;
        }
        
        if (!validateDateOfBirth(formData.dateOfBirth)) {
          toast({
            title: "Invalid Date of Birth",
            description: "Please enter a valid date of birth in YYYY-MM-DD format.",
            variant: "destructive"
          });
          return false;
        }
        
        return true;
      
      case 3:
        if (!formData.address || !formData.maritalStatus) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields to proceed.",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }
    
    // Final validation of all required fields
    if (!formData.doctorId || !formData.date || !formData.time || !formData.type || 
        !formData.name || !formData.email || !formData.phone || 
        !formData.dateOfBirth || !formData.gender || 
        !formData.address || !formData.maritalStatus) {
      
      toast({
        title: "Missing Information",
        description: "Please ensure all required fields are filled correctly.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare the appointment data
      const appointmentData = {
        doctor_id: formData.doctorId,
        date: selectedDateString,
        time_slot: formData.time.includes(':') ? 
          (formData.time.split(':').length === 3 ? formData.time : `${formData.time}:00`) : 
          `${formData.time}:00:00`,
        appointment_type: formData.type,
        patient_name: formData.name,
        patient_email: formData.email,
        patient_phone: formData.phone,
        date_of_birth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : null,
        gender: formData.gender ? formData.gender.toLowerCase() : null,
        address: formData.address || null,
        marital_status: formData.maritalStatus ? formData.maritalStatus.toLowerCase() : null,
        notes: formData.notes || ''
      };
      
      // Send the appointment data to the API
      const response = await api.appointments.create(appointmentData);
      
      // Show success message
      toast({
        title: "Appointment Scheduled",
        description: "Your appointment has been scheduled successfully!",
      });
      
      setFormSubmitted(true);
      setCurrentStep(5); // Show success step
      
    } catch (error: any) {
      console.error('Error submitting appointment:', error);
      
      let errorMessage = "Failed to schedule appointment. Please try again.";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="doctor">Select Doctor</Label>
              <Select value={formData.doctorId} onValueChange={(value) => setFormData(prev => ({ ...prev, doctorId: value }))}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id.toString()}>
                      Dr. {doctor.first_name} {doctor.last_name}
                      {doctor.specialization && (
                        <span className="text-muted-foreground"> - {doctor.specialization}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.doctorId && (
              <div>
                <Label>Select Date</Label>
                <div className="mt-2 border rounded-md p-3">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || !availableDates.some(availableDate => 
                        availableDate.toDateString() === date.toDateString()
                      );
                    }}
                    className="mx-auto"
                  />
                </div>
                {isLoadingDates && (
                  <p className="text-sm text-muted-foreground mt-2">Loading available dates...</p>
                )}
              </div>
            )}

            {formData.date && availableTimeSlots.length > 0 && (
              <div>
                <Label>Select Time</Label>
                <RadioGroup 
                  value={formData.time} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                  className="mt-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {availableTimeSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={slot.value} id={slot.id} />
                        <Label htmlFor={slot.id} className="text-sm">
                          {slot.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                {isLoadingTimeSlots && (
                  <p className="text-sm text-muted-foreground mt-2">Loading available times...</p>
                )}
              </div>
            )}

            {formData.time && (
              <div>
                <Label htmlFor="type">Appointment Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Vaccination">Vaccination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09123456789"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleDateOfBirthChange}
                  placeholder="YYYY-MM-DD"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Gender</Label>
              <RadioGroup 
                value={formData.gender} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                className="mt-2"
              >
                <div className="flex space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">Other</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter your complete address"
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label>Marital Status</Label>
              <RadioGroup 
                value={formData.maritalStatus} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, maritalStatus: value }))}
                className="mt-2"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single">Single</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="married" id="married" />
                    <Label htmlFor="married">Married</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="divorced" id="divorced" />
                    <Label htmlFor="divorced">Divorced</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="widowed" id="widowed" />
                    <Label htmlFor="widowed">Widowed</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information about your appointment"
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        const selectedDoctor = doctors.find(d => d.id.toString() === formData.doctorId);
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Review Your Appointment</h3>
              <p className="text-muted-foreground">Please review your information before confirming</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900">Appointment Details</h4>
                <dl className="mt-2 text-sm space-y-2">
                  <div>
                    <dt className="font-medium text-gray-500">Doctor</dt>
                    <dd>Dr. {selectedDoctor?.first_name} {selectedDoctor?.last_name}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Date</dt>
                    <dd>{formData.date?.toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Time</dt>
                    <dd>{availableTimeSlots.find(slot => slot.value === formData.time)?.label}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Type</dt>
                    <dd>{formData.type}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Personal Information</h4>
                <dl className="mt-2 text-sm space-y-2">
                  <div>
                    <dt className="font-medium text-gray-500">Name</dt>
                    <dd>{formData.name}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Email</dt>
                    <dd>{formData.email}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Phone</dt>
                    <dd>{formData.phone}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Date of Birth</dt>
                    <dd>{formData.dateOfBirth}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Gender</dt>
                    <dd className="capitalize">{formData.gender}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Marital Status</dt>
                    <dd className="capitalize">{formData.maritalStatus}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {formData.notes && (
              <div>
                <h4 className="font-medium text-gray-900">Additional Notes</h4>
                <p className="mt-2 text-sm text-gray-600">{formData.notes}</p>
              </div>
            )}
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">
                By clicking "Confirm Appointment", you agree to our terms and conditions. We'll send a confirmation to your email.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Appointment Scheduled Successfully!</h3>
              <p className="text-green-700 mt-2">
                Your appointment has been scheduled and is pending confirmation from our reception team.
              </p>
              <p className="text-sm text-gray-600 mt-4">
                You will receive a confirmation email once your appointment is approved.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Schedule Appointment";
      case 2: return "Personal Information";
      case 3: return "Additional Details";
      case 4: return "Review & Confirm";
      case 5: return "Success";
      default: return "Schedule Appointment";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            {currentStep === 5 
              ? "Your appointment request has been submitted"
              : `Step ${currentStep} of 4 - ${getStepTitle()}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {/* Progress bar */}
          {currentStep < 5 && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Schedule</span>
                <span>Personal Info</span>
                <span>Details</span>
                <span>Review</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {/* Footer buttons */}
            {currentStep < 5 && (
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={currentStep === 1 ? () => onOpenChange(false) : prevStep}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {currentStep === 1 ? "Cancel" : "Previous"}
                </Button>
                
                {currentStep < 4 ? (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && (!formData.doctorId || !formData.date || !formData.time || !formData.type)) ||
                      isSubmitting
                    }
                    className="flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? "Processing..." : "Confirm Appointment"}
                  </Button>
                )}
              </div>
            )}
            
            {/* Success step footer */}
            {currentStep === 5 && (
              <div className="flex justify-center mt-8 pt-6 border-t">
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientAppointmentModal;
