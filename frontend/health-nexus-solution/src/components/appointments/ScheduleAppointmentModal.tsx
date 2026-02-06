import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "@/hooks/useClinicContext";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/services/api";
import {
  convertDisplayTimeTo24Hour,
  generateTimeSlots,
} from "@/utils/timeSlots";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Search,
  Stethoscope,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Appointment types
const APPOINTMENT_TYPES = [
  "Check-up",
  "Follow-up",
  "Consultation",
  "Vaccination",
  "Lab Test",
  "Physical Examination",
  "Emergency",
];

// Form schema for new patient
const newPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleInitial: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  contactNumber: z
    .string()
    .min(11, "Contact number must be exactly 11 digits")
    .max(11, "Contact number must be exactly 11 digits")
    .regex(/^09\d{9}$/, "Phone number must start with 09 and be 11 digits"),
  email: z
    .string()
    .email("Invalid email address")
    .refine((email) => {
      const validTLDs = [
        "com",
        "net",
        "org",
        "edu",
        "gov",
        "mil",
        "co",
        "uk",
        "ph",
        "au",
        "ca",
        "de",
        "fr",
        "jp",
        "cn",
        "in",
        "br",
        "ru",
        "es",
        "it",
        "nl",
        "se",
        "no",
        "dk",
        "fi",
        "be",
        "ch",
        "at",
        "nz",
        "sg",
        "hk",
        "tw",
        "kr",
        "my",
        "th",
        "vn",
        "id",
        "ae",
        "sa",
        "za",
        "eg",
        "ng",
        "ke",
      ];
      const domain = email.split("@")[1];
      if (!domain) return false;
      const tld = domain.split(".").pop()?.toLowerCase();
      return tld ? validTLDs.includes(tld) : false;
    }, "Please enter a valid email domain (e.g., gmail.com, yahoo.com)"),
  address: z.string().min(1, "Address is required"),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  gender: z.string().min(1, "Sex is required"),
  maritalStatus: z.string().optional(),
});

// Form schema for appointment wizard
const appointmentSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      if (data.isExistingPatient) {
        return data.patientId && data.patientId.length > 0;
      } else {
        return data.newPatient;
      }
    },
    {
      message: "Please select a patient or fill in new patient details",
      path: ["patientId"],
    },
  );

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// Step configuration
const STEPS = [
  {
    id: 0,
    title: "Patient Selection",
    icon: User,
    description: "Select or create patient",
  },
  {
    id: 1,
    title: "Doctor & Type",
    icon: Stethoscope,
    description: "Choose doctor and appointment type",
  },
  {
    id: 2,
    title: "Date & Time",
    icon: CalendarIcon,
    description: "Pick appointment date and time",
  },
  {
    id: 3,
    title: "Notes",
    icon: FileText,
    description: "Add additional information",
  },
  {
    id: 4,
    title: "Confirmation",
    icon: User,
    description: "Review and confirm details",
  },
];

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Patient {
  id: string;
  patient_id?: string; // Add patient_id field
  name: string;
  email: string;
  phone: string;
  maritalStatus?: string;
}

const NewAppointmentModal = ({
  open,
  onOpenChange,
}: NewAppointmentModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<
    { label: string; value: string }[]
  >([]);

  // Patient search states
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Doctor search states
  const [doctorSearchOpen, setDoctorSearchOpen] = useState(false);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
  const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
  const [hasDoctorSearched, setHasDoctorSearched] = useState(false);
  const [allDoctors, setAllDoctors] = useState<{ id: string; name: string }[]>(
    [],
  );

  const { clinicCustomization } = useClinic();
  const { toast } = useToast();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      isExistingPatient: true,
      notes: "",
    },
  });

  // Watch for changes
  const isExistingPatient = form.watch("isExistingPatient");
  const selectedDate = form.watch("date");
  const selectedDoctor = form.watch("doctorId");
  const selectedTime = form.watch("time");
  const formValues = form.watch();

  // Reset patient fields when switching between existing/new patient
  useEffect(() => {
    if (isExistingPatient) {
      form.setValue("newPatient", undefined);
    } else {
      form.setValue("patientId", undefined);
    }
  }, [isExistingPatient, form]);

  // Reset form and step when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      form.reset({
        isExistingPatient: true,
        notes: "",
      });
      setAvailableTimeSlots([]);
      setPatients([]); // Clear patients when modal closes
      setPatientSearchTerm("");
      setHasSearched(false);
      setPatientSearchOpen(false);
      setIsSearchingPatients(false);

      // Reset doctor search states
      setDoctors([]);
      setDoctorSearchTerm("");
      setHasDoctorSearched(false);
      setDoctorSearchOpen(false);
      setIsSearchingDoctors(false);
    }
  }, [open, form]);

  // Fetch only doctors when the modal is opened (don't fetch all patients)
  useEffect(() => {
    if (open) {
      const fetchDoctors = async () => {
        try {
          const doctorsResponse = await axiosInstance.get("/doctors/");
          console.log("Loaded doctors:", doctorsResponse.data);
          const formattedDoctors = doctorsResponse.data.map((doctor: any) => ({
            id: doctor.id.toString(),
            name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
          }));
          setAllDoctors(formattedDoctors); // Store all doctors
          setDoctors(formattedDoctors); // Display all doctors immediately
          setHasDoctorSearched(true); // Mark as searched to show doctors
        } catch (error) {
          console.error("Error fetching doctors:", error);
          toast({
            title: "Error",
            description: "Failed to fetch doctors. Please try again.",
            variant: "destructive",
          });
        }
      };

      fetchDoctors();
    }
  }, [open]);

  // Search patients function
  const searchPatients = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setPatients([]);
      setHasSearched(false);
      return;
    }

    setIsSearchingPatients(true);
    try {
      console.log("Searching for patients with term:", searchTerm);
      const response = await axiosInstance.get("/patients/", {
        params: {
          search: searchTerm,
          ordering: "name",
          limit: 50,
        },
      });

      console.log("Patient search response:", response.data);
      console.log("Response data length:", response.data.length);

      // The response should be an array of patients
      const patientData = Array.isArray(response.data) ? response.data : [];

      // Convert patient data to match our interface
      const formattedPatients = patientData.map((patient: any) => {
        console.log("Processing patient:", patient);
        return {
          id: patient.id.toString(),
          patient_id: patient.patient_id, // Include the actual patient_id field
          name:
            patient.name ||
            `${patient.first_name || ""} ${patient.last_name || ""}`.trim(),
          email: patient.email || "",
          phone: patient.phone || "",
        };
      });

      console.log("Formatted patients:", formattedPatients);
      setPatients(formattedPatients);
      setHasSearched(true);

      // Debug: Log the state after setting patients
      console.log("Patients state will be set to:", formattedPatients);
      console.log("hasSearched will be set to: true");
      console.log(
        "isSearchingPatients will be set to: false (in finally block)",
      );
    } catch (error) {
      console.error("Error searching patients:", error);
      toast({
        title: "Error",
        description: "Failed to search patients. Please try again.",
        variant: "destructive",
      });
      setPatients([]);
      setHasSearched(true);
    } finally {
      setIsSearchingPatients(false);
    }
  };

  // Search doctors function
  const searchDoctors = (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setDoctors([]);
      setHasDoctorSearched(false);
      return;
    }

    setIsSearchingDoctors(true);
    try {
      console.log("Searching for doctors with term:", searchTerm);

      // Filter from allDoctors (client-side search since doctors list is usually small)
      const filteredDoctors = allDoctors.filter((doctor) =>
        doctor.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      console.log("Filtered doctors:", filteredDoctors);
      setDoctors(filteredDoctors);
      setHasDoctorSearched(true);
    } catch (error) {
      console.error("Error searching doctors:", error);
      setDoctors([]);
    } finally {
      setIsSearchingDoctors(false);
    }
  };

  // Debounced search effect for patients
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (patientSearchTerm.trim().length >= 2) {
        searchPatients(patientSearchTerm.trim());
      } else if (patientSearchTerm.trim().length === 0) {
        // Clear results when search is empty
        setPatients([]);
        setHasSearched(false);
        setIsSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [patientSearchTerm]);

  // Debounced search effect for doctors
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (doctorSearchTerm.trim().length >= 2) {
        searchDoctors(doctorSearchTerm.trim());
      } else if (doctorSearchTerm.trim().length === 0) {
        // Clear results when search is empty
        setDoctors([]);
        setHasDoctorSearched(false);
        setIsSearchingDoctors(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [doctorSearchTerm]);

  // Fetch available time slots when date is selected
  const fetchAvailableTimeSlots = async (date: Date, doctorId: string) => {
    try {
      console.log(
        "Fetching available time slots for doctor:",
        doctorId,
        "on date:",
        date,
      );

      // Format date to YYYY-MM-DD without timezone conversion (same as chatbot)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      console.log("Formatted date string:", dateString);

      // Fetch existing appointments for this doctor on this date
      let bookedTimeSlots: string[] = [];
      try {
        const appointmentsResponse = await axiosInstance.get("/appointments/", {
          params: {
            doctor_id: doctorId,
            appointment_date: dateString,
            status: "upcoming,ongoing", // Only upcoming and ongoing appointments block slots
          },
        });

        console.log(
          "Existing appointments response:",
          appointmentsResponse.data,
        );

        // Extract booked time slots from appointments
        if (Array.isArray(appointmentsResponse.data)) {
          bookedTimeSlots = appointmentsResponse.data
            .filter((apt) => apt.appointment_time) // Only include appointments with time
            .map((apt) => {
              // Convert appointment time to match the format used in time slots
              // If appointment_time is already in HH:MM format, use it directly
              const timeStr = apt.appointment_time;
              if (timeStr && timeStr.includes(":")) {
                return timeStr;
              }
              return null;
            })
            .filter((time) => time !== null);

          console.log("Booked time slots from appointments:", bookedTimeSlots);
        }
      } catch (appointmentError) {
        console.error("Error fetching appointments:", appointmentError);
        // Continue even if appointment fetch fails - we'll rely on is_booked from availability
      }

      // Use the same API endpoint as the chatbot
      const response = await axiosInstance.get(`/availability/`, {
        params: {
          doctor_id: doctorId,
          date: dateString,
        },
      });

      console.log("Time slots API response:", response.data);

      // Check if response is an array and has at least one item (same as chatbot logic)
      if (!Array.isArray(response.data) || response.data.length === 0) {
        toast({
          title: "Info",
          description:
            "No available time slots found for the selected doctor and date.",
        });
        setAvailableTimeSlots([]);
        return;
      }

      // Get the first availability object (same as chatbot)
      const availability = response.data[0];

      // Check if availability has time_slots array
      if (
        !availability ||
        !availability.time_slots ||
        !Array.isArray(availability.time_slots)
      ) {
        console.log("No time slots in availability:", availability);
        toast({
          title: "Info",
          description:
            "No available time slots for the selected doctor and date.",
        });
        setAvailableTimeSlots([]);
        return;
      }

      console.log("Raw time slots:", availability.time_slots);

      // Log all time slots before filtering (same as chatbot)
      console.log(
        "All time slots before filtering:",
        availability.time_slots.map((slot) => ({
          start: slot.start_time,
          end: slot.end_time,
          booked: slot.is_booked,
        })),
      );

      // Filter out booked slots and lunch break (12:00 PM - 1:00 PM) matching chatbot logic
      const availableSlots = availability.time_slots.filter((slot) => {
        // Check if slot is marked as booked in the availability data
        const isBookedInAvailability = Boolean(
          slot.is_booked === true ||
          slot.is_booked === 1 ||
          slot.is_booked === "true" ||
          slot.is_booked === "1" ||
          slot.is_booked === "True" ||
          slot.is_booked === "TRUE" ||
          slot.is_booked === "yes" ||
          slot.is_booked === "YES" ||
          slot.is_booked === "Yes",
        );

        // Also check if this time slot has an existing appointment
        const isBookedByAppointment = bookedTimeSlots.includes(slot.start_time);

        const isBooked = isBookedInAvailability || isBookedByAppointment;

        if (isBookedByAppointment) {
          console.log(
            `Time slot ${slot.start_time} is booked by an existing appointment`,
          );
        }

        // Skip lunch break (12:00 PM to 1:00 PM) - same logic as chatbot
        const [hours] = slot.start_time.split(":");
        const hour = parseInt(hours);
        const isLunchBreak = hour === 12;

        // Debug logging for lunch break filtering
        if (isLunchBreak) {
          console.log(
            `Filtering out lunch break slot: ${slot.start_time} - ${slot.end_time} (hour: ${hour})`,
          );
        }

        // Only show slots that are NOT booked AND NOT lunch break
        return !isBooked && !isLunchBreak && slot.start_time && slot.end_time;
      });

      console.log(
        "Available (unbooked) slots after filtering:",
        availableSlots,
      );

      // Format for display (same as chatbot logic)
      const formattedSlots = availableSlots.map((slot) => {
        // Parse time and convert to 12-hour format for display
        const startTime = new Date(`2000-01-01T${slot.start_time}`);
        const endTime = new Date(`2000-01-01T${slot.end_time}`);

        const startTime12h = startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const endTime12h = endTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        return {
          label: `${startTime12h} - ${endTime12h}`,
          value: slot.start_time, // Use 24-hour format for form submission
          start_time: slot.start_time,
          end_time: slot.end_time,
        };
      });

      console.log("Formatted time slots:", formattedSlots);

      if (formattedSlots.length > 0) {
        setAvailableTimeSlots(formattedSlots);
        toast({
          title: "Success",
          description: `Found ${formattedSlots.length} available time slots.`,
        });
      } else {
        toast({
          title: "Info",
          description:
            "No available time slots for the selected doctor and date.",
        });
        setAvailableTimeSlots([]);
      }
    } catch (error: any) {
      console.error("Error fetching available time slots:", error);

      if (error.response?.status === 404) {
        toast({
          title: "Error",
          description:
            "Doctor not found or not available on the selected date.",
          variant: "destructive",
        });
        setAvailableTimeSlots([]);
      } else if (error.response?.status === 400) {
        toast({
          title: "Error",
          description: "Invalid date or doctor selection.",
          variant: "destructive",
        });
        setAvailableTimeSlots([]);
      } else {
        // Fallback to client-side generation if API fails
        console.log("API failed, falling back to client-side generation");
        try {
          const generatedTimeSlots = generateTimeSlots(
            date,
            clinicCustomization,
          );

          if (generatedTimeSlots.length === 0) {
            const dayNames = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            const dayName = dayNames[date.getDay()];

            toast({
              title: "Error",
              description: `The clinic is closed on ${dayName}s. Please select a different date.`,
              variant: "destructive",
            });
            setAvailableTimeSlots([]);
            return;
          }

          // Convert generated time slots to the format expected by the component
          const slots = generatedTimeSlots.map((timeSlot) => ({
            label: timeSlot,
            value: convertDisplayTimeTo24Hour(timeSlot),
          }));

          setAvailableTimeSlots(slots);
          toast({
            title: "Warning",
            description:
              "Using default time slots. Doctor-specific availability not found.",
            variant: "destructive",
          });
        } catch (fallbackError) {
          console.error("Fallback time slot generation failed:", fallbackError);
          toast({
            title: "Error",
            description:
              "Failed to load available time slots. Please try again.",
            variant: "destructive",
          });
          setAvailableTimeSlots([]);
        }
      }
    }
  };

  useEffect(() => {
    if (selectedDate && selectedDoctor) {
      fetchAvailableTimeSlots(selectedDate, selectedDoctor);
    }
  }, [selectedDate, selectedDoctor]);

  // Step navigation functions
  const nextStep = async () => {
    console.log("nextStep called - current step:", currentStep);
    console.log("Total steps:", STEPS.length);

    // Prevent going past the final step
    if (currentStep >= STEPS.length - 1) {
      console.log("Already on final step, cannot proceed further");
      return;
    }

    let isValid = false;
    const formValues = form.getValues();

    // Validate current step before proceeding
    switch (currentStep) {
      case 0: // Patient Selection
        if (isExistingPatient) {
          await form.trigger(["patientId"]);
          isValid =
            !!formValues.patientId && formValues.patientId.trim() !== "";
          if (!isValid) {
            toast({
              title: "Error",
              description: "Please select a patient",
              variant: "destructive",
            });
          }
        } else {
          // Trigger validation for all new patient fields
          await form.trigger([
            "newPatient.firstName",
            "newPatient.lastName",
            "newPatient.contactNumber",
            "newPatient.email",
            "newPatient.address",
            "newPatient.dateOfBirth",
            "newPatient.gender",
            "newPatient.maritalStatus",
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
            console.log("Form errors:", errors);
            console.log("Form values:", formValues);
            toast({
              title: "Error",
              description: "Please fill in all required patient information",
              variant: "destructive",
            });
          }
        }
        break;
      case 1: // Doctor & Type
        await form.trigger(["doctorId", "appointmentType"]);
        isValid = !!formValues.doctorId && !!formValues.appointmentType;
        if (!isValid) {
          toast({
            title: "Error",
            description: "Please select a doctor and appointment type",
            variant: "destructive",
          });
        }
        break;
      case 2: // Date
        await form.trigger(["date"]);
        isValid = !!formValues.date;
        if (!isValid) {
          toast({
            title: "Error",
            description: "Please select a date",
            variant: "destructive",
          });
        }
        break;
      case 3: // Time
        await form.trigger(["time"]);
        isValid = !!formValues.time;
        if (!isValid) {
          toast({
            title: "Error",
            description: "Please select a time slot",
            variant: "destructive",
          });
        }
        break;
      case 4: // Notes (optional, always valid)
        isValid = true;
        break;
      default:
        isValid = true;
    }

    if (isValid && currentStep < STEPS.length - 1) {
      const nextStepNumber = currentStep + 1;
      console.log("Moving to next step:", nextStepNumber);
      setCurrentStep(nextStepNumber);
    } else if (isValid && currentStep === STEPS.length - 1) {
      console.log("Already on final step, cannot proceed further");
    } else {
      console.log("Validation failed, staying on current step");
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
  const createNewPatient = async (
    patientData: z.infer<typeof newPatientSchema>,
  ) => {
    try {
      // Construct full name from individual components
      const nameComponents = [
        patientData.firstName,
        patientData.middleInitial,
        patientData.lastName,
        patientData.suffix,
      ]
        .filter((component) => component && component.trim())
        .join(" ");

      // Format the patient data for the backend
      const formattedPatientData = {
        first_name: patientData.firstName,
        middle_initial: patientData.middleInitial || "",
        last_name: patientData.lastName,
        suffix: patientData.suffix || "",
        name: nameComponents, // Keep full name for backward compatibility
        email: patientData.email,
        phone: patientData.contactNumber.replace(/\D/g, ""), // Remove non-digits
        address: patientData.address,
        date_of_birth: format(patientData.dateOfBirth, "yyyy-MM-dd"),
        gender: patientData.gender,
        marital_status: patientData.maritalStatus || "",
      };

      console.log("Creating new patient:", formattedPatientData);

      const response = await axiosInstance.post(
        "/patients/",
        formattedPatientData,
      );
      console.log("Patient created:", response.data);

      return response.data;
    } catch (error: any) {
      console.error("Error creating patient:", error.response?.data);
      throw new Error(
        error.response?.data?.error || "Failed to create patient",
      );
    }
  };

  const onSubmit = async (data: AppointmentFormValues) => {
    console.log("onSubmit called with currentStep:", currentStep);
    console.log("Expected final step:", STEPS.length - 1);

    // Only allow submission when on the final confirmation step
    if (currentStep !== STEPS.length - 1) {
      console.log(
        "Form submission prevented - not on confirmation step. Current step:",
        currentStep,
      );
      return;
    }

    console.log("Form submission started - on confirmation step");
    setLoading(true);
    try {
      let patientId: string;
      let patientName: string;
      let patientEmail: string;
      let patientPhone: string;
      let patientData: any = {};
      let selectedPatient: Patient | undefined = undefined;

      // Handle patient creation or selection
      if (data.isExistingPatient) {
        // Use existing patient
        selectedPatient = patients.find(
          (p) => p.id.toString() === data.patientId,
        );
        if (!selectedPatient) {
          throw new Error("Selected patient not found");
        }

        // Fetch full patient details for existing patient
        try {
          const patientResponse = await axiosInstance.get(
            `/patients/${selectedPatient.id}/`,
          );
          const fullPatientData = patientResponse.data;

          patientId = selectedPatient.id;
          patientName = selectedPatient.name;
          patientEmail = selectedPatient.email;
          patientPhone = selectedPatient.phone;

          // Use actual patient data from the database
          patientData = {
            firstName:
              fullPatientData.first_name ||
              fullPatientData.name?.split(" ")[0] ||
              "",
            middleInitial: fullPatientData.middle_initial || "",
            lastName:
              fullPatientData.last_name ||
              fullPatientData.name?.split(" ").slice(1).join(" ") ||
              "",
            suffix: fullPatientData.suffix || "",
            date_of_birth: fullPatientData.date_of_birth || "1990-01-01",
            gender: fullPatientData.gender || "Not Specified",
            address: fullPatientData.address || "Address on file",
            marital_status: fullPatientData.marital_status || "Not Specified",
          };
        } catch (fetchError) {
          console.warn(
            "Could not fetch full patient details, using placeholder values:",
            fetchError,
          );
          // Fallback to placeholder values if fetch fails
          patientData = {
            firstName: selectedPatient.name.split(" ")[0] || "",
            middleInitial: "",
            lastName: selectedPatient.name.split(" ").slice(1).join(" ") || "",
            suffix: "",
            date_of_birth: "1990-01-01",
            gender: "Not Specified",
            address: "Address on file",
            marital_status: "Not Specified",
          };
        }
      } else {
        // Create new patient first
        if (!data.newPatient) {
          throw new Error("New patient data is required");
        }

        const newPatient = await createNewPatient(data.newPatient);
        patientId = newPatient.id.toString();
        patientName = newPatient.name;
        patientEmail = newPatient.email;
        patientPhone = newPatient.phone;

        // Use new patient data
        patientData = {
          firstName: data.newPatient.firstName,
          middleInitial: data.newPatient.middleInitial || "",
          lastName: data.newPatient.lastName,
          suffix: data.newPatient.suffix || "",
          date_of_birth: format(data.newPatient.dateOfBirth, "yyyy-MM-dd"),
          gender: data.newPatient.gender,
          address: data.newPatient.address,
          marital_status: data.newPatient.maritalStatus,
        };

        // Update the patients list with the new patient
        setPatients((prev) => [
          ...prev,
          {
            id: newPatient.id.toString(),
            name: newPatient.name,
            email: newPatient.email,
            phone: newPatient.phone,
          },
        ]);
      }

      // Format the date to YYYY-MM-DD string
      const formattedDate = format(data.date, "yyyy-MM-dd");

      // Validate phone number length
      const formattedPhone = patientPhone
        ? patientPhone.replace(/\D/g, "")
        : null;
      if (
        formattedPhone &&
        (formattedPhone.length < 10 || formattedPhone.length > 15)
      ) {
        toast({
          title: "Error",
          description: "Phone number must be between 10 and 15 digits",
          variant: "destructive",
        });
        return;
      }

      const appointmentData = {
        // Patient identification
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: formattedPhone,

        // Add patient_id for existing patients to avoid creating duplicates
        ...(data.isExistingPatient &&
          selectedPatient && {
            patient_id: selectedPatient.patient_id || selectedPatient.id, // Use patient_id if available, fallback to database id
          }),

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
        notes: data.notes || "",
        doctor_id: parseInt(data.doctorId),
        status: "scheduled",
      };

      console.log("Creating appointment:", appointmentData);

      const response = await axiosInstance.post(
        "/appointments/create/",
        appointmentData,
      );
      console.log("Appointment created:", response.data);

      toast({
        title: "Success",
        description: `Appointment scheduled successfully${!data.isExistingPatient ? " and patient record created" : ""}`,
      });
      onOpenChange(false);

      // Reset form and step
      setCurrentStep(1);
      form.reset({
        isExistingPatient: true,
        notes: "",
      });
    } catch (error: any) {
      console.error("Error:", error);

      // Better error handling with specific messages
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error) {
          toast({
            title: "Error",
            description: `Failed to schedule appointment: ${errorData.error}`,
            variant: "destructive",
          });
        } else if (errorData.detail) {
          toast({
            title: "Error",
            description: `Failed to schedule appointment: ${errorData.detail}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description:
              "Failed to schedule appointment: Please check all required fields",
            variant: "destructive",
          });
        }
      } else if (error.response?.status === 401) {
        toast({
          title: "Error",
          description: "Please log in to schedule appointments",
          variant: "destructive",
        });
      } else if (error.response?.status === 500) {
        toast({
          title: "Error",
          description: "Server error. Please try again later",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to schedule appointment",
          variant: "destructive",
        });
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
            <FormItem className="flex flex-col">
              <FormLabel>Select Patient *</FormLabel>
              <Popover
                open={patientSearchOpen}
                onOpenChange={setPatientSearchOpen}
              >
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={patientSearchOpen}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value
                        ? patients.find((patient) => patient.id === field.value)
                            ?.name
                        : "Search and select a patient..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type patient name to search..."
                      value={patientSearchTerm}
                      onValueChange={(value) => {
                        console.log("Search term changed:", value);
                        setPatientSearchTerm(value);
                        if (value.trim().length >= 2) {
                          setIsSearchingPatients(true);
                        }
                      }}
                      className="h-9"
                    />
                    <CommandList>
                      {/* Debug logging */}
                      {(() => {
                        console.log("Render conditions:", {
                          isSearchingPatients,
                          hasSearched,
                          patientsLength: patients.length,
                          patientSearchTermLength: patientSearchTerm.length,
                          patients: patients,
                        });
                        return null;
                      })()}

                      {isSearchingPatients && (
                        <CommandEmpty>
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="ml-2">Searching patients...</span>
                          </div>
                        </CommandEmpty>
                      )}

                      {!isSearchingPatients &&
                        patientSearchTerm &&
                        patientSearchTerm.length < 2 && (
                          <CommandEmpty>
                            Type at least 2 characters to search patients
                          </CommandEmpty>
                        )}

                      {!isSearchingPatients &&
                        hasSearched &&
                        patients.length === 0 &&
                        patientSearchTerm.length >= 2 && (
                          <CommandEmpty>
                            No patients found for "{patientSearchTerm}"
                          </CommandEmpty>
                        )}

                      {!isSearchingPatients &&
                        !hasSearched &&
                        patientSearchTerm.length < 2 && (
                          <CommandEmpty>
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                              <Search className="h-8 w-8 mb-2" />
                              <p>Start typing to search patients</p>
                              <p className="text-xs">
                                Search by name, email, or phone
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Available patients: Mari, Steph, JR, John, Jane
                              </p>
                            </div>
                          </CommandEmpty>
                        )}

                      {!isSearchingPatients && patients.length > 0 && (
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient.id}
                              value={patient.name.toLowerCase()}
                              onSelect={() => {
                                console.log("Patient selected:", patient);
                                field.onChange(patient.id);
                                setPatientSearchOpen(false);
                              }}
                              className="flex items-center justify-between"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {patient.name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {patient.email}
                                </span>
                                {patient.phone && (
                                  <span className="text-xs text-muted-foreground">
                                    {patient.phone}
                                  </span>
                                )}
                              </div>
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  patient.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                {hasSearched && patients.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Found {patients.length} patient
                    {patients.length !== 1 ? "s" : ""} matching "
                    {patientSearchTerm}"
                  </span>
                )}
                {!hasSearched && (
                  <span className="text-sm text-muted-foreground">
                    Start typing to search for existing patients
                  </span>
                )}
              </FormDescription>
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
                    <Input
                      placeholder="e.g., 09123456789"
                      maxLength={11}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                    />
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
                  <FormLabel>Sex *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">
                        Prefer not to say
                      </SelectItem>
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
                  <Input
                    type="email"
                    placeholder="patient@example.com"
                    {...field}
                  />
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
                <FormLabel>Home Address *</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter full home address" {...field} />
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
                <div className="border rounded-md p-2 max-w-xs">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    className="mx-auto scale-90"
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
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
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
          <FormItem className="flex flex-col">
            <FormLabel>Select Doctor *</FormLabel>
            <Popover open={doctorSearchOpen} onOpenChange={setDoctorSearchOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={doctorSearchOpen}
                    className={cn(
                      "w-full justify-between",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value
                      ? allDoctors.find((doctor) => doctor.id === field.value)
                          ?.name ||
                        doctors.find((doctor) => doctor.id === field.value)
                          ?.name
                      : "Search and select a doctor..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={true}>
                  <CommandList>
                    <CommandEmpty>No doctors found</CommandEmpty>
                    {doctors.length > 0 && (
                      <CommandGroup>
                        {doctors.map((doctor) => (
                          <CommandItem
                            key={doctor.id}
                            value={doctor.name.toLowerCase()}
                            onSelect={() => {
                              console.log("Doctor selected:", doctor);
                              field.onChange(doctor.id);
                              setDoctorSearchOpen(false);
                            }}
                            className="flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{doctor.name}</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                doctor.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>
              <span className="text-sm text-muted-foreground">
                {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}{" "}
                available
              </span>
            </FormDescription>
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
                {APPOINTMENT_TYPES.map((type) => (
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

  const renderDateAndTimeSelection = () => (
    <div className="space-y-6">
      {/* Date Selection with Popover */}
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Select Date *</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const compareDate = new Date(date);
                    compareDate.setHours(0, 0, 0, 0);
                    return compareDate < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormDescription>
              Choose your preferred appointment date
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Time Selection with Popover */}
      {selectedDate && (
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Select Time Slot *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        field.value
                      ) : (
                        <span>Pick a time slot</span>
                      )}
                      <Clock className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="max-h-[300px] overflow-y-auto p-4">
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-2"
                    >
                      {availableTimeSlots.map((slot) => (
                        <div
                          key={slot.value}
                          className="flex items-center space-x-2"
                        >
                          <Card
                            className={`p-2 cursor-pointer transition-all hover:shadow-md w-full ${
                              field.value === slot.value
                                ? "ring-2 ring-primary bg-primary/5"
                                : ""
                            }`}
                          >
                            <RadioGroupItem
                              value={slot.value}
                              id={slot.value}
                              className="sr-only"
                            />
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
                  </div>
                </PopoverContent>
              </Popover>
              <FormDescription>
                {availableTimeSlots.length > 0
                  ? `${availableTimeSlots.length} available time slots for ${format(selectedDate, "MMMM d, yyyy")}`
                  : "No available time slots for this date"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
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
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0); // Reset time to start of day
                  const compareDate = new Date(date);
                  compareDate.setHours(0, 0, 0, 0); // Reset time to start of day
                  return compareDate < today; // Only disable dates before today
                }}
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
                    <Card
                      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                        field.value === slot.value
                          ? "ring-2 ring-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <RadioGroupItem
                        value={slot.value}
                        id={slot.value}
                        className="sr-only"
                      />
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
                ? `${availableTimeSlots.length} available time slots for ${selectedDate ? format(selectedDate, "MMMM d, yyyy") : "selected date"}`
                : "Please select a doctor and date first to see available times"}
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
    console.log("Confirmation step - form values:", formValues);
    console.log("Is existing patient:", currentIsExistingPatient);
    console.log("Patient ID:", formValues.patientId);
    console.log("New patient data:", formValues.newPatient);
    console.log("Available patients:", patients);

    const selectedPatient = currentIsExistingPatient
      ? patients.find(
          (p) => p.id.toString() === formValues.patientId?.toString(),
        )
      : null;

    console.log("Selected patient:", selectedPatient);

    const selectedDoctorObj = doctors.find((d) => d.id === formValues.doctorId);
    const selectedTimeSlot = availableTimeSlots.find(
      (t) => t.value === formValues.time,
    );

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Review Appointment Details
          </h3>
          <p className="text-sm text-gray-600">
            Please review all details before confirming
          </p>
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
                    <p>
                      <strong>Name:</strong> {selectedPatient.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedPatient.email}
                    </p>
                    <p>
                      <strong>Phone:</strong> {selectedPatient.phone}
                    </p>
                  </div>
                ) : (
                  <p className="text-red-600">Please select a patient</p>
                )
              ) : formValues.newPatient ? (
                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong>{" "}
                    {[
                      formValues.newPatient.firstName,
                      formValues.newPatient.middleInitial,
                      formValues.newPatient.lastName,
                      formValues.newPatient.suffix,
                    ]
                      .filter((part) => part && part.trim())
                      .join(" ")}
                  </p>
                  <p>
                    <strong>Email:</strong> {formValues.newPatient.email}
                  </p>
                  <p>
                    <strong>Phone:</strong>{" "}
                    {formValues.newPatient.contactNumber}
                  </p>
                  <p>
                    <strong>Home Address:</strong>{" "}
                    {formValues.newPatient.address}
                  </p>
                  <p>
                    <strong>Date of Birth:</strong>{" "}
                    {formValues.newPatient.dateOfBirth
                      ? format(
                          formValues.newPatient.dateOfBirth,
                          "MMMM d, yyyy",
                        )
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Sex:</strong> {formValues.newPatient.gender}
                  </p>
                  {formValues.newPatient.maritalStatus && (
                    <p>
                      <strong>Marital Status:</strong>{" "}
                      {formValues.newPatient.maritalStatus}
                    </p>
                  )}
                  <p className="text-sm text-blue-600 mt-2">
                    * New patient record will be created
                  </p>
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
                  <p>
                    <strong>Doctor:</strong> {selectedDoctorObj?.name || "N/A"}
                  </p>
                  <p>
                    <strong>Type:</strong> {formValues.appointmentType || "N/A"}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Date:</strong>{" "}
                    {formValues.date
                      ? format(formValues.date, "MMMM d, yyyy")
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Time:</strong> {selectedTimeSlot?.label || "N/A"}
                  </p>
                </div>
              </div>
              {formValues.notes && (
                <div className="mt-4">
                  <p>
                    <strong>Notes:</strong>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formValues.notes}
                  </p>
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-base sm:text-lg">
            Schedule New Appointment
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Step {currentStep + 1} of {STEPS.length}:{" "}
            {STEPS[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-2 sm:px-0">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isAccessible = index <= currentStep;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center space-y-1 sm:space-y-2 relative"
              >
                <button
                  onClick={() => isAccessible && goToStep(index)}
                  disabled={!isAccessible}
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium
                    transition-all duration-200 flex-shrink-0
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                        : isCompleted
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : isAccessible
                            ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>
                <span
                  className={`hidden sm:block text-xs text-center max-w-[80px] ${
                    isActive ? "text-primary font-medium" : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block absolute h-0.5 w-12 lg:w-16 translate-x-10 lg:translate-x-12 ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              console.log("Form submit event triggered");
              console.log("Current step during submit:", currentStep);
              e.preventDefault();
              e.stopPropagation();

              // Only submit if we're on the confirmation step
              if (currentStep === STEPS.length - 1) {
                console.log("Allowing form submission - on confirmation step");
                form.handleSubmit(onSubmit)(e);
              } else {
                console.log(
                  "Preventing form submission - not on confirmation step. Current step:",
                  currentStep,
                );
                return false;
              }
            }}
            className="space-y-6"
            noValidate
          >
            {/* Step Content */}
            <div className="min-h-[300px] sm:min-h-[400px] px-1 sm:px-0">
              {currentStep === 0 && renderPatientSelection()}
              {currentStep === 1 && renderDoctorAndType()}
              {currentStep === 2 && renderDateAndTimeSelection()}
              {currentStep === 3 && renderNotes()}
              {currentStep === 4 && renderConfirmation()}
            </div>

            {/* Navigation Footer */}
            <DialogFooter className="pt-4 sm:pt-6 border-t">
              <div className="flex justify-between w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    currentStep === 0 ? () => onOpenChange(false) : prevStep
                  }
                  disabled={loading}
                  className="text-sm h-9 sm:h-10"
                >
                  {currentStep === 0 ? (
                    "Cancel"
                  ) : (
                    <>
                      <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Back</span>
                      <span className="sm:hidden">Back</span>
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  {currentStep < STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={loading}
                      className="text-sm h-9 sm:h-10"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                          "Submit button clicked, current step:",
                          currentStep,
                        );
                        if (currentStep === STEPS.length - 1) {
                          console.log("Manually triggering form submission");
                          form.handleSubmit(onSubmit)();
                        }
                      }}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-sm h-9 sm:h-10 whitespace-nowrap"
                    >
                      {loading ? (
                        "Creating..."
                      ) : (
                        <>
                          <span className="hidden sm:inline">
                            Create Appointment
                          </span>
                          <span className="sm:hidden">Create</span>
                        </>
                      )}
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
