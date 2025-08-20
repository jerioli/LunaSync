import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/contexts/ClinicContext';
import { convertDisplayTimeTo24Hour, generateTimeSlots } from '@/utils/timeSlots';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

// Configure axios defaults
axios.defaults.baseURL = 'http://127.0.0.1:8000';
axios.defaults.withCredentials = true; // Important for handling cookies

// Add request interceptor to include auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      toast.error('Please log in to access this feature');
      // Optionally redirect to login page
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

// Form schema to validate the form inputs
const appointmentSchema = z.object({
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string({
    required_error: "Please select a time",
  }),
  appointment_type: z.string({
    required_error: "Please select an appointment type",
  }),
  patientId: z.string({
    required_error: "Please select a patient",
  }),
  doctorId: z.string({
    required_error: "Please select a doctor",
  }),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ label: string; value: string }[]>([]);
  const { clinicCustomization } = useClinic();

  // Fetch patients and doctors when the modal is opened
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const [patientsResponse, doctorsResponse] = await Promise.all([
            axios.get<Patient[]>('/patients/'),
            axios.get('/doctors/')
          ]);
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

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      notes: '',
    },
  });

  // Watch for date changes to fetch available time slots
  const selectedDate = form.watch('date');
  const selectedDoctor = form.watch('doctorId');

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      fetchAvailableTimeSlots(selectedDate, selectedDoctor);
    }
  }, [selectedDate, selectedDoctor]);

  const onSubmit = async (data: AppointmentFormValues) => {
    setLoading(true); // Start loading
    try {
      // Format the date to YYYY-MM-DD string
      const formattedDate = format(data.date, 'yyyy-MM-dd');

      // Debug logs
      console.log('Form data:', data);
      console.log('Available patients:', patients);
      console.log('Selected patient ID:', data.patientId);

      // Get the selected patient
      const selectedPatient = patients.find(p => p.id.toString() === data.patientId.toString());
      if (!selectedPatient) {
        console.error('Patient not found. Available patients:', patients);
        throw new Error('Selected patient not found');
      }

      // Format phone number to remove any non-digit characters if it exists
      const formattedPhone = selectedPatient.phone ? selectedPatient.phone.replace(/\D/g, '') : null;
      
      // Validate phone number length only if a phone number is provided
      if (formattedPhone && (formattedPhone.length < 10 || formattedPhone.length > 15)) {
        toast.error("Phone number must be between 10 and 15 digits");
        return;
      }

      // Map frontend appointment type to backend type
      const appointmentType = data.appointment_type === 'Check-up' ? 'Routine Check-up' : data.appointment_type;

      const appointmentData = {
        patient_name: selectedPatient.name,
        patient_email: selectedPatient.email,
        patient_phone: formattedPhone,
        type: data.appointment_type,
        appointment_type: data.appointment_type,
        date: formattedDate,
        time: data.time,
        notes: data.notes || '',
        doctor_id: parseInt(data.doctorId),
        status: 'scheduled'
      };

      console.log('Sending appointment data:', appointmentData);

      try {
        const response = await axios.post('/appointments/create/', appointmentData);
        console.log('Appointment created:', response.data);
        toast.success("Appointment scheduled successfully");
        onOpenChange(false);
        form.reset();
      } catch (error: any) {
        console.error('Backend error:', error.response?.data);
        toast.error(error.response?.data?.error || "Failed to schedule appointment");
      }
    } catch (error: any) {
      console.error('Backend error:', error.response?.data);
      toast.error(error.response?.data?.error || "Failed to schedule appointment");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Fill in the details below to schedule a new appointment.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
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
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor" />
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
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <div className="border rounded-md p-2 max-w-full overflow-x-auto">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
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
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTimeSlots.map(slot => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
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
              name="appointment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional information about this appointment"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include any relevant details about the appointment.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentModal;
