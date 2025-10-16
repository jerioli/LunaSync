import { useClinic } from '@/contexts/ClinicContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Appointment } from '@/lib/mock-data';
import { api, axiosInstance, Doctor, Patient } from '@/services/api';
import { calculateAge } from '@/utils/medicalCertificateTemplate';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppointmentForm, FormField, MedicalRecordRequestForm, MessageType, PrescriptionRequestForm } from './types';
import { appointmentTypes } from './utils';

export const useChatbotLogic = () => {
  const { users, appointments, addAppointment, currentUser, clinicCustomization } = useClinic();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatStep, setChatStep] = useState<number | string>(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [clinicPhone, setClinicPhone] = useState<string>('');
  
  const API_BASE_URL = 'http://localhost:8000/api';

  // Function to fetch clinic settings
  const fetchClinicSettings = async () => {
    try {
      const response = await axiosInstance.get('/clinic/');
      const clinicData = response.data || {};
      setClinicPhone(clinicData.phone || '(555) 123-4567');
    } catch (error) {
      console.error('Error fetching clinic settings:', error);
      setClinicPhone('(555) 123-4567'); // Fallback phone number
    }
  };

  // Fetch clinic settings on component mount
  useEffect(() => {
    fetchClinicSettings();
  }, []);

  // Function to get CSRF token from cookies
  const getCSRFToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Function to fetch patient data by patient ID
  const fetchPatientData = async (patientId: string) => {
    try {
      // First check if patient ID exists and get the patient data
      const checkResponse = await axiosInstance.get(`/patients/check-patient-id/?patient_id=${encodeURIComponent(patientId)}`);
      
      if (!checkResponse.data.exists) {
        throw new Error('Patient not found');
      }
      
      // The patient data is already in the check response
      if (checkResponse.data.patient) {
        return checkResponse.data.patient;
      }
      
      // Fallback: if patient data not in check response, fetch using database ID
      const dbId = checkResponse.data.patient_id || checkResponse.data.id;
      if (dbId) {
        const response = await axiosInstance.get(`/patients/${dbId}/`);
        return response.data;
      }
      
      throw new Error('Patient data not available');
    } catch (error) {
      console.error('Error fetching patient data:', error);
      throw error;
    }
  };

  // Add patient lookup API function
  const lookupPatientByDetails = async (lookupData: typeof patientLookupForm) => {
    try {
      // Parse the full name into components for better matching
      const fullNameTrimmed = lookupData.fullName.trim();
      const nameParts = fullNameTrimmed.split(/\s+/);
      
      const requestData = {
        full_name: fullNameTrimmed,
        date_of_birth: lookupData.dateOfBirth.trim(),
        email: lookupData.email.trim().toLowerCase(),
        phone: lookupData.phone.trim(),
        // Add parsed name components for better backend matching
        first_name: nameParts[0] || '',
        last_name: nameParts[nameParts.length - 1] || '',
        middle_initial: nameParts.length > 2 ? nameParts[1] : ''
      };
      
      console.log('[DEBUG] Patient lookup request data:', requestData);
      console.log('[DEBUG] Full name:', requestData.full_name);
      console.log('[DEBUG] Parsed - First:', requestData.first_name, 'Middle:', requestData.middle_initial, 'Last:', requestData.last_name);
      console.log('[DEBUG] Date format:', requestData.date_of_birth);
      console.log('[DEBUG] Email format:', requestData.email);
      console.log('[DEBUG] Phone format:', requestData.phone);
      console.log('[DEBUG] Request payload:', JSON.stringify(requestData, null, 2));
      
      const response = await axiosInstance.post('/patients/lookup-patient/', requestData);
      
      console.log('[DEBUG] Patient lookup response:', response.data);
      console.log('[DEBUG] Response status:', response.status);
      console.log('[DEBUG] Response headers:', response.headers);
      
      return response.data;
    } catch (error: any) {
      console.error('Error looking up patient:', error);
      
      // Handle different types of errors
      if (error.response?.status === 404) {
        return { status: 'no_match', message: 'No patient found with the provided details.' };
      } else if (error.response?.status === 400) {
        return { status: 'error', message: 'Invalid request data. Please check your information and try again.' };
      } else if (error.response?.status === 500) {
        return { status: 'error', message: 'Server error. Please try again later.' };
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        return { status: 'error', message: 'Network error. Please check your connection and try again.' };
      } else {
        return { status: 'error', message: 'An unexpected error occurred during lookup. Please try again.' };
      }
    }
  };

  // Form state for appointments
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    date: undefined,
    time: '',
    type: '',
    doctorId: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    email: '',
    phone: '',
    notes: '',
    dateOfBirth: '',
    gender: '',
    religion: '',
    address: '',
    maritalStatus: '',
    termsAgreed: false,
    patient_id: ''
  });

  // Form state for medical record requests
  const [medicalRecordForm, setMedicalRecordForm] = useState<MedicalRecordRequestForm>({
    requestType: 'Medical Certificate', // Default to medical certificate
    patientId: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    idVerificationFront: null,
    idVerificationBack: null,
    idVerificationFrontPreview: null,
    idVerificationBackPreview: null,
    additionalInfo: ''
  });

  // Form state for prescription requests
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionRequestForm>({
    prescriptionType: '', // 'new' or 'refill'
    patientId: '',
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    idVerificationFront: null,
    idVerificationBack: null,
    idVerificationFrontPreview: null,
    idVerificationBackPreview: null,
    prescriptionImage: null,
    prescriptionImagePreview: null,
    additionalNotes: ''
  });

  // Add FAQ chat mode
  const [chatMode, setChatMode] = useState<'appointment' | 'medicalRecord' | 'prescription' | 'faq' | null>(null);
  
  // Track which messages have been interacted with to disable their options
  const [disabledMessages, setDisabledMessages] = useState<Set<string>>(new Set());

  // Track existing patient data for pre-population
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);
  
  // Store temporary form data for appointment confirmation
  const [tempFormData, setTempFormData] = useState<Record<string, string>>({});

  // Track typing animation state
  const [isTyping, setIsTyping] = useState(false);

  // Add patient lookup state
  const [patientLookupForm, setPatientLookupForm] = useState({
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    fullName: '',
    dateOfBirth: '',
    email: '',
    phone: ''
  });
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isPatientLookup, setIsPatientLookup] = useState(false);

  // Helper function to make responses more natural and varied
  const getRandomResponse = (responses: string[]): string => {
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Helper function to detect user sentiment and respond appropriately
  const addEmpathyToResponse = (message: string, userContext?: string): string => {
    const concernKeywords = ['pain', 'hurt', 'sick', 'emergency', 'urgent', 'worried', 'scared'];
    const happyKeywords = ['thank', 'great', 'perfect', 'awesome', 'wonderful'];
    
    if (userContext) {
      const lowerContext = userContext.toLowerCase();
      if (concernKeywords.some(keyword => lowerContext.includes(keyword))) {
        return `I understand this might be concerning for you. 💙 ${message}`;
      }
      if (happyKeywords.some(keyword => lowerContext.includes(keyword))) {
        return `I am so glad to hear that! 😊 ${message}`;
      }
    }
    return message;
  };

  // Enhanced validation error messages that are more supportive
  const getValidationErrorMessage = (type: 'email' | 'phone' | 'date' | 'patientId'): string => {
    const messages = {
      email: [
        'Hmm, that email doesn\'t look quite right! 📧 Could you double-check it?',
        'I need a valid email address to send you updates! 📧 Please try again.',
        'Oops! That email format seems off. Could you enter it like: name@example.com?'
      ],
      phone: [
        'I need a complete 11-digit phone number to reach you! 📱',
        'That phone number seems incomplete. Could you enter all 11 digits?',
        'Let me get your full phone number (11 digits) so I can contact you if needed! 📱'
      ],
      date: [
        'I need your date of birth in MM/DD/YYYY format! 📅 For example: 01/15/1990',
        'Could you enter your birth date like this: MM/DD/YYYY? 📅',
        'I need that date in MM/DD/YYYY format to continue! 📅'
      ],
      patientId: [
        'I need a valid Patient ID to look you up! 🔍 Please make sure it follows this format: P-YYYYMMDD-XXXX',
        'That Patient ID format doesn\'t look right. Could you check it? It should be like P-20250822-1234',
        'Let me help you with that Patient ID format: P-YYYYMMDD-XXXX (like P-20250822-1234) 🔍'
      ]
    };
    return getRandomResponse(messages[type]);
  };

  const faqs = clinicCustomization.faqs || [];

  // Helper function to create image preview URL
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Helper function to construct full name from name components
  const constructFullName = (form: AppointmentForm | MedicalRecordRequestForm | PrescriptionRequestForm) => {
    const parts = [
      form.firstName?.trim(),
      form.middleInitial?.trim(),
      form.lastName?.trim(),
      form.suffix?.trim()
    ].filter(part => part && part.length > 0);
    
    return parts.join(' ');
  };

  // Helper function to construct full name matching backend format exactly
  const constructFullNameForLookup = (firstName: string, middleInitial: string, lastName: string, suffix: string) => {
    // Match the exact backend format: f"{first_name} {middle_initial or ''} {last_name} {suffix or ''}".strip().replace('  ', ' ')
    const fullName = `${firstName || ''} ${middleInitial || ''} ${lastName || ''} ${suffix || ''}`.trim().replace(/\s+/g, ' ');
    return fullName;
  };

  // Helper: Find best matching FAQ (simple substring match, case-insensitive)
  const findBestFaq = (question: string) => {
    const q = question.toLowerCase();
    // Try exact match first
    let found = faqs.find(faq => faq.question.toLowerCase() === q);
    if (found) return found;
    // Try substring match
    found = faqs.find(faq => q.includes(faq.question.toLowerCase()) || faq.question.toLowerCase().includes(q));
    if (found) return found;
    // Try answer match
    found = faqs.find(faq => faq.answer.toLowerCase().includes(q));
    return found;
  };

  useEffect(() => {
    if (showChat && clinicPhone) {
      setTimeout(() => {
        const greetingMessage = `Hello there! 👋 I'm Luna, your friendly healthcare assistant. I'm here to help make your healthcare experience as smooth as possible. Ready to get started?

⚠️ For Emergency, Please contact clinic directly via call: ${clinicPhone}`;
        
        addBotMessage(greetingMessage, [
          { label: "Let's get started!", value: "hi" }
        ]);
      }, 500);
    }
  }, [showChat, t, clinicPhone]);

  const addMessage = (
    sender: 'user' | 'bot', 
    text: string, 
    options?: { label: string; value: string }[], 
    dateSelector?: boolean, 
    timeSelector?: boolean, 
    times?: string[], 
    fileUpload?: boolean, 
    fileUploadLabel?: string, 
    fileUploadAccept?: string,
    messageType?: 'text' | 'options' | 'date' | 'doctor' | 'slot' | 'form' | 'datetime-picker',
    formFields?: FormField[],
    availableDates?: Date[],
    selectedDate?: Date,
    selectedTime?: string,
    dateTimePicker?: boolean,
    getTimeSlotsForDate?: (date: Date) => Promise<string[]>,
    showCancelOption?: boolean
  ) => {
    const messageId = uuidv4();
    // Create messageKey for options or timeSelector (for disabling functionality)
    const messageKey = (options || timeSelector || dateTimePicker) ? messageId : undefined;

    setMessages(prev => [...prev, {
      id: messageId,
      messageKey,
      sender,
      text,
      options,
      dateSelector,
      timeSelector,
      dateTimePicker,
      times,
      availableDates,
      selectedDate,
      selectedTime,
      getTimeSlotsForDate,
      fileUpload,
      fileUploadLabel,
      fileUploadAccept,
      type: messageType,
      formFields,
      showCancelOption
    }]);
  };

  // Enhanced bot message function with typing animation
  const addBotMessage = (
    text: string, 
    options?: { label: string; value: string }[], 
    dateSelector?: boolean, 
    timeSelector?: boolean, 
    times?: string[], 
    fileUpload?: boolean, 
    fileUploadLabel?: string, 
    fileUploadAccept?: string,
    messageType?: 'text' | 'options' | 'date' | 'doctor' | 'slot' | 'form' | 'datetime-picker',
    formFields?: FormField[],
    availableDates?: Date[],
    selectedDate?: Date,
    selectedTime?: string,
    typingDuration: number = 1000,
    dateTimePicker?: boolean,
    getTimeSlotsForDate?: (date: Date) => Promise<string[]>,
    showCancelOption?: boolean
  ) => {
    // Show typing indicator
    setIsTyping(true);
    const typingId = uuidv4();
    
    setMessages(prev => [...prev, {
      id: typingId,
      sender: 'bot',
      text: '',
      type: 'typing',
      isTyping: true
    }]);

    // After typing duration, remove typing indicator and add actual message
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => {
        // Remove typing indicator
        const withoutTyping = prev.filter(msg => msg.id !== typingId);
        
        // Add actual message
        const messageId = uuidv4();
        const messageKey = (options || timeSelector || dateTimePicker) ? messageId : undefined;

        return [...withoutTyping, {
          id: messageId,
          messageKey,
          sender: 'bot' as const,
          text,
          options,
          dateSelector,
          timeSelector,
          dateTimePicker,
          times,
          availableDates,
          selectedDate,
          selectedTime,
          getTimeSlotsForDate,
          fileUpload,
          fileUploadLabel,
          fileUploadAccept,
          type: messageType,
          formFields,
          showCancelOption
        }];
      });
    }, typingDuration);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    // Check if the result is exactly 11 digits
    return digitsOnly.length === 11;
  };

  const validatePatientId = (patientId: string): boolean => {
    // Patient ID format: P-YYYYMMDD-XXXX
    const patientIdRegex = /^P-\d{8}-\d{4}$/;
    return patientIdRegex.test(patientId.trim());
  };

  const validateDateOfBirth = (dob: string) => {
    const date = new Date(dob);
    const today = new Date();
    return date < today;
  };

  // Profanity detection
  const [profanityWords, setProfanityWords] = useState<string[]>([]);
  const [isLoadingProfanityWords, setIsLoadingProfanityWords] = useState(false);

  // Fetch profanity words from APIs
  const fetchProfanityWords = async () => {
    if (isLoadingProfanityWords || profanityWords.length > 0) return;
    
    setIsLoadingProfanityWords(true);
    try {
      const allWords: string[] = [];

      // Fetch English profanity words from PurgoMalum API
      try {
        const englishResponse = await fetch('https://www.purgomalum.com/service/plain?text=damn hell shit fuck bitch asshole bastard crap piss stupid retard moron dumbass jackass bullshit dickhead prick slut whore fag');
        if (englishResponse.ok) {
          const englishText = await englishResponse.text();
          // PurgoMalum replaces profanity with *, so we'll use a backup list
          const englishWords = [
            'damn', 'hell', 'shit', 'fuck', 'bitch', 'asshole', 'bastard', 'crap', 'piss', 'idiot',
            'stupid', 'retard', 'moron', 'dumbass', 'jackass', 'bullshit', 'wtf', 'stfu',
            'fucking', 'bloody', 'dickhead', 'prick', 'slut', 'whore', 'fag', 'gay',
            'kill yourself', 'die', 'suicide', 'murder', 'rape', 'hitler', 'nazi'
          ];
          allWords.push(...englishWords);
        }
      } catch (error) {
        console.warn('Failed to fetch English profanity words:', error);
        // Fallback English words
        const fallbackEnglish = [
          'damn', 'hell', 'shit', 'fuck', 'bitch', 'asshole', 'bastard', 'crap', 'piss', 'idiot',
          'stupid', 'retard', 'moron', 'dumbass', 'jackass', 'bullshit', 'wtf', 'stfu',
          'fucking', 'bloody', 'dickhead', 'prick', 'slut', 'whore', 'fag', 'gay'
        ];
        allWords.push(...fallbackEnglish);
      }

      // Add Tagalog profanity words (common ones)
      const tagalogWords = [
        'putang ina', 'putangina', 'tang ina', 'tangina', 'puta', 'gago', 'gaga', 'tanga',
        'bobo', 'ulol', 'tarantado', 'leche', 'peste', 'buwisit', 'hayop', 'animal',
        'kingina', 'pakyu', 'fuck you', 'hindot', 'kantot', 'jakol', 'bayag', 'titi',
        'bilat', 'puki', 'etits', 'tite', 'burat', 'tamod', 'pepe', 'dura', 'salsal'
      ];
      allWords.push(...tagalogWords);

      // Remove duplicates and convert to lowercase
      const uniqueWords = [...new Set(allWords.map(word => word.toLowerCase()))];
      
      setProfanityWords(uniqueWords);
      
    } catch (error) {
      console.error('Error fetching profanity words:', error);
      // Fallback to basic list
      const fallbackWords = [
        'damn', 'hell', 'shit', 'fuck', 'bitch', 'putang ina', 'gago', 'tanga', 'bobo'
      ];
      setProfanityWords(fallbackWords);
    } finally {
      setIsLoadingProfanityWords(false);
    }
  };

  // Load profanity words when component mounts
  useEffect(() => {
    fetchProfanityWords();
  }, []);

  const containsProfanity = (text: string): boolean => {
    if (profanityWords.length === 0) return false; // Skip if words not loaded yet
    
    const normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, '');
    
    // Check for exact word matches
    const words = normalizedText.split(/\s+/);
    for (const word of words) {
      if (profanityWords.includes(word)) {
        return true;
      }
    }

    // Check for partial matches in longer words (like "f*ck" variations)
    for (const profanity of profanityWords) {
      if (profanity.length > 3) { // Only check longer words to avoid false positives
        const regex = new RegExp(profanity.split('').join('[^a-z]*'), 'i');
        if (regex.test(normalizedText)) {
          return true;
        }
      }
    }

    // Check for multi-word phrases (like "putang ina")
    for (const profanity of profanityWords) {
      if (profanity.includes(' ') && normalizedText.includes(profanity)) {
        return true;
      }
    }

    return false;
  };

  const handleProfanityDetection = (userInput: string): boolean => {
    if (profanityWords.length === 0) {
      // If profanity words haven't loaded yet, allow the message but try to load them
      if (!isLoadingProfanityWords) {
        fetchProfanityWords();
      }
      return false;
    }
    
    if (containsProfanity(userInput)) {
      addBotMessage(t('chatbot.keepRespectful'));
      return true;
    }
    return false;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return; // Prevent sending empty messages
    
    // Check for profanity before processing the message
    if (handleProfanityDetection(input)) {
      setInput(''); // Clear the input
      return; // Stop processing the message
    }
    
    if (chatStep === 0) {
      addMessage('user', input);
      setInput('');
      
      setTimeout(() => {
        addBotMessage(t('chatbot.howCanIHelp'), [
          { label: '📅 Book an Appointment', value: 'appointment' },
          { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
          { label: '💊 Request Prescription Refill', value: 'prescription' },
          { label: '❓ Ask Questions (FAQ)', value: 'faq' },
        ]);
        setChatStep(1);
      }, 500);
      return;
    }
    
    // Handle step 1 - main menu selection via typing
    if (chatStep === 1 && !chatMode) {
      const inputLower = input.toLowerCase().trim();
      setInput('');
      
      // Check what the user typed and map to appropriate action
      if (inputLower.includes('appointment') || inputLower.includes('schedule') || inputLower.includes('book') || inputLower === '1') {
        // Don't add user message, directly proceed to appointment flow
        setTimeout(() => {
          handleOptionSelect('appointment');
        }, 300);
      } else if (inputLower.includes('medical') || inputLower.includes('record') || inputLower.includes('certificate') || inputLower.includes('document') || inputLower === '2') {
        // Don't add user message, directly proceed to medical record flow
        setTimeout(() => {
          handleOptionSelect('medicalRecord');
        }, 300);
      } else if (inputLower.includes('prescription') || inputLower.includes('e-prescription') || inputLower.includes('medicine') || inputLower.includes('medication') || inputLower === '3') {
        // Don't add user message, directly proceed to prescription flow
        setTimeout(() => {
          handleOptionSelect('prescription');
        }, 300);
      } else if (inputLower.includes('faq') || inputLower.includes('question') || inputLower.includes('help') || inputLower === '4') {
        // Don't add user message, directly proceed to FAQ flow
        setTimeout(() => {
          handleOptionSelect('faq');
        }, 300);
      } else {
        // Only show user message if input doesn't match any option
        addMessage('user', input);
        // If input doesn't match any option, show the menu again with guidance
        setTimeout(() => {
          addBotMessage('I didn\'t understand that. Please choose one of the following options by typing the number or service name:', [
            { label: '1. 📅 Book an Appointment', value: 'appointment' },
            { label: '2. 📋 Get Medical Certificate', value: 'medicalRecord' },
            { label: '3. 💊 Request Prescription Refill', value: 'prescription' },
            { label: '4. ❓ Ask Questions (FAQ)', value: 'faq' },
          ]);
        }, 500);
      }
      return;
    }
    
    // FAQ chat mode
    if (chatMode === 'faq') {
      // Check for profanity in FAQ questions
      if (handleProfanityDetection(input)) {
        setInput('');
        return;
      }
      
      addMessage('user', input);
      const match = findBestFaq(input);
      setInput('');
      setTimeout(() => {
        if (match) {
          addBotMessage(match.answer);
        } else {
          addBotMessage(t('chatbot.couldntFindAnswer'));
        }
        // Show FAQ options again or allow return
        setTimeout(() => {
          addBotMessage(t('chatbot.askAnotherQuestion'), [
            ...faqs.map((faq, i) => ({ label: faq.question, value: `faq_${i}` })),
            { label: t('chatbot.mainMenu'), value: 'main' },
          ]);
          setChatStep(2);
        }, 500);
      }, 500);
      return;
    }

    // Handle patient lookup confirmation
    if (chatStep === 'confirm_match') {
      const inputLower = input.toLowerCase().trim();
      
      if (inputLower === 'yes' || inputLower === 'y') {
        addMessage('user', 'Yes');
        setInput('');
        
        if (lookupResult && lookupResult.patient_id) {
          // Store the patient ID
          const patientId = lookupResult.patient_id;
          
          if (chatMode === 'medicalRecord') {
            setMedicalRecordForm(prev => ({ ...prev, patientId }));
          } else if (chatMode === 'prescription') {
            setPrescriptionForm(prev => ({ ...prev, patientId }));
          } else if (chatMode === 'appointment') {
            setAppointmentForm(prev => ({ ...prev, patient_id: patientId }));
          }
          
          localStorage.setItem('chatbot_patient_id', patientId);
          
          addBotMessage('Perfect! I\'ve confirmed your patient record. Let\'s continue your request.');
          
          setTimeout(() => {
            if (chatMode === 'medicalRecord' || chatMode === 'prescription') {
              fetchPatientDataAndContinue(patientId, chatMode);
            } else if (chatMode === 'appointment') {
              fetchPatientDataAndContinueAppointment(patientId);
            }
          }, 1000);
        }
      } else if (inputLower === 'no' || inputLower === 'n') {
        addMessage('user', 'No');
        setInput('');
        
        setTimeout(() => {
          addBotMessage('I understand. Please re-enter your information carefully:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
            {
              name: 'fullName',
              label: 'Full Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your full name as registered'
            },
            {
              name: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true,
              placeholder: 'YYYY-MM-DD'
            },
            {
              name: 'email',
              label: 'Registered Email',
              type: 'email',
              required: true,
              placeholder: 'your.email@example.com'
            },
            {
              name: 'phone',
              label: 'Registered Phone Number',
              type: 'tel',
              required: true,
              placeholder: '09123456789'
            }
          ]);
          setChatStep('lookup');
          setIsInputDisabled(true);
        }, 500);
      } else {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addBotMessage('Please reply with YES or NO to confirm if this is your record.');
        }, 500);
      }
      return;
    }
    
    // Handle different chat modes
    if (chatMode === 'appointment') {
      if (chatStep === 2) {
        // Handle appointment scheduling preference via typing
        const inputLower = input.toLowerCase().trim();
        setInput('');
        
        if (inputLower.includes('doctor') || inputLower.includes('physician') || inputLower === '1') {
          // Don't show user message, directly proceed to doctor-first flow
          setTimeout(() => {
            handleOptionSelect('doctor-first');
          }, 300);
        } else if (inputLower.includes('date') || inputLower.includes('time') || inputLower === '2') {
          // Don't show user message, directly proceed to date-first flow
          setTimeout(() => {
            handleOptionSelect('date-first');
          }, 300);
        } else {
          // Show user message for unrecognized input with helpful guidance
          addMessage('user', input);
          setTimeout(() => {
            addBotMessage('I didn\'t understand that. Please choose how you\'d like to schedule:', [
              { label: '1. Select Doctor First', value: 'doctor-first' },
              { label: '2. Select Date First', value: 'date-first' }
            ]);
          }, 500);
        }
        return;
      } else if (chatStep === 6.1) {
        // Handle Patient ID input for returning patients
        if (!validatePatientId(input)) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addBotMessage(getValidationErrorMessage('patientId'));
          }, 500);
          return;
        }
        
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, patient_id: input }));
        setInput('');
        
        // Check if patient already exists (for returning patients only)
        setTimeout(async () => {
          try {
            addBotMessage('Looking up your information... ⏳');
            
            const response = await api.patients.checkByPatientId(input);
            
            if (response.exists && response.patient) {
              console.log('[DEBUG] Raw patient data from API:', response.patient);
              console.log('[DEBUG] date_of_birth type:', typeof response.patient.date_of_birth, response.patient.date_of_birth);
              setExistingPatient(response.patient);
              
              setTimeout(() => {
                addBotMessage(`Welcome back, ${response.patient.name}! 🎉 I found your information in our system. Would you like me to use your existing details or update them?`, [
                  { label: '✅ Use my existing info', value: 'use-existing-info' },
                  { label: '📝 I need to update something', value: 'update-info' }
                ]);
                setChatStep(6.2); // Existing patient choice
                setIsInputDisabled(true);
              }, 1000);
            } else {
              setExistingPatient(null);
              setTimeout(() => {
                addBotMessage(`I couldn't find any records with the Patient ID ${input}. Please double-check your Patient ID or you might be a new patient. Let me guide you through our registration process.`);
                
                setTimeout(() => {
                  addBotMessage('Before we proceed, I need to inform you that we will be collecting some personal information to process your appointment request.');
                  
                  setTimeout(() => {
                    addBotMessage('This includes your full name, phone number, and appointment details. Your information will be kept secure and used only for healthcare purposes.');
                    
                    setTimeout(() => {
                      addBotMessage('Please confirm that you agree to our Terms and Conditions and Privacy Policy:', [
                        { label: '✓ I agree to Terms & Conditions and Privacy Policy', value: 'agree-terms' },
                        { label: '✗ I do not agree', value: 'decline-terms' }
                      ]);
                      setChatStep(6.5);
                      setIsInputDisabled(true);
                    }, 1000);
                  }, 1000);
                }, 1000);
              }, 1000);
            }
          } catch (error) {
            console.error('Error checking existing patient:', error);
            // Treat as new patient if API fails
            setExistingPatient(null);
            setTimeout(() => {
              addBotMessage('I apologize, but I\'m having trouble accessing our records right now. Let me help you as a new patient.');
              
              setTimeout(() => {
                addBotMessage('Before we proceed, I need to inform you that we will be collecting some personal information to process your appointment request.');
                
                setTimeout(() => {
                  addBotMessage('This includes your full name, phone number, and appointment details. Your information will be kept secure and used only for healthcare purposes.');
                  
                  setTimeout(() => {
                    addBotMessage('Please confirm that you agree to our Terms and Conditions and Privacy Policy:', [
                      { label: '✓ I agree to Terms & Conditions and Privacy Policy', value: 'agree-terms' },
                      { label: '✗ I do not agree', value: 'decline-terms' }
                    ]);
                    setChatStep(6.5);
                    setIsInputDisabled(true);
                  }, 1000);
                }, 1000);
              }, 1000);
            }, 1000);
          }
        }, 500);
      } else if (chatStep === 7) {
        // Ask for first name
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, firstName: input }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage('Please enter your middle initial (or press Enter to skip):');
          setChatStep(7.1);
        }, 500);
      } else if (chatStep === 7.1) {
        // Ask for middle initial (optional)
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, middleInitial: input.trim() }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage('Please enter your last name:');
          setChatStep(7.2);
        }, 500);
      } else if (chatStep === 7.2) {
        // Ask for last name
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, lastName: input }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage('Please enter your suffix (Jr., Sr., III, etc.) or press Enter to skip:');
          setChatStep(7.3);
        }, 500);
      } else if (chatStep === 7.3) {
        // Ask for suffix (optional)
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, suffix: input.trim() }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage(t('chatbot.enterEmail'));
          setChatStep(8);
        }, 500);
      } else if (chatStep === 8) {
        // Validate email
        if (!validateEmail(input)) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addBotMessage(getValidationErrorMessage('email'));
          }, 500);
          return;
        }
        
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, email: input }));
        setInput('');
        
        // Check if patient already exists
        setTimeout(async () => {
          try {
            addBotMessage('Checking if you are a returning patient...');
            
            const response = await api.patients.checkByEmail(input);
            
            if (response.exists && response.patient) {
              setExistingPatient(response.patient);
              
              setTimeout(() => {
                addBotMessage(`Welcome back, ${response.patient.name}! I found your information in our system. Would you like me to use your existing details or update them?`, [
                  { label: 'Use Existing Info', value: 'use-existing-info' },
                  { label: 'Update My Info', value: 'update-info' }
                ]);
                setChatStep(8.5); // New intermediate step
              }, 1000);
            } else {
              setExistingPatient(null);
              setTimeout(() => {
                addBotMessage(t('chatbot.enterPhone'));
                setChatStep(9);
              }, 1000);
            }
          } catch (error) {
            console.error('Error checking existing patient:', error);
            // Continue with normal flow if API fails
            setExistingPatient(null);
            setTimeout(() => {
              addBotMessage(t('chatbot.enterPhone'));
              setChatStep(9);
            }, 1000);
          }
        }, 500);
      } else if (chatStep === 9) {
        // Validate phone
        if (!validatePhone(input)) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addBotMessage(getValidationErrorMessage('phone'));
          }, 500);
          return;
        }
        
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, phone: input }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage('Please enter your date of birth (MM/DD/YYYY):');
          setChatStep(10);
        }, 500);
      } else if (chatStep === 10) {
        // Validate date of birth
        const dob = new Date(input);
        if (isNaN(dob.getTime())) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addBotMessage(getValidationErrorMessage('date'));
          }, 500);
          return;
        }

        // Validate date range (between 1 and 100 years ago)
        const today = new Date();
        const minDate = new Date();
        minDate.setFullYear(today.getFullYear() - 100);
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() - 1);

        if (dob < minDate || dob > maxDate) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addBotMessage('Please enter a valid date of birth! 📅 It should be between 1 and 100 years ago.');
          }, 500);
          return;
        }

        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, dateOfBirth: input }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage(t('chatbot.selectGender'), [
            { label: t('chatbot.male'), value: 'male' },
            { label: t('chatbot.female'), value: 'female' },
            { label: t('chatbot.other'), value: 'other' }
          ]);
          setChatStep(11);
        }, 500);
      } else if (chatStep === 11) {
        // Gender selection is handled in handleOptionSelect
        return;
      } else if (chatStep === 12) {
        // Check for profanity in address input
        if (handleProfanityDetection(input)) {
          setInput('');
          return;
        }
        
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, address: input }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage('Please select your marital status:', [
            { label: 'Single', value: 'single' },
            { label: 'Married', value: 'married' },
            { label: 'Divorced', value: 'divorced' },
            { label: 'Widowed', value: 'widowed' }
          ]);
          setChatStep(13);
        }, 500);
      } else if (chatStep === 13) {
        // Marital status selection is handled in handleOptionSelect
        return;
      } else if (chatStep === 14) {
        // Check for profanity in notes input
        if (input.trim() && handleProfanityDetection(input)) {
          setInput('');
          return;
        }
        
        // Handle notes
        addMessage('user', input || 'No additional notes');
        setAppointmentForm(prev => ({ ...prev, notes: input }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage(t('chatbot.appointmentSummary'));
          
          setTimeout(() => {
            // Construct full name from components
            const fullName = constructFullName(appointmentForm);

            const summary = `
              Date: ${appointmentForm.date?.toLocaleDateString() || 'Not selected'}
              Time: ${appointmentForm.time}
              Type: ${appointmentForm.type}
              Name: ${fullName}
              Email: ${appointmentForm.email}
              Phone: ${appointmentForm.phone}
              Date of Birth: ${appointmentForm.dateOfBirth}
              Gender: ${appointmentForm.gender}
              Address: ${appointmentForm.address}
              Marital Status: ${appointmentForm.maritalStatus}
              Notes: ${appointmentForm.notes || 'None'}
            `;
            
            addBotMessage(summary, [
              { label: 'Confirm Appointment', value: 'confirm' },
              { label: 'Cancel', value: 'cancel' }
            ]);
            setChatStep(15);
          }, 500);
        }, 500);
      } else if (chatStep === 15) {
        // Confirmation is handled in handleOptionSelect
        return;
      } else if (chatStep === 'additional-notes') {
        // Handle additional notes input
        addMessage('user', input || 'No additional notes');
        setAppointmentForm(prev => ({ ...prev, notes: input }));
        setInput('');
        
        setTimeout(() => {
          addBotMessage('How would you like to receive the confirmation of your booking?', [
            { label: '📱 Text Message', value: 'confirmation-sms' },
            { label: '📧 Email', value: 'confirmation-email' }
          ]);
          setChatStep('confirmation-method');
          setIsInputDisabled(true);
        }, 500);
      }
    } else if (chatMode === 'medicalRecord') {
      await handleMedicalRecordFlow();
    } else if (chatMode === 'prescription') {
      await handlePrescriptionFlow();
    }
  };

  const handleMedicalRecordFlow = async () => {
    // Check for profanity in medical record inputs
    if (handleProfanityDetection(input)) {
      setInput('');
      return;
    }

    if (chatStep === 2) {
      // Handle Patient ID input or lookup
      if (input.toLowerCase().includes('forgot') || input === 'I forgot my Patient ID.') {
        addMessage('user', 'I forgot my Patient ID.');
        
        setTimeout(() => {
          addBotMessage('No worries! I can help you find your Patient ID. Please fill out the form below with your registered information:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
            {
              name: 'fullName',
              label: 'Full Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your full name as registered'
            },
            {
              name: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true,
              placeholder: 'YYYY-MM-DD'
            },
            {
              name: 'email',
              label: 'Registered Email',
              type: 'email',
              required: true,
              placeholder: 'your.email@example.com'
            },
            {
              name: 'phone',
              label: 'Registered Phone Number',
              type: 'tel',
              required: true,
              placeholder: '09123456789'
            }
          ]);
          setChatStep('lookup');
          setIsInputDisabled(true);
        }, 500);
        return;
      }

      if (!validatePatientId(input)) {
        addBotMessage('Please enter a valid Patient ID in the format P-YYYYMMDD-XXXX (e.g., P-20250822-1234)', [
          { label: 'Forgot Patient ID?', value: 'forgot-patient-id' }
        ]);
        setInput('');
        return;
      }
      
      addMessage('user', input);
      
      // Fetch patient data and populate form
      try {
        addBotMessage('Validating patient ID and fetching your information...');
        const patientData = await fetchPatientData(input);
        
        setMedicalRecordForm(prev => ({ 
          ...prev, 
          patientId: input,
          firstName: patientData.first_name || '',
          middleInitial: patientData.middle_initial || '',
          lastName: patientData.last_name || '',
          suffix: patientData.suffix || '',
          dateOfBirth: patientData.date_of_birth || '',
          email: patientData.email || '',
          phone: patientData.phone || ''
        }));
        
        setTimeout(() => {
          addBotMessage(`Great! I found your information:
            Name: ${patientData.first_name || ''} ${patientData.middle_initial || ''} ${patientData.last_name || ''} ${patientData.suffix || ''}
            Email: ${patientData.email || 'Not provided'}
            Phone: ${patientData.phone || 'Not provided'}
            
Now please upload the FRONT side of your valid government-issued ID for verification.`, [], false, false, [], true, 'Upload ID Front', 'image/*');
          setChatStep(3);
        }, 1000);
        
      } catch (error) {
        console.error('Error fetching patient data:', error);
        addBotMessage('Sorry, I could not find a patient with that ID. Please check your Patient ID and try again.');
        setInput('');
        return;
      }
      
      setInput('');
    } else if (chatMode === 'medicalRecord' && chatStep === 3) {
      // Front ID upload is handled by handleFileUpload - this step waits for file upload
      return;
    } else if (chatMode === 'medicalRecord' && chatStep === 3.5) {
      // Back ID upload is handled by handleFileUpload - this step waits for file upload
      return;
    } else if (chatMode === 'medicalRecord' && chatStep === 4) {
      // This step happens after ID upload - ask for additional info
      addMessage('user', input || 'No additional information');
      setMedicalRecordForm(prev => ({ ...prev, additionalInfo: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Thank you! Here is a summary of your medical certificate request:');
        
        setTimeout(() => {
          const summary = `
            Request Type: Medical Certificate
            Patient ID: ${medicalRecordForm.patientId}
            ID Verification: ${medicalRecordForm.idVerificationFront && medicalRecordForm.idVerificationBack ? 'Both sides uploaded' : 'Not complete'}
            Additional Info: ${medicalRecordForm.additionalInfo || 'None'}
          `;
          
          addBotMessage(summary, [
            { label: 'Submit Request', value: 'submit-record-request' },
            { label: 'Cancel', value: 'cancel-record-request' }
          ]);
          setChatStep(5);
        }, 500);
      }, 500);
    }
  };

  const handlePrescriptionFlow = async () => {
    // Check for profanity in prescription inputs
    if (handleProfanityDetection(input)) {
      setInput('');
      return;
    }

    if (chatStep === 2) {
      // Handle Patient ID input or lookup
      if (input.toLowerCase().includes('forgot') || input === 'I forgot my Patient ID.') {
        addMessage('user', 'I forgot my Patient ID.');
        
        setTimeout(() => {
          addBotMessage('No worries! I can help you find your Patient ID. Please fill out the form below with your registered information:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
            {
              name: 'fullName',
              label: 'Full Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your full name as registered'
            },
            {
              name: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true,
              placeholder: 'YYYY-MM-DD'
            },
            {
              name: 'email',
              label: 'Registered Email',
              type: 'email',
              required: true,
              placeholder: 'your.email@example.com'
            },
            {
              name: 'phone',
              label: 'Registered Phone Number',
              type: 'tel',
              required: true,
              placeholder: '09123456789'
            }
          ]);
          setChatStep('lookup');
          setIsInputDisabled(true);
        }, 500);
        return;
      }

      if (!validatePatientId(input)) {
        addBotMessage('Please enter a valid Patient ID in the format P-YYYYMMDD-XXXX (e.g., P-20250822-1234)', [
          { label: 'Forgot Patient ID?', value: 'forgot-patient-id' }
        ]);
        setInput('');
        return;
      }
      
      addMessage('user', input);
      
      // Fetch patient data and populate form
      try {
        addBotMessage('Validating patient ID and fetching your information...');
        const patientData = await fetchPatientData(input);
        
        setPrescriptionForm(prev => ({ 
          ...prev, 
          patientId: input,
          firstName: patientData.first_name || '',
          middleInitial: patientData.middle_initial || '',
          lastName: patientData.last_name || '',
          suffix: patientData.suffix || '',
          dateOfBirth: patientData.date_of_birth || '',
          email: patientData.email || '',
          phone: patientData.phone || ''
        }));
        
        setTimeout(() => {
          addBotMessage(`Great! I found your information:
            Name: ${patientData.first_name || ''} ${patientData.middle_initial || ''} ${patientData.last_name || ''} ${patientData.suffix || ''}
            Email: ${patientData.email || 'Not provided'}
            Phone: ${patientData.phone || 'Not provided'}
            
Now please upload the FRONT side of your valid government-issued ID for verification.`, [], false, false, [], true, 'Upload ID Front', 'image/*');
          setChatStep(3);
        }, 1000);
        
      } catch (error) {
        console.error('Error fetching patient data:', error);
        addBotMessage('Sorry, I could not find a patient with that ID. Please check your Patient ID and try again.');
        setInput('');
        return;
      }
      
      setInput('');
    } else if (chatMode === 'prescription' && chatStep === 3) {
      // Front ID upload is handled by handleFileUpload - this step waits for file upload
      return;
    } else if (chatMode === 'prescription' && chatStep === 3.5) {
      // Back ID upload is handled by handleFileUpload - this step waits for file upload
      return;
    } else if (chatMode === 'prescription' && chatStep === 4) {
      // Skip this step for refills - shouldn't reach here
      setChatStep(7);
    } else if (chatStep === 5) {
      // Skip this step for refills - shouldn't reach here
      setChatStep(7);
    } else if (chatStep === 6) {
      // Skip this step for refills - shouldn't reach here
      setChatStep(7);
    } else if (chatMode === 'prescription' && chatStep === 7) {
      addMessage('user', input);
      
      // For refills, this is additional notes
      setPrescriptionForm(prev => ({ ...prev, additionalNotes: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Thank you! Here is a summary of your prescription refill request:');
        
        setTimeout(() => {
          const summary = `
            Patient ID: ${prescriptionForm.patientId}
            Request Type: Prescription Refill
            Additional Notes: ${input || 'None'}
          `;
          
          addBotMessage(summary, [
            { label: '✓ Submit Refill Request', value: 'confirm-prescription-refill' },
            { label: '✗ Cancel Request', value: 'cancel-prescription-request' }
          ]);
          setChatStep(9);
        }, 1000);
      }, 500);
    } else if (chatStep === 8) {
      addMessage('user', input || 'No additional notes');
      setPrescriptionForm(prev => ({ ...prev, additionalNotes: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Thank you! Here is a summary of your prescription request:');
        
        setTimeout(() => {
          const summary = `
            Patient ID: ${prescriptionForm.patientId}
            Medication: ${prescriptionForm.medicationName}
            Dosage: ${prescriptionForm.dosage}
            Frequency: ${prescriptionForm.frequency}
            Duration: ${prescriptionForm.duration}
            ID Verification: ${prescriptionForm.idVerificationFront && prescriptionForm.idVerificationBack ? 'Both sides uploaded' : 'Not complete'}
            Additional Notes: ${prescriptionForm.additionalNotes || 'None'}
          `;
          
          addBotMessage(summary, [
            { label: 'Submit Request', value: 'submit-prescription-request' },
            { label: 'Cancel', value: 'cancel-prescription-request' }
          ]);
          setChatStep(9);
        }, 500);
      }, 500);
    }
  };

  const getDoctorAvailability = () => {
    const doctors = users.filter(user => user.role === 'doctor');
    const existingAppointmentDates = new Set();
    appointments.forEach(appointment => {
      existingAppointmentDates.add(appointment.date);
    });
    
    const availableDates: Date[] = [];
    const today = new Date();
    let daysToCheck = 20;
    
    for (let i = 1; i <= daysToCheck && availableDates.length < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() + i);
      
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;
      
      const dateString = checkDate.toISOString().split('T')[0];
      const appointmentsOnDate = appointments.filter(app => app.date === dateString);
      
      if (appointmentsOnDate.length < 8) {
        availableDates.push(checkDate);
      }
    }
    
    return availableDates.map(date => ({
      date,
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }));
  };

  const handleFileUpload = async (file: File) => {
    try {
      // Create image preview
      const previewUrl = await createImagePreview(file);
      
      if (chatMode === 'medicalRecord') {
        if (chatStep === 3) {
          // Front ID upload
          setMedicalRecordForm(prev => ({
            ...prev,
            idVerificationFront: file,
            idVerificationFrontPreview: previewUrl
          }));
          
          addMessage('user', `✅ Front ID uploaded: ${file.name}`);
          setTimeout(() => {
            addBotMessage('Great! Now please upload the BACK side of your ID for complete verification.', [], false, false, [], true, 'Upload ID Back', 'image/*');
            setChatStep(3.5);
          }, 500);
          
        } else if (chatStep === 3.5) {
          // Back ID upload
          setMedicalRecordForm(prev => ({
            ...prev,
            idVerificationBack: file,
            idVerificationBackPreview: previewUrl
          }));
          
          addMessage('user', `✅ Back ID uploaded: ${file.name}`);
          setTimeout(() => {
            addBotMessage('Perfect! Both sides of your ID have been uploaded. Is there any additional information you would like to provide for your medical certificate request? (Optional)');
            setChatStep(4);
          }, 500);
        }
      } else if (chatMode === 'prescription') {
        if (chatStep === 3) {
          // Front ID upload
          setPrescriptionForm(prev => ({
            ...prev,
            idVerificationFront: file,
            idVerificationFrontPreview: previewUrl
          }));
          
          addMessage('user', `✅ Front ID uploaded: ${file.name}`);
          setTimeout(() => {
            addBotMessage('Great! Now please upload the BACK side of your ID for complete verification.', [], false, false, [], true, 'Upload ID Back', 'image/*');
            setChatStep(3.5);
          }, 500);
          
        } else if (chatStep === 3.5) {
          // Back ID upload
          setPrescriptionForm(prev => ({
            ...prev,
            idVerificationBack: file,
            idVerificationBackPreview: previewUrl
          }));
          
          addMessage('user', `✅ Back ID uploaded: ${file.name}`);
          setTimeout(() => {
            addBotMessage('Perfect! Both sides of your ID have been uploaded. For prescription refills, I will request a refill of your most recent prescription. Please provide any additional notes for the doctor (optional):');
            setChatStep(7); // Go directly to notes for refills
          }, 500);
        } else if (chatStep === 10) {
          setPrescriptionForm(prev => ({ ...prev, idVerification: file }));
          
          addMessage('user', `Uploaded ID: ${file.name}`);
          
          setTimeout(() => {
           addBotMessage( 'Please upload an image of your previous prescription or relevant medical document (optional):', [
              { label: 'Skip Upload', value: 'skip-prescription-image' }
            ], undefined, undefined, undefined, true, "Upload Prescription", "image/*");
            setChatStep(11);
          }, 500);
        } else if (chatStep === 11) {
          const prescriptionPreview = await createImagePreview(file);
          setPrescriptionForm(prev => ({ 
            ...prev, 
            prescriptionImage: file,
            prescriptionImagePreview: prescriptionPreview
          }));
          
          addMessage('user', `Uploaded prescription: ${file.name}`);
          
          setTimeout(() => {
            addBotMessage( 'Any additional notes about your prescription request? (Optional)');
            setChatStep(12);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      addBotMessage('Sorry, there was an error uploading your file. Please try again.');
    }
  };

  const handleOptionSelect = async (value: string, messageKey?: string) => {
    // Handle patient lookup options first
    if (value === 'forgot-patient-id') {
      addMessage('user', 'I forgot my Patient ID.');
      setIsPatientLookup(true);
      
      setTimeout(() => {
        addBotMessage('No worries! I can help you find your Patient ID. Please fill out the form below with your registered information exactly as you provided during registration:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: true,
            placeholder: 'Enter your first name'
          },
          {
            name: 'middleInitial',
            label: 'Middle Initial (if any)',
            type: 'text',
            required: false,
            placeholder: 'M (optional)'
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: true,
            placeholder: 'Enter your last name'
          },
          {
            name: 'suffix',
            label: 'Suffix (if any)',
            type: 'text',
            required: false,
            placeholder: 'Jr., Sr., III, etc. (optional)'
          },
          {
            name: 'dateOfBirth',
            label: 'Date of Birth',
            type: 'date',
            required: true,
            placeholder: 'YYYY-MM-DD'
          },
          {
            name: 'email',
            label: 'Registered Email',
            type: 'email',
            required: true,
            placeholder: 'your.email@example.com'
          },
          {
            name: 'phone',
            label: 'Registered Phone Number',
            type: 'tel',
            required: true,
            placeholder: '09123456789'
          }
        ]);
        setChatStep('lookup');
        setIsInputDisabled(true);
      }, 500);
      return;
    }

    if (value === 'retry-lookup') {
      addMessage('user', 'Try again');
      
      setTimeout(() => {
        addBotMessage('Please fill out the form below with your registered information exactly as you provided during registration:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
          {
            name: 'firstName',
            label: 'First Name',
            type: 'text',
            required: true,
            placeholder: 'Enter your first name'
          },
          {
            name: 'middleInitial',
            label: 'Middle Initial (if any)',
            type: 'text',
            required: false,
            placeholder: 'M (optional)'
          },
          {
            name: 'lastName',
            label: 'Last Name',
            type: 'text',
            required: true,
            placeholder: 'Enter your last name'
          },
          {
            name: 'suffix',
            label: 'Suffix (if any)',
            type: 'text',
            required: false,
            placeholder: 'Jr., Sr., III, etc. (optional)'
          },
          {
            name: 'dateOfBirth',
            label: 'Date of Birth',
            type: 'date',
            required: true,
            placeholder: 'YYYY-MM-DD'
          },
          {
            name: 'email',
            label: 'Registered Email',
            type: 'email',
            required: true,
            placeholder: 'your.email@example.com'
          },
          {
            name: 'phone',
            label: 'Registered Phone Number',
            type: 'tel',
            required: true,
            placeholder: '09123456789'
          }
        ]);
        setChatStep('lookup');
        setIsInputDisabled(true);
      }, 500);
      return;
    }

    // Handle confirmation for partial matches
    if (chatStep === 'confirm_match') {
      if (value.toLowerCase() === 'yes' || input.toLowerCase() === 'yes') {
        addMessage('user', 'Yes');
        
        if (lookupResult && lookupResult.patient_id) {
          // Store the patient ID
          const patientId = lookupResult.patient_id;
          
          if (chatMode === 'appointment') {
            setAppointmentForm(prev => ({ ...prev, patient_id: patientId }));
          } else if (chatMode === 'medicalRecord') {
            setMedicalRecordForm(prev => ({ ...prev, patientId }));
          } else if (chatMode === 'prescription') {
            setPrescriptionForm(prev => ({ ...prev, patientId }));
          }
          
          localStorage.setItem('chatbot_patient_id', patientId);
          
          addBotMessage('✅ Perfect! I\'ve confirmed your patient record. Let\'s continue your request.');
          
          setTimeout(() => {
            if (chatMode === 'appointment') {
              fetchPatientDataAndContinueAppointment(patientId);
            } else if (chatMode === 'medicalRecord' || chatMode === 'prescription') {
              fetchPatientDataAndContinue(patientId, chatMode);
            }
          }, 1000);
        }
      } else if (value.toLowerCase() === 'no' || input.toLowerCase() === 'no') {
        addMessage('user', 'No');
        
        setTimeout(() => {
          addBotMessage('No worries! Let me help you find your Patient ID. Please fill out the form below with your registered information exactly as you provided during registration:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
            {
              name: 'firstName',
              label: 'First Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your first name'
            },
            {
              name: 'middleInitial',
              label: 'Middle Initial (if any)',
              type: 'text',
              required: false,
              placeholder: 'M (optional)'
            },
            {
              name: 'lastName',
              label: 'Last Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your last name'
            },
            {
              name: 'suffix',
              label: 'Suffix (if any)',
              type: 'text',
              required: false,
              placeholder: 'Jr., Sr., III, etc. (optional)'
            },
            {
              name: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true,
              placeholder: 'YYYY-MM-DD'
            },
            {
              name: 'email',
              label: 'Registered Email',
              type: 'email',
              required: true,
              placeholder: 'your.email@example.com'
            },
            {
              name: 'phone',
              label: 'Registered Phone Number',
              type: 'tel',
              required: true,
              placeholder: '09123456789'
            }
          ]);
          setChatStep('lookup');
          setIsInputDisabled(true);
        }, 500);
      }
      return;
    }

    // Disable the message options when an option is selected
    if (messageKey) {
      setDisabledMessages(prev => new Set([...prev, messageKey]));
      
      // Update the specific message to disable its options or time slots
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.messageKey === messageKey 
            ? {
                ...msg,
                // Disable regular options
                options: msg.options?.map(option => ({ ...option, disabled: true })),
                // Keep timeSelector visible but mark times as disabled and set selected time
                timesDisabled: msg.timeSelector ? true : undefined,
                selectedTime: msg.timeSelector ? value : msg.selectedTime
              }
            : msg
        )
      );
    }

    // Handle initial "Hi" button
    if (value === 'hi') {
      addMessage('user', 'Lets Get Started!');
      setChatStep(1);
      setIsInputDisabled(false); // Ensure input is enabled after greeting
      setTimeout(() => {
        addBotMessage("Nice to meet you! 🌟 I'm here to help you with your healthcare needs. What would you like to do today?", [
          { label: '📅 Book an Appointment', value: 'appointment' },
          { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
          { label: '💊 Request Prescription Refill', value: 'prescription' },
          { label: '❓ Ask Questions (FAQ)', value: 'faq' },
        ]);
      }, 500);
      return;
    }
    
    if (value === 'faq') {
      setChatMode('faq');
      addMessage('user', 'I have some questions');
      setTimeout(() => {
        addBotMessage('I love answering questions! 💭 Here are some common ones I get asked, or feel free to type your own question:',
          [
            ...faqs.map((faq, i) => ({ label: faq.question, value: `faq_${i}` })),
            { label: '⬅️ Back to Main Menu', value: 'main' },
          ]
        );
        setChatStep(2);
      }, 500);
      return;
    }
    // FAQ mode: handle question selection or back
    if (chatMode === 'faq' && chatStep === 2) {
      if (value === 'main') {
        setChatMode(null);
        setTimeout(() => {
          addBotMessage('How can I assist you today?', [
            { label: '📅 Book an Appointment', value: 'appointment' },
            { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
            { label: '💊 Request Prescription Refill', value: 'prescription' },
          ]);
          setChatStep(1);
        }, 500);
        return;
      }
      if (value.startsWith('faq_')) {
        const idx = parseInt(value.replace('faq_', ''));
        const faq = faqs[idx];
        if (faq) {
          addMessage('user', faq.question);
          setTimeout(() => {
            addBotMessage(faq.answer);
            setTimeout(() => {
              addBotMessage('Would you like to ask another question or return to the main menu?', [
                ...faqs.map((faq, i) => ({ label: faq.question, value: `faq_${i}` })),
                { label: 'Back to Main Menu', value: 'main' },
              ]);
              setChatStep(2);
            }, 500);
          }, 500);
        }
        return;
      }
    }
    if (value === 'appointment') {
      setChatMode('appointment');
      addMessage('user', 'I would like to book an appointment.');
      setIsInputDisabled(false); // Ensure input is enabled for new service
      setTimeout(() => {
        addBotMessage('Perfect! I would be happy to help you schedule an appointment. 📅 To make this easier for you, how would you prefer to start?', [
          { label: '👨‍⚕️ I want to choose my doctor first', value: 'doctor-first' },
          { label: '📅 I have a specific date in mind', value: 'date-first' }
        ]);
        setChatStep(2);
      }, 500);
    } else if (value === 'medicalRecord') {
      setChatMode('medicalRecord');
      addMessage('user', 'I need a medical certificate');
      setIsInputDisabled(false); // Ensure input is enabled for new service
      setTimeout(() => {
        addBotMessage('I can definitely help you get a medical certificate! 📋 To process your request quickly and securely, I will need your Patient ID.\n\n💡 Your Patient ID follows this format: P-YYYYMMDD-XXXX (like P-20250822-1234). You can find it in your previous appointment emails or medical records.', [
          { label: 'Forgot Patient ID?', value: 'forgot-patient-id' }
        ]);
        setChatStep(2);
      }, 500);
    } else if (value === 'prescription') {
      setChatMode('prescription');
      addMessage('user', 'I need a prescription refill');
      setPrescriptionForm(prev => ({ ...prev, prescriptionType: 'refill' }));
      setIsInputDisabled(false); // Ensure input is enabled for new service
      setTimeout(() => {
        addBotMessage('I will help you request a prescription refill! 💊 This will request a refill of your most recent prescription. I will need your Patient ID to get started.\n\n💡 Your Patient ID follows this format: P-YYYYMMDD-XXXX (like P-20250822-1234). You can find it in your previous appointment emails or medical records.', [
          { label: 'Forgot Patient ID?', value: 'forgot-patient-id' }
        ]);
        setChatStep(2);
      }, 500);
    } else if (value === 'returning-patient') {
      // Handle returning patient selection
      addMessage('user', 'I am a returning patient');
      setTimeout(() => {
        addBotMessage('Welcome back! 🎉 It is always great to see our patients again. To look up your information quickly, I will need your unique Patient ID.\n\n💡 Your Patient ID follows this format: P-YYYYMMDD-XXXX (like P-20250822-1234). You can find it in your previous appointment emails or medical records.', [
          { label: 'Forgot Patient ID?', value: 'forgot-patient-id' }
        ]);
        setChatStep(6.1); // Patient ID input for returning patients
        setIsInputDisabled(false);
      }, 500);
    } else if (value === 'first-visit') {
      // Handle first visit selection
      addMessage('user', 'This is my first visit');
      setTimeout(() => {
        addBotMessage('Welcome! Before we proceed, I need to inform you that we will be collecting some personal information to process your appointment request. Please confirm that you agree to our Terms and Conditions and Privacy Policy:', [
          { label: '✓ I agree', value: 'agree-terms' },
          { label: '✗ I do not agree', value: 'decline-terms' }
        ]);
        setChatStep(6.5); // Direct to terms for new patients
        setIsInputDisabled(true);
      }, 500);
    } else if (value === 'retry-appointment') {
      // Handle retry appointment after error
      addMessage('user', 'Yes, try again');
      setChatMode('appointment');
      
      // Go back to appointment confirmation
      setTimeout(() => {
        const selectedDoctor = doctors.find(d => d.id.toString() === appointmentForm.doctorId);
        const doctorName = selectedDoctor 
          ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`
          : 'Selected Doctor';
        
        addMessage('bot', `Please confirm your appointment details:\n\n• Doctor: ${doctorName}\n• Date: ${appointmentForm.date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n• Time: ${appointmentForm.time}\n• Type: ${appointmentForm.type}\n• Notes: ${appointmentForm.notes || 'None'}`, [
          { label: 'Confirm Appointment', value: 'confirm-appointment' },
          { label: 'Cancel', value: 'cancel-appointment' }
        ]);
        setChatStep(20);
      }, 500);
    } else if (value === 'back-to-main') {
      addMessage('user', 'Back to Main Menu');
      setChatMode(null);
      resetForms();
      setTimeout(() => {
        addBotMessage("Nice to meet you! 🌟 I'm here to help you with your healthcare needs. What would you like to do today?", [
          { label: '📅 Book an Appointment', value: 'appointment' },
          { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
          { label: '💊 Request Prescription Refill', value: 'prescription' },
          { label: '❓ Ask Questions (FAQ)', value: 'faq' },
        ]);
        setChatStep(1);
        setIsInputDisabled(true);
      }, 500);
    } else if (value === 'try-booking-again') {
      addMessage('user', 'Try Booking Again');
      setTimeout(() => {
        addBotMessage('Perfect! I would be happy to help you schedule an appointment. 📅 To make this easier for you, how would you prefer to start?', [
          { label: '👨‍⚕️ I want to choose my doctor first', value: 'doctor-first' },
          { label: '📅 I have a specific date in mind', value: 'date-first' }
        ]);
        setChatStep(2);
        setIsInputDisabled(true);
      }, 500);
    } else if (value === 'confirmation-sms') {
      addMessage('user', 'Text Message');
      setAppointmentForm(prev => ({ ...prev, confirmationMethod: 'sms' }));
      
      setTimeout(() => {
        showAppointmentSummary();
      }, 500);
    } else if (value === 'confirmation-email') {
      addMessage('user', 'Email');
      setAppointmentForm(prev => ({ ...prev, confirmationMethod: 'email' }));
      
      setTimeout(() => {
        showAppointmentSummary();
      }, 500);
    } else if (chatMode === 'appointment') {
      if (chatStep === 11) {
        // Handle gender selection
        addMessage('user', `I am ${value}`);
        setAppointmentForm(prev => ({ ...prev, gender: value }));
        
        setTimeout(() => {
          addBotMessage( 'Please enter your address:');
          setChatStep(12);
        }, 500);
      } else if (chatStep === 13) {
        // Handle marital status selection
        addMessage('user', `I am ${value}`);
        setAppointmentForm(prev => ({ ...prev, maritalStatus: value }));
        
        setTimeout(() => {
         addBotMessage( 'Any additional notes for your appointment? (Optional)');
          setChatStep(14);
        }, 500);
      } else if (chatStep === 15) {
        if (value === 'confirm') {
          addMessage('user', 'Confirm appointment');
          
          // Validate date of birth
          if (!validateDateOfBirth(appointmentForm.dateOfBirth)) {
            toast({
              title: "Invalid Date of Birth",
              description: "Date of birth cannot be in the future.",
              variant: "destructive"
            });
            return;
          }

          // Format the date to YYYY-MM-DD string
          const formattedDate = appointmentForm.date.toISOString().split('T')[0];

          // Format time to 24-hour format with seconds
          const [time, period] = appointmentForm.time.split(' ');
          const [hours, minutes] = time.split(':');
          let hour = parseInt(hours);
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          const formattedTime = `${hour.toString().padStart(2, '0')}:${minutes}:00`;

          // Construct full name from components
          const fullName = constructFullName(appointmentForm);

          // Create appointment data with proper structure for pending appointments
          const appointmentData = {
            // Patient details in separate fields (new structure)
            firstName: appointmentForm.firstName,
            middleInitial: appointmentForm.middleInitial,
            lastName: appointmentForm.lastName,
            suffix: appointmentForm.suffix,
            patient_email: appointmentForm.email,
            patient_phone: appointmentForm.phone,
            date_of_birth: appointmentForm.dateOfBirth ? new Date(appointmentForm.dateOfBirth).toISOString().split('T')[0] : null,
            gender: appointmentForm.gender === 'Prefer not to say' ? 'prefer_not_to_say' : (appointmentForm.gender ? appointmentForm.gender.toLowerCase() : null),
            address: appointmentForm.address || null,
            marital_status: appointmentForm.maritalStatus === 'Prefer not to say' ? 'prefer_not_to_say' : (appointmentForm.maritalStatus ? appointmentForm.maritalStatus.toLowerCase() : null),
            
            // Appointment details
            appointment_type: appointmentForm.type,
            date: formattedDate,
            time: formattedTime,
            notes: appointmentForm.notes || '',  // Only user's notes, no JSON structure
            doctor_id: parseInt(appointmentForm.doctorId),
            
            // Status and flags
            status: 'pending',
            is_pending_confirmation: true
          };

          

          // Submit appointment to API
          api.appointments.create(appointmentData)
            .then(response => {
            
              
              // Create the new appointment object using the response data directly
              const newAppointment: Appointment = {
                id: response?.id?.toString() || '',
                patientId: fullName, // Use patient full name as temporary identifier until receptionist confirms
                doctorId: response?.doctor_id?.toString() || '',
                date: response?.date || '',
                time: response?.time || '',
                status: 'pending', // Always set to pending for chatbot appointments
                type: response?.appointment_type || '',
                notes: appointmentForm.notes || ''  // Only use the user's note, not the patient details
              };
              
             
              
              addAppointment(newAppointment);
              
              // Force refresh availability data by clearing any cached data
              setTimeout(() => {
                // Availability data will be refreshed on next query
              }, 100);
              
              setTimeout(() => {
                addBotMessage( 'Your appointment request has been submitted and is pending review. Our reception team will review your request and send you a confirmation email once approved. A patient record will be created after the appointment is confirmed.');
                
                toast({
                  title: "Appointment Request Submitted",
                  description: "Your appointment request is pending review. You will receive a confirmation email once approved.",
                });
                
                setTimeout(() => {
                  addBotMessage( 'Is there anything else I can help you with?', [
                    { label: '📅 Book an Appointment', value: 'appointment' },
                    { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
                    { label: '👋 No, thank you!', value: 'end' }
                  ]);
                  setChatStep(1);
                  setIsInputDisabled(false); // Re-enable input for new service selection
                  resetForms();
                }, 1000);
              }, 500);
            })
            .catch(error => {
              console.error('Error creating appointment:', error);
              console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
              });
              
              // Check if the error is about time slot already being booked
              if (error.response?.status === 409 || 
                  error.response?.status === 500 || 
                  (error.response?.data && 
                   (error.response.data.error === 'TIME_SLOT_CONFLICT' ||
                    (typeof error.response.data === 'string' && error.response.data.includes('already booked')) ||
                    (error.response.data.message && error.response.data.message.includes('already booked')) ||
                    (error.response.data.error && error.response.data.error.includes('already booked')) ||
                    (error.message && error.message.includes('already booked'))))) {
                
                toast({
                  title: "Time Slot Unavailable",
                  description: "This time slot has just been booked by another patient. Please select a different time.",
                  variant: "destructive"
                });
                
                addBotMessage('Oh no! 😔 That time slot was just taken by another patient. Let me show you the available times:');
                
                // Refresh and show available time slots again
                getAvailableTimeSlotsForDoctor(appointmentForm.doctorId, appointmentForm.date!).then((times) => {
                  setTimeout(() => {
                    if (times.length === 0) {
                      addBotMessage('Unfortunately, this doctor is now fully booked for this date. 😞 Would you like to try a different date or choose another doctor?');
                      // Reset to date selection
                      getAvailableDates().then(availableDates => {
                        addBotMessage( 'Please select a different date:', 
                          availableDates.map(date => ({
                            label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                            value: date.toISOString()
                          }))
                        );
                        setChatStep(4);
                        setIsInputDisabled(true); // Disable input when showing dates
                      });
                    } else {
                      addBotMessage(
                        'Please select an available time slot:', 
                        undefined, // options
                        false, // dateSelector
                        true, // timeSelector
                        times, // times
                        false, // fileUpload
                        undefined, // fileUploadLabel
                        undefined, // fileUploadAccept
                        'slot', // messageType
                        undefined, // formFields
                        undefined, // availableDates
                        undefined, // selectedDate
                        undefined // selectedTime
                      );
                      setChatStep(5); // Go back to time selection
                      setIsInputDisabled(true); // Disable input when showing time slots
                    }
                  }, 500);
                });
              } else {
                toast({
                  title: "Error",
                  description: "Failed to submit appointment. Please try again.",
                  variant: "destructive"
                });
                
                addBotMessage( 'I apologize, but there was an error processing your appointment. Please try again or contact our reception directly.');
                
                // Go back to appointment confirmation
                setTimeout(() => {
                 addBotMessage( 'Would you like to try again?', [
                    { label: 'Yes, Try Again', value: 'retry-appointment' },
                    { label: 'Cancel', value: 'cancel' }
                  ]);
                }, 500);
              }
            });
        } else if (value === 'cancel') {
          addMessage('user', 'Cancel');
          
          setTimeout(() => {
            addBotMessage( 'Appointment booking cancelled. Is there anything else I can help you with?', [
              { label: '📅 Book an Appointment', value: 'appointment' },
              { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
              { label: '👋 No, thank you!', value: 'end' }
            ]);
            setChatStep(1);
            resetForms();
          }, 500);
        }
      } else if (chatStep === 20) {
        // Step 20: Appointment confirmation
        if (value === 'confirm-appointment') {
          addMessage('user', 'Confirm appointment');
         addBotMessage( 'Please wait while we process your appointment...');
          
          try {
            // Submit appointment request
            await submitAppointmentRequest();
            
            setTimeout(() => {
              addBotMessage('🎉 Wonderful! Your appointment has been successfully scheduled! You will receive a confirmation email shortly with all the details.');
              
              setTimeout(() => {
                addBotMessage('Is there anything else I can help you with today? 😊', [
                  { label: '📅 Book an Appointment', value: 'appointment' },
                  { label: '💊 Request Prescription Refill', value: 'prescription' },
                  { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
                  { label: '👋 No, thank you!', value: 'end' }
                ]);
                setChatStep(1);
                setIsInputDisabled(false); // Re-enable input for new service selection
                resetForms();
              }, 1000);
            }, 2000);
          } catch (error) {
            if (error.message === 'TIME_SLOT_CONFLICT') {
              // Handle time slot conflict - go back to time selection
             addBotMessage( 'I apologize, but the selected time slot has just been booked by another patient. Please select a different time slot.');
              
              // Refresh and show available time slots again
              getAvailableTimeSlotsForDoctor(appointmentForm.doctorId, appointmentForm.date!).then((times) => {
                setTimeout(() => {
                  if (times.length === 0) {
                  addBotMessage( 'Unfortunately, there are no more available time slots for this doctor on the selected date. Please select a different date or doctor.');
                    // Reset to date selection
                    getAvailableDates().then(availableDates => {
                    addBotMessage( 'Please select a different date:', 
                        availableDates.map(date => ({
                          label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                          value: date.toISOString()
                        }))
                      );
                      setChatStep(4);
                      setIsInputDisabled(true); // Disable input when showing dates
                    });
                  } else {
                   addBotMessage(
                      'Please select an available time slot:', 
                      undefined, // options
                      false, // dateSelector
                      true, // timeSelector
                      times, // times
                      false, // fileUpload
                      undefined, // fileUploadLabel
                      undefined, // fileUploadAccept
                      'slot', // messageType
                      undefined, // formFields
                      undefined, // availableDates
                      undefined, // selectedDate
                      undefined // selectedTime
                    );
                    setChatStep(5); // Go back to time selection
                    setIsInputDisabled(true); // Disable input when showing time slots
                  }
                }, 500);
              });
            } else {
              // Handle other errors
            addBotMessage( 'I apologize, but there was an error processing your appointment. Please try again or contact our reception directly.');
              
              setTimeout(() => {
               addBotMessage( 'Would you like to try again?', [
                  { label: 'Yes, Try Again', value: 'retry-appointment' },
                  { label: 'Cancel', value: 'cancel' }
                ]);
              }, 500);
            }
          }
        } else if (value === 'cancel-appointment') {
          addMessage('user', 'Cancel appointment');
          
          setTimeout(() => {
          addBotMessage( 'Appointment cancelled. Is there anything else I can help you with?', [
              { label: '📅 Book an Appointment', value: 'appointment' },
              { label: '💊 Request Prescription Refill', value: 'prescription' },
              { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
              { label: '👋 No, thank you!', value: 'end' }
            ]);
            setChatStep(1);
            setIsInputDisabled(false); // Re-enable input for new service selection
            resetForms();
          }, 500);
        }
      } else {
        handleAppointmentOptionSelect(value);
      }
    } else if (chatMode === 'medicalRecord') {
      // Handle medical record submission
      if (value === 'submit-record-request') {
        addMessage('user', 'Submit medical record request');
        
        try {
          await submitMedicalRecordRequest();
        } catch (error) {
          console.error('=== MEDICAL RECORD SUBMISSION FAILED ===');
          console.error('Submission error:', error);
        }
        
        // Note: Service menu is handled inside submitMedicalRecordRequest() on success
      } else if (value === 'cancel-record-request') {
        addMessage('user', 'Cancel request');
        
        setTimeout(() => {
       addBotMessage( 'Medical record request cancelled. Is there anything else I can help you with?', [
            { label: '📅 Book an Appointment', value: 'appointment' },
            { label: '💊 Request Prescription Refill', value: 'prescription' },
            { label: '👋 No, thank you!', value: 'end' }
          ]);
          setChatStep(1);
          resetForms();
        }, 500);
      } else {
        handleMedicalRecordOptionSelect(value);
      }
    } else if (chatMode === 'prescription') {
      // Handle prescription submission
      if (value === 'submit-prescription-request' || value === 'submit-prescription') {
        addMessage('user', 'Submit prescription request');
        
        try {
          await submitPrescriptionRequest();
        } catch (error) {
          console.error('=== PRESCRIPTION SUBMISSION FAILED ===');
          console.error('Submission error:', error);
        }
        
        // Note: Service menu is handled inside submitPrescriptionRequest() on success
      } else if (value === 'confirm-prescription-refill') {
        addMessage('user', 'Submit prescription refill request');
        
        try {
          await submitPrescriptionRequest(); // Use same submission function but data will indicate it's a refill
        } catch (error) {
          console.error('=== PRESCRIPTION REFILL SUBMISSION FAILED ===');
          console.error('Submission error:', error);
        }
        
        // Note: Service menu is handled inside submitPrescriptionRequest() on success
      } else if (value === 'cancel-prescription-request' || value === 'cancel-prescription') {
        addMessage('user', 'Cancel request');
        
        setTimeout(() => {
        addBotMessage( 'Prescription request cancelled. Is there anything else I can help you with?', [
            { label: '📅 Book an Appointment', value: 'appointment' },
            { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
            { label: '👋 No, thank you!', value: 'end' }
          ]);
          setChatStep(1);
          resetForms();
        }, 500);
      } else {
        handlePrescriptionOptionSelect(value);
      }
    }
  };

  const handleAppointmentOptionSelect = (value: string) => {
    if (chatStep === 2) {
      if (value === 'doctor-first') {
        addMessage('user', 'I want to choose my doctor first');
        
        // Show loading message while checking doctor availability
        addBotMessage('Perfect choice! Let me check which doctors have available appointments... ⏳');
        
        fetchDoctorsWithAvailability().then((doctorsWithAvailability) => {
          if (doctorsWithAvailability.length === 0) {
            setTimeout(() => {
              addBotMessage('I am sorry, but it looks like all our doctors are fully booked for the next 2 weeks. 😔 Please try again later or contact us directly for urgent needs.');
              // Reset chat to initial state
              setTimeout(() => {
                setMessages([]);
                setChatStep(0);
                resetForms();
              }, 2000);
            }, 500);
            return;
          }

          const doctorOptions = doctorsWithAvailability.map(doctor => ({
            label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
            value: doctor.id.toString()
          }));
          
          setTimeout(() => {
            addBotMessage('Great! Here are our available doctors: 👨‍⚕️', doctorOptions);
            setChatStep(3);
            setIsInputDisabled(true); // Disable input when showing doctor options
          }, 500);
        });
      } else if (value === 'date-first') {
        addMessage('user', 'I have a specific date in mind');
        
        // Show loading message while fetching available dates
        addBotMessage('Excellent! Let me find available dates and times for you... ⏳');
        
        getAvailableDates().then(availableDates => {
          setTimeout(() => {
            if (availableDates.length === 0) {
              addBotMessage('I am sorry, but there are no available dates in the next 2 weeks. 😔 Please try again later or contact us directly.');
              // Reset chat to initial state
              setTimeout(() => {
                setMessages([]);
                setChatStep(0);
                resetForms();
              }, 2000);
              return;
            }
            
            // Use the new combined datetime picker
            // Create a wrapper function that binds the doctor ID
            const getTimeSlotsForSelectedDate = (date: Date) => 
              getAvailableTimeSlotsForDoctor(appointmentForm.doctorId, date);

            addBotMessage( 
              'Please select your preferred appointment date and time 📅 ⏰:', 
              undefined, // options
              false, // dateSelector
              false, // timeSelector
              undefined, // times
              false, // fileUpload
              undefined, // fileUploadLabel
              undefined, // fileUploadAccept
              'datetime-picker', // messageType
              undefined, // formFields
              availableDates, // availableDates
              undefined, // selectedDate
              undefined, // selectedTime
              1000, // typingDuration
              true, // dateTimePicker
              getTimeSlotsForSelectedDate // getTimeSlotsForDate function
            );
            setChatStep(4);
            setIsInputDisabled(true); // Disable input when showing datetime picker
          }, 500);
        });
      }
    } else if (chatStep === 3) {
      // Doctor first flow - doctor selected
      const selectedDoctor = doctors.find(doctor => doctor.id.toString() === value);
      if (selectedDoctor) {
        setIsInputDisabled(false); // Re-enable input after doctor selection
        addMessage('user', `I want to see Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`);
        setAppointmentForm(prev => ({ ...prev, doctorId: value }));
        
        getAvailableDatesForDoctor(value).then(availableDates => {
          setTimeout(() => {
            // Create a wrapper function that binds the doctor ID
            const getTimeSlotsForSelectedDate = (date: Date) => 
              getAvailableTimeSlotsForDoctor(value, date);

            addBotMessage(
              `Please select your preferred appointment date and time 📅 ⏰`,
              undefined, // options
              false, // dateSelector
              false, // timeSelector
              undefined, // times
              false, // fileUpload
              undefined, // fileUploadLabel
              undefined, // fileUploadAccept
              'datetime-picker', // messageType
              undefined, // formFields
              availableDates, // availableDates
              undefined, // selectedDate
              undefined, // selectedTime
              1000, // typingDuration
              true, // dateTimePicker
              getTimeSlotsForSelectedDate // getTimeSlotsForDate function
            );
            setChatStep(4);
            setIsInputDisabled(true); // Disable input when showing date-time picker
          }, 500);
        });
      }
    } else if (chatStep === 4) {
      // Date selected (both flows)
      const selectedDate = new Date(value);
     
      setIsInputDisabled(false); // Re-enable input after date selection
      addMessage('user', `I want an appointment on ${selectedDate.toLocaleDateString()}`);
      setAppointmentForm(prev => ({ ...prev, date: selectedDate }));
      
      if (appointmentForm.doctorId) {
        // Doctor first flow - show time slots for selected doctor
        getAvailableTimeSlotsForDoctor(appointmentForm.doctorId, selectedDate).then((times) => {
          setTimeout(() => {
            if (times.length === 0) {
           addBotMessage( 'I apologize, but all time slots for this doctor are already booked on the selected date. Please select a different date.');
              // Show available dates again for the same doctor
              getAvailableDatesForDoctor(appointmentForm.doctorId).then(availableDates => {
                setTimeout(() => {
                addBotMessage( 'Please select a different date:', 
                    availableDates.map(date => ({
                      label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                      value: date.toISOString()
                    }))
                  );
                  setChatStep(4);
                  setIsInputDisabled(true); // Disable input when showing dates
                }, 500);
              });
            } else {
              const timeResponses = [
                'Perfect! Here are the available time slots for your appointment: ⏰',
                'Great choice! These are the times I have available: ⏰',
                'Excellent! Here are your time options: ⏰'
              ];
              addBotMessage(
                getRandomResponse(timeResponses), 
                undefined, // options
                false, // dateSelector
                true, // timeSelector
                times, // times
                false, // fileUpload
                undefined, // fileUploadLabel
                undefined, // fileUploadAccept
                'slot', // messageType
                undefined, // formFields
                undefined, // availableDates
                undefined, // selectedDate
                undefined // selectedTime
              );
              setChatStep(5);
              setIsInputDisabled(true); // Disable input when showing time slots
            }
          }, 500);
        });
      } else {
        // Date first flow - show available doctors
       
        getAvailableDoctorsForDate(selectedDate).then(availableDoctors => {
       
          
          if (!availableDoctors || availableDoctors.length === 0) {
            
            setTimeout(() => {
            addBotMessage( 'I apologize, but there are no doctors available on this date. Please select a different date.');
              // Show available dates again
              getAvailableDates().then(availableDates => {
               addBotMessage( 'Please select a different date:', 
                  availableDates.map(date => ({
                    label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                    value: date.toISOString()
                  }))
                );
                setChatStep(4);
                setIsInputDisabled(true); // Disable input when showing dates
              });
            }, 500);
            return;
          }

         
          setTimeout(() => {
            const doctorOptions = availableDoctors.map(doctor => ({
              label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
              value: doctor.id.toString()
            }));
          
          addBotMessage('The following doctors are available on this date:', doctorOptions);
            setChatStep(5);
          }, 500);
        }).catch(error => {
          console.error('Error getting available doctors:', error);
          toast({
            title: "Error",
            description: "Failed to fetch available doctors. Please try again.",
            variant: "destructive"
          });
        });
      }
    } else if (chatMode === 'appointment' && chatStep === 5) {
      if (!appointmentForm.doctorId) {
        // Date first flow - doctor selected
        const selectedDoctor = doctors.find(doctor => doctor.id.toString() === value);
        if (selectedDoctor) {
          setIsInputDisabled(false); // Re-enable input after doctor selection
          addMessage('user', `I want to see Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`);
          setAppointmentForm(prev => ({ ...prev, doctorId: value }));
          
          getAvailableTimeSlotsForDoctor(value, appointmentForm.date!).then((times) => {
            setTimeout(() => {
              if (times.length === 0) {
              addBotMessage( 'I apologize, but all time slots for this doctor are already booked on the selected date. Please select a different doctor.');
                // Get available doctors again for the same date
                getAvailableDoctorsForDate(appointmentForm.date!).then(availableDoctors => {
                  setTimeout(() => {
                    const doctorOptions = availableDoctors
                      .filter(doctor => doctor.id.toString() !== value) // Exclude the already selected doctor
                      .map(doctor => ({
                        label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                        value: doctor.id.toString()
                      }));
                    
                    if (doctorOptions.length > 0) {
                   addBotMessage( 'Please select a different doctor:', doctorOptions);
                      setChatStep(5);
                    } else {
                     addBotMessage( 'No other doctors are available on this date. Please select a different date.');
                      getAvailableDates().then(availableDates => {
                       addBotMessage( 'Please select a different date:', 
                          availableDates.map(date => ({
                            label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                            value: date.toISOString()
                          }))
                        );
                        setChatStep(4);
                        setIsInputDisabled(true); // Disable input when showing dates
                      });
                    }
                  }, 500);
                });
              } else {
               addBotMessage( 
                  'Please select a time slot:', 
                  undefined, // options
                  false, // dateSelector
                  true, // timeSelector
                  times, // times
                  false, // fileUpload
                  undefined, // fileUploadLabel
                  undefined, // fileUploadAccept
                  'slot', // messageType
                  undefined, // formFields
                  undefined, // availableDates
                  undefined, // selectedDate
                  undefined // selectedTime
                );
                setChatStep(6);
                setIsInputDisabled(true); // Disable input when showing time slots
              }
            }, 500);
          });
        }
      } else {
        // Time slot selected
        addMessage('user', `I'll take the ${value} time slot`);
        setAppointmentForm(prev => ({ ...prev, time: value }));
        setIsInputDisabled(false); // Re-enable input after time slot selection
        
        setTimeout(() => {
          addBotMessage('Perfect! What type of appointment do you need today? 🏥', appointmentTypes);
          setChatStep(6);
        }, 500);
      }
    } else if (chatMode === 'appointment' && chatStep === 6) {
      addMessage('user', `I need a ${value}`);
      setAppointmentForm(prev => ({ ...prev, type: value }));
      
      setTimeout(() => {
        addBotMessage('Great choice! 👍 Now, are you a returning patient or is this your first visit with us?', [
          { label: '🔄 Returning Patient', value: 'returning-patient' },
          { label: '🆕 First Visit', value: 'first-visit' }
        ]);
        setChatStep(6.0); // New step for patient type selection
        setIsInputDisabled(true);
      }, 500);
    } else if (chatStep === 6.2) {
      // Handle existing patient choice after email check
      if (value === 'use-existing-info') {
        addMessage('user', 'Use my existing information');
        
        if (existingPatient) {
          // Pre-populate form with existing patient data
          setAppointmentForm(prev => ({
            ...prev,
            firstName: existingPatient.first_name || '',
            lastName: existingPatient.last_name || '',
            middleInitial: existingPatient.middle_initial || '',
            suffix: existingPatient.suffix || '',
            email: existingPatient.email || '',
            phone: existingPatient.phone,
            dateOfBirth: existingPatient.date_of_birth,
            gender: existingPatient.gender || '',
            address: existingPatient.address || '',
            maritalStatus: existingPatient.marital_status || '',
            patient_id: existingPatient.patient_id || ''
          }));
          
          // Also populate tempFormData for consistency
          setTempFormData({
            firstName: existingPatient.first_name || '',
            lastName: existingPatient.last_name || '',
            middleInitial: existingPatient.middle_initial || '',
            suffix: existingPatient.suffix || '',
            email: existingPatient.email || '',
            phone: existingPatient.phone || '',
            dateOfBirth: existingPatient.date_of_birth || '',
            gender: existingPatient.gender || '',
            address: existingPatient.address || '',
            maritalStatus: existingPatient.marital_status || '',
            patient_id: existingPatient.patient_id || ''
          });
          
          setTimeout(() => {
            addBotMessage( `Great! I've pre-filled your information. Let me summarize your appointment details:`);
            
            setTimeout(() => {
              const selectedDoctor = doctors.find(d => d.id.toString() === appointmentForm.doctorId);
              const doctorName = selectedDoctor 
                ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`
                : 'Selected Doctor';
              
              const appointmentDetails = `
 Date: ${appointmentForm.date?.toLocaleDateString()}
 Time: ${appointmentForm.time}
 Doctor: ${doctorName}
 Type: ${appointmentForm.type}
 Patient: ${existingPatient ? `${existingPatient.first_name || ''} ${existingPatient.middle_initial || ''} ${existingPatient.last_name || ''} ${existingPatient.suffix || ''}`.trim().replace(/\s+/g, ' ') : 'Unknown Patient'}
 Email: ${existingPatient?.email || 'Not specified'}
 Phone: ${existingPatient?.phone || 'Not specified'}
 Date of Birth: ${existingPatient?.date_of_birth || 'Not specified'}
 Gender: ${existingPatient.gender || 'Not specified'}
 Address: ${existingPatient.address || 'Not specified'}
 Marital Status: ${existingPatient.marital_status || 'Not specified'}
              `.trim();

             addBotMessage( appointmentDetails);

              setTimeout(() => {
               addBotMessage( 'Would you like to confirm this appointment?', [
                  { label: ' Yes, confirm appointment', value: 'confirm-appointment' },
                  { label: ' No, make changes', value: 'cancel-appointment' }
                ]);
                setChatStep(20); // Go directly to confirmation step
                setIsInputDisabled(true); // Disable input when showing confirmation options
              }, 500);
            }, 500);
          }, 500);
        }
      } else if (value === 'update-info') {
        addMessage('user', 'I want to update my information');
        
        if (existingPatient) {
          // Pre-populate form but allow updates
          setAppointmentForm(prev => ({
            ...prev,
            firstName: existingPatient.first_name || '',
            lastName: existingPatient.last_name || '',
            middleInitial: existingPatient.middle_initial || '',
            suffix: existingPatient.suffix || '',
            email: existingPatient.email || '',
            phone: existingPatient.phone,
            dateOfBirth: existingPatient.date_of_birth,
            gender: existingPatient.gender || '',
            address: existingPatient.address || '',
            maritalStatus: existingPatient.marital_status || '',
            patient_id: existingPatient.patient_id || ''
          }));
          
          // Also populate tempFormData for consistency
          setTempFormData({
            firstName: existingPatient.first_name || '',
            lastName: existingPatient.last_name || '',
            middleInitial: existingPatient.middle_initial || '',
            suffix: existingPatient.suffix || '',
            email: existingPatient.email || '',
            phone: existingPatient.phone || '',
            dateOfBirth: existingPatient.date_of_birth || '',
            gender: existingPatient.gender || '',
            address: existingPatient.address || '',
            maritalStatus: existingPatient.marital_status || '',
            patient_id: existingPatient.patient_id || ''
          });
        }
        
        setTimeout(() => {
          addBotMessage( 'Perfect! Before we proceed, I need to inform you that we will be collecting some personal information to process your appointment request.');
          
          setTimeout(() => {
           addBotMessage('This includes your full name, phone number, and appointment details. Your information will be kept secure and used only for healthcare purposes.');
            
            setTimeout(() => {
              addBotMessage( 'Please confirm that you agree to our Terms and Conditions and Privacy Policy:', [
                { label: '✓ I agree to Terms & Conditions and Privacy Policy', value: 'agree-terms' },
                { label: '✗ I do not agree', value: 'decline-terms' }
              ]);
              setChatStep(6.5);
              setIsInputDisabled(true); // Disable input when showing terms options
            }, 1000);
          }, 1000);
        }, 500);
      }
    } else if (chatStep === 6.5) {
      // Handle terms and conditions response
      if (value === 'agree-terms') {
        setIsInputDisabled(false); // Re-enable input after terms agreement
        setAppointmentForm(prev => ({ ...prev, termsAgreed: true }));
        addMessage('user', 'I agree to the Terms & Conditions and Privacy Policy');
        
        setTimeout(() => {
          addBotMessage('Please fill out the registration form so we can finish booking your appointment:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
            {
              name: 'firstName',
              label: 'First Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your first name'
            },
            {
              name: 'middleName',
              label: 'Middle Name',
              type: 'text',
              required: false,
              placeholder: 'Enter your middle name',
              hasNoMiddleNameOption: true
            },
            {
              name: 'lastName',
              label: 'Last Name',
              type: 'text',
              required: true,
              placeholder: 'Enter your last name'
            },
            {
              name: 'suffix',
              label: 'Suffix',
              type: 'text',
              required: false,
              placeholder: 'Jr., Sr., III, etc. (optional)'
            },
            {
              name: 'email',
              label: 'Email Address',
              type: 'email',
              required: true,
              placeholder: 'your.email@example.com'
            },
            {
              name: 'phone',
              label: 'Phone Number',
              type: 'tel',
              required: true,
              placeholder: '09123456789'
            },
            {
              name: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true
            },
            {
              name: 'sex',
              label: 'Sex',
              type: 'select',
              required: true,
              options: [
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' }
              ]
            },
            {
              name: 'religion',
              label: 'Religion',
              type: 'text',
              required: false,
              placeholder: 'Enter your religion (optional)'
            },
            {
              name: 'address',
              label: 'Home Address',
              type: 'text',
              required: true,
              placeholder: 'Enter your complete home address'
            },
            {
              name: 'maritalStatus',
              label: 'Marital Status',
              type: 'select',
              required: false,
              options: [
                { value: 'Single', label: 'Single' },
                { value: 'Married', label: 'Married' },
                { value: 'Divorced', label: 'Divorced' },
                { value: 'Widowed', label: 'Widowed' },
                { value: 'Prefer not to say', label: 'Prefer not to say' }
              ]
            }
          ],
          undefined, // availableDates
          undefined, // selectedDate
          undefined, // selectedTime
          500, // typingDuration
          undefined, // dateTimePicker
          undefined, // getTimeSlotsForDate
          true // showCancelOption
          );
          setIsInputDisabled(true); // Disable chat input while form is shown
        }, 500);
      } else if (value === 'decline-terms') {
        setIsInputDisabled(false); // Re-enable input after declining terms
        addMessage('user', 'I do not agree');
        
        setTimeout(() => {
          addBotMessage('No problem — you can return to the main menu or start over any time. Would you like to go back?', [
            { label: '🏠 Back to Main Menu', value: 'back-to-main' },
            { label: '🔄 Try Booking Again', value: 'try-booking-again' }
          ]);
          setIsInputDisabled(true);
        }, 500);
      }
    } else if (chatStep === 7) {
      // Ask for name
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, name: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your email address:');
        setChatStep(8);
      }, 500);
    } else if (chatStep === 8) {
      // Validate email
      if (!validateEmail(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
         addBotMessage( 'Please enter a valid email address (e.g., john.doe@example.com):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please enter your phone number:');
        setChatStep(9);
      }, 500);
    } else if (chatStep === 9) {
      // Validate phone
      if (!validatePhone(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addBotMessage( 'Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
      addBotMessage('Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(10);
      }, 500);
    } else if (chatStep === 10) {
      // Validate date of birth
      const dob = new Date(input);
      if (isNaN(dob.getTime())) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addBotMessage( 'Please enter a valid date in MM/DD/YYYY format:');
        }, 500);
        return;
      }

      // Validate date range (between 1 and 100 years ago)
      const today = new Date();
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 100);
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() - 1);

      if (dob < minDate || dob > maxDate) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addBotMessage( 'Please enter a valid date of birth (between 1 and 100 years ago):');
        }, 500);
        return;
      }

      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please select your gender:', [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
          { label: 'Other', value: 'other' }
        ]);
        setChatStep(11);
      }, 500);
    } else if (chatStep === 11) {
      // Gender selection is handled in handleOptionSelect
      return;
    } else if (chatStep === 12) {
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, address: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Please select your marital status:', [
          { label: 'Single', value: 'single' },
          { label: 'Married', value: 'married' },
          { label: 'Divorced', value: 'divorced' },
          { label: 'Widowed', value: 'widowed' }
        ]);
        setChatStep(13);
      }, 500);
    } else if (chatStep === 13) {
      // Marital status selection is handled in handleOptionSelect
      return;
    } else if (chatStep === 14) {
      // Handle notes
      addMessage('user', input || 'No additional notes');
      setAppointmentForm(prev => ({ ...prev, notes: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Thank you! Here is a summary of your appointment:');
        
        setTimeout(() => {
          const summary = `
            Date: ${appointmentForm.date?.toLocaleDateString() || 'Not selected'}
            Time: ${appointmentForm.time}
            Type: ${appointmentForm.type}
            Name: ${constructFullName(appointmentForm)}
            Email: ${appointmentForm.email}
            Phone: ${appointmentForm.phone}
            Date of Birth: ${appointmentForm.dateOfBirth}
            Gender: ${appointmentForm.gender}
            Address: ${appointmentForm.address}
            Marital Status: ${appointmentForm.maritalStatus}
            Notes: ${appointmentForm.notes || 'None'}
          `;
          
         addBotMessage( summary, [
            { label: 'Confirm Appointment', value: 'confirm' },
            { label: 'Cancel', value: 'cancel' }
          ]);
          setChatStep(15);
        }, 500);
      }, 500);
    } else if (chatStep === 15) {
      // Confirmation is handled in handleOptionSelect
      return;
    }
  };

  const submitAppointmentRequest = async () => {
    try {
    
      // Format the date to YYYY-MM-DD string
      const formattedDate = appointmentForm.date!.toISOString().split('T')[0];

      // Format time to 24-hour format with seconds
      const [time, period] = appointmentForm.time.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      const formattedTime = `${hour.toString().padStart(2, '0')}:${minutes}:00`;

      // Determine which data source to use - prioritize existingPatient, then tempFormData, then appointmentForm
      const formDataToUse = existingPatient 
        ? {
            firstName: existingPatient.first_name || '',
            middleInitial: existingPatient.middle_initial || '',
            lastName: existingPatient.last_name || '',
            suffix: existingPatient.suffix || '',
            email: existingPatient.email || '',
            phone: existingPatient.phone || '',
            dateOfBirth: existingPatient.date_of_birth || '',
            gender: existingPatient.gender || '',
            address: existingPatient.address || '',
            religion: existingPatient.religion || '',
            maritalStatus: existingPatient.marital_status || ''
          }
        : Object.keys(tempFormData).length > 0 ? tempFormData : appointmentForm;
        
      const fullName = constructFullName({
        firstName: formDataToUse.firstName || appointmentForm.firstName,
        middleInitial: formDataToUse.middleInitial || appointmentForm.middleInitial,
        lastName: formDataToUse.lastName || appointmentForm.lastName,
        suffix: formDataToUse.suffix || appointmentForm.suffix
      } as AppointmentForm);

      // Create appointment data
      const appointmentData = {
        firstName: formDataToUse.firstName || appointmentForm.firstName,
        middleInitial: formDataToUse.middleInitial || appointmentForm.middleInitial,
        lastName: formDataToUse.lastName || appointmentForm.lastName,
        suffix: formDataToUse.suffix || appointmentForm.suffix,
        patient_id: appointmentForm.patient_id || null, // Include Patient ID for returning patients
        patient_email: formDataToUse.email || appointmentForm.email,
        patient_phone: formDataToUse.phone || appointmentForm.phone,
        date_of_birth: (() => {
          const dobValue = formDataToUse.dateOfBirth || appointmentForm.dateOfBirth;
          console.log(`[DEBUG] Processing date_of_birth - dobValue:`, dobValue, 'type:', typeof dobValue);
          
          if (!dobValue) return null;
          
          // Always convert to string format to avoid any date object issues
          let dateString = '';
          
          if (typeof dobValue === 'string') {
            // If it's already a string, check if it's in the right format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dobValue)) {
              dateString = dobValue;
            } else {
              // Try to parse and reformat
              const tempDate = new Date(dobValue);
              if (!isNaN(tempDate.getTime())) {
                dateString = tempDate.toISOString().split('T')[0];
              } else {
                console.error('[DEBUG] Invalid date string:', dobValue);
                dateString = ''; // Set to empty string for invalid dates
              }
            }
          } else if (dobValue && Object.prototype.toString.call(dobValue) === '[object Date]') {
            // If it's a Date object, convert to string
            const dateObj = dobValue as Date;
            if (!isNaN(dateObj.getTime())) {
              dateString = dateObj.toISOString().split('T')[0];
            } else {
              console.error('[DEBUG] Invalid Date object:', dobValue);
              dateString = ''; // Set to empty string for invalid dates
            }
          } else {
            // Try to create a Date object from whatever it is
            const tempDate = new Date(dobValue as any);
            if (!isNaN(tempDate.getTime())) {
              dateString = tempDate.toISOString().split('T')[0];
            } else {
              console.error('[DEBUG] Could not convert to date:', dobValue);
              dateString = ''; // Set to empty string for invalid dates
            }
          }
          
          console.log(`[DEBUG] Final date_of_birth string:`, dateString);
          
          // Return as string, not as any other type
          return String(dateString);
        })(),
        gender: (formDataToUse.gender || appointmentForm.gender) === 'Prefer not to say' ? 'prefer_not_to_say' : ((formDataToUse.gender || appointmentForm.gender) ? (formDataToUse.gender || appointmentForm.gender).toLowerCase() : null),
        address: formDataToUse.address || appointmentForm.address || null,
        religion: formDataToUse.religion || appointmentForm.religion || null,
        marital_status: (formDataToUse.maritalStatus || appointmentForm.maritalStatus) === 'Prefer not to say' ? 'prefer_not_to_say' : ((formDataToUse.maritalStatus || appointmentForm.maritalStatus) ? (formDataToUse.maritalStatus || appointmentForm.maritalStatus).toLowerCase() : null),
        appointment_type: appointmentForm.type,
        date: formattedDate,
        time: formattedTime,
        doctor_id: parseInt(appointmentForm.doctorId),
        status: 'pending',
        is_pending_confirmation: true
      };

      const response = await api.appointments.create(appointmentData);
     

      // Create the new appointment object
      const newAppointment: Appointment = {
        id: response?.id?.toString() || '',
        patientId: fullName,
        doctorId: response?.doctor_id?.toString() || '',
        date: response?.date || '',
        time: response?.time || '',
        status: 'pending',
        type: response?.appointment_type || '',
        notes: appointmentForm.notes || ''
      };
      
      addAppointment(newAppointment);
      
      // Clear temporary form data after successful submission
      setTempFormData({});
      
      toast({
        title: "Appointment Scheduled",
        description: "Your appointment has been successfully scheduled.",
      });

    } catch (error) {
      console.error('Error creating appointment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Check if the error is about time slot already being booked
      if (error.response?.status === 409 || 
          error.response?.status === 500 || 
          (error.response?.data && 
           (error.response.data.error === 'TIME_SLOT_CONFLICT' ||
            (typeof error.response.data === 'string' && error.response.data.includes('already booked')) ||
            (error.response.data.message && error.response.data.message.includes('already booked')) ||
            (error.response.data.error && error.response.data.error.includes('already booked')) ||
            (error.message && error.message.includes('already booked'))))) {
        
        toast({
          title: "Time Slot Unavailable",
          description: "This time slot has just been booked by another patient. Please select a different time.",
          variant: "destructive"
        });
        
        // Don't throw error, handle gracefully by going back to time selection
        // The calling function should handle this specific case
        throw new Error('TIME_SLOT_CONFLICT');
      } else {
        toast({
          title: "Error",
          description: "Failed to schedule appointment. Please try again.",
          variant: "destructive"
        });
        throw error;
      }
    }
  };

  const submitMedicalRecordRequest = async () => {
    try {
    
      const formData = new FormData();
      formData.append('request_type', medicalRecordForm.requestType);
      formData.append('patient_id', medicalRecordForm.patientId);
      formData.append('additional_info', medicalRecordForm.additionalInfo);
      
      // Add patient name (construct full name from components)
      const fullName = constructFullName(medicalRecordForm);
      formData.append('patient_name', fullName);
      
      // Add other patient information
      formData.append('first_name', medicalRecordForm.firstName || '');
      formData.append('last_name', medicalRecordForm.lastName || '');
      formData.append('middle_initial', medicalRecordForm.middleInitial || '');
      formData.append('suffix', medicalRecordForm.suffix || '');
      formData.append('date_of_birth', medicalRecordForm.dateOfBirth || '');
      formData.append('email', medicalRecordForm.email || '');
      formData.append('phone', medicalRecordForm.phone || '');
      
      if (medicalRecordForm.idVerificationFront) {
        formData.append('id_verification_front', medicalRecordForm.idVerificationFront);
      }
      
      if (medicalRecordForm.idVerificationBack) {
        formData.append('id_verification_back', medicalRecordForm.idVerificationBack);
      }

      // Get CSRF token
      const csrfToken = getCSRFToken();
      
      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await axiosInstance.post(`/medical-certificates/`, formData, { headers });

      if (response.status === 200 || response.status === 201) {
        addBotMessage('Your medical certificate request has been submitted successfully! Our team will review your request and contact you within 2-3 business days.');
        
        setTimeout(() => {
          addBotMessage('Is there anything else I can help you with?', [
            { label: '📅 Book an Appointment', value: 'appointment' },
            { label: '💊 Request Prescription Refill', value: 'prescription' },
            { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
            { label: '👋 No, thank you!', value: 'end' }
          ]);
          setChatStep(1);
          setIsInputDisabled(false); // Re-enable input for new service selection
          resetForms();
        }, 1000);
        
        toast({
          title: "Medical Certificate Request Submitted",
          description: "Your request has been received and will be processed within 2-3 business days.",
        });
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting medical record request:', error);
     addBotMessage( 'Sorry, there was an error submitting your request. Please try again or contact us directly.');
      
      toast({
        title: "Submission Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const submitPrescriptionRequest = async () => {
    try {
      const formData = new FormData();
      formData.append('patient_id', prescriptionForm.patientId);
      
      // For refills, indicate it's a refill request
      formData.append('request_type', 'refill');
      
      // Include empty medication details to satisfy backend requirements
      formData.append('medication_name', 'Prescription Refill Request');
      formData.append('dosage', 'As per previous prescription');
      formData.append('frequency', 'As per previous prescription');
      formData.append('duration', 'As per previous prescription');
      
      formData.append('additional_notes', prescriptionForm.additionalNotes || 'Prescription refill request');
      
      // Add patient name (construct full name from components)
      const fullName = constructFullName(prescriptionForm);
      formData.append('patient_name', fullName);
      
      // Add other patient information
      formData.append('first_name', prescriptionForm.firstName || '');
      formData.append('last_name', prescriptionForm.lastName || '');
      formData.append('middle_initial', prescriptionForm.middleInitial || '');
      formData.append('suffix', prescriptionForm.suffix || '');
      formData.append('date_of_birth', prescriptionForm.dateOfBirth || '');
      formData.append('email', prescriptionForm.email || '');
      formData.append('phone', prescriptionForm.phone || '');
      
      if (prescriptionForm.idVerificationFront) {
        formData.append('id_verification_front', prescriptionForm.idVerificationFront);
      }
      
      if (prescriptionForm.idVerificationBack) {
        formData.append('id_verification_back', prescriptionForm.idVerificationBack);
      }
      
      if (prescriptionForm.prescriptionImage) {
        formData.append('prescription_image', prescriptionForm.prescriptionImage);
      }

      // Get CSRF token
      const csrfToken = getCSRFToken();
      
      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
      
      const response = await axiosInstance.post(`/prescription-requests/`, formData, { headers });

      if (response.status === 200 || response.status === 201) {
        addBotMessage('Your prescription refill request has been submitted successfully! Our team will review your request and contact you within 2-3 business days.');
        
        setTimeout(() => {
          addBotMessage('Is there anything else I can help you with?', [
            { label: '📅 Book an Appointment', value: 'appointment' },
            { label: '💊 Request Prescription Refill', value: 'prescription' },
            { label: '📋 Get Medical Certificate', value: 'medicalRecord' },
            { label: '👋 No, thank you!', value: 'end' }
          ]);
          setChatStep(1);
          setIsInputDisabled(false); // Re-enable input for new service selection
          resetForms();
        }, 1000);
        
        toast({
          title: "Prescription Request Submitted",
          description: "Your request has been received and will be processed within 2-3 business days.",
        });
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting prescription request:', error);
      addBotMessage( 'Sorry, there was an error submitting your request. Please try again or contact us directly.');
      
      toast({
        title: "Submission Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMedicalRecordOptionSelect = async (value: string) => {
    if (chatStep === 2) {
      // Record type selected
      addMessage('user', `I need ${value} records`);
      setMedicalRecordForm(prev => ({ ...prev, requestType: value }));
      
      setTimeout(() => {
        addBotMessage( 'Please enter your first name:');
        setChatStep(3);
      }, 500);
    } else if (chatStep === 3) {
      // First name entered
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, firstName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your middle initial (optional):');
        setChatStep('3b');
      }, 500);
    } else if (chatStep === '3b') {
      // Middle initial entered
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, middleInitial: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your last name:');
        setChatStep('3c');
      }, 500);
    } else if (chatStep === '3c') {
      // Last name entered
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, lastName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your suffix (optional, e.g., Jr., Sr., III):');
        setChatStep('3d');
      }, 500);
    } else if (chatStep === '3d') {
      // Suffix entered
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, suffix: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(4);
      }, 500);
    } else if (chatStep === 4) {
      // Date of birth validation
      const dob = new Date(input);
      if (isNaN(dob.getTime())) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
         addBotMessage( 'Please enter a valid date in MM/DD/YYYY format:');
        }, 500);
        return;
      }

      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your email address:');
        setChatStep(5);
      }, 500);
    } else if (chatStep === 5) {
      // Email validation
      if (!validateEmail(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addBotMessage( 'Please enter a valid email address (e.g., john.doe@example.com):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please enter your phone number:');
        setChatStep(6);
      }, 500);
    } else if (chatStep === 6) {
      // Phone validation
      if (!validatePhone(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
         addBotMessage( 'Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please upload an image of your ID for verification (required):', undefined, undefined, undefined, undefined, true, "Upload ID", "image/*");
        setChatStep(7);
      }, 500);
    } else if (chatStep === 7) {
      // ID verification upload handled by file upload component
      setTimeout(() => {
        addBotMessage( 'Any additional information about your request? (Optional)');
        setChatStep(8);
      }, 500);
    } else if (chatStep === 8) {
      // Additional info
      addMessage('user', input || 'No additional information');
      setMedicalRecordForm(prev => ({ ...prev, additionalInfo: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Thank you! Here is a summary of your medical records request:');
        
        setTimeout(() => {
          const summary = `
            Record Type: ${medicalRecordForm.requestType}
            Patient Name: ${constructFullName(medicalRecordForm)}
            Date of Birth: ${medicalRecordForm.dateOfBirth}
            Email: ${medicalRecordForm.email}
            Phone: ${medicalRecordForm.phone}
            ID Verification: ${medicalRecordForm.idVerificationFront && medicalRecordForm.idVerificationBack ? 'Both sides uploaded' : 'Not complete'}
            Additional Info: ${medicalRecordForm.additionalInfo || 'None'}
          `;
          
          addBotMessage( summary, [
            { label: 'Submit Request', value: 'submit-record-request' },
            { label: 'Cancel', value: 'cancel-record-request' }
          ]);
          setChatStep(9);
        }, 500);
      }, 500);
    } else if (value === 'end') {
      addMessage('user', 'No, thank you');
      setIsInputDisabled(true); // Disable input when conversation ends
      
      setTimeout(() => {
        addBotMessage('Thank you so much for choosing our healthcare services! 🌟 It was wonderful helping you today. If you need any assistance in the future, just say hi and I will be right here to help! Take care! 💙');
      }, 500);
    }
  };

  const handlePrescriptionOptionSelect = (value: string) => {
    if (chatStep === 2) {
      // Medication name entered
      addMessage('user', value || input);
      setPrescriptionForm(prev => ({ ...prev, medicationName: value || input }));
      setInput('');
      
      setTimeout(() => {
      addBotMessage( 'Please enter the dosage (e.g., 500mg, 1 tablet):');
        setChatStep(3);
      }, 500);
    } else if (chatStep === 3) {
      // Dosage entered
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, dosage: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'How often should this medication be taken? (e.g., twice daily, every 8 hours):');
        setChatStep(4);
      }, 500);
    } else if (chatStep === 4) {
      // Frequency entered
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, frequency: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'For how long should this medication be taken? (e.g., 7 days, 2 weeks):');
        setChatStep(5);
      }, 500);
    } else if (chatStep === 5) {
      // Duration entered
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, duration: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please enter your first name:');
        setChatStep(6);
      }, 500);
    } else if (chatStep === 6) {
      // First name entered
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, firstName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your middle initial (optional):');
        setChatStep('6b');
      }, 500);
    } else if (chatStep === '6b') {
      // Middle initial entered
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, middleInitial: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your last name:');
        setChatStep('6c');
      }, 500);
    } else if (chatStep === '6c') {
      // Last name entered
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, lastName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your suffix (optional, e.g., Jr., Sr., III):');
        setChatStep('6d');
      }, 500);
    } else if (chatStep === '6d') {
      // Suffix entered
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, suffix: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(7);
      }, 500);
    } else if (chatStep === 7) {
      // Date of birth validation
      const dob = new Date(input);
      if (isNaN(dob.getTime())) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addBotMessage( 'Please enter a valid date in MM/DD/YYYY format:');
        }, 500);
        return;
      }

      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage( 'Please enter your email address:');
        setChatStep(8);
      }, 500);
    } else if (chatStep === 8) {
      // Email validation
      if (!validateEmail(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
         addBotMessage( 'Please enter a valid email address (e.g., john.doe@example.com):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Please enter your phone number:');
        setChatStep(9);
      }, 500);
    } else if (chatStep === 9) {
      // Phone validation
      if (!validatePhone(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
        addBotMessage( 'Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Please upload an image of your ID for verification (required):', undefined, undefined, undefined, undefined, true, "Upload ID", "image/*");
        setChatStep(10);
      }, 500);
    } else if (chatStep === 10) {
      // ID verification upload handled by file upload component
      setTimeout(() => {
      addBotMessage( 'Please upload an image of your previous prescription or relevant medical document (optional):', undefined, undefined, undefined, undefined, true, "Upload Prescription", "image/*");
        setChatStep(11);
      }, 500);
    } else if (chatStep === 11) {
      // Handle skip prescription image upload
      if (value === 'skip-prescription-image') {
        addMessage('user', 'Skip prescription image upload');
        
        setTimeout(() => {
       addBotMessage( 'Any additional notes about your prescription request? (Optional)');
          setChatStep(12);
        }, 500);
        return;
      }
      
      // Prescription image upload handled by file upload component
      setTimeout(() => {
      addBotMessage( 'Any additional notes about your prescription request? (Optional)');
        setChatStep(12);
      }, 500);
    } else if (chatStep === 12) {
      // Additional notes
      addMessage('user', input || 'No additional notes');
      setPrescriptionForm(prev => ({ ...prev, additionalNotes: input }));
      setInput('');
      
      setTimeout(() => {
     addBotMessage('Thank you! Here is a summary of your prescription request:');
        
        setTimeout(() => {
          const summary = `
            Medication: ${prescriptionForm.medicationName}
            Dosage: ${prescriptionForm.dosage}
            Frequency: ${prescriptionForm.frequency}
            Duration: ${prescriptionForm.duration}
            Patient Name: ${constructFullName(prescriptionForm)}
            Date of Birth: ${prescriptionForm.dateOfBirth}
            Email: ${prescriptionForm.email}
            Phone: ${prescriptionForm.phone}
            ID Verification: ${prescriptionForm.idVerificationFront && prescriptionForm.idVerificationBack ? 'Both sides uploaded' : 'Not complete'}
            Prescription Image: ${prescriptionForm.prescriptionImage ? 'Uploaded' : 'Not provided'}
            Additional Notes: ${prescriptionForm.additionalNotes || 'None'}
          `;
          
       addBotMessage( summary, [
            { label: 'Submit Request', value: 'submit-prescription' },
            { label: 'Cancel', value: 'cancel-prescription' }
          ]);
          setChatStep(13);
        }, 500);
      }, 500);
    }
  };

  const resetForms = () => {
    setChatMode(null);
    setDisabledMessages(new Set()); // Clear disabled messages when resetting
    setExistingPatient(null); // Clear existing patient data when resetting
    setTempFormData({}); // Clear temporary form data when resetting
    setIsInputDisabled(false); // Ensure input is enabled when resetting
    setAppointmentForm({
      date: undefined,
      time: '',
      type: '',
      doctorId: '',
      firstName: '',
      middleInitial: '',
      lastName: '',
      suffix: '',
      email: '',
      phone: '',
      notes: '',
      dateOfBirth: '',
      gender: '',
      religion: '',
      address: '',
      maritalStatus: '',
      termsAgreed: false,
      patient_id: ''
    });
    setMedicalRecordForm({
      requestType: 'Medical Certificate',
      patientId: '',
      firstName: '',
      middleInitial: '',
      lastName: '',
      suffix: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      idVerificationFront: null,
      idVerificationFrontPreview: null,
      idVerificationBack: null,
      idVerificationBackPreview: null,
      additionalInfo: ''
    });
    setPrescriptionForm({
      prescriptionType: '', // 'new' or 'refill'
      patientId: '',
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      firstName: '',
      middleInitial: '',
      lastName: '',
      suffix: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      idVerificationFront: null,
      idVerificationFrontPreview: null,
      idVerificationBack: null,
      idVerificationBackPreview: null,
      prescriptionImage: null,
      prescriptionImagePreview: null,
      additionalNotes: ''
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setAppointmentForm(prev => ({ ...prev, date }));
      addMessage('user', `I'd like an appointment on ${date.toLocaleDateString()}`);
      
      // Update the date selector message to show the selected date
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.dateSelector && msg.availableDates
            ? {
                ...msg,
                selectedDate: date,
                timesDisabled: true // Disable after selection
              }
            : msg
        )
      );
      
      setTimeout(() => {
        if (appointmentForm.doctorId) {
          // Doctor first flow - show time slots for selected doctor
          getAvailableTimeSlotsForDoctor(appointmentForm.doctorId, date).then((times) => {
            setTimeout(() => {
              if (times.length === 0) {
              addBotMessage( 'I apologize, but all time slots for this doctor are already booked on the selected date. Please select a different date.');
              } else {
               addBotMessage(
                  'Please select a time slot:', 
                  undefined, // options
                  false, // dateSelector
                  true, // timeSelector
                  times, // times
                  false, // fileUpload
                  undefined, // fileUploadLabel
                  undefined, // fileUploadAccept
                  'slot', // messageType
                  undefined, // formFields
                  undefined, // availableDates
                  undefined, // selectedDate
                  undefined // selectedTime
                );
                setChatStep(5);
                setIsInputDisabled(true);
              }
            }, 500);
          });
        } else {
          // Date first flow - show available doctors
          getAvailableDoctorsForDate(date).then(availableDoctors => {
            setTimeout(() => {
              if (availableDoctors.length === 0) {
                addBotMessage( 'No doctors are available on this date. Please select a different date.');
              } else {
                const doctorOptions = availableDoctors.map(doctor => ({
                  label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                  value: doctor.id.toString()
                }));
                addBotMessage( 'Please select a doctor:', doctorOptions);
                setChatStep(5);
                setIsInputDisabled(true);
              }
            }, 500);
          });
        }
      }, 500);
    }
  };

  // New handler for combined date-time selection
  const handleDateTimeSelect = (date: Date, time: string) => {
    setAppointmentForm(prev => ({ ...prev, date, time }));
    addMessage('user', `I want an appointment on ${date.toLocaleDateString()} at ${time}`);
    
    // Update the datetime picker message to show selection is disabled
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.dateTimePicker && msg.messageKey
          ? {
              ...msg,
              selectedDate: date,
              selectedTime: time,
              dateTimePicker: false // Disable the picker after selection
            }
          : msg
      )
    );

    // Move to next step in appointment flow
    setTimeout(() => {
      addBotMessage(`Excellent! 🎉 I have you down for ${date.toLocaleDateString()} at ${time}. Now, what type of appointment do you need?`, [
        { label: 'Consultation', value: 'Consultation' },
        { label: 'Follow-up', value: 'Follow-up' },
        { label: 'Vaccination', value: 'Vaccination' }
      ]);
      setChatStep(6);
    }, 500);
  };

  const startChat = () => {
    setShowChat(true);
    setMessages([]);
    setChatStep(0);
    setIsInputDisabled(false); // Ensure input is enabled when starting chat
    resetForms();
  };

  const getAvailableDates = async () => {
    try {
      // First get doctors with availability only
      const allDoctors = await fetchDoctorsWithAvailability();
      if (!allDoctors || allDoctors.length === 0) {
        console.error('No doctors with availability found');
        return [];
      }

      const today = new Date();
      const availableDates: Date[] = [];
      let daysToCheck = 60; // Check next 2 months to give users more options
      
      // Check each date in the next 2 months
      for (let i = 1; i <= daysToCheck; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        // Skip weekends
        if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;
        
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        // Check if any doctor has available time slots on this date
        let hasAvailableSlots = false;
        
        for (const doctor of allDoctors) {
          try {
            const response = await api.availability.getTimeSlots(doctor.id.toString(), dateString);
            
            if (response && Array.isArray(response) && response.length > 0) {
              const availability = response[0];
              if (availability && availability.time_slots && Array.isArray(availability.time_slots)) {
                // Check if there are any available (non-booked) slots
                const availableSlots = availability.time_slots.filter(slot => {
                  const isBooked = Boolean(
                    slot.is_booked === true || 
                    slot.is_booked === 1 || 
                    slot.is_booked === "true" || 
                    slot.is_booked === "1" ||
                    slot.is_booked === "True" ||
                    slot.is_booked === "TRUE" ||
                    slot.is_booked === "yes" ||
                    slot.is_booked === "YES" ||
                    slot.is_booked === "Yes"
                  );
                  console.log(`Slot ${slot.start_time}: is_booked=${slot.is_booked}, filtered out=${isBooked}`);
                  return !isBooked;
                });
                
                console.log(`Doctor ${doctor.id} has ${availableSlots.length} available slots on ${dateString}`);
                if (availableSlots.length > 0) {
                  hasAvailableSlots = true;
                  console.log(`✅ Date ${dateString} has available slots with doctor ${doctor.id}`);
                  break; // Found available slots, no need to check other doctors for this date
                }
              } else {
                console.log(`Doctor ${doctor.id} has no time_slots data`);
              }
            } else {
              console.log(`Doctor ${doctor.id} has no availability response or empty response`);
            }
          } catch (error) {
            console.error(`Error checking availability for doctor ${doctor.id} on ${dateString}:`, error);
            // Continue checking other doctors
          }
        }
        
        console.log(`Date ${dateString}: hasAvailableSlots = ${hasAvailableSlots}`);
        if (hasAvailableSlots) {
          availableDates.push(checkDate);
        }
      }
      
    
      return availableDates;
    } catch (error) {
      console.error('Error getting available dates:', error);
      // Fallback to old logic if API fails
      const today = new Date();
      const fallbackDates: Date[] = [];
      
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        if (checkDate.getDay() !== 0 && checkDate.getDay() !== 6) {
          fallbackDates.push(checkDate);
        }
      }
      
      return fallbackDates;
    }
  };

  const getAvailableDatesForDoctor = async (doctorId: string) => {
    try {
      const response = await api.availability.getAvailableDates(doctorId);

      if (!response || !Array.isArray(response)) {
        console.error('Invalid response format:', response);
        return [];
      }

      // Convert date strings to Date objects in Pacific Time
      const availableDates = response.map((dateStr: string) => {
        // Create date in Pacific Time
        const date = new Date(dateStr + 'T00:00:00-08:00');
        
        return date;
      });

      // Filter to only include dates within the next 2 weeks (14 days)
      const today = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(today.getDate() + 14);
      
      const filteredDates = availableDates.filter(date => {
        return date >= today && date <= twoWeeksFromNow;
      });
      
      return filteredDates;
    } catch (error) {
      console.error('Error fetching available dates:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params
        });
      }

      toast({
        title: "Error",
        description: "Failed to fetch available dates. Please try again.",
        variant: "destructive"
      });
      return [];
    }
  };

  const getAvailableDoctorsForDate = async (date: Date) => {
    try {
      // Use the same date formatting as getAvailableDates to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      
      // First, get doctors with availability only
      const allDoctors = await fetchDoctorsWithAvailability();
      
      if (!allDoctors || allDoctors.length === 0) {
        console.error('No doctors with availability found in the response');
        return [];
      }

      // Check availability for each doctor on the selected date
      const availableDoctors = await Promise.all(
        allDoctors.map(async (doctor) => {
          try {
            
            const response = await api.availability.getTimeSlots(doctor.id.toString(), dateString);
           
            if (response && Array.isArray(response) && response.length > 0) {
              const availability = response[0];
              if (availability && availability.time_slots && Array.isArray(availability.time_slots)) {
                // Filter out booked slots with comprehensive boolean checking
                const availableSlots = availability.time_slots.filter(slot => {
                  // Handle all possible truthy representations of "booked"
                  const isBooked = Boolean(
                    slot.is_booked === true || 
                    slot.is_booked === 1 || 
                    slot.is_booked === "true" || 
                    slot.is_booked === "1" ||
                    slot.is_booked === "True" ||
                    slot.is_booked === "TRUE" ||
                    slot.is_booked === "yes" ||
                    slot.is_booked === "YES" ||
                    slot.is_booked === "Yes"
                  );
                  return !isBooked;
                });
                
               
              }
            } else {
              console.log(`No time slots data found for doctor ${doctor.id} on ${dateString}`);
            }
            return null;
          } catch (error) {
            console.error(`Error checking availability for doctor ${doctor.id}:`, error);
            return null;
          }
        })
      );

      const filteredDoctors = availableDoctors.filter((doctor): doctor is Doctor => doctor !== null);
      console.log('Available doctors after filtering:', filteredDoctors);
      return filteredDoctors;
    } catch (error) {
      console.error('Error in getAvailableDoctorsForDate:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available doctors. Please try again.",
        variant: "destructive"
      });
      return [];
    }
  };

  const getAvailableTimeSlotsForDoctor = async (doctorId: string, date: Date) => {
    try {
      // Format date to YYYY-MM-DD without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      
      // Fetch time slots from the API with cache-busting parameter
      const response = await api.availability.getTimeSlots(doctorId, dateString);
      

      
      // Check if response is an array and has at least one item
      if (!Array.isArray(response) || response.length === 0) {
        console.error('Invalid time slots response format:', response);
        toast({
          title: "No Availability",
          description: "No time slots are available for this doctor on the selected date.",
          variant: "destructive"
        });
        return [];
      }

      // Get the first availability object
      const availability = response[0];
      
      // Check if availability has time_slots array
      if (!availability || !availability.time_slots || !Array.isArray(availability.time_slots)) {
        console.error('Invalid time slots format in availability:', availability);
        toast({
          title: "No Availability",
          description: "No time slots are available for this doctor on the selected date.",
          variant: "destructive"
        });
        return [];
      }
      
      
     
      const availableSlots = availability.time_slots.filter(slot => {
        // Handle all possible truthy representations of "booked"
        const isBooked = Boolean(
          slot.is_booked === true || 
          slot.is_booked === 1 || 
          slot.is_booked === "true" || 
          slot.is_booked === "1" ||
          slot.is_booked === "True" ||
          slot.is_booked === "TRUE" ||
          slot.is_booked === "yes" ||
          slot.is_booked === "YES" ||
          slot.is_booked === "Yes"
        );
        return !isBooked;
      });
     
      // Filter out booked slots and format for display
      const formattedAvailableSlots = availableSlots.map(slot => {
        const [hours, minutes] = slot.start_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      });

     
     
      
      return formattedAvailableSlots;
    } catch (error) {
      console.error('Error fetching time slots:', error);
      if (error.response) {
        console.error('API Error Response:', error.response.data);
        console.error('API Error Status:', error.response.status);
      }
      toast({
        title: "Error",
        description: "Failed to fetch available time slots. Please try again.",
        variant: "destructive"
      });
      return [];
    }
  };

  const fetchDoctors = async () => {
    try {
      setIsLoadingDoctors(true);
      
      const response = await api.doctors.getAll();
     
      setDoctors(response);
      return response;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch doctors. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const fetchDoctorsWithAvailability = async () => {
    try {
      setIsLoadingDoctors(true);
     
      
      // First fetch all doctors
      const allDoctors = await api.doctors.getAll();
     
      
      // Check availability for each doctor
      const doctorsWithAvailability = [];
      
      for (const doctor of allDoctors) {
        try {
          const availableDates = await getAvailableDatesForDoctor(doctor.id.toString());
          if (availableDates.length > 0) {
            doctorsWithAvailability.push(doctor);
           
          } else {
           
          }
        } catch (error) {
          
        }
      }
      
      
      setDoctors(doctorsWithAvailability);
      return doctorsWithAvailability;
    } catch (error) {
      console.error('Error fetching doctors with availability:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available doctors. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  // Handle different lookup response scenarios
  const handleLookupResponse = (response: any) => {
    const { status, patient_id, suggestion, message } = response;
    
    switch (status) {
      case 'match':
        // Store the patient ID for later use
        if (chatMode === 'appointment') {
          setAppointmentForm(prev => ({ ...prev, patient_id: patient_id }));
        } else if (chatMode === 'medicalRecord') {
          setMedicalRecordForm(prev => ({ ...prev, patientId: patient_id }));
        } else if (chatMode === 'prescription') {
          setPrescriptionForm(prev => ({ ...prev, patientId: patient_id }));
        }
        
        // Store in localStorage for session persistence
        localStorage.setItem('chatbot_patient_id', patient_id);
        
        addBotMessage('✅ Thank you! I\'ve found your patient record. Your information has been verified successfully. Let\'s continue your request.');
        
        setTimeout(() => {
          // Continue with the normal flow based on chat mode
          if (chatMode === 'appointment') {
            fetchPatientDataAndContinueAppointment(patient_id);
          } else if (chatMode === 'medicalRecord' || chatMode === 'prescription') {
            fetchPatientDataAndContinue(patient_id, chatMode);
          }
        }, 1000);
        break;
        
      case 'partial_match':
        setLookupResult({ status, suggestion, patient_id });
        addBotMessage(`Hmm, I found a similar record: ${suggestion}. Is this you? Please reply YES or NO.`);
        setChatStep('confirm_match');
        setIsInputDisabled(false);
        break;
        
      case 'no_match':
        addBotMessage('⚠️ I couldn\'t find any patient record with those details. Please double-check your name, birthdate, email, or phone number. If the issue persists, contact the clinic for help.', [
          { label: '🔄 Try Again', value: 'retry-lookup' }
        ]);
        break;
        
      case 'multiple_match':
        addBotMessage('I found multiple patients with similar details. Could you please confirm your registered email or phone number again so I can narrow it down?', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
          {
            name: 'email',
            label: 'Registered Email',
            type: 'email',
            required: true,
            placeholder: 'your.email@example.com'
          },
          {
            name: 'phone',
            label: 'Registered Phone Number',
            type: 'tel',
            required: true,
            placeholder: '09123456789'
          }
        ]);
        setChatStep('refine_lookup');
        setIsInputDisabled(true);
        break;
        
      case 'error':
        addBotMessage('I apologize, but I\'m having trouble accessing our records right now. Please try again later or contact the clinic for assistance.', [
          { label: '🔄 Try Again', value: 'retry-lookup' }
        ]);
        break;
        
      default:
        addBotMessage('There was an issue processing your request. Please try again.', [
          { label: '🔄 Try Again', value: 'retry-lookup' }
        ]);
    }
  };

  // Handle patient data fetching and continuation
  const fetchPatientDataAndContinue = async (patientId: string, mode: 'medicalRecord' | 'prescription') => {
    try {
      const patientData = await fetchPatientData(patientId);
      
      if (mode === 'medicalRecord') {
        setMedicalRecordForm(prev => ({ 
          ...prev, 
          patientId,
          firstName: patientData.first_name || '',
          middleInitial: patientData.middle_initial || '',
          lastName: patientData.last_name || '',
          suffix: patientData.suffix || '',
          dateOfBirth: patientData.date_of_birth || '',
          email: patientData.email || '',
          phone: patientData.phone || ''
        }));
        
        setTimeout(() => {
          addBotMessage(`Great! I found your information:
            Name: ${patientData.first_name || ''} ${patientData.middle_initial || ''} ${patientData.last_name || ''} ${patientData.suffix || ''}
            Email: ${patientData.email || 'Not provided'}
            Phone: ${patientData.phone || 'Not provided'}
            
Now please upload the FRONT side of your valid government-issued ID for verification.`, [], false, false, [], true, 'Upload ID Front', 'image/*');
          setChatStep(3);
        }, 1000);
      } else if (mode === 'prescription') {
        setPrescriptionForm(prev => ({ 
          ...prev, 
          patientId,
          firstName: patientData.first_name || '',
          middleInitial: patientData.middle_initial || '',
          lastName: patientData.last_name || '',
          suffix: patientData.suffix || '',
          dateOfBirth: patientData.date_of_birth || '',
          email: patientData.email || '',
          phone: patientData.phone || ''
        }));
        
        setTimeout(() => {
          addBotMessage(`Great! I found your information:
            Name: ${patientData.first_name || ''} ${patientData.middle_initial || ''} ${patientData.last_name || ''} ${patientData.suffix || ''}
            Email: ${patientData.email || 'Not provided'}
            Phone: ${patientData.phone || 'Not provided'}
            
Now please upload the FRONT side of your valid government-issued ID for verification.`, [], false, false, [], true, 'Upload ID Front', 'image/*');
          setChatStep(3);
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      addBotMessage('Sorry, there was an error retrieving your patient data. Please try again.');
    }
  };

  // Handle patient data fetching and continuation for appointments
  const fetchPatientDataAndContinueAppointment = async (patientId: string) => {
    try {
      const patientData = await fetchPatientData(patientId);
      
      // Store existing patient data for later use
      setExistingPatient(patientData);
      
      // Pre-populate appointment form with patient data
      setAppointmentForm(prev => ({
        ...prev,
        patient_id: patientId,
        firstName: patientData.first_name || '',
        middleInitial: patientData.middle_initial || '',
        lastName: patientData.last_name || '',
        suffix: patientData.suffix || '',
        dateOfBirth: patientData.date_of_birth || '',
        email: patientData.email || '',
        phone: patientData.phone || '',
        gender: patientData.gender || '',
        address: patientData.address || '',
        maritalStatus: patientData.marital_status || ''
      }));
      
      setTimeout(() => {
        addBotMessage(`Great! I found your information:
          Name: ${patientData.first_name || ''} ${patientData.middle_initial || ''} ${patientData.last_name || ''} ${patientData.suffix || ''}
          Email: ${patientData.email || 'Not provided'}
          Phone: ${patientData.phone || 'Not provided'}
          
Would you like to use this information or update it?`, [
          { label: '✓ Use existing information', value: 'use-existing-info' },
          { label: '✏️ Update my information', value: 'update-info' }
        ]);
        setChatStep(6.2); // Go to patient info choice step
        setIsInputDisabled(true);
      }, 1000);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      addBotMessage('Sorry, there was an error retrieving your patient data. Please try again.');
    }
  };

  // Add form submission handler for patient lookup
  const handlePatientLookupSubmit = async (formData: Record<string, string>) => {
    // Construct full name from components to match backend format exactly
    const fullName = constructFullNameForLookup(
      formData.firstName || '',
      formData.middleInitial || '',
      formData.lastName || '',
      formData.suffix || ''
    );
    
    const lookupData = {
      firstName: formData.firstName || '',
      middleInitial: formData.middleInitial || '',
      lastName: formData.lastName || '',
      suffix: formData.suffix || '',
      fullName: fullName,
      dateOfBirth: formData.dateOfBirth || '',
      email: formData.email || '',
      phone: formData.phone || ''
    };
    
    setPatientLookupForm(lookupData);
    setIsInputDisabled(false);
    
    addMessage('user', 'I have submitted my lookup information');
    
    try {
      addBotMessage('Looking up your patient record...');
      
      // Add a small delay to ensure any recent patient creation is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const lookupResponse = await lookupPatientByDetails(lookupData);
      
      setTimeout(() => {
        handleLookupResponse(lookupResponse);
      }, 1000);
      
    } catch (error: any) {
      setTimeout(() => {
        console.error('Patient lookup error:', error);
        let errorMessage = '⚠️ I apologize, but I\'m having trouble accessing our records right now. ';
        
        if (error.message === 'Network Error') {
          errorMessage += 'Please check your internet connection and try again.';
        } else if (error.response?.status === 500) {
          errorMessage += 'Our server is experiencing issues. Please try again in a few minutes.';
        } else if (error.response?.status === 400) {
          errorMessage += 'Please double-check your information and try again.';
        } else {
          errorMessage += 'Please try again later or contact the clinic for assistance.';
        }
        
        addBotMessage(errorMessage, [
          { label: '🔄 Try Again', value: 'retry-lookup' }
        ]);
      }, 1000);
    }
  };

  const handleFormSubmit = (formData: Record<string, string>) => {
    if (chatStep === 'lookup') {
      handlePatientLookupSubmit(formData);
    } else if (chatStep === 'refine_lookup') {
      // Handle refined lookup with email/phone only
      setIsInputDisabled(false);
      addMessage('user', 'I have updated my contact information');
      
      // Merge with existing lookup data
      const refinedData = {
        ...patientLookupForm,
        email: formData.email,
        phone: formData.phone
      };
      
      lookupPatientByDetails(refinedData)
        .then(response => {
          setTimeout(() => {
            handleLookupResponse(response);
          }, 1000);
        })
        .catch(error => {
          setTimeout(() => {
            console.error('Patient refined lookup error:', error);
            let errorMessage = 'Sorry, there was an error looking up your information. ';
            
            if (error.message === 'Network Error') {
              errorMessage += 'Please check your internet connection and try again.';
            } else if (error.response?.status === 500) {
              errorMessage += 'Our server is experiencing issues. Please try again in a few minutes.';
            } else {
              errorMessage += 'Please try again or contact the clinic for assistance.';
            }
            
            addBotMessage(errorMessage, [
              { label: 'Try Again', value: 'retry-lookup' }
            ]);
          }, 1000);
        });
    } else {
      // Handle regular appointment form submission
      setIsInputDisabled(false); // Re-enable input after form submission
      
      // Store form data temporarily for appointment confirmation
      setTempFormData(formData);
      
      // Update appointment form with all the form data
      setAppointmentForm(prev => ({
        ...prev,
        firstName: formData.firstName || '',
        middleInitial: formData.middleName || '', // Map middleName to middleInitial
        lastName: formData.lastName || '',
        suffix: formData.suffix || '',
        email: formData.email || '',
        phone: formData.phone || '',
        dateOfBirth: formData.dateOfBirth || '',
        gender: formData.sex || '', // Map sex to gender
        address: formData.address || '',
        maritalStatus: formData.maritalStatus || '',
        religion: formData.religion || '',
        age: formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : ''
      }));

      // Add user message showing the submitted information
      addMessage('user', 'I have submitted my personal information');

      // Continue with additional notes step
      setTimeout(() => {
        addBotMessage('Is there any additional notes or special requests for your appointment?');
        setChatStep('additional-notes');
        setIsInputDisabled(false);
      }, 500);
    }
  };

  const handleFormCancel = () => {
    addMessage('user', 'Cancel form');
    setTimeout(() => {
      addBotMessage('No problem — you can return to the main menu or start over any time. Would you like to go back?', [
        { label: '🏠 Back to Main Menu', value: 'back-to-main' },
        { label: '🔄 Try Booking Again', value: 'try-booking-again' }
      ]);
      setIsInputDisabled(true);
    }, 500);
  };

  const showAppointmentSummary = () => {
    addBotMessage('Thank you! Here is a summary of your appointment booking:');
    
    setTimeout(() => {
      const selectedDoctor = doctors.find(d => d.id.toString() === appointmentForm.doctorId);
      const doctorName = selectedDoctor 
        ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`
        : 'Selected Doctor';
      
      const appointmentDetails = `
📅 Date: ${appointmentForm.date?.toLocaleDateString()}
⏰ Time: ${appointmentForm.time}
👨‍⚕️ Doctor: ${doctorName}
📋 Type: ${appointmentForm.type}
👤 Patient: ${constructFullName(appointmentForm)}
📧 Email: ${appointmentForm.email}
📞 Phone: ${appointmentForm.phone}
🎂 Date of Birth: ${appointmentForm.dateOfBirth}
🎂 Age: ${appointmentForm.dateOfBirth ? calculateAge(appointmentForm.dateOfBirth) : 'Not provided'}
⚧ Sex: ${appointmentForm.gender}
🙏 Religion: ${appointmentForm.religion || 'Not specified'}
🏠 Address: ${appointmentForm.address}
💒 Marital Status: ${appointmentForm.maritalStatus || 'Not specified'}
📝 Notes: ${appointmentForm.notes || 'None'}
📬 Confirmation: ${appointmentForm.confirmationMethod === 'sms' ? 'Text Message' : 'Email'}
      `.trim();

      addBotMessage(appointmentDetails);

      setTimeout(() => {
        addBotMessage('Would you like to confirm this appointment?', [
          { label: '✅ Yes, confirm appointment', value: 'confirm-appointment' },
          { label: '❌ No, make changes', value: 'cancel-appointment' }
        ]);
        setChatStep(20); // Move to confirmation step
        setIsInputDisabled(true);
      }, 1000);
    }, 500);
  };

  return {
    messages,
    input,
    setInput,
    showChat,
    appointmentForm,
    handleSendMessage,
    handleOptionSelect,
    handleDateSelect,
    handleDateTimeSelect,
    handleFileUpload,
    handleFormSubmit,
    handleFormCancel,
    startChat,
    isLoadingDoctors,
    isLoadingProfanityWords,
    profanityWordsCount: profanityWords.length,
    isInputDisabled,
    isTyping,
    patientLookupForm,
    lookupResult
  };
};
