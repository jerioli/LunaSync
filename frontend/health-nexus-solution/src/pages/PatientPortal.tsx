import { AppointmentChatbot } from "@/components/chatbot/AppointmentChatbot";
import DateTimePicker from "@/components/chatbot/DateTimePicker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { format } from "date-fns";
import {
  ArrowUp,
  BotMessageSquare,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  MessageCircle,
  Pill,
  Stethoscope,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ENV } from "../config/env";

// Axios instance - using same configuration as chatbot
const axiosInstance = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include session ID
axiosInstance.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      config.headers["X-Session-ID"] = sessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Form schemas
const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().min(1, "Middle name is required"),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  phone: z
    .string()
    .min(11, "Contact number must be exactly 11 digits")
    .max(11, "Contact number must be exactly 11 digits")
    .regex(/^09\d{9}$/, "Phone number must start with 09 and be 11 digits"),
  sex: z.enum(["male", "female", "prefer_not_to_say"], {
    required_error: "Sex is required",
  }),
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
  address: z.string().min(1, "Home address is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  religion: z.string().min(1, "Religion is required"),
  maritalStatus: z
    .enum(["single", "married", "divorced", "widowed", "prefer_not_to_say"])
    .optional(),
});

const appointmentSchema = z.object({
  patient_id: z.string().optional(),
  new_patient: patientSchema.optional(),
  doctor_id: z.string().min(1, "Doctor selection is required"),
  appointment_date: z.string().min(1, "Appointment date is required"),
  appointment_time: z.string().min(1, "Appointment time is required"),
  appointment_type: z.string().min(1, "Appointment type is required"),
  notes: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;
type AppointmentFormData = z.infer<typeof appointmentSchema>;

// Medical Certificate and Prescription schemas
const medicalCertSchema = z.object({
  requestType: z.string().min(1, "Request type is required"),
  patientId: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  middleInitial: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
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
  phone: z
    .string()
    .min(11, "Phone number must be exactly 11 digits")
    .max(11, "Phone number must be exactly 11 digits")
    .regex(/^09\d{9}$/, "Phone number must start with 09 and be 11 digits"),
  additionalInfo: z.string().optional(),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
});

const prescriptionSchema = z.object({
  patientId: z.string().optional(),
  medicationName: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  middleInitial: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
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
  phone: z
    .string()
    .min(11, "Phone number must be exactly 11 digits")
    .max(11, "Phone number must be exactly 11 digits")
    .regex(/^09\d{9}$/, "Phone number must start with 09 and be 11 digits"),
  additionalNotes: z.string().optional(),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
});

type MedicalCertFormData = z.infer<typeof medicalCertSchema>;
type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

const PatientPortal = () => {
  const navigate = useNavigate();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [clinic, setClinic] = useState({
    clinic_name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    website: "",
    hero_title: "",
    hero_subtitle: "",
    about_title: "",
    about_text: "",
    services: [],
    faqs: [],
    reviews: [],
    logo: "",
    healthcare_professionals_image: "",
    clinic_building_image: "",
    google_maps_embed_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    email: "",
    rating: 1,
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [stayAnonymous, setStayAnonymous] = useState(false);
  const [lastReviewTime, setLastReviewTime] = useState<number | null>(null);
  const [reviewCooldown, setReviewCooldown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showGreetingCursor, setShowGreetingCursor] = useState(true);
  const [showArrow, setShowArrow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Patient Request Modal States
  const [openModal, setOpenModal] = useState<
    null | "appointment" | "medcert" | "eprescription"
  >(null);

  // Multi-step appointment scheduling states
  const [currentStep, setCurrentStep] = useState(1);
  const [isExistingPatient, setIsExistingPatient] = useState<boolean | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [appointmentTypes] = useState([
    "Consultation",
    "Follow-up",
    "Vaccination",
  ]);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [doctorAvailableDates, setDoctorAvailableDates] = useState<Date[]>([]);
  const [allAvailableDates, setAllAvailableDates] = useState<Date[]>([]); // For date-first flow
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [doctorDatesCache, setDoctorDatesCache] = useState<{
    [doctorId: string]: Date[];
  }>({});

  // Booking preference: "doctor" or "datetime"
  const [bookingPreference, setBookingPreference] = useState<
    "doctor" | "datetime" | null
  >(null);

  // New patient terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [noMiddleName, setNoMiddleName] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // Forgot Patient ID states
  const [showForgotPatientId, setShowForgotPatientId] = useState(false);
  const [forgotIdForm, setForgotIdForm] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    dateOfBirth: "",
    email: "",
    phone: "",
  });
  const [forgotIdSubmitting, setForgotIdSubmitting] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [forgotIdAttempted, setForgotIdAttempted] = useState(false);

  // Form handling
  const patientForm = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      phone: "",
      sex: "male",
      email: "",
      address: "",
      dateOfBirth: "",
      religion: "",
      maritalStatus: "single",
    },
  });

  const appointmentForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  });

  // Medical Certificate wizard states
  const [medCertStep, setMedCertStep] = useState(1);
  const [medCertIsExistingPatient, setMedCertIsExistingPatient] = useState<
    boolean | null
  >(null);
  const [medCertSearchQuery, setMedCertSearchQuery] = useState("");
  const [medCertPatients, setMedCertPatients] = useState([]);
  const [medCertSelectedPatient, setMedCertSelectedPatient] =
    useState<any>(null);
  const [medCertRequestType, setMedCertRequestType] = useState(
    "Medical Certificate",
  );
  const [medCertIdFront, setMedCertIdFront] = useState<File | null>(null);
  const [medCertIdBack, setMedCertIdBack] = useState<File | null>(null);
  const [medCertIdFrontPreview, setMedCertIdFrontPreview] = useState<
    string | null
  >(null);
  const [medCertIdBackPreview, setMedCertIdBackPreview] = useState<
    string | null
  >(null);
  const [medCertNotes, setMedCertNotes] = useState("");
  const [medCertSubmitting, setMedCertSubmitting] = useState(false);

  // Medical Certificate forgot Patient ID states
  const [showMedCertForgotPatientId, setShowMedCertForgotPatientId] =
    useState(false);
  const [medCertForgotIdForm, setMedCertForgotIdForm] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    dateOfBirth: "",
    email: "",
    phone: "",
  });
  const [medCertForgotIdSubmitting, setMedCertForgotIdSubmitting] =
    useState(false);

  // Medical Certificate delivery method
  const [medCertDeliveryMethod, setMedCertDeliveryMethod] = useState("pickup");

  // Medical Certificate notification preferences
  const [medCertEmailNotifications, setMedCertEmailNotifications] =
    useState(true);
  const [medCertSmsNotifications, setMedCertSmsNotifications] = useState(false);

  // Prescription wizard states
  const [prescriptionStep, setPrescriptionStep] = useState(1);
  const [prescriptionIsExistingPatient, setPrescriptionIsExistingPatient] =
    useState<boolean | null>(null);
  const [prescriptionSearchQuery, setPrescriptionSearchQuery] = useState("");
  const [prescriptionPatients, setPrescriptionPatients] = useState([]);
  const [prescriptionSelectedPatient, setPrescriptionSelectedPatient] =
    useState<any>(null);
  const [prescriptionIdFront, setPrescriptionIdFront] = useState<File | null>(
    null,
  );
  const [prescriptionIdBack, setPrescriptionIdBack] = useState<File | null>(
    null,
  );
  const [prescriptionIdFrontPreview, setPrescriptionIdFrontPreview] = useState<
    string | null
  >(null);
  const [prescriptionIdBackPreview, setPrescriptionIdBackPreview] = useState<
    string | null
  >(null);
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);

  // Prescription forgot Patient ID states
  const [showPrescriptionForgotPatientId, setShowPrescriptionForgotPatientId] =
    useState(false);
  const [prescriptionForgotIdForm, setPrescriptionForgotIdForm] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    dateOfBirth: "",
    email: "",
    phone: "",
  });
  const [prescriptionForgotIdSubmitting, setPrescriptionForgotIdSubmitting] =
    useState(false);

  // Prescription notification preferences
  const [prescriptionEmailNotifications, setPrescriptionEmailNotifications] =
    useState(true);
  const [prescriptionSmsNotifications, setPrescriptionSmsNotifications] =
    useState(false);

  // Form handling for medical cert and prescription
  const medicalCertForm = useForm<MedicalCertFormData>({
    resolver: zodResolver(medicalCertSchema),
    defaultValues: {
      requestType: "Medical Certificate",
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      additionalInfo: "",
    },
  });

  const prescriptionForm = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      medicationName: "",
      dosage: "",
      frequency: "",
      duration: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      additionalNotes: "",
    },
  });

  // Dummy data for backward compatibility
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(today.getMonth() + 2);
  const twoMonthsLaterStr = twoMonthsLater.toISOString().split("T")[0];

  // Old state variables for other modals (medcert, eprescription)
  const [consent, setConsent] = useState(false);
  const [existingPatient, setExistingPatient] = useState(false);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmationType, setConfirmationType] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("");
  const [eprescriptionType, setEPrescriptionType] = useState<string>("");

  // Handle ID upload
  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // CSRF token function
  const getCSRFToken = () => {
    const name = "csrftoken";
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Construct full name helper
  const constructFullName = (form: any) => {
    const parts = [
      form.firstName,
      form.middleInitial,
      form.lastName,
      form.suffix,
    ].filter((part) => part && part.trim() !== "");
    return parts.join(" ");
  };

  // Old simple notification handler for other modals
  const handleSubmit = (msg: string) => {
    setOpenModal(null);
    setConsent(false);
    setExistingPatient(false);
    setIdPreview(null);
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
    setConfirmationType("");
    setDocumentType("");
    setEPrescriptionType("");
  };

  // Function to fetch doctors available on a specific date
  const fetchDoctorsAvailableOnDate = useCallback(
    async (date: Date) => {
      try {
        // Format date to YYYY-MM-DD without timezone conversion
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;

        console.log("Fetching doctors available on date:", dateString);

        // Get all doctors first
        const doctorsResponse = await axiosInstance.get("doctors/");
        const allDoctors = doctorsResponse.data;

        // Filter doctors who have availability on this date
        const availableDoctors = [];

        for (const doctor of allDoctors) {
          try {
            const response = await api.availability.getTimeSlots(
              doctor.id,
              dateString,
            );

            // Check if doctor has any available slots on this date
            if (Array.isArray(response) && response.length > 0) {
              const availability = response[0];
              if (
                availability &&
                availability.time_slots &&
                Array.isArray(availability.time_slots)
              ) {
                // Filter out booked slots and lunch break (12:00 PM - 1:00 PM)
                const availableSlots = availability.time_slots.filter(
                  (slot) => {
                    // Skip if slot is booked
                    if (slot.is_booked) {
                      return false;
                    }

                    // Parse start time to check for lunch break
                    const startTime = slot.start_time;
                    const [hours, minutes] = startTime.split(":").map(Number);

                    // Skip lunch break slots (12:00 PM - 1:00 PM)
                    if (hours === 12) {
                      return false;
                    }

                    return true;
                  },
                );

                if (availableSlots.length > 0) {
                  availableDoctors.push(doctor);
                }
              }
            }
          } catch (error) {
            console.error(
              `Error checking availability for doctor ${doctor.id}:`,
              error,
            );
            // Continue to next doctor if there's an error
          }
        }

        console.log("Available doctors on", dateString, ":", availableDoctors);
        setFilteredDoctors(availableDoctors);
      } catch (error) {
        console.error("Error fetching doctors available on date:", error);
        // Fallback to all doctors if there's an error
        setFilteredDoctors(doctors);
      }
    },
    [doctors],
  );

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axiosInstance.get("doctors/");
        setDoctors(response.data);
      } catch (error) {
        console.error("Error fetching doctors:", error);
        toast({
          title: "Error",
          description: "Failed to load doctors",
          variant: "destructive",
        });
      }
    };

    if (openModal === "appointment") {
      fetchDoctors();
    }
  }, [openModal]);

  // Fetch doctors available on selected date for date-first flow
  useEffect(() => {
    if (
      bookingPreference === "datetime" &&
      selectedDate &&
      openModal === "appointment"
    ) {
      fetchDoctorsAvailableOnDate(selectedDate);
    }
  }, [selectedDate, bookingPreference, openModal, fetchDoctorsAvailableOnDate]);

  // Fetch time slots when doctor is selected in date-first flow
  useEffect(() => {
    if (
      bookingPreference === "datetime" &&
      selectedDate &&
      selectedDoctor &&
      openModal === "appointment"
    ) {
      fetchAvailableTimeSlots(selectedDoctor.id, selectedDate);
    }
  }, [selectedDoctor, selectedDate, bookingPreference, openModal]);

  // Refresh time slots when navigating to step 3 (for conflict resolution)
  useEffect(() => {
    if (
      currentStep === 3 &&
      selectedDoctor &&
      selectedDate &&
      openModal === "appointment"
    ) {
      fetchAvailableTimeSlots(selectedDoctor.id, selectedDate);
    }
  }, [currentStep, selectedDoctor, selectedDate, openModal]);

  // Fetch doctor's available dates when doctor is selected
  useEffect(() => {
    if (selectedDoctor && openModal === "appointment") {
      fetchDoctorAvailableDates(selectedDoctor.id);
    }
  }, [selectedDoctor, openModal]);

  // Search patients
  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setPatients([]);
      return;
    }

    try {
      const response = await axiosInstance.get(
        `patients/list/?search=${encodeURIComponent(query)}`,
      );
      setPatients(response.data);
    } catch (error) {
      console.error("Error searching patients:", error);
      setPatients([]);
    }
  };

  // Validate patient ID and fetch patient details (using chatbot approach)
  const validatePatientId = async (patientId: string) => {
    if (!patientId.trim()) {
      return { isValid: false, error: "Please enter your Patient ID" };
    }

    try {
      // Use the same endpoint as chatbot: check-patient-id
      const checkResponse = await axiosInstance.get(
        `/patients/check-patient-id/?patient_id=${encodeURIComponent(
          patientId,
        )}`,
      );

      if (!checkResponse.data.exists) {
        return {
          isValid: false,
          error: "Patient ID not found. Please check and try again.",
        };
      }

      // The patient data is already in the check response
      if (checkResponse.data.patient) {
        return { isValid: true, patient: checkResponse.data.patient };
      }

      // Fallback: if patient data not in check response, fetch using database ID
      const dbId = checkResponse.data.patient_id || checkResponse.data.id;
      if (dbId) {
        const response = await axiosInstance.get(`/patients/${dbId}/`);
        return { isValid: true, patient: response.data };
      }

      return { isValid: false, error: "Patient data not available" };
    } catch (error: any) {
      console.error("Error validating patient ID:", error);
      if (error.response?.status === 404) {
        return {
          isValid: false,
          error: "Patient ID not found. Please check and try again.",
        };
      }
      if (error.response?.status === 403) {
        return {
          isValid: false,
          error: "Access denied. Please check your session and try again.",
        };
      }
      return {
        isValid: false,
        error: "Unable to verify Patient ID. Please try again.",
      };
    }
  };

  // Fetch available time slots from doctor's actual schedule
  const fetchAvailableTimeSlots = async (doctorId: string, date: Date) => {
    setIsLoadingTimeSlots(true);
    try {
      // Format date to YYYY-MM-DD without timezone conversion (matching chatbot)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      console.log(
        "Fetching time slots for doctor:",
        doctorId,
        "on date:",
        dateString,
      );

      // Use the same API as chatbot
      const response = await api.availability.getTimeSlots(
        doctorId,
        dateString,
      );

      console.log("Time slots API response:", response);

      // Process the response - only use doctor's actual schedule
      if (!Array.isArray(response) || response.length === 0) {
        console.log("No availability data found for this doctor on this date");
        setAvailableTimeSlots([]);
        return;
      }

      const availability = response[0];
      if (
        !availability ||
        !availability.time_slots ||
        !Array.isArray(availability.time_slots)
      ) {
        console.log("Invalid time slots format or no time slots available");
        setAvailableTimeSlots([]);
        return;
      }

      // Log all time slots before filtering
      console.log(
        "All time slots before filtering:",
        availability.time_slots.map((slot) => ({
          start: slot.start_time,
          end: slot.end_time,
          booked: slot.is_booked,
        })),
      );

      // Filter out booked slots and lunch break (12:00 PM - 1:00 PM) matching Schedule.tsx logic
      const availableSlots = availability.time_slots.filter((slot) => {
        const isBooked = Boolean(
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

        // Skip lunch break (12:00 PM to 1:00 PM) - same logic as Schedule.tsx
        const [hours] = slot.start_time.split(":");
        const hour = parseInt(hours);
        const isLunchBreak = hour === 12;

        // Filter out past time slots if the selected date is today
        const today = new Date();
        const isToday =
          dateString ===
          `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
            2,
            "0",
          )}-${String(today.getDate()).padStart(2, "0")}`;

        let isPastTime = false;
        if (isToday) {
          const currentTime = new Date();
          const [slotHours, slotMinutes] = slot.start_time
            .split(":")
            .map(Number);
          const slotTime = new Date();
          slotTime.setHours(slotHours, slotMinutes, 0, 0);
          isPastTime = slotTime <= currentTime;
        }

        // Debug logging for lunch break filtering
        if (isLunchBreak) {
          console.log(
            `Filtering out lunch break slot: ${slot.start_time} - ${slot.end_time} (hour: ${hour})`,
          );
        }

        if (isPastTime && isToday) {
          console.log(
            `Filtering out past time slot: ${slot.start_time} (current time passed)`,
          );
        }

        // Only show slots that are NOT booked AND NOT lunch break AND NOT in the past (for today)
        return !isBooked && !isLunchBreak && !isPastTime;
      });

      // Format time slots for display (matching chatbot format)
      const formattedAvailableSlots = availableSlots.map((slot) => {
        const [hours, minutes] = slot.start_time.split(":");
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      });

      console.log(
        "Available time slots from doctor schedule:",
        formattedAvailableSlots,
      );
      setAvailableTimeSlots(formattedAvailableSlots);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      // Don't fall back to hardcoded slots - show empty array if error
      setAvailableTimeSlots([]);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  // Create a function compatible with the DateTimePicker component
  const getTimeSlotsForDate = useCallback(
    async (date: Date): Promise<string[]> => {
      if (!selectedDoctor) {
        console.log("No doctor selected, returning empty slots");
        return [];
      }

      try {
        // Format date to YYYY-MM-DD without timezone conversion (matching chatbot)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;

        console.log("Fetching time slots for:", {
          doctorId: selectedDoctor.id,
          date: dateString,
        });

        // Use the same API as chatbot
        const response = await api.availability.getTimeSlots(
          selectedDoctor.id,
          dateString,
        );

        console.log("Time slots response:", response);

        // Check if response is an array and has at least one item
        if (!Array.isArray(response) || response.length === 0) {
          console.log(
            "No availability data found for this doctor on this date",
          );
          return [];
        }

        // Get the first availability object
        const availability = response[0];

        // Check if availability has time_slots array
        if (
          !availability ||
          !availability.time_slots ||
          !Array.isArray(availability.time_slots)
        ) {
          console.log("Invalid time slots format or no time slots available");
          return [];
        }

        // Filter out booked slots and lunch break (12:00 PM - 1:00 PM) matching Schedule.tsx logic
        const availableSlots = availability.time_slots.filter((slot) => {
          const isBooked = Boolean(
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

          // Skip lunch break (12:00 PM to 1:00 PM) - same logic as Schedule.tsx
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
          return !isBooked && !isLunchBreak;
        });

        // Format for display (matching chatbot format)
        const formattedAvailableSlots = availableSlots.map((slot) => {
          const [hours, minutes] = slot.start_time.split(":");
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? "PM" : "AM";
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minutes} ${ampm}`;
        });

        console.log(
          "Available time slots from doctor schedule:",
          formattedAvailableSlots,
        );
        return formattedAvailableSlots;
      } catch (error) {
        console.error("Error fetching time slots:", error);
        // Return empty array on error - no hardcoded fallback
        return [];
      }
    },
    [selectedDoctor?.id],
  );

  // Fetch doctor's available dates from their actual schedule
  const fetchDoctorAvailableDates = async (doctorId: string) => {
    // Check cache first
    if (doctorDatesCache[doctorId]) {
      console.log("Using cached dates for doctor:", doctorId);
      setDoctorAvailableDates(doctorDatesCache[doctorId]);
      return;
    }

    setIsLoadingDates(true);
    try {
      console.log("Fetching available dates for doctor:", doctorId);

      // Use the same API as chatbot - direct call to get doctor's available dates
      const response = await api.availability.getAvailableDates(doctorId);

      if (!response || !Array.isArray(response)) {
        console.error("Invalid response format:", response);
        setDoctorAvailableDates([]);
        return;
      }

      // Convert date strings to Date objects
      const availableDates = response.map((dateStr: string) => {
        // Parse date string as YYYY-MM-DD and create date object
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return date;
      });

      // Filter to only include dates within the next 2 weeks (same as chatbot)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to midnight for date comparison
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(today.getDate() + 14);
      twoWeeksFromNow.setHours(23, 59, 59, 999); // End of day

      const filteredDates = availableDates.filter((date) => {
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate >= today && compareDate <= twoWeeksFromNow;
      });

      console.log("Doctor available dates:", filteredDates);
      setDoctorAvailableDates(filteredDates);

      // Cache the results for this doctor
      setDoctorDatesCache((prev) => ({
        ...prev,
        [doctorId]: filteredDates,
      }));
    } catch (error) {
      console.error("Error fetching doctor's available dates:", error);
      // Fallback to empty array if error
      setDoctorAvailableDates([]);
    } finally {
      setIsLoadingDates(false);
    }
  };

  // Fetch all available dates from all doctors (for date-first flow)
  const fetchAllAvailableDates = async () => {
    setIsLoadingDates(true);
    try {
      // Get all doctors with availability
      const allDoctors = doctors.filter((doc: any) => doc.id);

      if (allDoctors.length === 0) {
        console.log("No doctors available");
        setAllAvailableDates([]);
        return;
      }

      const dateSet = new Set<string>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch dates from all doctors
      const datePromises = allDoctors.map(async (doctor: any) => {
        try {
          const response = await api.availability.getAvailableDates(doctor.id);

          if (!response || !Array.isArray(response) || response.length === 0) {
            return [];
          }

          return response
            .map((dateStr: string) => {
              // Parse date string as YYYY-MM-DD and create date object
              const [year, month, day] = dateStr.split("-").map(Number);
              const date = new Date(year, month - 1, day);
              return date;
            })
            .filter((date) => date >= today);
        } catch (error) {
          console.error(`Error fetching dates for doctor ${doctor.id}:`, error);
          return [];
        }
      });

      const allDatesArrays = await Promise.all(datePromises);
      const allDates = allDatesArrays.flat();

      // Deduplicate dates using Set with formatted date strings
      allDates.forEach((date) => {
        // Format as YYYY-MM-DD without timezone conversion
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        dateSet.add(`${year}-${month}-${day}`);
      });

      // Convert back to Date objects and sort
      const uniqueDates = Array.from(dateSet)
        .map((dateStr) => {
          const [year, month, day] = dateStr.split("-").map(Number);
          return new Date(year, month - 1, day);
        })
        .sort((a, b) => a.getTime() - b.getTime());

      console.log(
        `Found ${uniqueDates.length} unique available dates from ${allDoctors.length} doctors`,
      );
      setAllAvailableDates(uniqueDates);
    } catch (error) {
      console.error("Error fetching all available dates:", error);
      setAllAvailableDates([]);
    } finally {
      setIsLoadingDates(false);
    }
  };

  // Generate available dates for the next 60 days
  // Available dates - use doctor-specific dates when available, fallback to hardcoded
  const availableDates = useMemo(() => {
    // If we have doctor-specific dates and a doctor is selected, use those
    if (selectedDoctor && doctorAvailableDates.length > 0) {
      return doctorAvailableDates;
    }

    // If in date-first flow and we have fetched all available dates, use those
    if (bookingPreference === "datetime" && allAvailableDates.length > 0) {
      return allAvailableDates;
    }

    // Return empty array instead of generating hardcoded dates
    return [];
  }, [
    selectedDoctor,
    doctorAvailableDates,
    bookingPreference,
    allAvailableDates,
  ]);

  // Keep the function for backward compatibility
  const generateAvailableDates = useCallback((): Date[] => {
    return availableDates;
  }, [availableDates]);

  // Submit forgot Patient ID request (using chatbot's lookup approach)
  const submitForgotPatientId = async () => {
    setForgotIdSubmitting(true);
    setForgotIdAttempted(true);

    try {
      // Validate required fields
      if (!forgotIdForm.firstName.trim()) {
        toast({
          title: "Error",
          description: "First name is required",
          variant: "destructive",
        });
        setForgotIdSubmitting(false);
        return;
      }
      if (!forgotIdForm.lastName.trim()) {
        toast({
          title: "Error",
          description: "Last name is required",
          variant: "destructive",
        });
        setForgotIdSubmitting(false);
        return;
      }
      if (!forgotIdForm.dateOfBirth) {
        toast({
          title: "Error",
          description: "Date of birth is required",
          variant: "destructive",
        });
        setForgotIdSubmitting(false);
        return;
      }
      if (!forgotIdForm.phone.trim()) {
        toast({
          title: "Error",
          description: "Phone number is required",
          variant: "destructive",
        });
        setForgotIdSubmitting(false);
        return;
      }

      // Construct full name matching chatbot's format
      const fullName = `${forgotIdForm.firstName} ${
        forgotIdForm.middleInitial || ""
      } ${forgotIdForm.lastName} ${forgotIdForm.suffix || ""}`
        .trim()
        .replace(/\s+/g, " ");

      const requestData = {
        full_name: fullName,
        date_of_birth: forgotIdForm.dateOfBirth,
        email: forgotIdForm.email ? forgotIdForm.email.toLowerCase() : "",
        phone: forgotIdForm.phone,
        first_name: forgotIdForm.firstName,
        last_name: forgotIdForm.lastName,
        middle_initial: forgotIdForm.middleInitial || "",
      };

      const response = await axiosInstance.post(
        "/patients/lookup-patient/",
        requestData,
      );

      console.log("[DEBUG] Full response:", response);
      console.log(
        "[DEBUG] Response data:",
        JSON.stringify(response.data, null, 2),
      );
      console.log("[DEBUG] Response status field:", response.data.status);
      console.log(
        "[DEBUG] Response patient_id field:",
        response.data.patient_id,
      );

      // Check if we have a patient_id in the response (regardless of status field)
      if (response.data.patient_id) {
        // Handle both 'match' and 'exact_match' status (chatbot uses 'match')
        if (
          response.data.status === "exact_match" ||
          response.data.status === "match" ||
          !response.data.status
        ) {
          toast({
            title: "Success",
            description: `Patient ID found: ${response.data.patient_id}`,
          });
          setSearchQuery(response.data.patient_id);
          setShowForgotPatientId(false);
          setLookupResult(response.data); // Set lookup result to indicate successful lookup
          setForgotIdForm({
            firstName: "",
            middleInitial: "",
            lastName: "",
            suffix: "",
            dateOfBirth: "",
            email: "",
            phone: "",
          });

          // Automatically validate the patient ID
          try {
            const validation = await validatePatientId(
              response.data.patient_id,
            );
            if (validation.isValid) {
              setSelectedPatient(validation.patient);
              toast({
                title: "✅ Patient Verified",
                description: "Patient ID verified successfully!",
              });
            }
          } catch (error) {
            console.error("Error validating found patient ID:", error);
          }
        } else if (response.data.status === "partial_match") {
          // Partial Match: Similar patient found, might be the right one
          toast({
            title: "🔍 Partial Match",
            description: `Found similar patient record. Patient ID: ${response.data.patient_id}. Please verify if this is correct.`,
            duration: 6000,
          });
          setSearchQuery(response.data.patient_id);
          setShowForgotPatientId(false);
          setLookupResult(response.data); // Set lookup result for partial match too
          setForgotIdForm({
            firstName: "",
            middleInitial: "",
            lastName: "",
            suffix: "",
            dateOfBirth: "",
            email: "",
            phone: "",
          });

          // Validate the patient ID to get full patient details
          try {
            const validation = await validatePatientId(
              response.data.patient_id,
            );
            if (validation.isValid) {
              setSelectedPatient(validation.patient);
            }
          } catch (error) {
            console.error("Error validating found patient ID:", error);
          }
        } else if (response.data.status === "multiple_matches") {
          // Multiple Matches: Found multiple similar patients
          toast({
            title: "⚠️ Multiple Matches",
            description:
              "Found multiple patients with similar details. Could you please confirm your registered email or phone number again so I can narrow it down?",
            variant: "destructive",
            duration: 8000,
          });
        } else if (response.data.status === "suggestion") {
          toast({
            title: "🔍 Suggestion",
            description:
              "Hmm, I found a similar record. Is this you? Please reply YES or NO. If NO → show the same form again",
            variant: "destructive",
          });
        } else if (response.data.status === "no_match") {
          // No Match: Completely no matching patient found
          toast({
            title: "❌ No Match",
            description:
              "I couldn't find any patient record with those details. Please double-check your name, birthdate, email, or phone number. If the issue persists, contact the clinic for help. 📞 Provide a 'Try Again' button to reopen the form",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "Error",
            description:
              "No matching patient found with the provided information",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description:
            "No matching patient found with the provided information",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error looking up patient:", error);
      if (error.response?.status === 404) {
        toast({
          title: "Error",
          description:
            "No matching patient found with the provided information",
          variant: "destructive",
        });
      } else if (error.response?.data?.message) {
        toast({
          title: "Error",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            "Failed to lookup patient. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } finally {
      setForgotIdSubmitting(false);
    }
  };

  // Submit medical certificate forgot Patient ID request (same approach as appointment)
  const submitMedCertForgotPatientId = async () => {
    setMedCertForgotIdSubmitting(true);

    try {
      // Validate required fields
      if (!medCertForgotIdForm.firstName.trim()) {
        toast({
          title: "Error",
          description: "First name is required",
          variant: "destructive",
        });
        setMedCertForgotIdSubmitting(false);
        return;
      }
      if (!medCertForgotIdForm.lastName.trim()) {
        toast({
          title: "Error",
          description: "Last name is required",
          variant: "destructive",
        });
        setMedCertForgotIdSubmitting(false);
        return;
      }
      if (!medCertForgotIdForm.dateOfBirth) {
        toast({
          title: "Error",
          description: "Date of birth is required",
          variant: "destructive",
        });
        setMedCertForgotIdSubmitting(false);
        return;
      }
      if (!medCertForgotIdForm.email.trim()) {
        toast({
          title: "Error",
          description: "Email is required",
          variant: "destructive",
        });
        setMedCertForgotIdSubmitting(false);
        return;
      }
      if (!medCertForgotIdForm.phone.trim()) {
        toast({
          title: "Error",
          description: "Phone number is required",
          variant: "destructive",
        });
        setMedCertForgotIdSubmitting(false);
        return;
      }

      // Construct full name matching chatbot's format
      const fullName = `${medCertForgotIdForm.firstName} ${
        medCertForgotIdForm.middleInitial || ""
      } ${medCertForgotIdForm.lastName} ${medCertForgotIdForm.suffix || ""}`
        .trim()
        .replace(/\s+/g, " ");

      const requestData = {
        full_name: fullName,
        date_of_birth: medCertForgotIdForm.dateOfBirth,
        email: medCertForgotIdForm.email.toLowerCase(),
        phone: medCertForgotIdForm.phone,
        first_name: medCertForgotIdForm.firstName,
        last_name: medCertForgotIdForm.lastName,
        middle_initial: medCertForgotIdForm.middleInitial || "",
      };

      const response = await axiosInstance.post(
        "/patients/lookup-patient/",
        requestData,
      );

      console.log("[DEBUG] Med Cert Patient lookup response:", response);

      // Check if we have a patient_id in the response
      if (response.data.patient_id) {
        if (
          response.data.status === "exact_match" ||
          response.data.status === "match" ||
          !response.data.status
        ) {
          toast({
            title: "Success",
            description: `Patient ID found: ${response.data.patient_id}`,
          });
          setMedCertSearchQuery(response.data.patient_id);
          setShowMedCertForgotPatientId(false);
          setMedCertForgotIdForm({
            firstName: "",
            middleInitial: "",
            lastName: "",
            suffix: "",
            dateOfBirth: "",
            email: "",
            phone: "",
          });

          // Automatically validate the patient ID and proceed
          try {
            const validation = await validatePatientId(
              response.data.patient_id,
            );
            if (validation.isValid) {
              setMedCertSelectedPatient(validation.patient);
              toast({
                title: "✅ Patient Verified",
                description: "Patient ID verified successfully!",
              });
            }
          } catch (error) {
            console.error("Error validating found patient ID:", error);
          }
        } else if (response.data.status === "partial_match") {
          toast({
            title: "🔍 Partial Match",
            description: `Found similar patient record. Patient ID: ${response.data.patient_id}. Please verify if this is correct.`,
            duration: 6000,
          });
          setMedCertSearchQuery(response.data.patient_id);
          setShowMedCertForgotPatientId(false);
          setMedCertForgotIdForm({
            firstName: "",
            middleInitial: "",
            lastName: "",
            suffix: "",
            dateOfBirth: "",
            email: "",
            phone: "",
          });
        } else if (response.data.status === "multiple_matches") {
          toast({
            title: "⚠️ Multiple Matches",
            description:
              "Found multiple patients with similar details. Could you please confirm your registered email or phone number again so I can narrow it down?",
            variant: "destructive",
            duration: 8000,
          });
        } else if (response.data.status === "suggestion") {
          toast({
            title: "🔍 Suggestion",
            description:
              "Hmm, I found a similar record. Is this you? Please reply YES or NO. If NO → show the same form again",
            variant: "destructive",
          });
        } else if (response.data.status === "no_match") {
          toast({
            title: "❌ No Match",
            description:
              "I couldn't find any patient record with those details. Please double-check your name, birthdate, email, or phone number. If the issue persists, contact the clinic for help.",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "Error",
            description:
              "No matching patient found with the provided information",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description:
            "No matching patient found with the provided information",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error looking up patient:", error);
      if (error.response?.status === 404) {
        toast({
          title: "Error",
          description:
            "No matching patient found with the provided information",
          variant: "destructive",
        });
      } else if (error.response?.data?.message) {
        toast({
          title: "Error",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            "Failed to lookup patient. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } finally {
      setMedCertForgotIdSubmitting(false);
    }
  };

  // Submit prescription forgot Patient ID request (same approach as others)
  const submitPrescriptionForgotPatientId = async () => {
    setPrescriptionForgotIdSubmitting(true);

    try {
      // Validate required fields
      if (!prescriptionForgotIdForm.firstName.trim()) {
        toast({
          title: "Error",
          description: "First name is required",
          variant: "destructive",
        });
        setPrescriptionForgotIdSubmitting(false);
        return;
      }
      if (!prescriptionForgotIdForm.lastName.trim()) {
        toast({
          title: "Error",
          description: "Last name is required",
          variant: "destructive",
        });
        setPrescriptionForgotIdSubmitting(false);
        return;
      }
      if (!prescriptionForgotIdForm.dateOfBirth) {
        toast({
          title: "Error",
          description: "Date of birth is required",
          variant: "destructive",
        });
        setPrescriptionForgotIdSubmitting(false);
        return;
      }
      if (!prescriptionForgotIdForm.email.trim()) {
        toast({
          title: "Error",
          description: "Email is required",
          variant: "destructive",
        });
        setPrescriptionForgotIdSubmitting(false);
        return;
      }
      if (!prescriptionForgotIdForm.phone.trim()) {
        toast({
          title: "Error",
          description: "Phone number is required",
          variant: "destructive",
        });
        setPrescriptionForgotIdSubmitting(false);
        return;
      }

      // Construct full name matching chatbot's format
      const fullName = `${prescriptionForgotIdForm.firstName} ${
        prescriptionForgotIdForm.middleInitial || ""
      } ${prescriptionForgotIdForm.lastName} ${
        prescriptionForgotIdForm.suffix || ""
      }`
        .trim()
        .replace(/\s+/g, " ");

      const requestData = {
        full_name: fullName,
        date_of_birth: prescriptionForgotIdForm.dateOfBirth,
        email: prescriptionForgotIdForm.email.toLowerCase(),
        phone: prescriptionForgotIdForm.phone,
        first_name: prescriptionForgotIdForm.firstName,
        last_name: prescriptionForgotIdForm.lastName,
        middle_initial: prescriptionForgotIdForm.middleInitial || "",
      };

      const response = await axiosInstance.post(
        "/patients/lookup-patient/",
        requestData,
      );

      console.log("[DEBUG] Prescription Patient lookup response:", response);

      // Check if we have a patient_id in the response
      if (response.data.patient_id) {
        if (
          response.data.status === "exact_match" ||
          response.data.status === "match" ||
          !response.data.status
        ) {
          toast({
            title: "Success",
            description: `Patient ID found: ${response.data.patient_id}`,
          });
          setPrescriptionSearchQuery(response.data.patient_id);
          setShowPrescriptionForgotPatientId(false);
          setPrescriptionForgotIdForm({
            firstName: "",
            middleInitial: "",
            lastName: "",
            suffix: "",
            dateOfBirth: "",
            email: "",
            phone: "",
          });

          // Automatically validate the patient ID and proceed
          try {
            const validation = await validatePatientId(
              response.data.patient_id,
            );
            if (validation.isValid) {
              setPrescriptionSelectedPatient(validation.patient);
              toast({
                title: "✅ Patient Verified",
                description: "Patient ID verified successfully!",
              });
            }
          } catch (error) {
            console.error("Error validating found patient ID:", error);
          }
        } else if (response.data.status === "partial_match") {
          toast({
            title: "🔍 Partial Match",
            description: `Found similar patient record. Patient ID: ${response.data.patient_id}. Please verify if this is correct.`,
            duration: 6000,
          });
          setPrescriptionSearchQuery(response.data.patient_id);
          setShowPrescriptionForgotPatientId(false);
          setPrescriptionForgotIdForm({
            firstName: "",
            middleInitial: "",
            lastName: "",
            suffix: "",
            dateOfBirth: "",
            email: "",
            phone: "",
          });
        } else if (response.data.status === "multiple_matches") {
          toast({
            title: "⚠️ Multiple Matches",
            description:
              "Found multiple patients with similar details. Could you please confirm your registered email or phone number again so I can narrow it down?",
            variant: "destructive",
            duration: 8000,
          });
        } else if (response.data.status === "suggestion") {
          toast({
            title: "🔍 Suggestion",
            description:
              "Hmm, I found a similar record. Is this you? Please reply YES or NO. If NO → show the same form again",
            variant: "destructive",
          });
        } else if (response.data.status === "no_match") {
          toast({
            title: "❌ No Match",
            description:
              "I couldn't find any patient record with those details. Please double-check your name, birthdate, email, or phone number. If the issue persists, contact the clinic for help.",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "Error",
            description:
              "No matching patient found with the provided information",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description:
            "No matching patient found with the provided information",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error looking up patient:", error);
      if (error.response?.status === 404) {
        toast({
          title: "Error",
          description:
            "No matching patient found with the provided information",
          variant: "destructive",
        });
      } else if (error.response?.data?.message) {
        toast({
          title: "Error",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            "Failed to lookup patient. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } finally {
      setPrescriptionForgotIdSubmitting(false);
    }
  };

  // Reset appointment modal
  const resetAppointmentModal = () => {
    setCurrentStep(1);
    setIsExistingPatient(null);
    setSearchQuery("");
    setPatients([]);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedAppointmentType("");
    setSelectedDate(undefined);
    setAvailableTimeSlots([]);
    setSelectedTimeSlot("");
    setNotes("");
    setBookingPreference(null);
    setIsLoadingTimeSlots(false);
    setDoctorAvailableDates([]);
    setIsLoadingDates(false);
    setDoctorDatesCache({});
    setTermsAccepted(false);
    setNoMiddleName(false);
    setShowForgotPatientId(false);
    setLookupResult(null);
    setForgotIdAttempted(false);
    setForgotIdForm({
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      dateOfBirth: "",
      email: "",
      phone: "",
    });
    patientForm.reset();
    appointmentForm.reset();
  };

  // Handle appointment modal close
  const handleAppointmentModalClose = () => {
    setOpenModal(null);
    resetAppointmentModal();
  };

  // Submit appointment - using same approach as chatbot
  const onSubmitAppointment = async () => {
    setIsSubmitting(true);

    console.log("Starting appointment submission...");

    try {
      // Validate patient form if new patient
      if (!isExistingPatient) {
        const isValidPatient = await patientForm.trigger();
        if (!isValidPatient) {
          toast({
            title: "Incomplete Information",
            description: "Please fill in all required patient information",
            variant: "destructive",
          });
          setCurrentStep(2);
          setIsSubmitting(false);
          return;
        }
      }

      // Format time to 24-hour format with seconds (same as chatbot)
      const [time, period] = selectedTimeSlot.includes(" ")
        ? selectedTimeSlot.split(" ")
        : [selectedTimeSlot, ""];
      let formattedTime = selectedTimeSlot;

      if (period) {
        const [hours, minutes] = time.split(":");
        let hour = parseInt(hours);
        if (period === "PM" && hour !== 12) hour += 12;
        if (period === "AM" && hour === 12) hour = 0;
        formattedTime = `${hour.toString().padStart(2, "0")}:${minutes}:00`;
      } else if (!selectedTimeSlot.includes(":")) {
        // If it's just HH format, add minutes and seconds
        formattedTime = `${selectedTimeSlot}:00:00`;
      } else if (
        !selectedTimeSlot.includes(":", selectedTimeSlot.lastIndexOf(":") + 1)
      ) {
        // If it's HH:MM format, add seconds
        formattedTime = `${selectedTimeSlot}:00`;
      }

      // Prepare appointment data using chatbot's structure
      const patientData = isExistingPatient
        ? selectedPatient
        : patientForm.getValues();

      const appointmentData = {
        firstName: isExistingPatient
          ? selectedPatient?.firstName || selectedPatient?.first_name
          : patientData.firstName,
        middleInitial: isExistingPatient
          ? selectedPatient?.middleInitial ||
            selectedPatient?.middle_initial ||
            ""
          : patientData.middleName === "N/A"
            ? ""
            : patientData.middleName || "",
        lastName: isExistingPatient
          ? selectedPatient?.lastName || selectedPatient?.last_name
          : patientData.lastName,
        suffix: isExistingPatient
          ? selectedPatient?.suffix || ""
          : patientData.suffix || "",
        patient_id: isExistingPatient
          ? selectedPatient?.patient_id || null
          : null,
        patient_email: isExistingPatient
          ? selectedPatient?.email
          : patientData.email,
        patient_phone: isExistingPatient
          ? selectedPatient?.phone || selectedPatient?.phone_number
          : patientData.phone,
        date_of_birth: isExistingPatient
          ? selectedPatient?.dateOfBirth || selectedPatient?.date_of_birth
          : patientData.dateOfBirth,
        religion: isExistingPatient
          ? selectedPatient?.religion || null
          : patientData.religion,
        gender: isExistingPatient
          ? selectedPatient?.gender ||
            selectedPatient?.sex ||
            "prefer_not_to_say"
          : patientData.sex,
        address: isExistingPatient
          ? selectedPatient?.address || null
          : patientData.address,
        marital_status: isExistingPatient
          ? selectedPatient?.maritalStatus ||
            selectedPatient?.marital_status ||
            "prefer_not_to_say"
          : patientData.maritalStatus || "prefer_not_to_say",
        appointment_type: selectedAppointmentType,
        date: selectedDate
          ? `${selectedDate.getFullYear()}-${String(
              selectedDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(
              2,
              "0",
            )}`
          : "",
        time: formattedTime,
        doctor_id: parseInt(selectedDoctor.id),
        status: "pending",
        is_pending_confirmation: true,
        notes: notes || "",
        // Notification preferences (for new patients)
        emailNotifications: isExistingPatient ? undefined : emailNotifications,
        smsNotifications: isExistingPatient ? undefined : smsNotifications,
      };

      // Create appointment using the same API as chatbot
      const response = await api.appointments.create(appointmentData);

      console.log("Appointment created successfully:", response);

      // Enhanced success toast notification with appointment details
      const patientName = isExistingPatient
        ? `${selectedPatient?.firstName || selectedPatient?.first_name} ${
            selectedPatient?.lastName || selectedPatient?.last_name
          }`
        : `${patientData.firstName} ${patientData.lastName}`;

      // Success toast with simple confirmation
      toast({
        title: "🎉 Appointment Successfully Scheduled!",
        description: "You will receive a confirmation email once approved.",
      });

      // Add a small delay before closing modal to ensure toast is visible
      setTimeout(() => {
        handleAppointmentModalClose();
      }, 500);
    } catch (error: any) {
      console.error("Error submitting appointment:", error);

      // Handle specific error cases like chatbot does
      if (
        error.response?.status === 409 ||
        error.response?.status === 500 ||
        (error.response?.data &&
          (error.response.data.error === "TIME_SLOT_CONFLICT" ||
            (typeof error.response.data === "string" &&
              error.response.data.includes("already booked")) ||
            (error.response.data.message &&
              error.response.data.message.includes("already booked"))))
      ) {
        toast({
          title: "Time Slot Conflict",
          description:
            "This time slot has just been booked by another patient. Please select a different time.",
          variant: "destructive",
        });
        // Clear the selected time slot and refresh available slots
        setSelectedTimeSlot("");
        if (selectedDoctor && selectedDate) {
          await fetchAvailableTimeSlots(selectedDoctor.id, selectedDate);
        }
        setCurrentStep(3); // Go back to date/time selection
      } else if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === "object") {
          const firstError = Object.values(errorData)[0];
          toast({
            title: "Submission Error",
            description: Array.isArray(firstError) ? firstError[0] : firstError,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Submission Error",
            description: errorData,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Submission Failed",
          description:
            "Failed to submit appointment request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 7));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // Handle step navigation with validation
  const handleNextStep = async () => {
    // Validate Patient ID in Step 5 for existing patients
    if (currentStep === 5 && isExistingPatient) {
      // If user used Forgot Patient ID feature, check if patient was found
      if (lookupResult) {
        if (!selectedPatient) {
          toast({
            title: "Patient Information Required",
            description:
              "Please complete the 'Forgot Patient ID?' lookup process.",
            variant: "destructive",
          });
          return;
        }
        // Patient already validated via Forgot ID lookup, proceed to next step
      } else {
        // User manually entered Patient ID, need to validate it
        if (!searchQuery.trim()) {
          toast({
            title: "Patient ID Required",
            description:
              "Please enter your Patient ID or use 'Forgot Patient ID?' to look it up.",
            variant: "destructive",
          });
          return;
        }

        try {
          const validation = await validatePatientId(searchQuery);

          if (!validation.isValid) {
            toast({
              title: "Invalid Patient ID",
              description:
                validation.error ||
                "The Patient ID you entered was not found in our system. Please check and try again, or use 'Forgot Patient ID?' feature.",
              variant: "destructive",
            });
            return;
          }

          // Set the patient data from validation
          if (validation.patient) {
            setSelectedPatient(validation.patient);
            toast({
              title: "✅ Patient Verified",
              description: "Patient ID verified successfully!",
            });
          }
        } catch (error) {
          toast({
            title: "Validation Error",
            description: "Unable to verify Patient ID. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    switch (currentStep) {
      case 1:
        if (!bookingPreference) {
          toast({
            title: "Selection Required",
            description: "Please select your booking preference",
            variant: "destructive",
          });
          return;
        }
        break;
      case 2:
        // Step 2 validation based on booking preference
        if (bookingPreference === "doctor") {
          // Doctor-first flow: validate doctor selection
          if (!selectedDoctor) {
            toast({
              title: "Selection Required",
              description: "Please select a doctor",
              variant: "destructive",
            });
            return;
          }
        } else {
          // Date-first flow: validate date selection only
          if (!selectedDate) {
            toast({
              title: "Selection Required",
              description: "Please select a date",
              variant: "destructive",
            });
            return;
          }
        }
        break;
      case 3:
        // Step 3 validation based on booking preference
        if (bookingPreference === "doctor") {
          // Doctor-first flow: validate date and time selection
          if (!selectedDate) {
            toast({
              title: "Selection Required",
              description: "Please select a date",
              variant: "destructive",
            });
            return;
          }
          if (!selectedTimeSlot) {
            toast({
              title: "Selection Required",
              description: "Please select a time",
              variant: "destructive",
            });
            return;
          }
        } else {
          // Date-first flow: validate doctor and time selection
          if (!selectedDoctor) {
            toast({
              title: "Selection Required",
              description: "Please select a doctor",
              variant: "destructive",
            });
            return;
          }
          if (!selectedTimeSlot) {
            toast({
              title: "Selection Required",
              description: "Please select a time slot",
              variant: "destructive",
            });
            return;
          }
        }
        break;
      case 4:
        // Step 4: Patient type validation
        if (isExistingPatient === null) {
          toast({
            title: "Selection Required",
            description: "Please select if you are an existing patient",
            variant: "destructive",
          });
          return;
        }
        // For new patients, check if terms are accepted
        if (!isExistingPatient && !termsAccepted) {
          toast({
            title: "Agreement Required",
            description: "Please accept the terms and conditions to proceed",
            variant: "destructive",
          });
          return;
        }
        break;
      case 5:
        // Step 5: Patient information validation
        if (isExistingPatient) {
          // Validate Patient ID for existing patients
          if (!searchQuery.trim()) {
            toast({
              title: "Input Required",
              description: "Please enter your Patient ID",
              variant: "destructive",
            });
            return;
          }
          const validation = await validatePatientId(searchQuery);
          if (!validation.isValid) {
            toast({
              title: "Validation Error",
              description: validation.error,
              variant: "destructive",
            });
            return;
          }
          setSelectedPatient(validation.patient);
          toast({
            title: "✅ Patient Verified",
            description: "Patient ID verified successfully!",
          });
        } else {
          // Custom validation for new patients
          const formData = patientForm.getValues();

          // Check required fields
          if (!formData.firstName?.trim()) {
            toast({
              title: "Required Field",
              description: "First name is required",
              variant: "destructive",
            });
            return;
          }
          if (!noMiddleName && !formData.middleName?.trim()) {
            toast({
              title: "Required Field",
              description:
                "Middle name is required (or check 'No middle name')",
              variant: "destructive",
            });
            return;
          }
          if (!formData.lastName?.trim()) {
            toast({
              title: "Required Field",
              description: "Last name is required",
              variant: "destructive",
            });
            return;
          }
          if (!formData.phone?.trim()) {
            toast({
              title: "Required Field",
              description: "Contact number is required",
              variant: "destructive",
            });
            return;
          }
          if (formData.phone.length < 10) {
            toast({
              title: "Invalid Input",
              description: "Contact number must be at least 10 digits",
              variant: "destructive",
            });
            return;
          }
          if (!formData.sex) {
            toast({
              title: "Required Field",
              description: "Sex is required",
              variant: "destructive",
            });
            return;
          }
          if (!formData.email?.trim()) {
            toast({
              title: "Required Field",
              description: "Email address is required",
              variant: "destructive",
            });
            return;
          }
          if (!formData.dateOfBirth) {
            toast({
              title: "Required Field",
              description: "Date of birth is required",
              variant: "destructive",
            });
            return;
          }
          if (!formData.religion?.trim()) {
            toast({
              title: "Required Field",
              description: "Religion is required",
              variant: "destructive",
            });
            return;
          }
          if (!formData.address?.trim()) {
            toast({
              title: "Required Field",
              description: "Home address is required",
              variant: "destructive",
            });
            return;
          }

          // Email validation - basic format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.email)) {
            toast({
              title: "Invalid Email",
              description: "Please enter a valid email address",
              variant: "destructive",
            });
            return;
          }

          // Email domain validation
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
          const domain = formData.email.split("@")[1];
          if (!domain) {
            toast({
              title: "Invalid Email",
              description: "Please enter a valid email address",
              variant: "destructive",
            });
            return;
          }
          const tld = domain.split(".").pop()?.toLowerCase();
          if (!tld || !validTLDs.includes(tld)) {
            toast({
              title: "Invalid Email Domain",
              description:
                "Please enter a valid email domain (e.g., gmail.com, yahoo.com)",
              variant: "destructive",
            });
            return;
          }
        }
        break;
      case 6:
        // Step 6: validate appointment type (same for both flows)
        if (!selectedAppointmentType) {
          toast({
            title: "Selection Required",
            description: "Please select an appointment type",
            variant: "destructive",
          });
          return;
        }
        break;
    }
    nextStep();
  };

  // Search patients on query change
  useEffect(() => {
    if (isExistingPatient && searchQuery) {
      const timeoutId = setTimeout(() => {
        searchPatients(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, isExistingPatient]);

  // Medical Certificate submission
  const submitMedicalCertRequest = async () => {
    setMedCertSubmitting(true);

    try {
      if (!medCertSearchQuery.trim()) {
        toast({
          title: "Input Required",
          description: "Please enter your Patient ID",
          variant: "destructive",
        });
        setMedCertStep(1);
        setMedCertSubmitting(false);
        return;
      }

      if (!medCertSelectedPatient) {
        toast({
          title: "Patient Not Found",
          description:
            "Patient information not found. Please verify your Patient ID again.",
          variant: "destructive",
        });
        setMedCertStep(1);
        setMedCertSubmitting(false);
        return;
      }

      const formData = new FormData();

      // Fixed request type as Medical Certificate
      formData.append("request_type", "Medical Certificate");
      formData.append("patient_id", medCertSearchQuery);
      formData.append("additional_info", medCertNotes);
      formData.append("delivery_method", medCertDeliveryMethod);

      // Use the validated patient data from medCertSelectedPatient
      const patient = medCertSelectedPatient;
      const fullName = `${patient.first_name || ""} ${
        patient.middle_initial ? patient.middle_initial + " " : ""
      }${patient.last_name || ""}${
        patient.suffix ? " " + patient.suffix : ""
      }`.trim();

      formData.append("patient_name", fullName);
      formData.append("first_name", patient.first_name || "");
      formData.append("last_name", patient.last_name || "");
      formData.append("middle_initial", patient.middle_initial || "");
      formData.append("suffix", patient.suffix || "");
      formData.append(
        "date_of_birth",
        patient.date_of_birth || patient.dateOfBirth || "",
      );
      formData.append("email", patient.email || "");
      formData.append("phone", patient.phone_number || patient.phone || "");

      if (medCertIdFront) {
        formData.append("id_verification_front", medCertIdFront);
      }

      if (medCertIdBack) {
        formData.append("id_verification_back", medCertIdBack);
      }

      const csrfToken = getCSRFToken();
      const headers = {
        "Content-Type": "multipart/form-data",
      };

      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }

      const response = await axiosInstance.post(
        "/medical-certificates/",
        formData,
        { headers },
      );

      if (response.status === 200 || response.status === 201) {
        const deliveryMessage =
          medCertDeliveryMethod === "pickup"
            ? "You will be notified when it's ready for pickup at the clinic."
            : "A digital copy will be sent to your registered email address.";

        toast({
          title: "🎉 Medical Certificate Request Submitted!",
          description: `Your medical certificate request has been submitted successfully! Our team will review your request and contact you within 2-3 business days. ${deliveryMessage}`,
        });
        resetMedCertModal();
        setOpenModal(null);
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (error: any) {
      console.error("Error submitting medical record request:", error);
      toast({
        title: "Submission Failed",
        description:
          "Sorry, there was an error submitting your request. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setMedCertSubmitting(false);
    }
  };

  // Prescription submission
  const submitPrescriptionRequest = async () => {
    setPrescriptionSubmitting(true);

    try {
      if (!prescriptionSearchQuery.trim()) {
        toast({
          title: "Input Required",
          description: "Please enter your Patient ID",
          variant: "destructive",
        });
        setPrescriptionStep(1);
        setPrescriptionSubmitting(false);
        return;
      }

      if (!prescriptionSelectedPatient) {
        toast({
          title: "Patient Not Found",
          description:
            "Patient information not found. Please verify your Patient ID again.",
          variant: "destructive",
        });
        setPrescriptionStep(1);
        setPrescriptionSubmitting(false);
        return;
      }

      const formData = new FormData();

      formData.append("patient_id", prescriptionSearchQuery);
      formData.append(
        "medication_name",
        prescriptionForm.getValues("medicationName"),
      );
      formData.append("dosage", prescriptionForm.getValues("dosage"));
      formData.append("frequency", prescriptionForm.getValues("frequency"));
      formData.append("duration", prescriptionForm.getValues("duration"));
      formData.append(
        "additional_notes",
        prescriptionForm.getValues("additionalNotes") || "",
      );

      // Use the validated patient data from prescriptionSelectedPatient
      const patient = prescriptionSelectedPatient;
      const fullName = `${patient.first_name || ""} ${
        patient.middle_initial ? patient.middle_initial + " " : ""
      }${patient.last_name || ""}${
        patient.suffix ? " " + patient.suffix : ""
      }`.trim();

      formData.append("patient_name", fullName);
      formData.append("first_name", patient.first_name || "");
      formData.append("last_name", patient.last_name || "");
      formData.append("middle_initial", patient.middle_initial || "");
      formData.append("suffix", patient.suffix || "");
      formData.append(
        "date_of_birth",
        patient.date_of_birth || patient.dateOfBirth || "",
      );
      formData.append("email", patient.email || "");
      formData.append("phone", patient.phone_number || patient.phone || "");

      if (prescriptionIdFront) {
        formData.append("id_verification_front", prescriptionIdFront);
      }

      if (prescriptionIdBack) {
        formData.append("id_verification_back", prescriptionIdBack);
      }

      const csrfToken = getCSRFToken();
      const headers = {
        "Content-Type": "multipart/form-data",
      };

      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }

      const response = await axiosInstance.post(
        "/prescription-requests/",
        formData,
        { headers },
      );

      if (response.status === 200 || response.status === 201) {
        toast({
          title: "🎉 Prescription Request Submitted!",
          description:
            "Your prescription request has been submitted successfully! Our team will review your request and contact you within 2-3 business days.",
        });
        resetPrescriptionModal();
        setOpenModal(null);
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (error: any) {
      console.error("Error submitting prescription request:", error);
      toast({
        title: "Submission Failed",
        description:
          "Sorry, there was an error submitting your request. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setPrescriptionSubmitting(false);
    }
  };

  // Reset functions
  const resetMedCertModal = () => {
    setMedCertStep(1);
    setMedCertIsExistingPatient(true); // Always set to existing patient
    setMedCertSearchQuery("");
    setMedCertPatients([]);
    setMedCertSelectedPatient(null);
    setMedCertRequestType("Medical Certificate");
    setMedCertIdFront(null);
    setMedCertIdBack(null);
    setMedCertIdFrontPreview(null);
    setMedCertIdBackPreview(null);
    setMedCertNotes("");
    setShowMedCertForgotPatientId(false);
    setMedCertForgotIdForm({
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      dateOfBirth: "",
      email: "",
      phone: "",
    });
    setMedCertDeliveryMethod("pickup");
    medicalCertForm.reset();
  };

  const resetPrescriptionModal = () => {
    setPrescriptionStep(1);
    setPrescriptionIsExistingPatient(true); // Always set to existing patient
    setPrescriptionSearchQuery("");
    setPrescriptionPatients([]);
    setPrescriptionSelectedPatient(null);
    setPrescriptionIdFront(null);
    setPrescriptionIdBack(null);
    setPrescriptionIdFrontPreview(null);
    setPrescriptionIdBackPreview(null);
    setShowPrescriptionForgotPatientId(false);
    setPrescriptionForgotIdForm({
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      dateOfBirth: "",
      email: "",
      phone: "",
    });
    setPrescriptionForgotIdSubmitting(false);
    prescriptionForm.reset();
  };

  const GREETING_TEXT =
    "Hi! I'm Luna, virtual assistant. What can I help you with?";

  const [greetingDisplay, setGreetingDisplay] = useState("");
  const [typing, setTyping] = useState(true);

  // Typing animation for greeting
  useEffect(() => {
    let charIndex = 0;
    let typingTimeout: NodeJS.Timeout;
    let repeatTimeout: NodeJS.Timeout;

    const typeGreeting = () => {
      setTyping(true);
      setGreetingDisplay("");
      charIndex = 0;
      typingTimeout = setInterval(() => {
        charIndex++;
        setGreetingDisplay(GREETING_TEXT.slice(0, charIndex));
        if (charIndex === GREETING_TEXT.length) {
          clearInterval(typingTimeout);
          setTyping(false);
          repeatTimeout = setTimeout(typeGreeting, 20000); // repeat every 20s
        }
      }, 35);
    };

    typeGreeting();

    return () => {
      clearInterval(typingTimeout);
      clearTimeout(repeatTimeout);
    };
  }, []);

  // Move fetchClinic outside useEffect
  const fetchClinic = async () => {
    try {
      const res = await axios.get("clinic/");
      const clinicData = res.data || {};

      // Also fetch submitted reviews from the reviews API
      try {
        const reviewsRes = await axios.get("clinic/reviews/");
        if (reviewsRes.data && reviewsRes.data.length > 0) {
          // Use submitted reviews as the primary source
          clinicData.reviews = reviewsRes.data;
        }
      } catch (reviewsErr) {
        console.log("Could not fetch submitted reviews:", reviewsErr);
        // Keep any reviews from clinic data as fallback
      }

      setClinic(clinicData);
    } catch (err) {
      // fallback: keep default empty values
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinic();
  }, []);

  const getLogoUrl = (logo) => {
    if (!logo) return null;
    if (logo.startsWith("http")) return logo;

    // Use the same base URL as the API but without /api suffix for media files
    const baseUrl = ENV.API_URL.replace("/api", "");

    if (logo.startsWith("/media/")) return `${baseUrl}${logo}`;
    if (logo.startsWith("branding/")) return `${baseUrl}/media/${logo}`;
    return `${baseUrl}${logo}`;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    // Check cooldown period (5 minutes)
    const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = Date.now();

    if (lastReviewTime && now - lastReviewTime < COOLDOWN_PERIOD) {
      const timeLeft = Math.ceil(
        (COOLDOWN_PERIOD - (now - lastReviewTime)) / 1000 / 60,
      );
      toast({
        title: "⏱️ Please Wait",
        description: `Please wait ${timeLeft} minute(s) before submitting another review to prevent spam.`,
        variant: "destructive",
      });
      return;
    }

    // Validation checks
    if (!stayAnonymous) {
      if (!reviewForm.name.trim() || reviewForm.name.trim().length < 2) {
        toast({
          title: "⚠️ Invalid Name",
          description: "Please enter a valid name (at least 2 characters).",
          variant: "destructive",
        });
        return;
      }
      if (!reviewForm.email.trim() || !reviewForm.email.includes("@")) {
        toast({
          title: "⚠️ Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!reviewForm.comment.trim() || reviewForm.comment.trim().length < 10) {
      toast({
        title: "⚠️ Comment Too Short",
        description: "Please write a comment with at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    if (reviewForm.comment.trim().length > 1000) {
      toast({
        title: "⚠️ Comment Too Long",
        description: "Comment is too long. Please limit to 1000 characters.",
        variant: "destructive",
      });
      return;
    }

    // Check for repeated characters (simple spam detection)
    const repeatedCharsPattern = /(.)\1{9,}/; // 10 or more repeated characters
    if (repeatedCharsPattern.test(reviewForm.comment)) {
      toast({
        title: "🚫 Suspicious Pattern Detected",
        description:
          "Your comment contains suspicious patterns. Please write a genuine review.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate submission (localStorage)
    const reviewKey = `review_${
      stayAnonymous ? "anonymous" : reviewForm.email.toLowerCase()
    }_${reviewForm.rating}`;
    const lastSubmittedReview = localStorage.getItem(reviewKey);

    if (lastSubmittedReview) {
      const lastReview = JSON.parse(lastSubmittedReview);
      if (
        lastReview.comment === reviewForm.comment.trim() &&
        now - lastReview.timestamp < 24 * 60 * 60 * 1000 // 24 hours
      ) {
        toast({
          title: "⚠️ Duplicate Review",
          description:
            "This review appears to be a duplicate. Please submit a different review or wait 24 hours.",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const reviewData = {
        name: stayAnonymous ? "Anonymous" : reviewForm.name.trim(),
        email: stayAnonymous ? "" : reviewForm.email.trim().toLowerCase(),
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        date: new Date().toISOString().slice(0, 10),
        anonymous: stayAnonymous,
      };

      const response = await axios.post("clinic/reviews/", reviewData);

      // Store review info to prevent duplicates
      localStorage.setItem(
        reviewKey,
        JSON.stringify({
          comment: reviewForm.comment.trim(),
          timestamp: now,
        }),
      );

      // Set cooldown
      setLastReviewTime(now);
      setReviewCooldown(true);
      setCooldownTimeLeft(COOLDOWN_PERIOD / 1000); // in seconds

      // Reset form with 1 star rating
      setReviewForm({ name: "", email: "", rating: 1, comment: "" });
      setStayAnonymous(false); // Reset anonymous checkbox
      await fetchClinic(); // Refresh reviews

      // Enhanced success message with email confirmation
      const emailSent = response.data?.email_sent;
      if (emailSent) {
        toast({
          title: "✅ Review Submitted Successfully!",
          description:
            "Thank you for your review! We have received it and our clinic management team has been notified via email. They may reach out to you directly.",
        });
      } else {
        toast({
          title: "✅ Review Submitted Successfully!",
          description:
            "Thank you for your review! We have received it and saved it to our system. (Email notification temporarily unavailable, but your review is safely stored).",
        });
      }
    } catch (err) {
      console.error("Review submission error:", err);
      if (err.response?.status === 429) {
        toast({
          title: "🚫 Too Many Requests",
          description: "Too many review submissions. Please try again later.",
          variant: "destructive",
        });
      } else if (err.response?.data?.error) {
        toast({
          title: "❌ Submission Failed",
          description: `Failed to submit review: ${err.response.data.error}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Submission Failed",
          description: "Failed to submit review. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for scroll up
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      const headerHeight = 10; // Account for fixed header height
      const elementPosition = section.offsetTop;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Update URL hash without triggering scroll
      history.replaceState(null, "", `#${id}`);
    }
  };

  // Add state for active section
  const [activeSection, setActiveSection] = useState("home");

  // Show arrow only when user is near the bottom (footer)
  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector("footer");
      if (!footer) return setShowArrow(false);

      const footerRect = footer.getBoundingClientRect();
      const windowHeight =
        window.innerHeight || document.documentElement.clientHeight;

      // Show arrow if the top of the footer is visible in the viewport
      setShowArrow(footerRect.top < windowHeight && footerRect.bottom > 0);

      // Detect active section for smooth navigation highlighting
      const sections = [
        "home",
        "about",
        "services",
        "reviews",
        "faqs",
        "contact",
      ];
      const scrollPosition = window.scrollY + 100; // Offset for header

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Add this state for the transitioning button text
  const [buttonText, setButtonText] = useState("Chat Now");

  // Add this effect for transitioning button text
  useEffect(() => {
    const texts = [
      "Chat Now",
      "Request an Appointment",
      "Request a Prescription",
      "Request Med-cert",
    ];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % texts.length;
      setButtonText(texts[currentIndex]);
    }, 3000); // Changed from 7000 to 3000 for a 3-second interval

    return () => clearInterval(interval);
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (reviewCooldown && cooldownTimeLeft > 0) {
      const timer = setInterval(() => {
        setCooldownTimeLeft((prev) => {
          if (prev <= 1) {
            setReviewCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [reviewCooldown, cooldownTimeLeft]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading clinic info...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        background: "linear-gradient(to bottom, #fff 0%, #79c942 300%)",
      }}
    >
      {/* Notification popup */}
      {notification && (
        <div className="fixed top-5 right-5 bg-[#79c942] text-white px-4 py-2 rounded shadow-lg z-50">
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white shadow">
        <div className="container flex h-16 items-center justify-between mobile-container">
          {/* Mobile Menu Button - only visible on mobile */}
          <button
            className="md:hidden mr-2"
            onClick={() => setMobileMenuOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Navigation Menu - hidden on mobile */}
          <div className="flex-1 hidden md:block">
            <NavigationMenu>
              <NavigationMenuList className="flex gap-4 bg-transparent text-base font-medium items-center">
                {[
                  { label: "Home", href: "#home" },
                  { label: "About", href: "#about" },
                  { label: "Services", href: "#services" },
                  { label: "Reviews", href: "#reviews" },
                  { label: "FAQs", href: "#faqs" },
                  { label: "Contact Us", href: "#contact" },
                ].map((item) => {
                  const sectionId = item.href.substring(1); // Remove # from href
                  const isActive = activeSection === sectionId;
                  return (
                    <NavigationMenuItem key={item.href} className="flex">
                      <NavigationMenuLink
                        href={item.href}
                        className={`
                          bg-transparent
                          px-2 py-1
                          font-medium
                          transition-all duration-300 ease-in-out
                          flex items-center
                          whitespace-nowrap
                          transform hover:scale-105
                          ${
                            isActive
                              ? "text-[#79c942] underline underline-offset-8 font-semibold bg-green-50 shadow-sm rounded-md"
                              : "text-black"
                          }
                          hover:text-[#79c942] hover:bg-green-50 hover:underline hover:underline-offset-8 hover:shadow-sm hover:rounded-md
                        `}
                        style={{
                          textDecorationColor: isActive ? "#79c942" : undefined,
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToSection(item.href.substring(1)); // Remove # from href
                        }}
                      >
                        <span className="whitespace-nowrap">{item.label}</span>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Logo - center on desktop, left-aligned on mobile (after menu button) */}
          <div className="flex items-center justify-center md:flex-1">
            {clinic.logo ? (
              <img
                src={getLogoUrl(clinic.logo)}
                alt="Clinic Logo"
                className="h-10 w-auto object-contain"
                style={{ maxWidth: 160 }}
              />
            ) : (
              <div className="text-xl font-bold text-[#79c942]">
                {clinic.clinic_name || "Clinic"}
              </div>
            )}
          </div>

          {/* Chat Now Button + Request Appointment - on right side */}
          <div className="flex-1 flex justify-end items-center gap-2">
            {/* Schedule Appointment button (moved from hero section) */}
            <Button
              onClick={() => setOpenModal("appointment")}
              size="lg"
              className="rounded-full font-bold bg-[#79c942] hover:bg-[#6bb33a] text-white transition-colors
              h-9 w-[180px] min-w-[180px] max-w-[180px]
              px-3 py-0
              flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span className="whitespace-nowrap text-[10px] md:text-xs truncate">
                Schedule Appointment
              </span>
              <Calendar className="h-4 w-4 flex-shrink-0" />
            </Button>

            {/* Chat Now Button - wider size with dynamic icon */}
            <Button
              onClick={() => {
                if (buttonText === "Chat Now") {
                  setIsChatbotOpen(!isChatbotOpen);
                } else if (buttonText === "Request an Appointment") {
                  setOpenModal("appointment");
                } else if (buttonText === "Request a Prescription") {
                  setOpenModal("eprescription");
                } else if (buttonText === "Request Med-cert") {
                  setOpenModal("medcert");
                }
              }}
              size="lg"
              className="rounded-full font-bold bg-[#79c942] hover:bg-[#6bb33a] text-white transition-colors
              h-9 w-[200px] min-w-[200px] max-w-[200px]
              px-3 py-0
              flex items-center justify-center gap-1"
            >
              <span className="whitespace-nowrap text-[10px] md:text-xs truncate">
                {buttonText}
              </span>
              {/* Dynamic icon based on button text */}
              {buttonText === "Chat Now" && (
                <BotMessageSquare className="h-4 w-4 flex-shrink-0" />
              )}
              {buttonText === "Request an Appointment" && (
                <Calendar className="h-4 w-4 flex-shrink-0" />
              )}
              {buttonText === "Request a Prescription" && (
                <Pill className="h-4 w-4 flex-shrink-0" />
              )}
              {buttonText === "Request Med-cert" && (
                <FileText className="h-4 w-4 flex-shrink-0" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Arrow Up Button - bottom right, only visible near footer */}
      {showArrow && (
        <button
          onClick={() => scrollToSection("home")}
          className="fixed bottom-6 right-6 z-50 bg-[#79c942] text-white p-3 rounded-full shadow-lg hover:bg-[#6bb33a] transition-colors"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
      )}

      {/* Chatbot Greeting & Trigger - Improved visibility and accessibility */}
      <div
        className={`fixed ${
          showArrow ? "bottom-20" : "bottom-6"
        } right-2 md:right-6 z-50 flex flex-col-reverse md:flex-row items-center md:items-end gap-2 md:gap-3`}
      >
        {/* Animated Luna icon */}
        <button
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          className="transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#79c942]/50 rounded-full md:order-2"
          aria-label="Open chat with Luna"
        >
          <img
            src="/gif.webp"
            alt="Luna virtual assistant - Click to chat"
            className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain"
          />
        </button>

        {/* Greeting with typing effect */}
        <div
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          className="bg-white px-3 py-2 md:px-4 md:py-3 lg:px-5 lg:py-4 rounded-lg md:rounded-xl shadow-lg md:shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-[#79c942]/20 md:order-1 max-w-[240px] md:max-w-xs focus:outline-none focus:ring-4 focus:ring-[#79c942]/50"
          role="button"
          tabIndex={0}
          aria-label="Click to chat with Luna, our virtual assistant"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsChatbotOpen(!isChatbotOpen);
            }
          }}
        >
          <div className="flex items-start gap-2">
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-[#79c942] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs md:text-sm lg:text-base font-semibold text-gray-900 mb-0.5">
                Hi! I'm Luna 👋
              </p>
              <p className="text-[10px] md:text-xs lg:text-sm text-gray-700">
                <span className="typing-effect">
                  Click here to chat with me!
                </span>
                <span className="cursor-blink">|</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>
        {`
          @keyframes blink-cursor {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          
          .cursor-blink {
            animation: blink-cursor 1s infinite;
            margin-left: 2px;
            font-weight: 400;
            color: #79c942;
          }
          
          .typing-effect {
            display: inline-block;
          }
        `}
      </style>

      {/* Chatbot Modal */}
      {isChatbotOpen && (
        <div className="fixed bottom-20 md:bottom-32 right-2 md:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-96 max-w-[calc(100vw-1rem)] md:max-w-96">
          <AppointmentChatbot onClose={() => setIsChatbotOpen(false)} />
        </div>
      )}

      {/* Hero Section */}
      <section id="home" className="py-8 sm:py-10 md:py-16 lg:py-20">
        <div className="container mx-auto flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-12 px-4">
          <div className="flex-1 space-y-4 sm:space-y-6 w-full">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#79c942] leading-tight">
              {clinic.hero_title || "Your Health Is Our Priority"}
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              {clinic.hero_subtitle ||
                `${
                  clinic.clinic_name || "Welcome"
                } - Your Trusted Healthcare Partner`}
            </p>
            {/* Remove the flex container with two buttons and only leave the content div empty */}
          </div>
          <div className="flex-1 w-full">
            {clinic.healthcare_professionals_image ? (
              <img
                src={getLogoUrl(clinic.healthcare_professionals_image)}
                alt="Healthcare Professionals"
                className="w-full h-auto rounded-lg shadow-lg object-cover max-h-[320px] md:max-h-[400px]"
              />
            ) : (
              <img
                src="https://images.unsplash.com/photo-1631815588090-602d3d4d020c?q=80&w=1887&auto=format&fit=crop"
                alt="Healthcare professionals"
                className="w-full h-auto rounded-lg shadow-lg object-cover max-h-[320px] md:max-h-[400px]"
              />
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-8 sm:py-10 md:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-[#79c942]">
            {clinic.about_title ||
              `About ${clinic.clinic_name || "Our Clinic"}`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              {clinic.clinic_building_image ? (
                <img
                  src={getLogoUrl(clinic.clinic_building_image)}
                  alt="Clinic building"
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1579684288361-5c1a2b4d1528?q=80&w=1974&auto=format&fit=crop"
                  alt="Clinic building"
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              )}
            </div>
            <div className="space-y-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-[#79c942]">
                Our Story
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                {clinic.about_text ||
                  "Founded in 2010, HealthNexus has grown to become one of the leading healthcare providers in the region. Our mission is to deliver accessible, high-quality healthcare services in a compassionate environment."}
              </p>
              <h3 className="text-xl sm:text-2xl font-semibold text-[#79c942]">
                Our Values
              </h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                <li className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "#79c942" }}
                  ></div>
                  <span>Patient-centered care</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "#79c942" }}
                  ></div>
                  <span>Excellence in medical practice</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "#79c942" }}
                  ></div>
                  <span>Integrity and transparency</span>
                </li>
                <li className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "#79c942" }}
                  ></div>
                  <span>Continuous improvement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        className="py-8 sm:py-10 md:py-16 lg:py-20 relative"
      >
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-[#79c942]">
            Our Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl mx-auto">
            {/* Appointment Card */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle className="text-base md:text-lg text-[#79c942] flex items-center gap-2">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                  Schedule Appointment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 md:mb-4 text-xs md:text-sm text-gray-600">
                  Book a clinic appointment.
                </p>
                <Button
                  className="w-full bg-[#79c942] hover:bg-[#68ab38] text-white font-bold transition-colors"
                  onClick={() => setOpenModal("appointment")}
                >
                  Book an Appointment
                </Button>
              </CardContent>
            </Card>

            {/* MedCert Card */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle className="text-base md:text-lg text-[#79c942] flex items-center gap-2">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                  Request MedCert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 md:mb-4 text-xs md:text-sm text-gray-600">
                  Request an official medical certificate.
                </p>
                <Button
                  className="w-full bg-[#79c942] hover:bg-[#68ab38] text-white font-bold transition-colors"
                  onClick={() => setOpenModal("medcert")}
                >
                  Request MedCert
                </Button>
              </CardContent>
            </Card>

            {/* E-Prescription Card */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle className="text-base md:text-lg text-[#79c942] flex items-center gap-2">
                  <Pill className="h-4 w-4 md:h-5 md:w-5" />
                  Request Refill Prescription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 md:mb-4 text-xs md:text-sm text-gray-600">
                  Request an electronic prescription.
                </p>
                <Button
                  className="w-full bg-[#79c942] hover:bg-[#68ab38] text-white font-bold transition-colors"
                  onClick={() => setOpenModal("eprescription")}
                >
                  Request Refill Prescription
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section
        id="reviews"
        className="py-8 sm:py-10 md:py-16 lg:py-20 relative"
      >
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-[#79c942]">
            Patient Reviews
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Patient Reviews - Left Side (3 columns) */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {clinic.reviews && clinic.reviews.length > 0 ? (
                  clinic.reviews
                    .slice(0, showAllReviews ? clinic.reviews.length : 6)
                    .map((review, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {review.anonymous ? "A" : review.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm text-gray-900 truncate">
                                {review.anonymous ? "Anonymous" : review.name}
                              </h4>
                              <div className="flex text-yellow-400 ml-2">
                                {Array(review.rating)
                                  .fill(0)
                                  .map((_, i) => (
                                    <svg
                                      key={i}
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-3 mb-2">
                              {review.comment}
                            </p>
                            <p className="text-xs text-gray-400">
                              {review.date}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">
                      No reviews yet. Be the first to leave a review!
                    </p>
                  </div>
                )}
              </div>

              {/* Show More/Less Button */}
              {clinic.reviews && clinic.reviews.length > 6 && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="border-[#79c942] text-[#79c942] hover:bg-[#79c942] hover:text-white"
                  >
                    {showAllReviews
                      ? "Show Less"
                      : `Show All ${clinic.reviews.length} Reviews`}
                  </Button>
                </div>
              )}
            </div>

            {/* Leave a Review Form - Right Side (1 column) */}
            <div className="lg:col-span-1">
              <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 lg:sticky lg:top-20">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  Leave a Review
                </h3>

                <div className="flex items-center mb-3 gap-2">
                  <Checkbox
                    id="stay-anonymous"
                    checked={stayAnonymous}
                    onCheckedChange={(checked) =>
                      setStayAnonymous(checked === true)
                    }
                    className="data-[state=checked]:bg-[#79c942] border-[#79c942] focus:ring-[#79c942]"
                  />
                  <label
                    htmlFor="stay-anonymous"
                    className="text-xs font-medium text-gray-700 select-none cursor-pointer"
                  >
                    Stay anonymous
                  </label>
                </div>

                <form className="space-y-3" onSubmit={handleReviewSubmit}>
                  {!stayAnonymous && (
                    <>
                      <div>
                        <Input
                          placeholder="Your Name"
                          className="bg-white text-gray-900 text-sm h-8"
                          value={reviewForm.name}
                          onChange={(e) =>
                            setReviewForm({
                              ...reviewForm,
                              name: e.target.value,
                            })
                          }
                          required={!stayAnonymous}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Your Email"
                          type="email"
                          className="bg-white text-gray-900 text-sm h-8"
                          value={reviewForm.email}
                          onChange={(e) =>
                            setReviewForm({
                              ...reviewForm,
                              email: e.target.value,
                            })
                          }
                          required={!stayAnonymous}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">
                      Rating
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          style={{
                            cursor: "pointer",
                            color:
                              reviewForm.rating >= star ? "#FFD700" : "#E5E7EB",
                            fontSize: 20,
                          }}
                          onClick={() =>
                            setReviewForm({ ...reviewForm, rating: star })
                          }
                          role="button"
                          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <textarea
                      placeholder="Your Review"
                      className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#79c942] focus:border-[#79c942] min-h-[80px] text-xs text-gray-900 resize-none"
                      value={reviewForm.comment}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          comment: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    {reviewCooldown && cooldownTimeLeft > 0 && (
                      <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                        ⏱️ Please wait {Math.floor(cooldownTimeLeft / 60)}:
                        {String(cooldownTimeLeft % 60).padStart(2, "0")} before
                        submitting another review
                      </div>
                    )}
                    <Button
                      className="w-full bg-[#79c942] hover:bg-[#6bb33a] text-white text-sm h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      type="submit"
                      disabled={submitting || reviewCooldown}
                    >
                      {submitting
                        ? "Submitting..."
                        : reviewCooldown
                          ? `Wait ${Math.floor(cooldownTimeLeft / 60)}:${String(
                              cooldownTimeLeft % 60,
                            ).padStart(2, "0")}`
                          : "Submit Review"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="py-8 sm:py-10 md:py-16 lg:py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-[#79c942]">
            Frequently Asked Questions
          </h2>
          {clinic.faqs && clinic.faqs.length > 0 ? (
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* First Accordion Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">FAQs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clinic.faqs
                      .slice(0, Math.ceil(clinic.faqs.length / 2))
                      .map((faq, index) => (
                        <div key={index} className="border-b last:border-b-0">
                          <details className="group">
                            <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline list-none flex items-start">
                              <span className="mr-2">•</span>
                              <span>{faq.question}</span>
                            </summary>
                            <div className="pl-4 pb-3 text-gray-600">
                              {faq.answer}
                            </div>
                          </details>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              {/* Second Accordion Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">More FAQs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clinic.faqs
                      .slice(Math.ceil(clinic.faqs.length / 2))
                      .map((faq, index) => (
                        <div key={index} className="border-b last:border-b-0">
                          <details className="group">
                            <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline list-none flex items-start">
                              <span className="mr-2">•</span>
                              <span>{faq.question}</span>
                            </summary>
                            <div className="pl-4 pb-3 text-gray-600">
                              {faq.answer}
                            </div>
                          </details>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto text-center">
              <Card>
                <CardContent className="py-8">
                  <p className="text-gray-600">
                    No FAQs available at the moment. Please check back later or
                    contact us directly for any questions.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="py-8 sm:py-10 md:py-16 lg:py-20 relative bg-white/70"
      >
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-[#79c942]">
            Contact Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-start">
            {/* Our Location */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col items-center">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#79c942] flex items-center gap-2">
                <svg
                  className="inline-block text-[#79c942]"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Our Location
              </h3>
              <div className="mb-4 text-center">
                <p className="font-medium">{clinic.address}</p>
                <p>
                  {clinic.city}
                  {clinic.state ? `, ${clinic.state}` : ""} {clinic.zip}
                </p>
              </div>
              <div className="w-full h-48 rounded overflow-hidden border mb-2">
                <iframe
                  src={
                    clinic.google_maps_embed_url ||
                    "https://www.google.com/maps/embed?pb=!4v1751955711488!6m8!1m7!1sIi6uy9JxNnmbSDI1hq2OpQ!2m2!1d14.32452455175477!2d121.0129429156632!3f200.80705806525316!4f-2.215198390680669!5f2.5769253873367934"
                  }
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Clinic Location"
                />
              </div>
              <div className="text-center text-sm text-gray-700 font-medium">
                Blk. 2 Lot 2, St. Joseph 9 Village, Brgy. Langgam, San Pedro
                City, Laguna
              </div>
            </div>
            {/* Combined Contact Information & Operation Hours */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#79c942] flex items-center gap-2">
                  <svg
                    className="inline-block text-[#79c942]"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 16.92V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.08" />
                    <path d="M16 2v4" />
                    <path d="M8 2v4" />
                    <path d="M3 10h18" />
                    <path d="M17 14h.01" />
                    <path d="M7 14h.01" />
                  </svg>
                  Contact Information
                </h3>
                <div>
                  <span className="font-semibold">Phone:</span>{" "}
                  <a
                    href={`tel:${clinic.phone}`}
                    className="text-[#79c942] hover:underline"
                  >
                    {clinic.phone}
                  </a>
                </div>
                <div>
                  <span className="font-semibold">Email:</span>{" "}
                  <a
                    href={`mailto:${clinic.email}`}
                    className="text-[#79c942] hover:underline"
                  >
                    {clinic.email}
                  </a>
                </div>
                {clinic.website && (
                  <div>
                    <span className="font-semibold">Website:</span>{" "}
                    <a
                      href={clinic.website}
                      className="text-[#79c942] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {clinic.website}
                    </a>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#79c942] flex items-center gap-2">
                  <svg
                    className="inline-block text-[#79c942]"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Operation Hours
                </h3>
                <div>
                  <span className="font-semibold">Monday - Friday:</span> 8:00
                  AM - 6:00 PM
                </div>
                <div>
                  <span className="font-semibold">Saturday:</span> 9:00 AM -
                  2:00 PM
                </div>
                <div>
                  <span className="font-semibold">Sunday:</span>{" "}
                  <span className="text-red-500">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gray-900 text-white text-sm">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <p className="text-gray-300 leading-relaxed">
              Medratrics Langgam. Providing quality healthcare services since
              2010. Dedicated to improving the health and wellbeing of our
              community.
            </p>
          </div>
          <div className="border-t border-gray-800 pt-4 text-center text-gray-400 text-xs">
            <p>&copy; 2024 Medratrics Langgam. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Add this style block in your component's JSX return, after existing style blocks */}
      <style>
        {`
        /* Line clamp for review text */
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Fixed width for chat button */
        .chat-button {
          width: 180px;
          min-width: 180px;
          max-width: 180px;
          justify-content: center;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        /* Responsive styles for mobile */
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none;
          }
          .show-on-mobile {
            display: block;
          }
          .mobile-container {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .mobile-menu {
            position: fixed;
            top: 0;
            left: 0;
            width: 75%; /* Responsive width for mobile menu */
            max-width: 320px;
            height: 100%;
            background-color: white;
            z-index: 100;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1);
            animation: slide-in 0.3s ease-out;
          }
          
          /* Add animation for sliding in from left */
          @keyframes slide-in {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          
          /* Add a semi-transparent overlay for the rest of the screen */
          .mobile-menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.3);
            z-index: 99;
          }
          
          /* Mobile Header Buttons */
          .flex-1.flex.justify-end {
            gap: 0.5rem;
          }
          
          /* Mobile Buttons - with multi-line text */
          .rounded-full.font-bold.bg-\\[\\#79c942\\] {
            height: auto !important;
            width: 80px !important;
            min-width: 80px !important;
            max-width: 80px !important;
            padding: 0.5rem !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            white-space: normal !important;
          }
          
          /* Adjust text wrapping for mobile buttons */
          .rounded-full.font-bold.bg-\\[\\#79c942\\] .whitespace-nowrap {
            white-space: normal !important;
            text-align: center !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
            hyphens: auto !important;
          }
          
          /* Hide icons on mobile */
          .rounded-full.font-bold.bg-\\[\\#79c942\\] .flex-shrink-0 {
            display: none !important;
          }
          
          /* Adjust the gap between buttons */
          .flex-1.flex.justify-end {
            gap: 0.25rem !important;
          }
          
          /* Adjust sections padding for mobile */
          section {
            padding-top: 2rem !important;
            padding-bottom: 2rem !important;
          }
          
          /* Review cards responsive */
          .service-card {
            margin-bottom: 1rem;
          }
          
          /* Chatbot greeting responsive */
          .chatbot-greeting {
            max-width: 250px !important;
          }
        }
        
        /* Tablet breakpoint */
        @media (min-width: 640px) and (max-width: 1024px) {
          .container {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
        }
        
        /* Smooth scrolling and scroll padding for fixed header */
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 80px;
        }
        
        /* Ensure all sections have proper spacing for header */
        section[id] {
          scroll-margin-top: 80px;
        }
        
        /* Improve scroll behavior for webkit browsers */
        @media screen and (-webkit-min-device-pixel-ratio: 0) {
          html {
            scroll-behavior: smooth;
            scroll-snap-type: y proximity;
          }
        }
      `}
      </style>

      {/* Mobile Menu - Show when mobileMenuOpen is true */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="mobile-menu">
            <div className="flex justify-between items-center mb-6">
              {/* Clinic Logo */}
              <div className="flex items-center">
                {clinic.logo ? (
                  <img
                    src={getLogoUrl(clinic.logo)}
                    alt="Clinic Logo"
                    className="h-8 w-auto object-contain"
                    style={{ maxWidth: 120 }}
                  />
                ) : (
                  <div className="text-xl font-bold text-[#79c942]">
                    {clinic.clinic_name || "Clinic"}
                  </div>
                )}
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <nav className="space-y-3">
              {[
                { label: "Home", href: "#home" },
                { label: "About", href: "#about" },
                { label: "Services", href: "#services" },
                { label: "Reviews", href: "#reviews" },
                { label: "FAQs", href: "#faqs" },
                { label: "Contact Us", href: "#contact" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block py-3 px-4 text-lg font-medium text-[#79c942] rounded-xl hover:bg-green-50 hover:shadow-sm transition-all duration-200"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.href.substring(1)); // Remove # from href
                    setMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* =================== Appointment Modal =================== */}
      <Dialog
        open={openModal === "appointment"}
        onOpenChange={handleAppointmentModalClose}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-[#79c942] text-center text-lg md:text-2xl font-bold">
              Step {currentStep} of 7
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-4 gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium ${
                    step <= currentStep
                      ? "bg-[#79c942] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    step
                  )}
                </div>
                <span className="text-[9px] md:text-xs mt-1 text-center leading-tight hidden sm:block">
                  {step === 1 && "Booking"}
                  {step === 2 &&
                    (bookingPreference === "doctor" ? "Doctor" : "Date")}
                  {step === 3 &&
                    (bookingPreference === "doctor" ? "Date/Time" : "Doctor")}
                  {step === 4 && "Patient"}
                  {step === 5 && "Info"}
                  {step === 6 && "Service"}
                  {step === 7 && "Summary"}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Step 1: Booking Preference Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  How would you like to book your appointment?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={
                      bookingPreference === "doctor" ? "default" : "outline"
                    }
                    className={`p-6 h-auto ${
                      bookingPreference === "doctor"
                        ? "bg-[#79c942] hover:bg-[#68ab38]"
                        : ""
                    }`}
                    onClick={() => {
                      setBookingPreference("doctor");
                      // Reset selections when switching to doctor-first
                      setSelectedDate(undefined);
                      setSelectedDoctor(null);
                      setSelectedTimeSlot("");
                    }}
                  >
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">Choose Doctor First</div>
                      <div className="text-sm opacity-75">
                        Select your preferred doctor, then pick date & time
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant={
                      bookingPreference === "datetime" ? "default" : "outline"
                    }
                    className={`p-6 h-auto ${
                      bookingPreference === "datetime"
                        ? "bg-[#79c942] hover:bg-[#68ab38]"
                        : ""
                    }`}
                    onClick={() => {
                      setBookingPreference("datetime");
                      // Reset date selection when switching to date-first
                      setSelectedDate(undefined);
                      setSelectedDoctor(null);
                      setSelectedTimeSlot("");
                      // Fetch all available dates when date-first is selected
                      fetchAllAvailableDates();
                    }}
                  >
                    <div className="text-center">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">Choose Date First</div>
                      <div className="text-sm opacity-75">
                        Pick your preferred date, then select available doctor
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Dynamic step based on booking preference - Doctor or Date/Time */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {bookingPreference === "doctor" ? (
                  // Doctor Selection for doctor-first flow
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Select a Doctor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {doctors.map((doctor: any) => (
                        <Button
                          key={doctor.id}
                          variant={
                            selectedDoctor?.id === doctor.id
                              ? "default"
                              : "outline"
                          }
                          className={`p-4 h-auto text-left justify-start ${
                            selectedDoctor?.id === doctor.id
                              ? "bg-[#79c942] hover:bg-[#68ab38]"
                              : ""
                          }`}
                          onClick={() => setSelectedDoctor(doctor)}
                        >
                          <div className="flex items-center space-x-3">
                            <Stethoscope className="w-8 h-8" />
                            <div>
                              <div className="font-semibold">
                                {doctor.first_name} {doctor.last_name}
                              </div>
                              <div className="text-sm opacity-75">
                                {doctor.specialization}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  // Date Selection for date-first flow (no time selection yet)
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Select Date
                    </h3>
                    {isLoadingDates ? (
                      <div className="text-center text-gray-500 py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#79c942]"></div>
                          <span>Loading available dates...</span>
                        </div>
                      </div>
                    ) : availableDates.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-lg font-medium mb-2">
                          No available dates
                        </div>
                        <div className="text-sm">
                          No doctors have available appointments scheduled.
                          Please contact the clinic or try again later.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {availableDates.slice(0, 30).map((date) => {
                            const isSelected =
                              selectedDate &&
                              date.getFullYear() ===
                                selectedDate.getFullYear() &&
                              date.getMonth() === selectedDate.getMonth() &&
                              date.getDate() === selectedDate.getDate();

                            return (
                              <Button
                                key={date.toISOString()}
                                variant={isSelected ? "default" : "outline"}
                                className={`p-3 h-auto text-center ${
                                  isSelected
                                    ? "bg-[#79c942] hover:bg-[#68ab38]"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectedDate(date);
                                  setSelectedDoctor(null); // Reset doctor when date changes
                                  setSelectedTimeSlot(""); // Reset time slot when date changes
                                  toast({
                                    title: "Date Selected",
                                    description: `Date selected: ${format(
                                      date,
                                      "MMM dd, yyyy",
                                    )}`,
                                  });
                                }}
                              >
                                <div>
                                  <div className="font-semibold text-sm">
                                    {format(date, "MMM dd")}
                                  </div>
                                  <div className="text-xs opacity-75">
                                    {format(date, "EEE")}
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 3: Dynamic step based on booking preference - Date/Time or Doctor */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {bookingPreference === "doctor" ? (
                  // Date and Time Selection for doctor-first flow
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Select Date and Time
                    </h3>

                    {selectedDoctor ? (
                      isLoadingDates ? (
                        <div className="text-center text-gray-500 py-8">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#79c942]"></div>
                            <span>Loading doctor's available dates...</span>
                          </div>
                        </div>
                      ) : availableDates.length === 0 && selectedDoctor ? (
                        <div className="text-center text-gray-500 py-8">
                          <div className="text-lg font-medium mb-2">
                            No available dates
                          </div>
                          <div className="text-sm">
                            Dr. {selectedDoctor.first_name}{" "}
                            {selectedDoctor.last_name} has no available
                            appointments scheduled. Please select a different
                            doctor or contact the clinic.
                          </div>
                        </div>
                      ) : (
                        <DateTimePicker
                          availableDates={availableDates}
                          selectedDate={selectedDate}
                          selectedTime={selectedTimeSlot}
                          getTimeSlotsForDate={getTimeSlotsForDate}
                          onDateTimeSelect={(date: Date, time: string) => {
                            console.log("DateTimePicker selected:", {
                              date,
                              time,
                            });
                            setSelectedDate(date);
                            setSelectedTimeSlot(time);
                            toast({
                              title: "Appointment Scheduled",
                              description: `Appointment scheduled for ${format(
                                date,
                                "MMM dd, yyyy",
                              )} at ${time}`,
                            });
                          }}
                        />
                      )
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        Please select a doctor first
                      </div>
                    )}
                  </>
                ) : (
                  // Doctor Selection for date-first flow (doctors available on selected date)
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Select a Doctor
                    </h3>
                    <div className="text-center text-sm text-gray-600 mb-4">
                      Selected date:{" "}
                      {selectedDate
                        ? format(selectedDate, "MMMM do, yyyy")
                        : "No date"}
                    </div>
                    {selectedDate ? (
                      <>
                        {filteredDoctors.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredDoctors.map((doctor: any) => (
                              <Button
                                key={doctor.id}
                                variant={
                                  selectedDoctor?.id === doctor.id
                                    ? "default"
                                    : "outline"
                                }
                                className={`p-4 h-auto text-left justify-start ${
                                  selectedDoctor?.id === doctor.id
                                    ? "bg-[#79c942] hover:bg-[#68ab38]"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectedDoctor(doctor);
                                  setSelectedTimeSlot(""); // Reset time slot when doctor changes
                                  toast({
                                    title: "Doctor Selected",
                                    description: `Doctor selected: Dr. ${doctor.first_name} ${doctor.last_name}`,
                                  });
                                }}
                              >
                                <div className="flex items-center space-x-3">
                                  <Stethoscope className="w-8 h-8" />
                                  <div>
                                    <div className="font-semibold">
                                      Dr. {doctor.first_name} {doctor.last_name}
                                    </div>
                                    <div className="text-sm opacity-75">
                                      {doctor.specialization}
                                    </div>
                                    <div className="text-xs text-green-600 mt-1">
                                      Available on selected date
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <div className="text-lg font-medium mb-2">
                              No doctors available
                            </div>
                            <div className="text-sm">
                              No doctors have set their schedule for{" "}
                              {format(selectedDate, "MMMM do, yyyy")}. Please
                              select a different date.
                            </div>
                          </div>
                        )}

                        {/* Time Slot Selection for date-first flow */}
                        {selectedDoctor && (
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-semibold text-gray-900 mb-4">
                              Select Time Slot
                            </h4>
                            {isLoadingTimeSlots ? (
                              <div className="text-center text-gray-500 py-4">
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#79c942]"></div>
                                  <span>Loading available time slots...</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {availableTimeSlots.map((timeSlot) => (
                                    <Button
                                      key={timeSlot}
                                      variant={
                                        selectedTimeSlot === timeSlot
                                          ? "default"
                                          : "outline"
                                      }
                                      className={`p-2 text-sm ${
                                        selectedTimeSlot === timeSlot
                                          ? "bg-[#79c942] hover:bg-[#68ab38]"
                                          : ""
                                      }`}
                                      onClick={() => {
                                        setSelectedTimeSlot(timeSlot);
                                        toast({
                                          title: "Time Selected",
                                          description: `Time slot selected: ${timeSlot}`,
                                        });
                                      }}
                                    >
                                      {timeSlot}
                                    </Button>
                                  ))}
                                </div>
                                {availableTimeSlots.length === 0 && (
                                  <div className="text-center text-gray-500 py-4">
                                    No available time slots for this doctor on
                                    the selected date.
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        Please select a date first
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 4: Patient Type Selection */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Are you an existing patient?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={isExistingPatient === true ? "default" : "outline"}
                    className={`p-6 h-auto ${
                      isExistingPatient === true
                        ? "bg-[#79c942] hover:bg-[#68ab38]"
                        : ""
                    }`}
                    onClick={() => setIsExistingPatient(true)}
                  >
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">
                        Yes, I'm an existing patient
                      </div>
                      <div className="text-sm opacity-75">
                        I have visited this clinic before
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant={
                      isExistingPatient === false ? "default" : "outline"
                    }
                    className={`p-6 h-auto ${
                      isExistingPatient === false
                        ? "bg-[#79c942] hover:bg-[#68ab38]"
                        : ""
                    }`}
                    onClick={() => {
                      setIsExistingPatient(false);
                      setTermsAccepted(false); // Reset terms when switching to new patient
                    }}
                  >
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">No, I'm a new patient</div>
                      <div className="text-sm opacity-75">
                        This is my first visit
                      </div>
                    </div>
                  </Button>
                </div>

                {/* Terms and Conditions for New Patients */}
                {isExistingPatient === false && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">
                        Terms and Conditions
                      </h4>
                      <div className="text-sm text-gray-700 space-y-2">
                        <p>
                          Before proceeding with your appointment request,
                          please read and accept our{" "}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open("/terms-and-conditions", "_blank");
                            }}
                            className="text-[#79c942] hover:text-[#6bb33a] underline font-medium"
                          >
                            Terms and Conditions
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open("/privacy-policy", "_blank");
                            }}
                            className="text-[#79c942] hover:text-[#6bb33a] underline font-medium"
                          >
                            Privacy Policy
                          </a>
                          :
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>
                            Your personal information will be collected and
                            processed for appointment scheduling and medical
                            record purposes
                          </li>
                          <li>
                            We comply with the Data Privacy Act of 2012 (RA
                            10173)
                          </li>
                          <li>
                            Your information will be kept confidential and
                            secure
                          </li>
                          <li>
                            You have the right to access, correct, or delete
                            your personal information
                          </li>
                        </ul>
                      </div>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="terms-checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 h-4 w-4 text-[#79c942] focus:ring-[#79c942] border-gray-300 rounded"
                        />
                        <label
                          htmlFor="terms-checkbox"
                          className="text-sm text-gray-700"
                        >
                          By checking this box, I confirm that I consent to the
                          collection and processing of my personal information
                          for appointment scheduling and medical record
                          purposes, in compliance with the Data Privacy Act of
                          2012 (RA 10173).
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Patient Information */}
            {currentStep === 5 && (
              <div className="space-y-4">
                {isExistingPatient ? (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Enter your Patient ID
                    </h3>
                    <div className="space-y-4">
                      {!showForgotPatientId && (
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Patient ID *
                          </label>
                          <Input
                            placeholder="Enter your Patient ID"
                            value={searchQuery}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, "");
                              setSearchQuery(value);
                            }}
                            className="w-full"
                            disabled={lookupResult !== null}
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            You can find your Patient ID on your previous
                            appointment receipts, medical certificates, or
                            contact the clinic
                          </div>
                          {lookupResult && (
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Patient ID found and verified!
                            </div>
                          )}
                          <div className="text-center mt-2">
                            <button
                              type="button"
                              onClick={() => setShowForgotPatientId(true)}
                              className="text-[#79c942] hover:text-[#6bb33a] text-sm font-medium underline"
                              disabled={lookupResult !== null}
                            >
                              Forgot Patient ID?
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Forgot Patient ID Form */}
                      {showForgotPatientId && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">
                              Forgot Patient ID? Let's help you find it
                            </h4>
                            <p className="text-sm text-gray-600">
                              Please provide the following information to lookup
                              your Patient ID:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  First Name *
                                </label>
                                <Input
                                  placeholder="Enter your first name"
                                  value={forgotIdForm.firstName}
                                  onChange={(e) =>
                                    setForgotIdForm({
                                      ...forgotIdForm,
                                      firstName: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Middle Initial
                                </label>
                                <Input
                                  placeholder="Optional"
                                  value={forgotIdForm.middleInitial}
                                  onChange={(e) =>
                                    setForgotIdForm({
                                      ...forgotIdForm,
                                      middleInitial: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Last Name *
                                </label>
                                <Input
                                  placeholder="Enter your last name"
                                  value={forgotIdForm.lastName}
                                  onChange={(e) =>
                                    setForgotIdForm({
                                      ...forgotIdForm,
                                      lastName: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Suffix
                                </label>
                                <Input
                                  placeholder="Jr, Sr, III, etc."
                                  value={forgotIdForm.suffix}
                                  onChange={(e) =>
                                    setForgotIdForm({
                                      ...forgotIdForm,
                                      suffix: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Date of Birth *
                                </label>
                                <Input
                                  type="date"
                                  value={forgotIdForm.dateOfBirth}
                                  onChange={(e) =>
                                    setForgotIdForm({
                                      ...forgotIdForm,
                                      dateOfBirth: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Registered Email
                                </label>
                                <Input
                                  type="email"
                                  placeholder="Optional"
                                  value={forgotIdForm.email}
                                  onChange={(e) =>
                                    setForgotIdForm({
                                      ...forgotIdForm,
                                      email: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">
                                  Registered Phone Number *
                                </label>
                                <Input
                                  placeholder="Enter your registered phone number"
                                  value={forgotIdForm.phone}
                                  maxLength={11}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setForgotIdForm({
                                      ...forgotIdForm,
                                      phone: value,
                                    });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowForgotPatientId(false);
                                  setForgotIdForm({
                                    firstName: "",
                                    middleInitial: "",
                                    lastName: "",
                                    suffix: "",
                                    dateOfBirth: "",
                                    email: "",
                                    phone: "",
                                  });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={submitForgotPatientId}
                                disabled={forgotIdSubmitting}
                                className="bg-[#79c942] hover:bg-[#6bb33a]"
                              >
                                {forgotIdSubmitting
                                  ? "Looking up..."
                                  : "Find Patient ID"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Enter your information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          First Name *
                        </label>
                        <Input {...patientForm.register("firstName")} />
                        {patientForm.formState.errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Middle Name *
                        </label>
                        <div className="space-y-2">
                          <Input
                            {...patientForm.register("middleName")}
                            placeholder={
                              noMiddleName
                                ? "No Middle Name"
                                : "Enter middle name"
                            }
                            disabled={noMiddleName}
                            className={noMiddleName ? "bg-gray-100" : ""}
                          />
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="no-middle-name"
                              checked={noMiddleName}
                              onChange={(e) => {
                                setNoMiddleName(e.target.checked);
                                if (e.target.checked) {
                                  patientForm.setValue("middleName", "N/A");
                                } else {
                                  patientForm.setValue("middleName", "");
                                }
                              }}
                              className="h-4 w-4 text-[#79c942] focus:ring-[#79c942] border-gray-300 rounded"
                            />
                            <label
                              htmlFor="no-middle-name"
                              className="text-sm text-gray-600"
                            >
                              No middle name
                            </label>
                          </div>
                        </div>
                        {patientForm.formState.errors.middleName && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.middleName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Last Name *
                        </label>
                        <Input {...patientForm.register("lastName")} />
                        {patientForm.formState.errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Suffix
                        </label>
                        <Input
                          {...patientForm.register("suffix")}
                          placeholder="Jr, Sr, III, etc."
                        />
                        {patientForm.formState.errors.suffix && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.suffix.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Date of Birth *
                        </label>
                        <Input
                          type="date"
                          {...patientForm.register("dateOfBirth")}
                        />
                        {patientForm.formState.errors.dateOfBirth && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.dateOfBirth.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Sex *
                        </label>
                        <Select
                          value={patientForm.watch("sex")}
                          onValueChange={(value) =>
                            patientForm.setValue(
                              "sex",
                              value as "male" | "female" | "prefer_not_to_say",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="prefer_not_to_say">
                              Prefer not to say
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {patientForm.formState.errors.sex && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.sex.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Religion *
                        </label>
                        <Input
                          {...patientForm.register("religion")}
                          placeholder="Enter your religion"
                        />
                        {patientForm.formState.errors.religion && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.religion.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Contact Number *
                        </label>
                        <Input
                          {...patientForm.register("phone")}
                          maxLength={11}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            patientForm.setValue("phone", value);
                          }}
                          placeholder="09123456789"
                        />
                        {patientForm.formState.errors.phone && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.phone.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Marital Status
                        </label>
                        <Select
                          value={patientForm.watch("maritalStatus")}
                          onValueChange={(value) =>
                            patientForm.setValue(
                              "maritalStatus",
                              value as
                                | "single"
                                | "married"
                                | "divorced"
                                | "widowed"
                                | "prefer_not_to_say",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
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
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          {...patientForm.register("email")}
                        />
                        {patientForm.formState.errors.email && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Home Address *
                        </label>
                        <Input {...patientForm.register("address")} />
                        {patientForm.formState.errors.address && (
                          <p className="text-red-500 text-sm mt-1">
                            {patientForm.formState.errors.address.message}
                          </p>
                        )}
                      </div>

                      {/* Notification Preferences */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-3">
                          Notification Preferences
                        </label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="email-notifications"
                              checked={emailNotifications}
                              onChange={(e) =>
                                setEmailNotifications(e.target.checked)
                              }
                              className="h-4 w-4 text-[#79c942] focus:ring-[#79c942] border-gray-300 rounded"
                            />
                            <label
                              htmlFor="email-notifications"
                              className="text-sm text-gray-700"
                            >
                              📧 Send appointment confirmations via Email
                            </label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="sms-notifications"
                              checked={smsNotifications}
                              onChange={(e) =>
                                setSmsNotifications(e.target.checked)
                              }
                              className="h-4 w-4 text-[#79c942] focus:ring-[#79c942] border-gray-300 rounded"
                            />
                            <label
                              htmlFor="sms-notifications"
                              className="text-sm text-gray-700"
                            >
                              💬 Send appointment confirmations via SMS/Text
                              Message
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            You can choose how you'd like to receive appointment
                            confirmations and reminders.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 6: Appointment Type */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Select Appointment Type
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointmentTypes.map((type) => (
                    <Button
                      key={type}
                      variant={
                        selectedAppointmentType === type ? "default" : "outline"
                      }
                      className={`p-4 h-auto ${
                        selectedAppointmentType === type
                          ? "bg-[#79c942] hover:bg-[#68ab38]"
                          : ""
                      }`}
                      onClick={() => setSelectedAppointmentType(type)}
                    >
                      <div className="text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-2" />
                        <div className="font-semibold">{type}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: Summary/Confirmation */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Confirm Your Appointment
                </h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700">Date</h4>
                      <p>
                        {selectedDate
                          ? format(selectedDate, "MM/dd/yyyy")
                          : "Not selected"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Time</h4>
                      <p>{selectedTimeSlot || "Not selected"}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Doctor</h4>
                      <p>
                        Dr. {selectedDoctor?.first_name}{" "}
                        {selectedDoctor?.last_name}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Type</h4>
                      <p>{selectedAppointmentType}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Patient</h4>
                      <p>
                        {isExistingPatient
                          ? `${
                              selectedPatient?.firstName ||
                              selectedPatient?.first_name
                            } ${
                              selectedPatient?.middleInitial ||
                              selectedPatient?.middle_initial ||
                              ""
                            } ${
                              selectedPatient?.lastName ||
                              selectedPatient?.last_name
                            }`.trim()
                          : `${patientForm.getValues("firstName")} ${
                              patientForm.getValues("middleName") === "N/A"
                                ? ""
                                : patientForm.getValues("middleName")
                            } ${patientForm.getValues("lastName")}`.trim()}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Email</h4>
                      <p>
                        {isExistingPatient
                          ? selectedPatient?.email || "Not available"
                          : patientForm.getValues("email")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Phone</h4>
                      <p>
                        {isExistingPatient
                          ? selectedPatient?.phone_number ||
                            selectedPatient?.phone ||
                            "Not available"
                          : patientForm.getValues("phone")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Date of Birth
                      </h4>
                      <p>
                        {isExistingPatient
                          ? selectedPatient?.dateOfBirth ||
                            selectedPatient?.date_of_birth ||
                            "Not available"
                          : patientForm.getValues("dateOfBirth")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Sex</h4>
                      <p>
                        {(() => {
                          const gender = isExistingPatient
                            ? selectedPatient?.gender ||
                              selectedPatient?.sex ||
                              "Not available"
                            : patientForm.getValues("sex");

                          // Format the gender for better display
                          switch (gender) {
                            case "male":
                              return "Male";
                            case "female":
                              return "Female";
                            case "prefer_not_to_say":
                              return "Prefer not to say";
                            default:
                              return gender;
                          }
                        })()}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Address</h4>
                      <p>
                        {isExistingPatient
                          ? selectedPatient?.address || "Not available"
                          : patientForm.getValues("address")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Marital Status
                      </h4>
                      <p>
                        {(() => {
                          const status = isExistingPatient
                            ? selectedPatient?.maritalStatus ||
                              selectedPatient?.marital_status ||
                              "Not available"
                            : patientForm.getValues("maritalStatus") ||
                              "prefer_not_to_say";

                          // Format the status for better display
                          switch (status) {
                            case "prefer_not_to_say":
                              return "Prefer not to say";
                            case "single":
                              return "Single";
                            case "married":
                              return "Married";
                            case "divorced":
                              return "Divorced";
                            case "widowed":
                              return "Widowed";
                            default:
                              return status;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Please Note:</p>
                      <p>
                        Your appointment request will be marked as{" "}
                        <strong>pending</strong> and subject to staff approval.
                        You will receive a confirmation email once your
                        appointment is approved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={
                  currentStep === 1 ? handleAppointmentModalClose : prevStep
                }
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {currentStep === 1 ? "Cancel" : "Previous"}
              </Button>

              {currentStep < 7 ? (
                <Button
                  onClick={handleNextStep}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={
                    isSubmitting ||
                    isLoadingTimeSlots ||
                    (currentStep === 1 && !bookingPreference) ||
                    (currentStep === 4 &&
                      isExistingPatient === false &&
                      !termsAccepted) ||
                    (currentStep === 4 && isExistingPatient === null) ||
                    (currentStep === 5 &&
                      isExistingPatient &&
                      showForgotPatientId &&
                      !forgotIdAttempted)
                  }
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={onSubmitAppointment}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white"
                  disabled={isSubmitting || isLoadingTimeSlots}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =================== MedCert Modal =================== */}
      <Dialog
        open={openModal === "medcert"}
        onOpenChange={() => {
          setOpenModal(null);
          resetMedCertModal();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-[#79c942] text-center text-2xl font-bold">
              Request Medical Certificate - Step {medCertStep} of 3
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= medCertStep
                      ? "bg-[#79c942] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < medCertStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                <span className="text-xs mt-1 text-center">
                  {step === 1 && "Patient Info"}
                  {step === 2 && "Documents"}
                  {step === 3 && "Confirm"}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Step 1: Patient ID Input with Forgot ID Option */}
            {medCertStep === 1 && (
              <div className="space-y-4">
                {!showMedCertForgotPatientId ? (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Enter your Patient ID
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Patient ID *
                        </label>
                        <Input
                          placeholder="Enter your Patient ID"
                          value={medCertSearchQuery}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\s/g, "");
                            setMedCertSearchQuery(value);
                          }}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          You can find your Patient ID on your previous
                          appointment receipts, medical certificates, or contact
                          the clinic
                        </div>
                        <div className="text-center mt-2">
                          <button
                            type="button"
                            onClick={() => setShowMedCertForgotPatientId(true)}
                            className="text-[#79c942] hover:text-[#6bb33a] text-sm font-medium underline"
                          >
                            Forgot Patient ID?
                          </button>
                        </div>
                      </div>

                      {/* Forgot Patient ID Form */}
                      {showMedCertForgotPatientId && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">
                              Forgot Patient ID? Let's help you find it
                            </h4>
                            <p className="text-sm text-gray-600">
                              Please provide the following information to lookup
                              your Patient ID:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  First Name *
                                </label>
                                <Input
                                  placeholder="Enter your first name"
                                  value={medCertForgotIdForm.firstName}
                                  onChange={(e) =>
                                    setMedCertForgotIdForm({
                                      ...medCertForgotIdForm,
                                      firstName: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Middle Initial
                                </label>
                                <Input
                                  placeholder="Optional"
                                  value={medCertForgotIdForm.middleInitial}
                                  onChange={(e) =>
                                    setMedCertForgotIdForm({
                                      ...medCertForgotIdForm,
                                      middleInitial: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Last Name *
                                </label>
                                <Input
                                  placeholder="Enter your last name"
                                  value={medCertForgotIdForm.lastName}
                                  onChange={(e) =>
                                    setMedCertForgotIdForm({
                                      ...medCertForgotIdForm,
                                      lastName: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Suffix
                                </label>
                                <Input
                                  placeholder="Jr, Sr, III, etc."
                                  value={medCertForgotIdForm.suffix}
                                  onChange={(e) =>
                                    setMedCertForgotIdForm({
                                      ...medCertForgotIdForm,
                                      suffix: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Date of Birth *
                                </label>
                                <Input
                                  type="date"
                                  value={medCertForgotIdForm.dateOfBirth}
                                  onChange={(e) =>
                                    setMedCertForgotIdForm({
                                      ...medCertForgotIdForm,
                                      dateOfBirth: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  Registered Email *
                                </label>
                                <Input
                                  type="email"
                                  placeholder="Enter your registered email"
                                  value={medCertForgotIdForm.email}
                                  onChange={(e) =>
                                    setMedCertForgotIdForm({
                                      ...medCertForgotIdForm,
                                      email: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">
                                  Registered Phone Number *
                                </label>
                                <Input
                                  placeholder="Enter your registered phone number"
                                  value={medCertForgotIdForm.phone}
                                  maxLength={11}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setMedCertForgotIdForm({
                                      ...medCertForgotIdForm,
                                      phone: value,
                                    });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowMedCertForgotPatientId(false);
                                  setMedCertForgotIdForm({
                                    firstName: "",
                                    middleInitial: "",
                                    lastName: "",
                                    suffix: "",
                                    dateOfBirth: "",
                                    email: "",
                                    phone: "",
                                  });
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={submitMedCertForgotPatientId}
                                disabled={medCertForgotIdSubmitting}
                                className="bg-[#79c942] hover:bg-[#6bb33a]"
                              >
                                {medCertForgotIdSubmitting
                                  ? "Looking up..."
                                  : "Find Patient ID"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delivery Method Selection */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          How would you like to receive your medical
                          certificate? *
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="pickup"
                              value="pickup"
                              checked={medCertDeliveryMethod === "pickup"}
                              onChange={(e) =>
                                setMedCertDeliveryMethod(e.target.value)
                              }
                              className="w-4 h-4 text-[#79c942] border-gray-300 focus:ring-[#79c942]"
                            />
                            <label
                              htmlFor="pickup"
                              className="text-sm text-gray-700"
                            >
                              Pick up at clinic
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="email"
                              value="email"
                              checked={medCertDeliveryMethod === "email"}
                              onChange={(e) =>
                                setMedCertDeliveryMethod(e.target.value)
                              }
                              className="w-4 h-4 text-[#79c942] border-gray-300 focus:ring-[#79c942]"
                            />
                            <label
                              htmlFor="email"
                              className="text-sm text-gray-700"
                            >
                              Receive an e-medical certificate
                            </label>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {medCertDeliveryMethod === "pickup"
                            ? "You will be notified when your medical certificate is ready for pickup"
                            : "An e-medical certificate will be sent to your registered email address"}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Enter your information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Enter your information to create new patient
                        </label>
                        <div className="text-sm text-gray-600">
                          Since you don't have a Patient ID, please provide your
                          details
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Document Upload (Previously Step 3) */}
            {medCertStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Upload Identification Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ID Front Side *
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setMedCertIdFront(file);
                          setMedCertIdFrontPreview(URL.createObjectURL(file));
                        }
                      }}
                      required
                    />
                    <div className="flex items-center gap-1 text-xs text-[#79c942] mt-1">
                      <Info className="h-3 w-3" />
                      <span>
                        Driver's License, Passport, National ID, Postal ID
                      </span>
                    </div>
                    {medCertIdFrontPreview && (
                      <img
                        src={medCertIdFrontPreview}
                        alt="ID Front"
                        className="w-32 h-20 mt-2 rounded object-cover border"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ID Back Side
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setMedCertIdBack(file);
                          setMedCertIdBackPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Optional for most IDs
                    </div>
                    {medCertIdBackPreview && (
                      <img
                        src={medCertIdBackPreview}
                        alt="ID Back"
                        className="w-32 h-20 mt-2 rounded object-cover border"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Additional Notes
                  </label>
                  <Textarea
                    value={medCertNotes}
                    onChange={(e) => setMedCertNotes(e.target.value)}
                    placeholder="Any additional information or special requests..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Confirmation (Previously Step 4) */}
            {medCertStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Confirm Your Request
                </h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Request Type
                      </h4>
                      <p>Medical Certificate</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Delivery Method
                      </h4>
                      <p>
                        {medCertDeliveryMethod === "pickup"
                          ? "Pick up at clinic"
                          : "Receive an e-medical certificate"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Patient ID
                      </h4>
                      <p>{medCertSearchQuery}</p>
                    </div>
                    {medCertSelectedPatient && (
                      <>
                        <div>
                          <h4 className="font-semibold text-gray-700">
                            Patient Name
                          </h4>
                          <p>
                            {`${medCertSelectedPatient.first_name || ""} ${
                              medCertSelectedPatient.middle_initial
                                ? medCertSelectedPatient.middle_initial + " "
                                : ""
                            }${medCertSelectedPatient.last_name || ""}${
                              medCertSelectedPatient.suffix
                                ? " " + medCertSelectedPatient.suffix
                                : ""
                            }`.trim()}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700">
                            Date of Birth
                          </h4>
                          <p>
                            {medCertSelectedPatient.date_of_birth ||
                              medCertSelectedPatient.dateOfBirth ||
                              "Not available"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700">Email</h4>
                          <p>
                            {medCertSelectedPatient.email || "Not available"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700">Phone</h4>
                          <p>
                            {medCertSelectedPatient.phone_number ||
                              medCertSelectedPatient.phone ||
                              "Not available"}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-700">Documents</h4>
                      <p>{medCertIdFront ? "ID uploaded" : "No ID uploaded"}</p>
                    </div>
                  </div>
                  {medCertNotes && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Notes</h4>
                      <p className="text-gray-600">{medCertNotes}</p>
                    </div>
                  )}
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Processing Time:</p>
                      <p>
                        Your request will be processed within 2-3 business days.
                        You will be contacted via email once ready.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={
                  medCertStep === 1
                    ? () => {
                        setOpenModal(null);
                        resetMedCertModal();
                      }
                    : () => setMedCertStep((prev) => prev - 1)
                }
                disabled={medCertSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {medCertStep === 1 ? "Cancel" : "Previous"}
              </Button>

              {medCertStep < 3 ? (
                <Button
                  onClick={async () => {
                    if (medCertStep === 1) {
                      // Skip validation if showing forgot patient ID form
                      if (showMedCertForgotPatientId) {
                        toast({
                          title: "Form Incomplete",
                          description:
                            "Please complete the patient lookup or go back to enter Patient ID directly",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Validate Patient ID
                      if (!medCertSearchQuery.trim()) {
                        toast({
                          title: "Input Required",
                          description: "Please enter your Patient ID",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Validate delivery method
                      if (!medCertDeliveryMethod) {
                        toast({
                          title: "Selection Required",
                          description:
                            "Please select how you want to receive your medical certificate",
                          variant: "destructive",
                        });
                        return;
                      }

                      const validation =
                        await validatePatientId(medCertSearchQuery);
                      if (!validation.isValid) {
                        toast({
                          title: "Validation Error",
                          description: validation.error,
                          variant: "destructive",
                        });
                        return;
                      }
                      setMedCertSelectedPatient(validation.patient);
                      toast({
                        title: "✅ Patient Verified",
                        description: "Patient ID verified successfully!",
                      });
                    }
                    if (medCertStep === 2 && !medCertIdFront) {
                      toast({
                        title: "Upload Required",
                        description: "Please upload your ID",
                        variant: "destructive",
                      });
                      return;
                    }
                    setMedCertStep((prev) => prev + 1);
                  }}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white"
                  disabled={medCertSubmitting}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={submitMedicalCertRequest}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white"
                  disabled={medCertSubmitting}
                >
                  {medCertSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =================== E-Prescription Modal =================== */}
      <Dialog
        open={openModal === "eprescription"}
        onOpenChange={() => {
          setOpenModal(null);
          resetPrescriptionModal();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-[#79c942] text-center text-2xl font-bold">
              Request E-Prescription - Step {prescriptionStep} of 3
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= prescriptionStep
                      ? "bg-[#79c942] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < prescriptionStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                <span className="text-xs mt-1 text-center">
                  {step === 1 && "Patient ID"}
                  {step === 2 && "Documents"}
                  {step === 3 && "Confirm"}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Step 1: Patient ID Input (Previously Step 2) */}
            {prescriptionStep === 1 && (
              <div className="space-y-4">
                {!showPrescriptionForgotPatientId ? (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Enter your Patient ID
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Patient ID *
                        </label>
                        <Input
                          placeholder="Enter your Patient ID"
                          value={prescriptionSearchQuery}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\s/g, "");
                            setPrescriptionSearchQuery(value);
                          }}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          You can find your Patient ID on your previous
                          appointment receipts, medical certificates, or contact
                          the clinic
                        </div>
                      </div>
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          className="text-sm text-blue-600 hover:text-blue-800"
                          onClick={() =>
                            setShowPrescriptionForgotPatientId(true)
                          }
                        >
                          Forgot your Patient ID?
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      Find Your Patient ID
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          First Name *
                        </label>
                        <Input
                          placeholder="Enter your first name"
                          value={prescriptionForgotIdForm.firstName}
                          onChange={(e) =>
                            setPrescriptionForgotIdForm({
                              ...prescriptionForgotIdForm,
                              firstName: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Last Name *
                        </label>
                        <Input
                          placeholder="Enter your last name"
                          value={prescriptionForgotIdForm.lastName}
                          onChange={(e) =>
                            setPrescriptionForgotIdForm({
                              ...prescriptionForgotIdForm,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Date of Birth *
                        </label>
                        <Input
                          type="date"
                          value={prescriptionForgotIdForm.dateOfBirth}
                          onChange={(e) =>
                            setPrescriptionForgotIdForm({
                              ...prescriptionForgotIdForm,
                              dateOfBirth: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          onClick={submitPrescriptionForgotPatientId}
                          disabled={prescriptionForgotIdSubmitting}
                          className="flex-1"
                        >
                          {prescriptionForgotIdSubmitting
                            ? "Searching..."
                            : "Find Patient ID"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setShowPrescriptionForgotPatientId(false)
                          }
                          className="flex-1"
                        >
                          Back
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Document Upload (skip medication details) */}
            {prescriptionStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Upload Supporting Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ID Front Side *
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPrescriptionIdFront(file);
                          setPrescriptionIdFrontPreview(
                            URL.createObjectURL(file),
                          );
                        }
                      }}
                      required
                    />
                    <div className="flex items-center gap-1 text-xs text-[#79c942] mt-1">
                      <Info className="h-3 w-3" />
                      <span>Valid government ID</span>
                    </div>
                    {prescriptionIdFrontPreview && (
                      <img
                        src={prescriptionIdFrontPreview}
                        alt="ID Front"
                        className="w-32 h-20 mt-2 rounded object-cover border"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ID Back Side
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPrescriptionIdBack(file);
                          setPrescriptionIdBackPreview(
                            URL.createObjectURL(file),
                          );
                        }
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-1">Optional</div>
                    {prescriptionIdBackPreview && (
                      <img
                        src={prescriptionIdBackPreview}
                        alt="ID Back"
                        className="w-32 h-20 mt-2 rounded object-cover border"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {prescriptionStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Confirm Your Request
                </h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Patient ID
                      </h4>
                      <p>{prescriptionSearchQuery}</p>
                    </div>
                    {prescriptionSelectedPatient && (
                      <>
                        <div>
                          <h4 className="font-semibold text-gray-700">
                            Patient Name
                          </h4>
                          <p>
                            {`${prescriptionSelectedPatient.first_name || ""} ${
                              prescriptionSelectedPatient.middle_initial
                                ? prescriptionSelectedPatient.middle_initial +
                                  " "
                                : ""
                            }${prescriptionSelectedPatient.last_name || ""}${
                              prescriptionSelectedPatient.suffix
                                ? " " + prescriptionSelectedPatient.suffix
                                : ""
                            }`.trim()}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700">
                            Date of Birth
                          </h4>
                          <p>
                            {prescriptionSelectedPatient.date_of_birth ||
                              prescriptionSelectedPatient.dateOfBirth ||
                              "Not available"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700">Email</h4>
                          <p>
                            {prescriptionSelectedPatient.email ||
                              "Not available"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-700">Phone</h4>
                          <p>
                            {prescriptionSelectedPatient.phone_number ||
                              prescriptionSelectedPatient.phone ||
                              "Not available"}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-700">Documents</h4>
                      <p>
                        {prescriptionIdFront ? "ID uploaded" : "No ID uploaded"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold">Note:</p>
                      <p>
                        Your doctor will review your request and provide the
                        appropriate prescription based on your medical needs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Processing Time:</p>
                      <p>
                        Your prescription request will be processed within 2-3
                        business days. You will be contacted via email once
                        ready.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={
                  prescriptionStep === 1
                    ? () => {
                        setOpenModal(null);
                        resetPrescriptionModal();
                      }
                    : () => setPrescriptionStep((prev) => prev - 1)
                }
                disabled={prescriptionSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {prescriptionStep === 1 ? "Cancel" : "Previous"}
              </Button>

              {prescriptionStep < 3 ? (
                <Button
                  onClick={async () => {
                    if (prescriptionStep === 1) {
                      // Validate Patient ID
                      if (!prescriptionSearchQuery.trim()) {
                        toast({
                          title: "Input Required",
                          description: "Please enter your Patient ID",
                          variant: "destructive",
                        });
                        return;
                      }
                      const validation = await validatePatientId(
                        prescriptionSearchQuery,
                      );
                      if (!validation.isValid) {
                        toast({
                          title: "Validation Error",
                          description: validation.error,
                          variant: "destructive",
                        });
                        return;
                      }
                      setPrescriptionSelectedPatient(validation.patient);
                      toast({
                        title: "✅ Patient Verified",
                        description: "Patient ID verified successfully!",
                      });
                    }
                    if (prescriptionStep === 2 && !prescriptionIdFront) {
                      toast({
                        title: "Upload Required",
                        description: "Please upload your ID",
                        variant: "destructive",
                      });
                      return;
                    }
                    setPrescriptionStep((prev) => prev + 1);
                  }}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white"
                  disabled={prescriptionSubmitting}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={submitPrescriptionRequest}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white"
                  disabled={prescriptionSubmitting}
                >
                  {prescriptionSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Card and Scrollbar Styles */}
      <style>
        {`
          .service-card {
            transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
          }
          .service-card:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 32px 0 #79c94255;
            background: #79c94222;
            z-index: 2;
          }
          
          /* Enhanced Scrollbar Styles for Popovers */
          .overflow-y-auto, .popover-scrollable .overflow-y-auto {
            /* Ensure smooth scrolling */
            scroll-behavior: smooth;
            /* Enable mouse wheel scrolling */
            overflow-y: auto !important;
            /* Ensure pointer events work */
            pointer-events: auto !important;
          }
          
          /* Ensure popover content can receive mouse events */
          .popover-scrollable {
            pointer-events: auto !important;
          }
          
          /* Webkit browsers (Chrome, Safari, Edge) */
          .overflow-y-auto::-webkit-scrollbar,
          .popover-scrollable .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
          }
          
          .overflow-y-auto::-webkit-scrollbar-track,
          .popover-scrollable .overflow-y-auto::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
          }
          
          .overflow-y-auto::-webkit-scrollbar-thumb,
          .popover-scrollable .overflow-y-auto::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            transition: background 0.2s ease;
          }
          
          .overflow-y-auto::-webkit-scrollbar-thumb:hover,
          .popover-scrollable .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.3);
          }
          
          /* Firefox */
          .overflow-y-auto,
          .popover-scrollable .overflow-y-auto {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
          }
          
          /* Ensure popovers can be scrolled with mouse wheel */
          [data-radix-popper-content-wrapper],
          [data-radix-popper-content-wrapper] * {
            pointer-events: auto !important;
          }
          
          /* Specific targeting for Radix UI PopoverContent */
          [data-radix-popover-content] {
            pointer-events: auto !important;
          }
          
          [data-radix-popover-content] .overflow-y-auto {
            pointer-events: auto !important;
            touch-action: pan-y !important;
          }
          
          /* Fix z-index for sticky headers */
          .sticky {
            z-index: 10;
          }
          
          @media (max-width: 1024px) {
            .max-w-6xl { max-width: 100vw; }
            .grid-cols-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 768px) {
            .max-w-6xl { max-width: 100vw; }
            .grid-cols-2, .grid-cols-3 { grid-template-columns: 1fr; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-8 { padding-top: 1rem; padding-bottom: 1rem; }
          }
          @media (max-width: 640px) {
            .calendar-modal-input {
              max-width: 100vw !important;
              min-width: 0 !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default PatientPortal;
