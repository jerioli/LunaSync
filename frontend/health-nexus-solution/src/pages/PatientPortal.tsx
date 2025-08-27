import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from '@/services/api';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { ArrowUp, BotMessageSquare, Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, FileText, Info, Monitor, Moon, Pill, Stethoscope, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

// Axios instance - using same configuration as chatbot
const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true,  // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include session ID
axiosInstance.interceptors.request.use(
  (config) => {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Form schemas
const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleInitial: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional(),
  phone: z.string().min(10, 'Contact number must be at least 10 digits'),
  gender: z.enum(['male', 'female', 'prefer_not_to_say'], { required_error: 'Gender is required' }),
  email: z.string().email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'prefer_not_to_say']).optional(),
});

const appointmentSchema = z.object({
  patient_id: z.string().optional(),
  new_patient: patientSchema.optional(),
  doctor_id: z.string().min(1, 'Doctor selection is required'),
  appointment_date: z.string().min(1, 'Appointment date is required'),
  appointment_time: z.string().min(1, 'Appointment time is required'),
  appointment_type: z.string().min(1, 'Appointment type is required'),
  notes: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;
type AppointmentFormData = z.infer<typeof appointmentSchema>;

// Note: These hooks need to be implemented or imported from your theme/language context
// For now, providing mock implementations to prevent errors
const useTheme = () => ({ 
  theme: 'light' as 'light' | 'dark' | 'system', 
  setTheme: (theme: 'light' | 'dark' | 'system') => {} 
});
const useLanguage = () => ({ t: (key: string) => key });

const PatientPortal = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [clinic, setClinic] = useState({
    clinic_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    website: '',
    hero_title: '',
    hero_subtitle: '',
    about_title: '',
    about_text: '',
    services: [],
    faqs: [],
    reviews: [],
    logo: '',
    healthcare_professionals_image: '',
    clinic_building_image: '',
  });
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ name: '', email: '', rating: 1, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [stayAnonymous, setStayAnonymous] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showGreetingCursor, setShowGreetingCursor] = useState(true);
  const [showArrow, setShowArrow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Patient Request Modal States
  const [openModal, setOpenModal] = useState<null | "appointment" | "medcert" | "eprescription">(null);

  // Multi-step appointment scheduling states
  const [currentStep, setCurrentStep] = useState(1);
  const [isExistingPatient, setIsExistingPatient] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [appointmentTypes] = useState([
    'Consultation',
    'Follow-up',
    'Check-up', 
    'Vaccination',
    'Physical Therapy',
    'Laboratory',
    'Emergency'
  ]);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form handling
  const patientForm = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: '',
      middleInitial: '',
      lastName: '',
      suffix: '',
      phone: '',
      gender: 'male',
      email: '',
      address: '',
      dateOfBirth: '',
      maritalStatus: 'single',
    }
  });

  const appointmentForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  });

  // Dummy data for backward compatibility
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(today.getMonth() + 2);
  const twoMonthsLaterStr = twoMonthsLater.toISOString().split('T')[0];

  const availableDates = [todayStr, twoMonthsLaterStr];
  const availableTimes = ["9:00 AM", "10:00 AM", "2:00 PM"];

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

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await axiosInstance.get('doctors/');
        setDoctors(response.data);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        toast.error('Failed to load doctors');
      }
    };
    
    if (openModal === 'appointment') {
      fetchDoctors();
    }
  }, [openModal]);

  // Search patients
  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      setPatients([]);
      return;
    }
    
    try {
      const response = await axiosInstance.get(`patients/search/?q=${encodeURIComponent(query)}`);
      setPatients(response.data);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatients([]);
    }
  };

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute > 0) break; // Stop at 5:00 PM
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  // Fetch available time slots
  const fetchAvailableTimeSlots = async (doctorId: string, date: string) => {
    try {
      const response = await axiosInstance.get(`appointments/available-slots/`, {
        params: { doctor_id: doctorId, date }
      });
      setAvailableTimeSlots(response.data);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setAvailableTimeSlots(generateTimeSlots());
    }
  };

  // Reset appointment modal
  const resetAppointmentModal = () => {
    setCurrentStep(1);
    setIsExistingPatient(null);
    setSearchQuery('');
    setPatients([]);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedAppointmentType('');
    setSelectedDate('');
    setAvailableTimeSlots([]);
    setSelectedTimeSlot('');
    setNotes('');
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
    
    try {
      // Validate patient form if new patient
      if (!isExistingPatient) {
        const isValidPatient = await patientForm.trigger();
        if (!isValidPatient) {
          toast.error('Please fill in all required patient information');
          setCurrentStep(2);
          setIsSubmitting(false);
          return;
        }
      }

      // Format time to 24-hour format with seconds (same as chatbot)
      const [time, period] = selectedTimeSlot.includes(' ') ? selectedTimeSlot.split(' ') : [selectedTimeSlot, ''];
      let formattedTime = selectedTimeSlot;
      
      if (period) {
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        formattedTime = `${hour.toString().padStart(2, '0')}:${minutes}:00`;
      } else if (!selectedTimeSlot.includes(':')) {
        // If it's just HH format, add minutes and seconds
        formattedTime = `${selectedTimeSlot}:00:00`;
      } else if (!selectedTimeSlot.includes(':', selectedTimeSlot.lastIndexOf(':') + 1)) {
        // If it's HH:MM format, add seconds
        formattedTime = `${selectedTimeSlot}:00`;
      }

      // Prepare appointment data using chatbot's structure
      const patientData = isExistingPatient ? selectedPatient : patientForm.getValues();
      
      const appointmentData = {
        firstName: isExistingPatient ? selectedPatient?.firstName || selectedPatient?.first_name : patientData.firstName,
        middleInitial: isExistingPatient ? selectedPatient?.middleInitial || selectedPatient?.middle_initial || '' : patientData.middleInitial || '',
        lastName: isExistingPatient ? selectedPatient?.lastName || selectedPatient?.last_name : patientData.lastName,
        suffix: isExistingPatient ? selectedPatient?.suffix || '' : patientData.suffix || '',
        patient_id: isExistingPatient ? selectedPatient?.patient_id || null : null,
        patient_email: isExistingPatient ? selectedPatient?.email : patientData.email,
        patient_phone: isExistingPatient ? selectedPatient?.phone || selectedPatient?.phone_number : patientData.phone,
        date_of_birth: isExistingPatient 
          ? (selectedPatient?.dateOfBirth || selectedPatient?.date_of_birth) 
          : patientData.dateOfBirth,
        gender: isExistingPatient 
          ? (selectedPatient?.gender || 'prefer_not_to_say')
          : patientData.gender,
        address: isExistingPatient 
          ? (selectedPatient?.address || null)
          : patientData.address,
        marital_status: isExistingPatient 
          ? (selectedPatient?.maritalStatus || selectedPatient?.marital_status || 'prefer_not_to_say')
          : (patientData.maritalStatus || 'prefer_not_to_say'),
        appointment_type: selectedAppointmentType,
        date: selectedDate,
        time: formattedTime,
        doctor_id: parseInt(selectedDoctor.id),
        status: 'pending',
        is_pending_confirmation: true,
        notes: notes || ''
      };

      // Create appointment using the same API as chatbot
      const response = await api.appointments.create(appointmentData);
      
      toast.success('Appointment request submitted successfully! You will receive a confirmation once approved.');
      handleAppointmentModalClose();
      
    } catch (error: any) {
      console.error('Error submitting appointment:', error);
      
      // Handle specific error cases like chatbot does
      if (error.response?.status === 409 || 
          error.response?.status === 500 || 
          (error.response?.data && 
           (error.response.data.error === 'TIME_SLOT_CONFLICT' ||
            (typeof error.response.data === 'string' && error.response.data.includes('already booked')) ||
            (error.response.data.message && error.response.data.message.includes('already booked'))))) {
        
        toast.error('This time slot has just been booked by another patient. Please select a different time.');
        setCurrentStep(5); // Go back to date/time selection
      } else if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const firstError = Object.values(errorData)[0];
          toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          toast.error(errorData);
        }
      } else {
        toast.error('Failed to submit appointment request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Handle step navigation with validation
  const handleNextStep = async () => {
    switch (currentStep) {
      case 1:
        if (isExistingPatient === null) {
          toast.error('Please select if you are an existing patient');
          return;
        }
        break;
      case 2:
        if (isExistingPatient && !selectedPatient) {
          toast.error('Please select a patient');
          return;
        }
        if (!isExistingPatient) {
          const isValid = await patientForm.trigger();
          if (!isValid) {
            toast.error('Please fill in all required fields');
            return;
          }
        }
        break;
      case 3:
        if (!selectedDoctor) {
          toast.error('Please select a doctor');
          return;
        }
        break;
      case 4:
        if (!selectedAppointmentType) {
          toast.error('Please select an appointment type');
          return;
        }
        break;
      case 5:
        if (!selectedDate) {
          toast.error('Please select a date');
          return;
        }
        if (!selectedTimeSlot) {
          toast.error('Please select a time');
          return;
        }
        break;
    }
    nextStep();
  };

  // Watch for date/doctor changes to fetch time slots
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableTimeSlots(selectedDoctor.id, selectedDate);
    }
  }, [selectedDoctor, selectedDate]);

  // Search patients on query change
  useEffect(() => {
    if (isExistingPatient && searchQuery) {
      const timeoutId = setTimeout(() => {
        searchPatients(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, isExistingPatient]);

  const GREETING_TEXT = "Hi! I'm Dr. MDSync, virtual assistant. What can I help you with?";

  const [greetingDisplay, setGreetingDisplay] = useState('');
  const [typing, setTyping] = useState(true);

  // Typing animation for greeting
  useEffect(() => {
    let charIndex = 0;
    let typingTimeout: NodeJS.Timeout;
    let repeatTimeout: NodeJS.Timeout;

    const typeGreeting = () => {
      setTyping(true);
      setGreetingDisplay('');
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

  // Theme toggle function
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Get theme icon
  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Move fetchClinic outside useEffect
  const fetchClinic = async () => {
    try {
      const res = await axios.get('clinic/');
      const clinicData = res.data || {};
      
      // Also fetch submitted reviews from the reviews API
      try {
        const reviewsRes = await axios.get('clinic/reviews/');
        if (reviewsRes.data && reviewsRes.data.length > 0) {
          // Use submitted reviews as the primary source
          clinicData.reviews = reviewsRes.data;
        }
      } catch (reviewsErr) {
        console.log('Could not fetch submitted reviews:', reviewsErr);
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
    if (logo.startsWith('http')) return logo;
    if (logo.startsWith('/media/')) return `http://127.0.0.1:8000${logo}`;
    if (logo.startsWith('branding/')) return `http://127.0.0.1:8000/media/${logo}`;
    return `http://127.0.0.1:8000${logo}`;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const reviewData = {
        name: stayAnonymous ? 'Anonymous' : reviewForm.name,
        email: stayAnonymous ? '' : reviewForm.email,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        date: new Date().toISOString().slice(0, 10),
        anonymous: stayAnonymous,
      };
      
      const response = await axios.post('clinic/reviews/', reviewData);
      
      // Reset form with 1 star rating
      setReviewForm({ name: '', email: '', rating: 1, comment: '' });
      setStayAnonymous(false); // Reset anonymous checkbox
      await fetchClinic(); // Refresh reviews
      
      // Enhanced success message with email confirmation
      const emailSent = response.data?.email_sent;
      if (emailSent) {
        alert('Thank you for your review! We have received it and our clinic management team has been notified via email. They may reach out to you directly.');
      } else {
        alert('Thank you for your review! We have received it and saved it to our system. (Email notification temporarily unavailable, but your review is safely stored).');
      }
      
    } catch (err) {
      console.error('Review submission error:', err);
      alert('Failed to submit review. Please try again later.');
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
        behavior: 'smooth'
      });
      
      // Update URL hash without triggering scroll
      history.replaceState(null, '', `#${id}`);
    }
  };

  // Show arrow only when user is near the bottom (footer)
  useEffect(() => {
    const handleScroll = () => {
      const footer = document.querySelector('footer');
      if (!footer) return setShowArrow(false);

      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      // Show arrow if the top of the footer is visible in the viewport
      setShowArrow(footerRect.top < windowHeight && footerRect.bottom > 0);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add this state for the transitioning button text
  const [buttonText, setButtonText] = useState('Chat Now');

  // Add this effect for transitioning button text
  useEffect(() => {
    const texts = [
      'Chat Now',
      'Request an Appointment',
      'Request a Prescription',
      'Request Med-cert'
    ];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % texts.length;
      setButtonText(texts[currentIndex]);
    }, 3000); // Changed from 7000 to 3000 for a 3-second interval
    
    return () => clearInterval(interval);
  }, []);

  // Helper component for personal info fields
  const PersonalInfoFields = ({ disabled }: { disabled: boolean }) => (
    <div className={`space-y-4 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input placeholder="First Name" disabled={disabled} required />
        <Input placeholder="Suffix" disabled={disabled} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input placeholder="Middle Name" disabled={disabled} required />
        <Input type="date" placeholder="Birthdate" disabled={disabled} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input placeholder="Last Name" disabled={disabled} required />
        <Input placeholder="Age" disabled={disabled} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input placeholder="Religion" disabled={disabled} required />
        <Select disabled={disabled} required>
          <SelectTrigger>
            <SelectValue placeholder="Sex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="prefernot">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input placeholder="Phone Number" disabled={disabled} required />
        <Select disabled={disabled} required>
          <SelectTrigger>
            <SelectValue placeholder="Marital Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="married">Married</SelectItem>
            <SelectItem value="widowed">Widowed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input placeholder="Email Address" disabled={disabled} required />
      <Textarea placeholder="Home Address" disabled={disabled} required />
    </div>
  );

  // Tooltip component
  const ConsentTooltip = ({ text }: { text: string }) => {
    const [open, setOpen] = useState(false);

    return (
      <span
        className="relative inline-flex align-middle ml-1"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          tabIndex={0}
          className="outline-none focus:ring-2 focus:ring-[#79c942] rounded bg-transparent border-none p-0"
          aria-label="Show consent information"
          onClick={() => setOpen((prev) => !prev)}
          onBlur={() => setOpen(false)}
        >
          <Info className="h-4 w-4 text-[#79c942] cursor-pointer" />
        </button>
        {open && (
          <span className="absolute left-1/2 top-full z-50 -translate-x-1/2 mt-2 w-[320px] bg-white text-gray-700 text-[8px] rounded shadow-lg p-3 border border-gray-200 whitespace-pre-line">
            {text}
          </span>
        )}
      </span>
    );
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading clinic info...</div>;
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
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          
          {/* Navigation Menu - hidden on mobile */}
          <div className="flex-1 hidden md:block">
            <NavigationMenu>
              <NavigationMenuList className="flex gap-4 bg-transparent text-base font-medium items-center">
                {[
                  { label: 'Home', href: '#home' },
                  { label: 'About', href: '#about' },
                  { label: 'Services', href: '#services' },
                  { label: 'Reviews', href: '#reviews' },
                  { label: 'FAQs', href: '#faqs' },
                  { label: 'Contact Us', href: '#contact' },
                ].map((item) => {
                  const isActive = window.location.hash === item.href;
                  return (
                    <NavigationMenuItem key={item.href} className="flex">
                      <NavigationMenuLink
                        href={item.href}
                        className={`
                          bg-transparent
                          px-2 py-1
                          font-medium
                          transition-colors
                          flex items-center
                          whitespace-nowrap
                          ${isActive ? 'text-[#79c942] underline underline-offset-8 font-semibold' : 'text-black'}
                          hover:text-[#79c942] hover:bg-transparent hover:underline hover:underline-offset-8
                        `}
                        style={{
                          textDecorationColor: isActive ? '#79c942' : undefined,
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
              <div className="text-xl font-bold text-[#79c942]">{clinic.clinic_name || 'Clinic'}</div>
            )}
          </div>
          
          {/* Chat Now Button + Request Appointment - on right side */}
          <div className="flex-1 flex justify-end items-center gap-2">
            {/* Schedule Appointment button (moved from hero section) */}
            <Button 
              onClick={() => navigate('/patient-requests')}
              size="lg"
              className="rounded-full font-bold bg-[#79c942] hover:bg-[#6bb33a] text-white transition-colors
              h-9 w-[180px] min-w-[180px] max-w-[180px]
              px-3 py-0
              flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span className="whitespace-nowrap text-[10px] md:text-xs truncate">Schedule Appointment</span>
              <Calendar className="h-4 w-4 flex-shrink-0" />
            </Button>
            
            {/* Chat Now Button - wider size with dynamic icon */}
            <Button 
              onClick={() => {
                if (buttonText === 'Chat Now') {
                  setIsChatbotOpen(!isChatbotOpen);
                } else if (buttonText === 'Request an Appointment') {
                  setOpenModal("appointment");
                } else if (buttonText === 'Request a Prescription') {
                  setOpenModal("eprescription");
                } else if (buttonText === 'Request Med-cert') {
                  setOpenModal("medcert");
                }
              }}
              size="lg"
              className="rounded-full font-bold bg-[#79c942] hover:bg-[#6bb33a] text-white transition-colors
              h-9 w-[200px] min-w-[200px] max-w-[200px]
              px-3 py-0
              flex items-center justify-center gap-1"
            >
              <span className="whitespace-nowrap text-[10px] md:text-xs truncate">{buttonText}</span>
              {/* Dynamic icon based on button text */}
              {buttonText === 'Chat Now' && <BotMessageSquare className="h-4 w-4 flex-shrink-0" />}
              {buttonText === 'Request an Appointment' && <Calendar className="h-4 w-4 flex-shrink-0" />}
              {buttonText === 'Request a Prescription' && <Pill className="h-4 w-4 flex-shrink-0" />}
              {buttonText === 'Request Med-cert' && <FileText className="h-4 w-4 flex-shrink-0" />}
            </Button>
            
            
          </div>
        </div>
      </header>
      
      {/* Arrow Up Button - bottom right, only visible near footer */}
      {showArrow && (
        <button
          onClick={() => scrollToSection('home')}
          className="fixed bottom-6 right-6 z-50 bg-[#79c942] text-white p-3 rounded-full shadow-lg hover:bg-[#6bb33a] transition-colors"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
      )}

      {/* Chatbot Greeting & Trigger - left side of the chatbot icon */}
      <div className={`fixed ${showArrow ? 'bottom-20' : 'bottom-6'} right-6 z-50 flex items-center gap-2`}>
        <div className="hidden md:block order-1">
          <span className="text-[#79c942] font-medium text-xs italic flex items-center p-2 rounded-lg shadow-sm bg-white/40 backdrop-blur-sm">
            {greetingDisplay}
            <span
              className={`inline-block w-2 h-4 align-middle ml-1 bg-[#79c942]`}
              style={{
                borderRadius: '2px',
                verticalAlign: 'middle',
                marginLeft: '2px',
                transition: 'background 0.2s',
                opacity: typing ? 1 : 0,
                animation: typing ? 'blink-cursor 1s steps(1) infinite' : 'none'
              }}
            ></span>
          </span>
        </div>
        <button
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          className="bg-[#79c942] text-white p-3 rounded-full shadow-lg hover:bg-[#6bb33a] transition-colors order-2"
        >
          <BotMessageSquare className="h-6 w-6" />
        </button>
      </div>
      <style>
        {`
          @keyframes blink-cursor {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}
      </style>

      {/* Chatbot Modal */}
      {isChatbotOpen && (
        <div className="fixed bottom-32 right-6 z-50 w-96">
          <AppointmentChatbot onClose={() => setIsChatbotOpen(false)} />
        </div>
      )}
      
      {/* Hero Section */}
      <section id="home" className="py-10 md:py-20">
        <div className="container mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12 px-4">
          <div className="flex-1 space-y-6 w-full">
            {clinic.logo && (
              <img src={getLogoUrl(clinic.logo)} alt="Clinic Logo" className="h-16 mb-4" />
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-[#79c942]">
              {clinic.hero_title || 'Your Health Is Our Priority'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {clinic.hero_subtitle || `${clinic.clinic_name || t('portal.welcome')} ${t('portal.heroSubtitle')}`}
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
      <section id="about" className="py-10 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 md:mb-12 text-[#79c942]">{clinic.about_title || `About ${clinic.clinic_name || 'Our Clinic'}`}</h2>
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
              <h3 className="text-2xl font-semibold text-[#79c942]">Our Story</h3>
              <p className="text-gray-600">
                {clinic.about_text || 'Founded in 2010, HealthNexus has grown to become one of the leading healthcare providers in the region. Our mission is to deliver accessible, high-quality healthcare services in a compassionate environment.'}
              </p>
              <h3 className="text-2xl font-semibold text-[#79c942]">Our Values</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: '#79c942' }}></div>
                  <span>Patient-centered care</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: '#79c942' }}></div>
                  <span>Excellence in medical practice</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: '#79c942' }}></div>
                  <span>Integrity and transparency</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: '#79c942' }}></div>
                  <span>Continuous improvement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section id="services" className="py-10 md:py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 md:mb-12 text-[#79c942]">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
            {/* Appointment Card */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle className="text-[#79c942] flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Appointment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
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
                <CardTitle className="text-[#79c942] flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request MedCert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
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
                <CardTitle className="text-[#79c942] flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Request E-Prescription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  Request an electronic prescription.
                </p>
                <Button 
                  className="w-full bg-[#79c942] hover:bg-[#68ab38] text-white font-bold transition-colors"
                  onClick={() => setOpenModal("eprescription")}
                >
                  Request E-Prescription
                </Button>
              </CardContent>
            </Card>

           
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-10 md:py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 md:mb-12 text-[#79c942]">Patient Reviews</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Patient Reviews - Left Side (3 columns) */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {clinic.reviews && clinic.reviews.length > 0 ? 
                  clinic.reviews.slice(0, showAllReviews ? clinic.reviews.length : 6).map((review, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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
                              {Array(review.rating).fill(0).map((_, i) => (
                                <svg key={i} className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-3 mb-2">{review.comment}</p>
                          <p className="text-xs text-gray-400">{review.date}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500">No reviews yet. Be the first to leave a review!</p>
                    </div>
                  )
                }
              </div>
              
              {/* Show More/Less Button */}
              {clinic.reviews && clinic.reviews.length > 6 && (
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="border-[#79c942] text-[#79c942] hover:bg-[#79c942] hover:text-white"
                  >
                    {showAllReviews ? 'Show Less' : `Show All ${clinic.reviews.length} Reviews`}
                  </Button>
                </div>
              )}
            </div>

            {/* Leave a Review Form - Right Side (1 column) */}
            <div className="lg:col-span-1">
              <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 sticky top-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Leave a Review</h3>
                
                <div className="flex items-center mb-3 gap-2">
                  <Checkbox
                    id="stay-anonymous"
                    checked={stayAnonymous}
                    onCheckedChange={checked => setStayAnonymous(checked === true)}
                    className="data-[state=checked]:bg-[#79c942] border-[#79c942] focus:ring-[#79c942]"
                  />
                  <label htmlFor="stay-anonymous" className="text-xs font-medium text-gray-700 select-none cursor-pointer">
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
                          onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                          required={!stayAnonymous}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Your Email"
                          type="email"
                          className="bg-white text-gray-900 text-sm h-8"
                          value={reviewForm.email}
                          onChange={e => setReviewForm({ ...reviewForm, email: e.target.value })}
                          required={!stayAnonymous}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-700">Rating</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <span
                          key={star}
                          style={{ cursor: 'pointer', color: reviewForm.rating >= star ? '#FFD700' : '#E5E7EB', fontSize: 20 }}
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          role="button"
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >★</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <textarea
                      placeholder="Your Review"
                      className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#79c942] focus:border-[#79c942] min-h-[80px] text-xs text-gray-900 resize-none"
                      value={reviewForm.comment}
                      onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      required
                    />
                  </div>
                  <Button 
                    className="w-full bg-[#79c942] hover:bg-[#6bb33a] text-white text-sm h-8" 
                    type="submit" 
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="py-10 md:py-20 relative">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 md:mb-12 text-[#79c942]">Frequently Asked Questions</h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* First Accordion Card (first 5 FAQs) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FAQs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Custom Accordion */}
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">
                        1. What's our operating hours?
                      </summary>
                      <div className="pl-4 pb-3 text-gray-600">
                        Monday - Saturday: 8am - 6pm.<br />
                        Sunday (CLOSED)
                      </div>
                    </details>
                  </div>
                  {/* First 5 dynamic FAQs */}
                  {clinic.faqs && clinic.faqs.slice(0, 5).map((faq, index) => (
                    <div key={index} className="border-b last:border-b-0">
                      <details className="group">
                        <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">{faq.question}</summary>
                        <div className="pl-4 pb-3 text-gray-600">{faq.answer}</div>
                      </details>
                    </div>
                  ))}
                  {/* 5 static accordions */}
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">2. How do I book an appointment?</summary>
                      <div className="pl-4 pb-3 text-gray-600">You can book an appointment online or call our clinic directly.</div>
                    </details>
                  </div>
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">3. Do you accept walk-ins?</summary>
                      <div className="pl-4 pb-3 text-gray-600">Yes, we accept walk-ins but appointments are preferred.</div>
                    </details>
                  </div>
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">4. What insurance do you accept?</summary>
                      <div className="pl-4 pb-3 text-gray-600">We accept most major insurance plans. Please contact us for details.</div>
                    </details>
                  </div>
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">5. Where are you located?</summary>
                      <div className="pl-4 pb-3 text-gray-600">We are located at {clinic.address}, {clinic.city}, {clinic.state} {clinic.zip}.</div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Second Accordion Card (6th and more FAQs + 6 more static accordions) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">More FAQs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* 6th and more dynamic FAQs */}
                  {clinic.faqs && clinic.faqs.slice(5, 10).map((faq, index) => (
                    <div key={index} className="border-b last:border-b-0">
                      <details className="group">
                        <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">{faq.question}</summary>
                        <div className="pl-4 pb-3 text-gray-600">{faq.answer}</div>
                      </details>
                    </div>
                  ))}
                  {/* 6 more static accordions */}
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">6. Can I get my lab results online?</summary>
                      <div className="pl-4 pb-3 text-gray-600">Yes, lab results are available through your patient portal account.</div>
                    </details>
                  </div>
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">7. How do I request prescription refills?</summary>
                      <div className="pl-4 pb-3 text-gray-600">You can request refills by contacting our clinic or through the portal.</div>
                    </details>
                  </div>
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">8. Are telemedicine appointments available?</summary>
                      <div className="pl-4 pb-3 text-gray-600">Yes, we offer telemedicine appointments for your convenience.</div>
                    </details>
                  </div>
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">9. How do I access my medical records?</summary>
                      <div className="pl-4 pb-3 text-gray-600">Medical records can be accessed securely through the patient portal.</div>
                    </details>
                  </div>
                  <div className="border-b">
                    <details className="group">
                      <summary className="cursor-pointer py-3 font-semibold text-[#79c942] group-open:underline">10. What should I bring to my appointment?</summary>
                      <div className="pl-4 pb-3 text-gray-600">Please bring a valid ID, insurance card, and any rointmen medical documents.</div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-10 md:py-20 relative bg-white/70">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 md:mb-12 text-[#79c942]">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-start">
            {/* Our Location */}
            <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4 text-[#79c942] flex items-center gap-2">
                <svg className="inline-block text-[#79c942]" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Our Location
              </h3>
              <div className="mb-4 text-center">
                <p className="font-medium">{clinic.address}</p>
                <p>{clinic.city}{clinic.state ? `, ${clinic.state}` : ''} {clinic.zip}</p>
              </div>
              <div className="w-full h-48 rounded overflow-hidden border mb-2">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!4v1751955711488!6m8!1m7!1sIi6uy9JxNnmbSDI1hq2OpQ!2m2!1d14.32452455175477!2d121.0129429156632!3f200.80705806525316!4f-2.215198390680669!5f2.5769253873367934"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Clinic 360 Location"
                />
              </div>
              <div className="text-center text-sm text-gray-700 font-medium">
                Blk. 2 Lot 2, St. Joseph 9 Village, Brgy. Langgam, San Pedro City, Laguna
              </div>
            </div>
            {/* Combined Contact Information & Operation Hours */}
            <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#79c942] flex items-center gap-2">
                  <svg className="inline-block text-[#79c942]" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.08"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M17 14h.01"/><path d="M7 14h.01"/></svg>
                  Contact Information
                </h3>
                <div>
                  <span className="font-semibold">Phone:</span> <a href={`tel:${clinic.phone}`} className="text-[#79c942] hover:underline">{clinic.phone}</a>
                </div>
                <div>
                  <span className="font-semibold">Email:</span> <a href={`mailto:${clinic.email}`} className="text-[#79c942] hover:underline">{clinic.email}</a>
                </div>
                {clinic.website && (
                  <div>
                    <span className="font-semibold">Website:</span> <a href={clinic.website} className="text-[#79c942] hover:underline" target="_blank" rel="noopener noreferrer">{clinic.website}</a>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#79c942] flex items-center gap-2">
                  <svg className="inline-block text-[#79c942]" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Operation Hours
                </h3>
                <div>
                  <span className="font-semibold">Monday - Friday:</span> 8:00 AM - 6:00 PM
                </div>
                <div>
                  <span className="font-semibold">Saturday:</span> 9:00 AM - 2:00 PM
                </div>
                <div>
                  <span className="font-semibold">Sunday:</span> <span className="text-red-500">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-2 bg-gray-900 text-white text-xs">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 text-center">
            <div>
              <h3 className="text-base font-bold mb-1 text-clinic-blue">{clinic.clinic_name || 'Clinic'}</h3>
              <p className="text-gray-400 text-[10px]">
                Providing quality healthcare services since 2010. Dedicated to improving the health and wellbeing of our community.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">Quick Links</h3>
              <ul className="space-y-0.5">
                <li><a href="#home" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">Services</a></li>
                <li><a href="#reviews" className="text-gray-400 hover:text-white transition-colors">Reviews</a></li>
                <li><a href="#faqs" className="text-gray-400 hover:text-white transition-colors">FAQs</a></li>
                <li>
                  <button 
                    onClick={() => setShowAppointmentModal(true)} 
                    className="text-clinic-blue hover:text-white transition-colors"
                  >
                    Schedule Appointment
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">Services</h3>
              <ul className="space-y-0.5">
                <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">General Consultation</a></li>
                <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">Specialized Care</a></li>
                <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">Diagnostic Services</a></li>
                <li><a href="#services" className="text-gray-400 hover:text-white transition-colors">Preventive Care</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-2 text-center text-gray-400 text-[10px]">
            <p>&copy; 2024 {clinic.clinic_name || 'Clinic'}. All rights reserved.</p>
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
            width: 70%; /* Only cover 70% of screen width */
            height: 100%;
            background-color: white;
            z-index: 100;
            padding: 1.5rem;
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
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="mobile-menu">
            <div className="flex justify-between items-center mb-6">
              <div className="text-xl font-bold text-[#79c942]">{clinic.clinic_name || 'Clinic'}</div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <nav className="space-y-4">
              {[
                { label: 'Home', href: '#home' },
                { label: 'About', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Reviews', href: '#reviews' },
                { label: 'FAQs', href: '#faqs' },
                { label: 'Contact Us', href: '#contact' },
              ].map((item) => (
                <a 
                  key={item.href}
                  href={item.href}
                  className="block py-2 text-lg font-medium text-[#79c942]"
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
      <Dialog open={openModal === "appointment"} onOpenChange={handleAppointmentModalClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-[#79c942] text-center text-2xl font-bold">
              Schedule Appointment - Step {currentStep} of 6
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-6">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-[#79c942] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
                <span className="text-xs mt-1 text-center">
                  {step === 1 && 'Patient Type'}
                  {step === 2 && 'Patient Info'}
                  {step === 3 && 'Doctor'}
                  {step === 4 && 'Service'}
                  {step === 5 && 'Date & Time'}
                  {step === 6 && 'Confirm'}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Step 1: Patient Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Are you an existing patient?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant={isExistingPatient === true ? "default" : "outline"}
                    className={`p-6 h-auto ${isExistingPatient === true ? 'bg-[#79c942] hover:bg-[#68ab38]' : ''}`}
                    onClick={() => setIsExistingPatient(true)}
                  >
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">Yes, I'm an existing patient</div>
                      <div className="text-sm opacity-75">I have visited this clinic before</div>
                    </div>
                  </Button>
                  <Button
                    variant={isExistingPatient === false ? "default" : "outline"}
                    className={`p-6 h-auto ${isExistingPatient === false ? 'bg-[#79c942] hover:bg-[#68ab38]' : ''}`}
                    onClick={() => setIsExistingPatient(false)}
                  >
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-semibold">No, I'm a new patient</div>
                      <div className="text-sm opacity-75">This is my first visit</div>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Patient Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {isExistingPatient ? (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">Search for your patient record</h3>
                    <Input
                      placeholder="Search by name, email, or phone number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                    {patients.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {patients.map((patient: any) => (
                          <Button
                            key={patient.id}
                            variant={selectedPatient?.id === patient.id ? "default" : "outline"}
                            className={`w-full text-left p-4 h-auto justify-start ${
                              selectedPatient?.id === patient.id ? 'bg-[#79c942] hover:bg-[#68ab38]' : ''
                            }`}
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <div>
                              <div className="font-semibold">{patient.first_name} {patient.last_name}</div>
                              <div className="text-sm opacity-75">{patient.email} • {patient.phone_number}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                    {searchQuery && patients.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        No patients found. Please check your spelling or contact the clinic.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-center mb-4">Enter your information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">First Name *</label>
                        <Input {...patientForm.register('firstName')} />
                        {patientForm.formState.errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Middle Initial</label>
                        <Input {...patientForm.register('middleInitial')} placeholder="Optional" />
                        {patientForm.formState.errors.middleInitial && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.middleInitial.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Last Name *</label>
                        <Input {...patientForm.register('lastName')} />
                        {patientForm.formState.errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.lastName.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Suffix</label>
                        <Input {...patientForm.register('suffix')} placeholder="Jr, Sr, III, etc." />
                        {patientForm.formState.errors.suffix && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.suffix.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Contact Number *</label>
                        <Input {...patientForm.register('phone')} />
                        {patientForm.formState.errors.phone && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.phone.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Gender *</label>
                        <Select value={patientForm.watch('gender')} onValueChange={(value) => patientForm.setValue('gender', value as 'male' | 'female' | 'prefer_not_to_say')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        {patientForm.formState.errors.gender && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.gender.message}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Email Address *</label>
                        <Input type="email" {...patientForm.register('email')} />
                        {patientForm.formState.errors.email && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Address *</label>
                        <Input {...patientForm.register('address')} />
                        {patientForm.formState.errors.address && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.address.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                        <Input type="date" {...patientForm.register('dateOfBirth')} />
                        {patientForm.formState.errors.dateOfBirth && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.dateOfBirth.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Marital Status</label>
                        <Select value={patientForm.watch('maritalStatus')} onValueChange={(value) => patientForm.setValue('maritalStatus', value as 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        {patientForm.formState.errors.maritalStatus && (
                          <p className="text-red-500 text-sm mt-1">{patientForm.formState.errors.maritalStatus.message}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Doctor Selection */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Select a Doctor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map((doctor: any) => (
                    <Button
                      key={doctor.id}
                      variant={selectedDoctor?.id === doctor.id ? "default" : "outline"}
                      className={`p-4 h-auto text-left justify-start ${
                        selectedDoctor?.id === doctor.id ? 'bg-[#79c942] hover:bg-[#68ab38]' : ''
                      }`}
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      <div className="flex items-center space-x-3">
                        <Stethoscope className="w-8 h-8" />
                        <div>
                          <div className="font-semibold">{doctor.first_name} {doctor.last_name}</div>
                          <div className="text-sm opacity-75">{doctor.specialization}</div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Appointment Type */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Select Appointment Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointmentTypes.map((type) => (
                    <Button
                      key={type}
                      variant={selectedAppointmentType === type ? "default" : "outline"}
                      className={`p-4 h-auto ${
                        selectedAppointmentType === type ? 'bg-[#79c942] hover:bg-[#68ab38]' : ''
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

            {/* Step 5: Date and Time Selection */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Select Date and Time</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Date</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Time</label>
                    {selectedDate && availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {availableTimeSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTimeSlot === slot ? "default" : "outline"}
                            size="sm"
                            className={selectedTimeSlot === slot ? 'bg-[#79c942] hover:bg-[#68ab38]' : ''}
                            onClick={() => setSelectedTimeSlot(slot)}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            {slot}
                          </Button>
                        ))}
                      </div>
                    ) : selectedDate ? (
                      <div className="text-center text-gray-500 py-4">Loading available times...</div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">Please select a date first</div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes (Optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information or special requests..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 6: Confirmation */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center mb-4">Confirm Your Appointment</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700">Patient</h4>
                      <p>{isExistingPatient 
                        ? `${selectedPatient?.firstName || selectedPatient?.first_name} ${selectedPatient?.lastName || selectedPatient?.last_name}` 
                        : `${patientForm.getValues('firstName')} ${patientForm.getValues('lastName')}`}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Doctor</h4>
                      <p>{selectedDoctor?.first_name} {selectedDoctor?.last_name}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Date & Time</h4>
                      <p>{selectedDate} at {selectedTimeSlot}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">Appointment Type</h4>
                      <p>{selectedAppointmentType}</p>
                    </div>
                  </div>
                  {notes && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Notes</h4>
                      <p className="text-gray-600">{notes}</p>
                    </div>
                  )}
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Please Note:</p>
                      <p>Your appointment request will be marked as <strong>pending</strong> and subject to staff approval. You will receive a confirmation email once your appointment is approved.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? handleAppointmentModalClose : prevStep}
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {currentStep === 1 ? 'Cancel' : 'Previous'}
              </Button>
              
              {currentStep < 6 ? (
                <Button
                  onClick={handleNextStep}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white"
                  disabled={isSubmitting}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={onSubmitAppointment}
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =================== MedCert Modal =================== */}
      <Dialog open={openModal === "medcert"} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-[#79c942] text-center">Request Medical Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="accent-[#79c942]" />
              <span>
                I agree to the Terms and Conditions and consent to providing my personal information for processing my request.
                <span className="inline-flex align-middle ml-1">
                  <ConsentTooltip text={
  `By ticking this box:
1. I confirm that the information I provide is true and correct.
2. I understand that my personal data will be collected, stored, and used only for the purpose of scheduling my appointment or processing my request (medical certificate or e-prescription).
3. I consent to the clinic reviewing my request and communicating with me through my selected contact preference (SMS, email, or phone).
4. I also acknowledge that my request is subject to approval by clinic staff.`
} />                </span>
              </span>
            </div>
            <div className={consent ? "space-y-6" : "opacity-50 pointer-events-none space-y-6"}>
              <PersonalInfoFields disabled={!consent} />
              <div className="space-y-2">
                <Input type="file" accept="image/*" onChange={handleIdUpload} required />
                <div className="flex items-center gap-1 text-xs text-[#79c942]">
                  <Info className="h-3 w-3 text-[#79c942]" />
                  <span>
                    Primary IDs only: Driver's License, Passport, Philippine National ID, Postal ID
                  </span>
                </div>
                {idPreview && (
                  <img src={idPreview} alt="ID Preview" className="w-16 h-16 mt-2 rounded object-cover border" />
                )}
              </div>
              <Textarea placeholder="Additional notes (optional)" className="mt-2" />
              <Select value={documentType} onValueChange={setDocumentType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Receive document via" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pick-up</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-col md:flex-row justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setOpenModal(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white font-bold transition-colors"
                  onClick={() =>
                    handleSubmit(
                      "Your medical records request has been submitted successfully! Our staff will review your request and contact you within 2-3 business days."
                    )
                  }
                  disabled={!consent || !documentType}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =================== E-Prescription Modal =================== */}
      <Dialog open={openModal === "eprescription"} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-[#79c942] text-center">Request E-Prescription</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox checked={existingPatient} onCheckedChange={(v) => setExistingPatient(!!v)} className="accent-[#79c942]" />
              <span>
                I agree to the Terms and Conditions and consent to providing my personal information for processing my request.
                <span className="inline-flex align-middle ml-1">
                  <ConsentTooltip text={
  `By ticking this box:
1. I confirm that the information I provide is true and correct.
2. I understand that my personal data will be collected, stored, and used only for the purpose of scheduling my appointment or processing my request (medical certificate or e-prescription).
3. I consent to the clinic reviewing my request and communicating with me through my selected contact preference (SMS, email, or phone).
4. I also acknowledge that my request is subject to approval by clinic staff.`
} />                </span>
              </span>
            </div>
            <div className={existingPatient ? "space-y-6" : "opacity-50 pointer-events-none space-y-6"}>
              <PersonalInfoFields disabled={!existingPatient} />
              <div className="space-y-2">
                <Input type="file" accept="image/*" onChange={handleIdUpload} required />
                <div className="flex items-center gap-1 text-xs text-[#79c942]">
                  <Info className="h-3 w-3 text-[#79c942]" />
                  <span>
                    Primary IDs only: Driver's License, Passport, Philippine National ID, Postal ID
                  </span>
                </div>
                {idPreview && (
                  <img src={idPreview} alt="ID Preview" className="w-16 h-16 mt-2 rounded object-cover border" />
                )}
              </div>
              <Textarea placeholder="Additional notes (optional)" className="mt-2" />
              <Select value={eprescriptionType} onValueChange={setEPrescriptionType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Receive e-prescription via" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pick-up</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-col md:flex-row justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setOpenModal(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#79c942] hover:bg-[#68ab38] text-white font-bold transition-colors"
                  onClick={() =>
                    handleSubmit(
                      "Your medical records request has been submitted successfully! Our staff will review your request and contact you within 2-3 business days."
                    )
                  }
                  disabled={!existingPatient || !eprescriptionType}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Card Styles */}
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