import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/services/api';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, CheckCircle } from 'lucide-react';

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

const AppointmentScheduling: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDateString, setSelectedDateString] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(1);
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
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Fetch all doctors when component mounts
  useEffect(() => {
    fetchDoctors();
  }, []);

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
            `${slot.start_time}:00:00`, // Ensure proper format with seconds
          label: `${slot.start_time} - ${slot.end_time}`, // Display full time range
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
    
    // Allow only digits and hyphens
    const filteredValue = value.replace(/[^\d-]/g, '');
    
    // Auto-format as user types (YYYY-MM-DD)
    let formattedValue = filteredValue;
    
    // Handle auto-insertion of hyphens
    if (filteredValue.length > 0) {
      // Remove any existing hyphens
      const digitsOnly = filteredValue.replace(/-/g, '');
      
      // Re-insert hyphens at the correct positions
      if (digitsOnly.length <= 4) {
        formattedValue = digitsOnly;
      } else if (digitsOnly.length <= 6) {
        formattedValue = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
      } else {
        formattedValue = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
      }
    }
    
    // Set the formatted value directly
    setFormData(prev => ({ ...prev, dateOfBirth: formattedValue }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
      const formatted = format(date, 'yyyy-MM-dd');
      setSelectedDateString(formatted);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    // Check if the result has 11 digits
    return digitsOnly.length === 11;
  };

  const validateDateOfBirth = (dob: string): boolean => {
    // Check if the format is YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
    
    const date = new Date(dob);
    const today = new Date();
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) return false;
    
    // Check if date is in the past
    if (date >= today) return false;
    
    // Check if date is within reasonable range (1-120 years old)
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 120);
    
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() - 1);
    
    return date >= minDate && date <= maxDate;
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Validate doctor, date, time, and appointment type
        if (!formData.doctorId || !formData.date || !formData.time || !formData.type) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields to proceed.",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      case 2:
        // Validate personal information
        if (!formData.name || !formData.email || !formData.phone || !formData.dateOfBirth || !formData.gender) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields to proceed.",
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
        // Validate address and marital status
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
          `${formData.time}:00:00`, // Ensure proper time format with seconds
        appointment_type: formData.type, // Use the exact value from the select options
        patient_name: formData.name,
        patient_email: formData.email,
        patient_phone: formData.phone,
        date_of_birth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : null, // Format exactly like chatbot
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
      
      // Set form submitted flag
      setFormSubmitted(true);
      
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      
      // Extract and display specific validation errors if available
      let errorMessage = "Failed to schedule appointment. Please try again.";
      
      if (error.response && error.response.data) {
        const responseData = error.response.data;
        
        // Create a more user-friendly error message from backend validation errors
        if (typeof responseData === 'object') {
          const errorFields = Object.keys(responseData);
          if (errorFields.length > 0) {
            // Check specifically for field-specific errors
            if (errorFields.includes('date_of_birth')) {
              errorMessage = "The date of birth must be in YYYY-MM-DD format (e.g., 1990-01-15).";
            } else if (errorFields.includes('time') || errorFields.includes('time_slot')) {
              errorMessage = "The time must be in the format HH:MM:SS (e.g., 14:30:00).";
            } else {
              const fieldNames = errorFields.map(field => {
                // Convert snake_case to Title Case for display
                return field.split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              }).join(', ');
              
              errorMessage = `Please check these fields: ${fieldNames}`;
            }
          }
        }
      }
      
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If form was submitted successfully, show confirmation
  if (formSubmitted) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-clinic-blue">Appointment Scheduled</CardTitle>
            <CardDescription className="text-center">Your appointment has been scheduled successfully!</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="text-center space-y-4">
              <p className="text-lg">Thank you for scheduling an appointment with us.</p>
              <p>We've sent a confirmation to your email address.</p>
              <p>You'll receive a reminder 24 hours before your appointment.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center space-x-4">
            <Button 
              onClick={() => navigate('/portal')}
              variant="outline"
            >
              Return to Home
            </Button>
            <Button
              onClick={() => {
                setFormSubmitted(false);
                setCurrentStep(1);
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
              }}
            >
              Schedule Another Appointment
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-clinic-blue">Schedule an Appointment</h1>
        
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className={`h-1 flex-1 ${currentStep >= 1 ? 'bg-clinic-blue' : 'bg-gray-200'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${currentStep >= 1 ? 'bg-clinic-blue' : 'bg-gray-200'}`}>1</div>
            <div className={`h-1 flex-1 ${currentStep >= 2 ? 'bg-clinic-blue' : 'bg-gray-200'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${currentStep >= 2 ? 'bg-clinic-blue' : 'bg-gray-200'}`}>2</div>
            <div className={`h-1 flex-1 ${currentStep >= 3 ? 'bg-clinic-blue' : 'bg-gray-200'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${currentStep >= 3 ? 'bg-clinic-blue' : 'bg-gray-200'}`}>3</div>
            <div className={`h-1 flex-1 ${currentStep >= 4 ? 'bg-clinic-blue' : 'bg-gray-200'}`}></div>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${currentStep >= 4 ? 'bg-clinic-blue' : 'bg-gray-200'}`}>4</div>
            <div className={`h-1 flex-1 ${currentStep >= 4 ? 'bg-clinic-blue' : 'bg-gray-200'}`}></div>
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <div className="text-center">Select Doctor & Date</div>
            <div className="text-center">Personal Info</div>
            <div className="text-center">Address & Status</div>
            <div className="text-center">Confirm</div>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Select Doctor & Appointment Details'}
              {currentStep === 2 && 'Personal Information'}
              {currentStep === 3 && 'Additional Information'}
              {currentStep === 4 && 'Review & Confirm'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Choose your preferred doctor, date, and time'}
              {currentStep === 2 && 'Please provide your personal details'}
              {currentStep === 3 && 'Please provide your address and additional information'}
              {currentStep === 4 && 'Review your appointment details before confirming'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Doctor and Appointment Details */}
              {currentStep === 1 && (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="doctor">Select Doctor</Label>
                      <Select
                        value={formData.doctorId}
                        onValueChange={(value) => handleSelectChange('doctorId', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map(doctor => (
                            <SelectItem key={doctor.id} value={String(doctor.id)}>
                              Dr. {doctor.first_name} {doctor.last_name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Select Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            disabled={!formData.doctorId || isLoadingDates}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.date ? format(formData.date, "PPP") : "Select a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.date}
                            onSelect={handleDateSelect}
                            disabled={(date) => {
                              // Disable past dates
                              if (date < new Date()) return true;
                              // Disable dates not in availableDates
                              return !availableDates.some(available => 
                                date.getFullYear() === available.getFullYear() &&
                                date.getMonth() === available.getMonth() &&
                                date.getDate() === available.getDate()
                              );
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      {isLoadingDates && <p className="text-sm text-gray-500 mt-1">Loading available dates...</p>}
                    </div>

                    <div>
                      <Label htmlFor="time">Select Time</Label>
                      <Select
                        value={formData.time}
                        onValueChange={(value) => handleSelectChange('time', value)}
                        disabled={!formData.date || isLoadingTimeSlots || availableTimeSlots.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a time slot" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimeSlots.map(slot => (
                            <SelectItem key={slot.id} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isLoadingTimeSlots && <p className="text-sm text-gray-500 mt-1">Loading available times...</p>}
                      {!isLoadingTimeSlots && formData.date && availableTimeSlots.length === 0 && (
                        <p className="text-sm text-red-500 mt-1">No available time slots for this date.</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="type">Appointment Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleSelectChange('type', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select appointment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Consultation">General Consultation</SelectItem>
                          <SelectItem value="Regular Checkup">Regular Check-up</SelectItem>
                          <SelectItem value="Follow-up">Follow-up Visit</SelectItem>
                          <SelectItem value="Vaccination">Vaccination</SelectItem>
                          <SelectItem value="Specialist Consultation">Specialist Consultation</SelectItem>
                          <SelectItem value="Urgent Care">Urgent Care</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Personal Information */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Please enter an 11-digit phone number</p>
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="text"
                      value={formData.dateOfBirth}
                      onChange={handleDateOfBirthChange}
                      placeholder="YYYY-MM-DD"
                      maxLength={10}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Required format: YYYY-MM-DD (e.g., 1990-01-15)</p>
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <RadioGroup
                      value={formData.gender}
                      onValueChange={(value) => handleSelectChange('gender', value)}
                      className="flex space-x-4"
                    >
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
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Step 3: Additional Information */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Home Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your complete home address"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <Select
                      value={formData.maritalStatus}
                      onValueChange={(value) => handleSelectChange('maritalStatus', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Enter any additional information relevant to your appointment"
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Appointment Details</h3>
                      <dl className="mt-2 text-sm">
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Doctor</dt>
                          <dd className="mt-1">
                            {doctors.find(d => d.id.toString() === formData.doctorId) ? 
                              `Dr. ${doctors.find(d => d.id.toString() === formData.doctorId)?.first_name} ${doctors.find(d => d.id.toString() === formData.doctorId)?.last_name}` : 
                              'No doctor selected'}
                          </dd>
                        </div>
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Date</dt>
                          <dd className="mt-1">{formData.date ? format(formData.date, 'PPPP') : 'No date selected'}</dd>
                        </div>
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Time</dt>
                          <dd className="mt-1">{formData.time || 'No time selected'}</dd>
                        </div>
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Appointment Type</dt>
                          <dd className="mt-1">{formData.type || 'No type selected'}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Personal Information</h3>
                      <dl className="mt-2 text-sm">
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Name</dt>
                          <dd className="mt-1">{formData.name}</dd>
                        </div>
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Email</dt>
                          <dd className="mt-1">{formData.email}</dd>
                        </div>
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1">{formData.phone}</dd>
                        </div>
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Date of Birth</dt>
                          <dd className="mt-1">{formData.dateOfBirth}</dd>
                        </div>
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Gender</dt>
                          <dd className="mt-1">{formData.gender}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Additional Information</h3>
                    <dl className="mt-2 text-sm">
                      <div className="mt-3">
                        <dt className="font-medium text-gray-500">Address</dt>
                        <dd className="mt-1">{formData.address}</dd>
                      </div>
                      <div className="mt-3">
                        <dt className="font-medium text-gray-500">Marital Status</dt>
                        <dd className="mt-1">{formData.maritalStatus}</dd>
                      </div>
                      {formData.notes && (
                        <div className="mt-3">
                          <dt className="font-medium text-gray-500">Additional Notes</dt>
                          <dd className="mt-1">{formData.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500">
                      By clicking "Confirm Appointment", you agree to our terms and conditions. We'll send a confirmation to your email.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            {currentStep > 1 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
            {currentStep < 4 ? (
              <Button 
                type="button" 
                onClick={nextStep}
                className={currentStep === 1 && !formData.doctorId ? "opacity-50 cursor-not-allowed" : ""}
                disabled={currentStep === 1 && !formData.doctorId}
              >
                Next
              </Button>
            ) : (
              <Button 
                type="submit" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm Appointment"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentScheduling;
