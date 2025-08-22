import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/hooks/useClinicContext';
import { axiosInstance } from '@/services/api';
import { convertDisplayTimeTo24Hour, generateTimeSlots } from '@/utils/timeSlots';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, FileText, Stethoscope, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

// Appointment types
const APPOINTMENT_TYPES = [
  'Check-up',
  'Follow-up',
  'Consultation',
  'Vaccination',
  'Lab Test',
  'Physical Examination',
  'Emergency'
];

// Form schema for new patient
const newPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleInitial: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  gender: z.string().min(1, "Gender is required"),
  maritalStatus: z.string().optional(),
});

// Form schema for appointment wizard
const appointmentSchema = z.object({
  // Step 0: Patient Selection
  isExistingPatient: z.boolean(),
  patientId: z.string().optional(),
  newPatient: newPatientSchema.optional(),
  
  // Step 1: Doctor & Type Selection
  doctorId: z.string({
    required_error: "Please select a doctor",
  }),
  appointmentType: z.string({
    required_error: "Please select an appointment type",
  }),
  
  // Step 2: Date Selection
  date: z.date({
    required_error: "Please select a date",
  }),
  
  // Step 3: Time Selection
  time: z.string({
    required_error: "Please select a time",
  }),
  
  // Step 4: Notes
  notes: z.string().optional(),
}).refine((data) => {
  if (data.isExistingPatient) {
    return data.patientId && data.patientId.length > 0;
  } else {
    return data.newPatient;
  }
}, {
  message: "Please select a patient or fill in new patient details",
  path: ["patientId"],
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// Step configuration
const STEPS = [
  { id: 0, title: "Patient Selection", icon: User, description: "Select or create patient" },
  { id: 1, title: "Doctor & Type", icon: Stethoscope, description: "Choose doctor and appointment type" },
  { id: 2, title: "Select Date", icon: CalendarIcon, description: "Pick appointment date" },
  { id: 3, title: "Select Time", icon: Clock, description: "Choose available time slot" },
  { id: 4, title: "Notes", icon: FileText, description: "Add additional information" },
  { id: 5, title: "Confirmation", icon: User, description: "Review and confirm details" },
];

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  maritalStatus?: string;
}

const NewAppointmentModal = ({ open, onOpenChange }: NewAppointmentModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ label: string; value: string }[]>([]);
  const { clinicCustomization } = useClinic();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      isExistingPatient: true,
      notes: '',
    },
  });

  // Watch for changes
  const isExistingPatient = form.watch('isExistingPatient');
  const selectedDate = form.watch('date');
  const selectedDoctor = form.watch('doctorId');
  const selectedTime = form.watch('time');
  const formValues = form.watch();

  // Reset patient fields when switching between existing/new patient
  useEffect(() => {
    if (isExistingPatient) {
      form.setValue('newPatient', undefined);
    } else {
      form.setValue('patientId', undefined);
    }
  }, [isExistingPatient, form]);

  // Reset form and step when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      form.reset({
        isExistingPatient: true,
        notes: '',
      });
      setAvailableTimeSlots([]);
    }
  }, [open, form]);

  // Fetch patients and doctors when the modal is opened
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const [patientsResponse, doctorsResponse] = await Promise.all([
            axiosInstance.get<Patient[]>('/patients/'),
            axiosInstance.get('/doctors/')
          ]);
          console.log('Loaded patients:', patientsResponse.data);
          console.log('Loaded doctors:', doctorsResponse.data);
          setPatients(patientsResponse.data);
          setDoctors(doctorsResponse.data.map((doctor: any) => ({
            id: doctor.id.toString(),
            name: `Dr. ${doctor.first_name} ${doctor.last_name}`
          })));
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('Failed to fetch data. Please try again.');
        }
      };

      fetchData();
    }
  }, [open]);

  // Fetch available time slots when date is selected
  const fetchAvailableTimeSlots = async (date: Date, doctorId: string) => {
    try {
      // Generate time slots dynamically based on clinic operating hours
      const generatedTimeSlots = generateTimeSlots(date, clinicCustomization);
      
      if (generatedTimeSlots.length === 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        
        toast.error(`The clinic is closed on ${dayName}s. Please select a different date.`);
        setAvailableTimeSlots([]);
        return;
      }
      
      // Convert generated time slots to the format expected by the component
      const slots = generatedTimeSlots.map(timeSlot => ({
        label: timeSlot,
        value: convertDisplayTimeTo24Hour(timeSlot)
      }));
      
      // TODO: In a future update, filter out already booked time slots by checking the database
      // For now, all generated slots are available
      setAvailableTimeSlots(slots);
      
    } catch (error) {
      console.error('Error generating time slots:', error);
      toast.error('Failed to generate available time slots. Please try again.');
    }
  };

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      fetchAvailableTimeSlots(selectedDate, selectedDoctor);
    }
  }, [selectedDate, selectedDoctor]);

  // Step navigation functions
  const nextStep = async () => {
    console.log('nextStep called - current step:', currentStep);
    let isValid = false;
    const formValues = form.getValues();

    // Validate current step before proceeding
    switch (currentStep) {
      case 0: // Patient Selection
        if (isExistingPatient) {
          await form.trigger(['patientId']);
          isValid = !!formValues.patientId && formValues.patientId.trim() !== '';
          if (!isValid) {
            toast.error("Please select a patient");
          }
        } else {
          // Trigger validation for all new patient fields
          await form.trigger([
            'newPatient.firstName', 
            'newPatient.lastName', 
            'newPatient.contactNumber', 
            'newPatient.email', 
            'newPatient.address', 
            'newPatient.dateOfBirth', 
            'newPatient.gender',
            'newPatient.maritalStatus'
          ] as const);
          
          const newPatient = formValues.newPatient;
          isValid = !!(
            newPatient?.firstName?.trim() &&
            newPatient?.lastName?.trim() &&
            newPatient?.contactNumber?.trim() &&
            newPatient?.email?.trim() &&
            newPatient?.address?.trim() &&
            newPatient?.dateOfBirth &&
            newPatient?.gender?.trim() &&
            newPatient?.maritalStatus?.trim()
          );
          
          if (!isValid) {
            const errors = form.formState.errors;
            console.log('Form errors:', errors);
            console.log('Form values:', formValues);
            toast.error("Please fill in all required patient information");
          }
        }
        break;
      case 1: // Doctor & Type
        await form.trigger(['doctorId', 'appointmentType']);
        isValid = !!formValues.doctorId && !!formValues.appointmentType;
        if (!isValid) {
          toast.error("Please select a doctor and appointment type");
        }
        break;
      case 2: // Date
        await form.trigger(['date']);
        isValid = !!formValues.date;
        if (!isValid) {
          toast.error("Please select a date");
        }
        break;
      case 3: // Time
        await form.trigger(['time']);
        isValid = !!formValues.time;
        if (!isValid) {
          toast.error("Please select a time slot");
        }
        break;
      case 4: // Notes (optional, always valid)
        isValid = true;
        break;
      default:
        isValid = true;
    }

    if (isValid && currentStep < STEPS.length - 1) {
      console.log('Moving to next step:', currentStep + 1);
      setCurrentStep(currentStep + 1);
    } else if (isValid) {
      console.log('Already on final step, cannot proceed further');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  // Function to create a new patient
  const createNewPatient = async (patientData: z.infer<typeof newPatientSchema>) => {
    try {
      // Construct full name from individual components
      const nameComponents = [
        patientData.firstName,
        patientData.middleInitial,
        patientData.lastName,
        patientData.suffix
      ].filter(component => component && component.trim()).join(' ');

      // Format the patient data for the backend
      const formattedPatientData = {
        first_name: patientData.firstName,
        middle_initial: patientData.middleInitial || '',
        last_name: patientData.lastName,
        suffix: patientData.suffix || '',
        name: nameComponents, // Keep full name for backward compatibility
        email: patientData.email,
        phone: patientData.contactNumber.replace(/\D/g, ''), // Remove non-digits
        address: patientData.address,
        date_of_birth: format(patientData.dateOfBirth, 'yyyy-MM-dd'),
        gender: patientData.gender,
        marital_status: patientData.maritalStatus || '',
      };

      console.log('Creating new patient:', formattedPatientData);

      const response = await axiosInstance.post('/patients/', formattedPatientData);
      console.log('Patient created:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('Error creating patient:', error.response?.data);
      throw new Error(error.response?.data?.error || 'Failed to create patient');
    }
  };

  const onSubmit = async (data: AppointmentFormValues) => {
    // Only allow submission when on the final confirmation step
    if (currentStep !== STEPS.length - 1) {
      console.log('Form submission prevented - not on confirmation step. Current step:', currentStep);
      return;
    }

    console.log('Form submission started - on confirmation step');
    setLoading(true);
    try {
      let patientId: string;
      let patientName: string;
      let patientEmail: string;
      let patientPhone: string;
      let patientData: any = {};

      // Handle patient creation or selection
      if (data.isExistingPatient) {
        // Use existing patient
        const selectedPatient = patients.find(p => p.id.toString() === data.patientId);
        if (!selectedPatient) {
          throw new Error('Selected patient not found');
        }
        
        // Fetch full patient details for existing patient
        try {
          const patientResponse = await axiosInstance.get(`/patients/${selectedPatient.id}/`);
          const fullPatientData = patientResponse.data;
          
          patientId = selectedPatient.id;
          patientName = selectedPatient.name;
          patientEmail = selectedPatient.email;
          patientPhone = selectedPatient.phone;
          
          // Use actual patient data from the database
          patientData = {
            firstName: fullPatientData.first_name || fullPatientData.name?.split(' ')[0] || '',
            middleInitial: fullPatientData.middle_initial || '',
            lastName: fullPatientData.last_name || fullPatientData.name?.split(' ').slice(1).join(' ') || '',
            suffix: fullPatientData.suffix || '',
            date_of_birth: fullPatientData.date_of_birth || '1990-01-01',
            gender: fullPatientData.gender || 'Not Specified',
            address: fullPatientData.address || 'Address on file',
            marital_status: fullPatientData.marital_status || 'Not Specified',
          };
        } catch (fetchError) {
          console.warn('Could not fetch full patient details, using placeholder values:', fetchError);
          // Fallback to placeholder values if fetch fails
          patientData = {
            firstName: selectedPatient.name.split(' ')[0] || '',
            middleInitial: '',
            lastName: selectedPatient.name.split(' ').slice(1).join(' ') || '',
            suffix: '',
            date_of_birth: '1990-01-01',
            gender: 'Not Specified',
            address: 'Address on file',
            marital_status: 'Not Specified',
          };
        }
      } else {
        // Create new patient first
        if (!data.newPatient) {
          throw new Error('New patient data is required');
        }
        
        const newPatient = await createNewPatient(data.newPatient);
        patientId = newPatient.id.toString();
        patientName = newPatient.name;
        patientEmail = newPatient.email;
        patientPhone = newPatient.phone;
        
        // Use new patient data
        patientData = {
          firstName: data.newPatient.firstName,
          middleInitial: data.newPatient.middleInitial || '',
          lastName: data.newPatient.lastName,
          suffix: data.newPatient.suffix || '',
          date_of_birth: format(data.newPatient.dateOfBirth, 'yyyy-MM-dd'),
          gender: data.newPatient.gender,
          address: data.newPatient.address,
          marital_status: data.newPatient.maritalStatus,
        };
        
        // Update the patients list with the new patient
        setPatients(prev => [...prev, {
          id: newPatient.id.toString(),
          name: newPatient.name,
          email: newPatient.email,
          phone: newPatient.phone,
        }]);
      }

      // Format the date to YYYY-MM-DD string
      const formattedDate = format(data.date, 'yyyy-MM-dd');

      // Validate phone number length
      const formattedPhone = patientPhone ? patientPhone.replace(/\D/g, '') : null;
      if (formattedPhone && (formattedPhone.length < 10 || formattedPhone.length > 15)) {
        toast.error("Phone number must be between 10 and 15 digits");
        return;
      }

      const appointmentData = {
        // Patient identification
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: formattedPhone,
        
        // Patient details - now using actual or new patient data
        firstName: patientData.firstName,
        middleInitial: patientData.middleInitial,
        lastName: patientData.lastName,
        suffix: patientData.suffix,
        date_of_birth: patientData.date_of_birth,
        gender: patientData.gender,
        address: patientData.address,
        marital_status: patientData.marital_status,
        
        // Appointment details
        type: data.appointmentType,
        appointment_type: data.appointmentType,
        date: formattedDate,
        time: data.time,
        notes: data.notes || '',
        doctor_id: parseInt(data.doctorId),
        status: 'scheduled'
      };

      console.log('Creating appointment:', appointmentData);

      const response = await axiosInstance.post('/appointments/create/', appointmentData);
      console.log('Appointment created:', response.data);
      
      toast.success(`Appointment scheduled successfully${!data.isExistingPatient ? ' and patient record created' : ''}`);
      onOpenChange(false);
      
      // Reset form and step
      setCurrentStep(1);
      form.reset({
        isExistingPatient: true,
        notes: '',
      });
      
    } catch (error: any) {
      console.error('Error:', error);
      
      // Better error handling with specific messages
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error) {
          toast.error(`Failed to schedule appointment: ${errorData.error}`);
        } else if (errorData.detail) {
          toast.error(`Failed to schedule appointment: ${errorData.detail}`);
        } else {
          toast.error('Failed to schedule appointment: Please check all required fields');
        }
      } else if (error.response?.status === 401) {
        toast.error('Please log in to schedule appointments');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later');
      } else {
        toast.error(error.message || 'Failed to schedule appointment');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step render functions
  const renderPatientSelection = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="isExistingPatient"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Existing Patient?</FormLabel>
              <FormDescription>
                Check this if the patient already has a record in the system
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {isExistingPatient ? (
        <FormField
          control={form.control}
          name="patientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Patient *</FormLabel>
              <Select 
                onValueChange={(value) => {
                  console.log('Patient selected:', value);
                  field.onChange(value);
                }} 
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an existing patient" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {patients.length === 0 ? (
                    <SelectItem value="no-patients" disabled>
                      No patients available
                    </SelectItem>
                  ) : (
                    patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.name} - {patient.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <h4 className="font-medium text-lg">New Patient Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="newPatient.firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPatient.middleInitial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Initial</FormLabel>
                  <FormControl>
                    <Input placeholder="M" maxLength={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPatient.lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPatient.suffix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suffix</FormLabel>
                  <FormControl>
                    <Input placeholder="Jr, Sr, III, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPatient.contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., +1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPatient.gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="newPatient.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="patient@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPatient.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address *</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter full address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPatient.dateOfBirth"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Birth *</FormLabel>
                <div className="border rounded-md p-2">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    className="mx-auto"
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPatient.maritalStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marital Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );

  const renderDoctorAndType = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="doctorId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Doctor *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a doctor" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="appointmentType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Appointment Type *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select appointment type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {APPOINTMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderDateSelection = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Select Date *</FormLabel>
            <div className="border rounded-md p-2">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) => date < new Date()}
                initialFocus
                className="mx-auto"
              />
            </div>
            <FormDescription>
              Choose your preferred appointment date
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderTimeSelection = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="time"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Select Time Slot *</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-2 md:grid-cols-3 gap-3"
              >
                {availableTimeSlots.map((slot) => (
                  <div key={slot.value} className="flex items-center space-x-2">
                    <Card className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                      field.value === slot.value ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}>
                      <RadioGroupItem value={slot.value} id={slot.value} className="sr-only" />
                      <label 
                        htmlFor={slot.value} 
                        className="text-sm font-medium cursor-pointer w-full block text-center"
                      >
                        {slot.label}
                      </label>
                    </Card>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormDescription>
              {availableTimeSlots.length > 0 
                ? `${availableTimeSlots.length} available time slots for ${selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'selected date'}`
                : 'Please select a doctor and date first to see available times'
              }
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Add any additional information about this appointment..."
                className="resize-none min-h-[120px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Include any relevant details, symptoms, or special requirements
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderConfirmation = () => {
    const formValues = form.getValues();
    const currentIsExistingPatient = formValues.isExistingPatient;
    
    // Debug log to see what we have
    console.log('Confirmation step - form values:', formValues);
    console.log('Is existing patient:', currentIsExistingPatient);
    console.log('Patient ID:', formValues.patientId);
    console.log('New patient data:', formValues.newPatient);
    console.log('Available patients:', patients);
    
    const selectedPatient = currentIsExistingPatient 
      ? patients.find(p => p.id.toString() === formValues.patientId?.toString())
      : null;
    
    console.log('Selected patient:', selectedPatient);
    
    const selectedDoctorObj = doctors.find(d => d.id === formValues.doctorId);
    const selectedTimeSlot = availableTimeSlots.find(t => t.value === formValues.time);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Review Appointment Details</h3>
          <p className="text-sm text-gray-600">Please review all details before confirming</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              {currentIsExistingPatient ? (
                selectedPatient ? (
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {selectedPatient.name}</p>
                    <p><strong>Email:</strong> {selectedPatient.email}</p>
                    <p><strong>Phone:</strong> {selectedPatient.phone}</p>
                  </div>
                ) : (
                  <p className="text-red-600">Please select a patient</p>
                )
              ) : formValues.newPatient ? (
                <div className="space-y-2">
                  <p><strong>Name:</strong> {[
                    formValues.newPatient.firstName,
                    formValues.newPatient.middleInitial,
                    formValues.newPatient.lastName,
                    formValues.newPatient.suffix
                  ].filter(part => part && part.trim()).join(' ')}</p>
                  <p><strong>Email:</strong> {formValues.newPatient.email}</p>
                  <p><strong>Phone:</strong> {formValues.newPatient.contactNumber}</p>
                  <p><strong>Address:</strong> {formValues.newPatient.address}</p>
                  <p><strong>Date of Birth:</strong> {formValues.newPatient.dateOfBirth ? format(formValues.newPatient.dateOfBirth, 'MMMM d, yyyy') : 'N/A'}</p>
                  <p><strong>Gender:</strong> {formValues.newPatient.gender}</p>
                  {formValues.newPatient.maritalStatus && (
                    <p><strong>Marital Status:</strong> {formValues.newPatient.maritalStatus}</p>
                  )}
                  <p className="text-sm text-blue-600 mt-2">* New patient record will be created</p>
                </div>
              ) : (
                <p className="text-red-600">No patient information available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Doctor:</strong> {selectedDoctorObj?.name || 'N/A'}</p>
                  <p><strong>Type:</strong> {formValues.appointmentType || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Date:</strong> {formValues.date ? format(formValues.date, 'MMMM d, yyyy') : 'N/A'}</p>
                  <p><strong>Time:</strong> {selectedTimeSlot?.label || 'N/A'}</p>
                </div>
              </div>
              {formValues.notes && (
                <div className="mt-4">
                  <p><strong>Notes:</strong></p>
                  <p className="text-sm text-gray-600 mt-1">{formValues.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isAccessible = index <= currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                <button
                  onClick={() => isAccessible && goToStep(index)}
                  disabled={!isAccessible}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                      : isCompleted
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : isAccessible
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </button>
                <span className={`text-xs text-center max-w-[80px] ${
                  isActive ? 'text-primary font-medium' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div className={`absolute h-0.5 w-16 translate-x-12 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form 
            onSubmit={(e) => {
              console.log('Form submit event triggered');
              e.preventDefault();
              // Only submit if we're on the confirmation step
              if (currentStep === STEPS.length - 1) {
                console.log('Allowing form submission - on confirmation step');
                form.handleSubmit(onSubmit)(e);
              } else {
                console.log('Preventing form submission - not on confirmation step. Current step:', currentStep);
              }
            }} 
            className="space-y-6"
          >
            
            {/* Step Content */}
            <div className="min-h-[400px]">
              {currentStep === 0 && renderPatientSelection()}
              {currentStep === 1 && renderDoctorAndType()}
              {currentStep === 2 && renderDateSelection()}
              {currentStep === 3 && renderTimeSelection()}
              {currentStep === 4 && renderNotes()}
              {currentStep === 5 && renderConfirmation()}
            </div>

            {/* Navigation Footer */}
            <DialogFooter className="pt-6 border-t">
              <div className="flex justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 0 ? () => onOpenChange(false) : prevStep}
                  disabled={loading}
                >
                  {currentStep === 0 ? (
                    'Cancel'
                  ) : (
                    <>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </>
                  )}
                </Button>

                <div className="flex space-x-2">
                  {currentStep < STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={loading}
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? 'Creating...' : 'Create Appointment'}
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentModal;
