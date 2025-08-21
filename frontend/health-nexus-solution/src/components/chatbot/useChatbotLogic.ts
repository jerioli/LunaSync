import { useClinic } from '@/contexts/ClinicContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Appointment } from '@/lib/mock-data';
import { api, Doctor, Patient } from '@/services/api';
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
  
  const API_BASE_URL = 'http://localhost:8000/api';

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
    address: '',
    maritalStatus: '',
    termsAgreed: false
  });

  // Form state for medical record requests
  const [medicalRecordForm, setMedicalRecordForm] = useState<MedicalRecordRequestForm>({
    requestType: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    idVerification: null,
    additionalInfo: ''
  });

  // Form state for prescription requests
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionRequestForm>({
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
    idVerification: null,
    prescriptionImage: null,
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

  const faqs = clinicCustomization.faqs || [];

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
    if (showChat) {
      setTimeout(() => {
        addBotMessage("Hello! I'm Dr.MDSync, your healthcare assistant. Say hi to start conversation?", [
          { label: "Hi", value: "hi" }
        ]);
      }, 500);
    }
  }, [showChat, t]);

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
    messageType?: 'text' | 'options' | 'date' | 'doctor' | 'slot' | 'form',
    formFields?: FormField[],
    availableDates?: Date[],
    selectedDate?: Date,
    selectedTime?: string
  ) => {
    const messageId = uuidv4();
    // Create messageKey for options or timeSelector (for disabling functionality)
    const messageKey = (options || timeSelector) ? messageId : undefined;

    setMessages(prev => [...prev, {
      id: messageId,
      messageKey,
      sender,
      text,
      options,
      dateSelector,
      timeSelector,
      times,
      availableDates,
      selectedDate,
      selectedTime,
      fileUpload,
      fileUploadLabel,
      fileUploadAccept,
      type: messageType,
      formFields
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
    messageType?: 'text' | 'options' | 'date' | 'doctor' | 'slot' | 'form',
    formFields?: FormField[],
    availableDates?: Date[],
    selectedDate?: Date,
    selectedTime?: string,
    typingDuration: number = 1000
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
        const messageKey = (options || timeSelector) ? messageId : undefined;

        return [...withoutTyping, {
          id: messageId,
          messageKey,
          sender: 'bot' as const,
          text,
          options,
          dateSelector,
          timeSelector,
          times,
          availableDates,
          selectedDate,
          selectedTime,
          fileUpload,
          fileUploadLabel,
          fileUploadAccept,
          type: messageType,
          formFields
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
      console.log('Loaded profanity words:', uniqueWords.length);
      
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

  const handleSendMessage = () => {
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
          { label: t('appointment.schedule'), value: 'appointment' },
          { label: t('chatbot.requestMedicalRecord'), value: 'medicalRecord' },
          { label: t('chatbot.requestPrescription'), value: 'prescription' },
          { label: 'FAQs', value: 'faq' },
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
            { label: '1. ' + t('appointment.schedule'), value: 'appointment' },
            { label: '2. ' + t('chatbot.requestMedicalRecord'), value: 'medicalRecord' },
            { label: '3. ' + t('chatbot.requestPrescription'), value: 'prescription' },
            { label: '4. FAQs', value: 'faq' },
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
        // Handle email input for returning patients
        if (!validateEmail(input)) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addBotMessage('Please enter a valid email address:');
          }, 500);
          return;
        }
        
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, email: input }));
        setInput('');
        
        // Check if patient already exists (for returning patients only)
        setTimeout(async () => {
          try {
            addBotMessage('Looking up your information...');
            
            const response = await api.patients.checkByEmail(input);
            
            if (response.exists && response.patient) {
              setExistingPatient(response.patient);
              
              setTimeout(() => {
                addBotMessage(`Welcome back, ${response.patient.name}! I found your information in our system. Would you like me to use your existing details or update them?`, [
                  { label: 'Use Existing Info', value: 'use-existing-info' },
                  { label: 'Update My Info', value: 'update-info' }
                ]);
                setChatStep(6.2); // Existing patient choice
                setIsInputDisabled(true);
              }, 1000);
            } else {
              setExistingPatient(null);
              setTimeout(() => {
                addBotMessage(`I couldn't find any records with the email ${input}. It looks like you might be a new patient. Let me guide you through our registration process.`);
                
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
            addBotMessage(t('chatbot.enterValidEmail'));
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
            addBotMessage('Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
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
            addBotMessage('Please enter a valid date in MM/DD/YYYY format:');
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
            addBotMessage('Please enter a valid date of birth (between 1 and 100 years ago):');
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
      }
    } else if (chatMode === 'medicalRecord') {
      handleMedicalRecordFlow();
    } else if (chatMode === 'prescription') {
      handlePrescriptionFlow();
    }
  };

  const handleMedicalRecordFlow = () => {
    // Check for profanity in medical record inputs
    if (handleProfanityDetection(input)) {
      setInput('');
      return;
    }

    if (chatStep === 2) {
      const inputLower = input.toLowerCase().trim();
      setInput('');
      
      // Check for common medical record type keywords
      if (inputLower.includes('lab') || inputLower === '1') {
        // Don't show user message, directly proceed to lab selection
        setTimeout(() => {
          handleOptionSelect('lab');
        }, 300);
      } else if (inputLower.includes('imaging') || inputLower.includes('x-ray') || inputLower.includes('scan') || inputLower === '2') {
        // Don't show user message, directly proceed to imaging selection
        setTimeout(() => {
          handleOptionSelect('imaging');
        }, 300);
      } else if (inputLower.includes('history') || inputLower.includes('visit') || inputLower === '3') {
        // Don't show user message, directly proceed to history selection
        setTimeout(() => {
          handleOptionSelect('history');
        }, 300);
      } else if (inputLower.includes('all') || inputLower.includes('everything') || inputLower === '4') {
        // Don't show user message, directly proceed to all records selection
        setTimeout(() => {
          handleOptionSelect('all');
        }, 300);
      } else {
        // Only show user message if input doesn't match any option
        addMessage('user', input);
        setMedicalRecordForm(prev => ({ ...prev, requestType: input }));
        
        setTimeout(() => {
          addBotMessage('Please enter your first name:');
          setChatStep(3);
        }, 500);
      }
    } else if (chatMode === 'medicalRecord' && chatStep === 3) {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, firstName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your middle initial (optional):');
        setChatStep('3b');
      }, 500);
    } else if (chatMode === 'medicalRecord' && chatStep === '3b') {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, middleInitial: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your last name:');
        setChatStep('3c');
      }, 500);
    } else if (chatMode === 'medicalRecord' && chatStep === '3c') {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, lastName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your suffix (optional, e.g., Jr., Sr., III):');
        setChatStep('3d');
      }, 500);
    } else if (chatMode === 'medicalRecord' && chatStep === '3d') {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, suffix: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(4);
      }, 500);
    } else if (chatMode === 'medicalRecord' && chatStep === 4) {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage('Please enter your email address:');
        setChatStep(5);
      }, 500);
    } else if (chatMode === 'medicalRecord' && chatStep === 5) {
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
      setMedicalRecordForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Please enter your phone number:');
        setChatStep(6);
      }, 500);
    } else if (chatMode === 'medicalRecord' && chatStep === 6) {
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
      setMedicalRecordForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage(
          'For identity verification, please upload a photo of your government-issued ID:', 
          undefined, // options
          false, // dateSelector
          false, // timeSelector
          undefined, // times
          true, // fileUpload
          "Upload ID", // fileUploadLabel
          "image/*", // fileUploadAccept
          undefined, // messageType
          undefined, // formFields
          undefined, // availableDates
          undefined, // selectedDate
          undefined // selectedTime
        );
        setChatStep(7);
      }, 500);
    } else if (chatStep === 8) {
      addMessage('user', input || 'No additional information');
      setMedicalRecordForm(prev => ({ ...prev, additionalInfo: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Thank you! Here is a summary of your medical records request:');
        
        setTimeout(() => {
          const summary = `
            Request Type: ${medicalRecordForm.requestType}
            Patient Name: ${constructFullName(medicalRecordForm)}
            Date of Birth: ${medicalRecordForm.dateOfBirth}
            Email: ${medicalRecordForm.email}
            Phone: ${medicalRecordForm.phone}
            ID Verification: ${medicalRecordForm.idVerification ? 'Uploaded' : 'Not uploaded'}
            Additional Info: ${medicalRecordForm.additionalInfo || 'None'}
          `;
          
         addBotMessage( summary, [
            { label: 'Submit Request', value: 'submit-record-request' },
            { label: 'Cancel', value: 'cancel-record-request' }
          ]);
          setChatStep(9);
        }, 500);
      }, 500);
    }
  };

  const handlePrescriptionFlow = () => {
    // Check for profanity in prescription inputs
    if (handleProfanityDetection(input)) {
      setInput('');
      return;
    }

    if (chatStep === 2) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, medicationName: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Please enter the dosage (e.g., 500mg):');
        setChatStep(3);
      }, 500);
    } else if (chatStep === 3) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, dosage: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'How often should the medication be taken? (e.g., twice daily):');
        setChatStep(4);
      }, 500);
    } else if (chatStep === 4) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, frequency: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage('How long should the medication be taken? (e.g., 7 days):');
        setChatStep(5);
      }, 500);
    } else if (chatMode === 'prescription' && chatStep === 5) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, duration: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage('Please enter your first name:');
        setChatStep(6);
      }, 500);
    } else if (chatMode === 'prescription' && chatStep === 6) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, firstName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your middle initial (optional):');
        setChatStep('6b');
      }, 500);
    } else if (chatMode === 'prescription' && chatStep === '6b') {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, middleInitial: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your last name:');
        setChatStep('6c');
      }, 500);
    } else if (chatMode === 'prescription' && chatStep === '6c') {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, lastName: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('Please enter your suffix (optional, e.g., Jr., Sr., III):');
        setChatStep('6d');
      }, 500);
    } else if (chatMode === 'prescription' && chatStep === '6d') {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, suffix: input }));
      setInput('');
      
      setTimeout(() => {
    addBotMessage( 'Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(7);
      }, 500);
    } else if (chatStep === 7) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
       addBotMessage( 'Please enter your email address:');
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
      setPrescriptionForm(prev => ({ ...prev, email: input }));
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
      setPrescriptionForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
        addBotMessage('For identity verification, please upload a photo of your government-issued ID:', undefined, undefined, undefined, undefined, true, "Upload ID", "image/*");
        setChatStep(10);
      }, 500);
    } else if (chatStep === 12) {
      addMessage('user', input || 'No additional notes');
      setPrescriptionForm(prev => ({ ...prev, additionalNotes: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Thank you! Here is a summary of your prescription request:');
        
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
            ID Verification: ${prescriptionForm.idVerification ? 'Uploaded' : 'Not uploaded'}
            Prescription Image: ${prescriptionForm.prescriptionImage ? 'Uploaded' : 'Not uploaded'}
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

  const handleFileUpload = (file: File) => {
    if (chatMode === 'medicalRecord' && chatStep === 7) {
      setMedicalRecordForm(prev => ({ ...prev, idVerification: file }));
      
      addMessage('user', `Uploaded ID: ${file.name}`);
      
      setTimeout(() => {
       addBotMessage( 'Is there any additional information you would like to provide for your medical records request? (Optional)');
        setChatStep(8);
      }, 500);
    } else if (chatMode === 'prescription' && chatStep === 10) {
      setPrescriptionForm(prev => ({ ...prev, idVerification: file }));
      
      addMessage('user', `Uploaded ID: ${file.name}`);
      
      setTimeout(() => {
       addBotMessage( 'Please upload an image of your previous prescription or relevant medical document (optional):', [
          { label: 'Skip Upload', value: 'skip-prescription-image' }
        ], undefined, undefined, undefined, true, "Upload Prescription", "image/*");
        setChatStep(11);
      }, 500);
    } else if (chatMode === 'prescription' && chatStep === 11) {
      setPrescriptionForm(prev => ({ ...prev, prescriptionImage: file }));
      
      addMessage('user', `Uploaded prescription: ${file.name}`);
      
      setTimeout(() => {
        addBotMessage( 'Any additional notes about your prescription request? (Optional)');
        setChatStep(12);
      }, 500);
    }
  };

  const handleOptionSelect = async (value: string, messageKey?: string) => {
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
      addMessage('user', 'Hi');
      setChatStep(1);
      setTimeout(() => {
        addBotMessage(t('chatbot.howCanIHelp'), [
          { label: t('appointment.schedule'), value: 'appointment' },
          { label: t('chatbot.requestMedicalRecord'), value: 'medicalRecord' },
          { label: t('chatbot.requestPrescription'), value: 'prescription' },
          { label: 'FAQs', value: 'faq' },
        ]);
      }, 500);
      return;
    }
    
    if (value === 'faq') {
      setChatMode('faq');
      addMessage('user', 'FAQs');
      setTimeout(() => {
        addBotMessage('Here are some frequently asked questions. Please select one or type your own:',
          [
            ...faqs.map((faq, i) => ({ label: faq.question, value: `faq_${i}` })),
            { label: 'Back to Main Menu', value: 'main' },
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
            { label: 'Schedule an Appointment', value: 'appointment' },
            { label: 'Request a Medical Certificate', value: 'medicalRecord' },
            { label: 'Request E-Prescription', value: 'prescription' },
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
      addMessage('user', 'Schedule Appointment');
      setTimeout(() => {
        addBotMessage('How would you like to schedule your appointment?', [
          { label: '1. Select Doctor First', value: 'doctor-first' },
          { label: '2. Select Date First', value: 'date-first' }
        ]);
        setChatStep(2);
      }, 500);
    } else if (value === 'medicalRecord') {
      setChatMode('medicalRecord');
      addMessage('user', 'Request Medical Records');
      setTimeout(() => {
        addBotMessage('What type of medical records do you need?', [
          { label: '1. Lab Results', value: 'lab' },
          { label: '2. Imaging Reports', value: 'imaging' },
          { label: '3. Visit History', value: 'history' },
          { label: '4. All Records', value: 'all' }
        ]);
        setChatStep(2);
      }, 500);
    } else if (value === 'prescription') {
      setChatMode('prescription');
      addMessage('user', 'Request Prescription');
      setTimeout(() => {
        addBotMessage('Please enter the name of the medication you need:');
        setChatStep(2);
      }, 500);
    } else if (value === 'returning-patient') {
      // Handle returning patient selection
      addMessage('user', 'Returning Patient');
      setTimeout(() => {
        addBotMessage('Great! Please provide your email address so I can look up your information:');
        setChatStep(6.1); // Email input for returning patients
        setIsInputDisabled(false);
      }, 500);
    } else if (value === 'first-visit') {
      // Handle first visit selection
      addMessage('user', 'First Visit');
      setTimeout(() => {
        addBotMessage('Welcome! Before we proceed, I need to inform you that we will be collecting some personal information to process your appointment request.');
        
        setTimeout(() => {
          addBotMessage('This includes your full name, email, phone number, and appointment details. Your information will be kept secure and used only for healthcare purposes.');
          
          setTimeout(() => {
            addBotMessage('Please confirm that you agree to our Terms and Conditions and Privacy Policy:', [
              { label: '✓ I agree to Terms & Conditions and Privacy Policy', value: 'agree-terms' },
              { label: '✗ I do not agree', value: 'decline-terms' }
            ]);
            setChatStep(6.5); // Direct to terms for new patients
            setIsInputDisabled(true);
          }, 1000);
        }, 1000);
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
            appointment_type: appointmentForm.type === 'Regular Checkup' ? 'Routine Check-up' : appointmentForm.type,
            date: formattedDate,
            time: formattedTime,
            notes: appointmentForm.notes || '',  // Only user's notes, no JSON structure
            doctor_id: parseInt(appointmentForm.doctorId),
            
            // Status and flags
            status: 'pending',
            is_pending_confirmation: true
          };

          // Log the data being sent
          console.log('Submitting appointment data:', appointmentData);

          // Submit appointment to API
          api.appointments.create(appointmentData)
            .then(response => {
              console.log('Appointment created:', response);
              
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
              
              console.log('New appointment object:', newAppointment);
              
              addAppointment(newAppointment);
              
              // Force refresh availability data by clearing any cached data
              setTimeout(() => {
                console.log('Appointment confirmed, availability data should be refreshed on next query');
              }, 100);
              
              setTimeout(() => {
                addBotMessage( 'Your appointment request has been submitted and is pending review. Our reception team will review your request and send you a confirmation email once approved. A patient record will be created after the appointment is confirmed.');
                
                toast({
                  title: "Appointment Request Submitted",
                  description: "Your appointment request is pending review. You will receive a confirmation email once approved.",
                });
                
                setTimeout(() => {
                  addBotMessage( 'Is there anything else I can help you with?', [
                    { label: 'Schedule Another Appointment', value: 'appointment' },
                    { label: 'Request Medical Records', value: 'medicalRecord' },
                    { label: 'No, Thank You', value: 'end' }
                  ]);
                  setChatStep(1);
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
              { label: 'Schedule Appointment', value: 'appointment' },
              { label: 'Request Medical Records', value: 'medicalRecord' },
              { label: 'No, Thank You', value: 'end' }
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
             addBotMessage( 'Your appointment has been successfully scheduled! You will receive a confirmation email shortly.');
              
              setTimeout(() => {
               addBotMessage( 'Is there anything else I can help you with?', [
                  { label: 'Schedule Another Appointment', value: 'appointment' },
                  { label: 'Request E-Prescription', value: 'prescription' },
                  { label: 'Request Medical Records', value: 'medical-records' },
                  { label: 'No, Thank You', value: 'end' }
                ]);
                setChatStep(1);
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
              { label: 'Schedule an Appointment', value: 'appointment' },
              { label: 'Request E-Prescription', value: 'prescription' },
              { label: 'Request Medical Records', value: 'medical-records' },
              { label: 'No, Thank You', value: 'end' }
            ]);
            setChatStep(1);
            resetForms();
          }, 500);
        }
      } else {
        handleAppointmentOptionSelect(value);
      }
    } else if (chatMode === 'medicalRecord') {
      // Handle medical record submission
      console.log('Medical record option selected:', value);
      if (value === 'submit-record-request') {
        console.log('Submit medical record button clicked!');
        addMessage('user', 'Submit medical record request');
        await submitMedicalRecordRequest();
        
        setTimeout(() => {
         addBotMessage( 'Is there anything else I can help you with?', [
            { label: 'Schedule an Appointment', value: 'appointment' },
            { label: 'Request E-Prescription', value: 'prescription' },
            { label: 'No, Thank You', value: 'end' }
          ]);
          setChatStep(1);
          resetForms();
        }, 1000);
      } else if (value === 'cancel-record-request') {
        addMessage('user', 'Cancel request');
        
        setTimeout(() => {
       addBotMessage( 'Medical record request cancelled. Is there anything else I can help you with?', [
            { label: 'Schedule an Appointment', value: 'appointment' },
            { label: 'Request E-Prescription', value: 'prescription' },
            { label: 'No, Thank You', value: 'end' }
          ]);
          setChatStep(1);
          resetForms();
        }, 500);
      } else {
        handleMedicalRecordOptionSelect(value);
      }
    } else if (chatMode === 'prescription') {
      // Handle prescription submission
      console.log('Prescription option selected:', value);
      if (value === 'submit-prescription-request' || value === 'submit-prescription') {
        console.log('Submit prescription button clicked!');
        addMessage('user', 'Submit prescription request');
        await submitPrescriptionRequest();
        
        setTimeout(() => {
        addBotMessage( 'Is there anything else I can help you with?', [
            { label: 'Schedule an Appointment', value: 'appointment' },
            { label: 'Request Medical Records', value: 'medicalRecord' },
            { label: 'No, Thank You', value: 'end' }
          ]);
          setChatStep(1);
          resetForms();
        }, 1000);
      } else if (value === 'cancel-prescription-request' || value === 'cancel-prescription') {
        addMessage('user', 'Cancel request');
        
        setTimeout(() => {
        addBotMessage( 'Prescription request cancelled. Is there anything else I can help you with?', [
            { label: 'Schedule an Appointment', value: 'appointment' },
            { label: 'Request Medical Records', value: 'medicalRecord' },
            { label: 'No, Thank You', value: 'end' }
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
        addMessage('user', 'I want to select a doctor first');
        
        // Show loading message while checking doctor availability
       addBotMessage( 'Let me check which doctors have available appointments...');
        
        fetchDoctorsWithAvailability().then((doctorsWithAvailability) => {
          if (doctorsWithAvailability.length === 0) {
            setTimeout(() => {
           addBotMessage( 'I apologize, but no doctors have available appointments in the next 2 weeks. Please try again later or contact us directly.');
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
         addBotMessage( 'Please select a doctor:', doctorOptions);
            setChatStep(3);
            setIsInputDisabled(true); // Disable input when showing doctor options
          }, 500);
        });
      } else if (value === 'date-first') {
        addMessage('user', 'I want to select a date first');
        
        // Show loading message while fetching available dates
      addBotMessage( 'Let me check available dates...');
        
        getAvailableDates().then(availableDates => {
          setTimeout(() => {
            if (availableDates.length === 0) {
            addBotMessage( 'I apologize, but there are no available dates in the next 2 weeks. Please try again later or contact us directly.');
              // Reset chat to initial state
              setTimeout(() => {
                setMessages([]);
                setChatStep(0);
                resetForms();
              }, 2000);
              return;
            }
            
           addBotMessage( 
              'Please select a date:', 
              undefined, // options
              true, // dateSelector
              false, // timeSelector
              undefined, // times
              false, // fileUpload
              undefined, // fileUploadLabel
              undefined, // fileUploadAccept
              'date', // messageType
              undefined, // formFields
              availableDates, // availableDates
              undefined, // selectedDate
              undefined // selectedTime
            );
            setChatStep(4);
            setIsInputDisabled(true); // Disable input when showing dates
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
           addBotMessage(
              `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name} is available on the following dates:`, 
              undefined, // options
              true, // dateSelector
              false, // timeSelector
              undefined, // times
              false, // fileUpload
              undefined, // fileUploadLabel
              undefined, // fileUploadAccept
              'date', // messageType
              undefined, // formFields
              availableDates, // availableDates
              undefined, // selectedDate
              undefined // selectedTime
            );
            setChatStep(4);
            setIsInputDisabled(true); // Disable input when showing dates
          }, 500);
        });
      }
    } else if (chatStep === 4) {
      // Date selected (both flows)
      const selectedDate = new Date(value);
      console.log('Selected date:', selectedDate);
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
              setIsInputDisabled(true); // Disable input when showing time slots
            }
          }, 500);
        });
      } else {
        // Date first flow - show available doctors
        console.log('Starting to fetch available doctors for date:', selectedDate);
        getAvailableDoctorsForDate(selectedDate).then(availableDoctors => {
          console.log('Received available doctors:', availableDoctors);
          
          if (!availableDoctors || availableDoctors.length === 0) {
            console.log('No doctors available, showing error message');
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

          console.log('Displaying available doctors:', availableDoctors);
          setTimeout(() => {
            const doctorOptions = availableDoctors.map(doctor => ({
              label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
              value: doctor.id.toString()
            }));
            console.log('Doctor options for display:', doctorOptions);
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
          addBotMessage( 'What type of appointment do you need?', appointmentTypes);
          setChatStep(6);
        }, 500);
      }
    } else if (chatMode === 'appointment' && chatStep === 6) {
      addMessage('user', `I need a ${value}`);
      setAppointmentForm(prev => ({ ...prev, type: value }));
      
      setTimeout(() => {
        addBotMessage('Perfect! Are you a returning patient or is this your first visit with us?', [
          { label: 'Returning Patient', value: 'returning-patient' },
          { label: 'First Visit', value: 'first-visit' }
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
            name: existingPatient.name,
            phone: existingPatient.phone,
            dateOfBirth: existingPatient.date_of_birth,
            gender: existingPatient.gender || '',
            address: existingPatient.address || '',
            maritalStatus: existingPatient.marital_status || ''
          }));
          
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
 Patient: ${existingPatient.name}
 Email: ${existingPatient.email}
 Phone: ${existingPatient.phone}
 Date of Birth: ${existingPatient.date_of_birth}
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
            name: existingPatient.name,
            phone: existingPatient.phone,
            dateOfBirth: existingPatient.date_of_birth,
            gender: existingPatient.gender || '',
            address: existingPatient.address || '',
            maritalStatus: existingPatient.marital_status || ''
          }));
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
         addBotMessage('Great! Now I need some information about you.');
          
          setTimeout(() => {
            addBotMessage('Please fill out the form below with your personal information:', undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'form', [
              {
                name: 'firstName',
                label: 'First Name',
                type: 'text',
                required: true,
                placeholder: 'Enter your first name'
              },
              {
                name: 'middleInitial',
                label: 'Middle Initial',
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
                name: 'gender',
                label: 'Gender',
                type: 'select',
                required: true,
                options: [
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                 
                ]
              },
              {
                name: 'address',
                label: 'Address',
                type: 'text',
                required: false,
                placeholder: 'Your complete address (optional)'
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
            ]);
            setIsInputDisabled(true); // Disable chat input while form is shown
          }, 500);
        }, 500);
      } else if (value === 'decline-terms') {
        setIsInputDisabled(false); // Re-enable input after declining terms
        addMessage('user', 'I do not agree to the terms');
        
        setTimeout(() => {
         addBotMessage( 'I understand. Unfortunately, I cannot proceed with booking an appointment without your consent to our Terms & Conditions and Privacy Policy.');
          
          setTimeout(() => {
           addBotMessage( 'If you change your mind, please feel free to start a new conversation. Is there anything else I can help you with today?');
            setChatStep(1); // Reset to main menu
          }, 1000);
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
      console.log('Submitting appointment request with form data:', appointmentForm);
      
      // Format the date to YYYY-MM-DD string
      const formattedDate = appointmentForm.date!.toISOString().split('T')[0];

      // Format time to 24-hour format with seconds
      const [time, period] = appointmentForm.time.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      const formattedTime = `${hour.toString().padStart(2, '0')}:${minutes}:00`;

      // Construct full name from components - use tempFormData if available, otherwise appointmentForm
      const formDataToUse = Object.keys(tempFormData).length > 0 ? tempFormData : appointmentForm;
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
        patient_email: formDataToUse.email || appointmentForm.email,
        patient_phone: formDataToUse.phone || appointmentForm.phone,
        date_of_birth: (formDataToUse.dateOfBirth || appointmentForm.dateOfBirth) ? new Date(formDataToUse.dateOfBirth || appointmentForm.dateOfBirth).toISOString().split('T')[0] : null,
        gender: (formDataToUse.gender || appointmentForm.gender) === 'Prefer not to say' ? 'prefer_not_to_say' : ((formDataToUse.gender || appointmentForm.gender) ? (formDataToUse.gender || appointmentForm.gender).toLowerCase() : null),
        address: formDataToUse.address || appointmentForm.address || null,
        marital_status: (formDataToUse.maritalStatus || appointmentForm.maritalStatus) === 'Prefer not to say' ? 'prefer_not_to_say' : ((formDataToUse.maritalStatus || appointmentForm.maritalStatus) ? (formDataToUse.maritalStatus || appointmentForm.maritalStatus).toLowerCase() : null),
        appointment_type: appointmentForm.type === 'Regular Checkup' ? 'Routine Check-up' : appointmentForm.type,
        date: formattedDate,
        time: formattedTime,
        doctor_id: parseInt(appointmentForm.doctorId),
        status: 'pending',
        is_pending_confirmation: true
      };

      console.log('Making request to create appointment:', appointmentData);
      console.log('tempFormData:', tempFormData);
      console.log('appointmentForm name fields:', {
        firstName: appointmentForm.firstName,
        middleInitial: appointmentForm.middleInitial,
        lastName: appointmentForm.lastName,
        suffix: appointmentForm.suffix
      });
      console.log('Final appointmentData name fields:', {
        firstName: appointmentData.firstName,
        middleInitial: appointmentData.middleInitial,
        lastName: appointmentData.lastName,
        suffix: appointmentData.suffix
      });
      const response = await api.appointments.create(appointmentData);
      console.log('Appointment created successfully:', response);

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
      console.log('Submitting medical record request with form data:', medicalRecordForm);
      
      const formData = new FormData();
      formData.append('request_type', medicalRecordForm.requestType);
      formData.append('patient_name', constructFullName(medicalRecordForm));
      formData.append('date_of_birth', medicalRecordForm.dateOfBirth);
      formData.append('email', medicalRecordForm.email);
      formData.append('phone', medicalRecordForm.phone);
      formData.append('additional_info', medicalRecordForm.additionalInfo);
      
      if (medicalRecordForm.idVerification) {
        formData.append('id_verification', medicalRecordForm.idVerification);
      }

      console.log('Making request to:', `${API_BASE_URL}/medical-certificates/`);
      const response = await axios.post(`${API_BASE_URL}/medical-certificates/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response received:', response);
      if (response.status === 200 || response.status === 201) {
        addBotMessage( 'Your medical records request has been submitted successfully! Our team will review your request and contact you within 2-3 business days.');
        
        toast({
          title: "Medical Records Request Submitted",
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
      console.log('Submitting prescription request with form data:', prescriptionForm);
      
      const formData = new FormData();
      formData.append('medication_name', prescriptionForm.medicationName);
      formData.append('dosage', prescriptionForm.dosage);
      formData.append('frequency', prescriptionForm.frequency);
      formData.append('duration', prescriptionForm.duration);
      formData.append('patient_name', constructFullName(prescriptionForm));
      formData.append('date_of_birth', prescriptionForm.dateOfBirth);
      formData.append('email', prescriptionForm.email);
      formData.append('phone', prescriptionForm.phone);
      formData.append('additional_notes', prescriptionForm.additionalNotes);
      
      if (prescriptionForm.idVerification) {
        formData.append('id_verification', prescriptionForm.idVerification);
      }
      
      if (prescriptionForm.prescriptionImage) {
        formData.append('prescription_image', prescriptionForm.prescriptionImage);
      }

      console.log('Making request to:', `${API_BASE_URL}/prescription-requests/`);
      const response = await axios.post(`${API_BASE_URL}/prescription-requests/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response received:', response);
      if (response.status === 200 || response.status === 201) {
       addBotMessage( 'Your prescription request has been submitted successfully! Our team will review your request and contact you within 2-3 business days.');
        
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
            ID Verification: ${medicalRecordForm.idVerification ? 'Uploaded' : 'Not provided'}
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
      
      setTimeout(() => {
        addBotMessage('Thank you for chatting with MedySync! If you need assistance in the future, just say hi to start a new conversation.');
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
            ID Verification: ${prescriptionForm.idVerification ? 'Uploaded' : 'Not provided'}
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
      address: '',
      maritalStatus: '',
      termsAgreed: false
    });
    setMedicalRecordForm({
      requestType: '',
      firstName: '',
      middleInitial: '',
      lastName: '',
      suffix: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      idVerification: null,
      additionalInfo: ''
    });
    setPrescriptionForm({
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
      idVerification: null,
      prescriptionImage: null,
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

  const startChat = () => {
    setShowChat(true);
    setMessages([]);
    setChatStep(0);
    resetForms();
  };

  const getAvailableDates = async () => {
    try {
      console.log('Getting available dates across all doctors...');
      
      // First get all doctors
      const allDoctors = await fetchDoctors();
      if (!allDoctors || allDoctors.length === 0) {
        console.error('No doctors found');
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
        console.log(`Checking date ${dateString} for available doctors...`);
        
        for (const doctor of allDoctors) {
          try {
            console.log(`Checking doctor ${doctor.id} (${doctor.first_name} ${doctor.last_name}) for ${dateString}`);
            const response = await api.availability.getTimeSlots(doctor.id.toString(), dateString);
            console.log(`Doctor ${doctor.id} response:`, response);
            
            if (response && Array.isArray(response) && response.length > 0) {
              const availability = response[0];
              if (availability && availability.time_slots && Array.isArray(availability.time_slots)) {
                console.log(`Doctor ${doctor.id} has ${availability.time_slots.length} time slots`);
                
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
      
      console.log('Available dates found:', availableDates.map(d => d.toISOString().split('T')[0]));
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
      console.log('Fetching available dates for doctor:', {
        doctorId,
        currentUser: currentUser?.email
      });

      const response = await api.availability.getAvailableDates(doctorId);
      console.log('Available dates response:', response);

      if (!response || !Array.isArray(response)) {
        console.error('Invalid response format:', response);
        return [];
      }

      // Convert date strings to Date objects in Pacific Time
      const availableDates = response.map((dateStr: string) => {
        // Create date in Pacific Time
        const date = new Date(dateStr + 'T00:00:00-08:00');
        console.log('Converting date:', { dateStr, date });
        return date;
      });

      // Filter to only include dates within the next 2 weeks (14 days)
      const today = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(today.getDate() + 14);
      
      const filteredDates = availableDates.filter(date => {
        return date >= today && date <= twoWeeksFromNow;
      });

      console.log('Processed available dates (filtered to 2 weeks):', filteredDates);
      
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
      
      console.log('🔍 getAvailableDoctorsForDate called with:');
      console.log('  - Input date object:', date);
      console.log('  - Formatted dateString (manual):', dateString);
      console.log('  - Formatted dateString (ISO):', date.toISOString().split('T')[0]);
      console.log('  - Date.toLocaleDateString():', date.toLocaleDateString());
      console.log('  - Date.toDateString():', date.toDateString());
      
      // First, get all doctors
      const allDoctors = await fetchDoctors();
      console.log('All doctors fetched:', allDoctors);
      
      if (!allDoctors || allDoctors.length === 0) {
        console.error('No doctors found in the response');
        return [];
      }

      // Check availability for each doctor on the selected date
      const availableDoctors = await Promise.all(
        allDoctors.map(async (doctor) => {
          try {
            console.log(`Checking availability for doctor ${doctor.id} on ${dateString}`);
            const response = await api.availability.getTimeSlots(doctor.id.toString(), dateString);
            console.log(`Availability response for doctor ${doctor.id}:`, response);

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
                
                if (availableSlots.length > 0) {
                  console.log(`Doctor ${doctor.id} has ${availableSlots.length} available slots`);
                  return doctor;
                } else {
                  console.log(`Doctor ${doctor.id} has no available slots on ${dateString}`);
                }
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
      
      console.log('Fetching time slots with params:', {
        doctorId,
        dateString
      });
      
      // Fetch time slots from the API with cache-busting parameter
      const response = await api.availability.getTimeSlots(doctorId, dateString);
      
      console.log('Received time slots response:', response);
      
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
      
      console.log('All time slots for doctor:', availability.time_slots);
      
      // Log detailed booking status for each slot
      availability.time_slots.forEach(slot => {
        console.log(`Slot ${slot.start_time}: is_booked=${slot.is_booked} (type: ${typeof slot.is_booked})`);
      });
      
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
      
      console.log('Available slots count:', availableSlots.length);
      console.log('Available slots before formatting:', availableSlots.map(s => `${s.start_time} (is_booked: ${s.is_booked})`));
      
      // Filter out booked slots and format for display
      const formattedAvailableSlots = availableSlots.map(slot => {
        const [hours, minutes] = slot.start_time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      });

      console.log('Final formatted available slots:', formattedAvailableSlots);
      
      if (formattedAvailableSlots.length === 0) {
        console.log('No available slots found after filtering');
        toast({
          title: "No Available Times",
          description: "All time slots for this doctor are already booked on the selected date. Please select a different date or doctor.",
          variant: "destructive"
        });
      }
      
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
      console.log('Fetching doctors...');
      const response = await api.doctors.getAll();
      console.log('Doctors response:', response);
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
      console.log('Fetching doctors with availability...');
      
      // First fetch all doctors
      const allDoctors = await api.doctors.getAll();
      console.log('All doctors:', allDoctors);
      
      // Check availability for each doctor
      const doctorsWithAvailability = [];
      
      for (const doctor of allDoctors) {
        try {
          const availableDates = await getAvailableDatesForDoctor(doctor.id.toString());
          if (availableDates.length > 0) {
            doctorsWithAvailability.push(doctor);
            console.log(`Doctor ${doctor.first_name} ${doctor.last_name} has ${availableDates.length} available dates`);
          } else {
            console.log(`Doctor ${doctor.first_name} ${doctor.last_name} has no available dates`);
          }
        } catch (error) {
          console.error(`Error checking availability for doctor ${doctor.id}:`, error);
          // Skip this doctor if there's an error checking availability
        }
      }
      
      console.log('Doctors with availability:', doctorsWithAvailability);
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

  const handleFormSubmit = (formData: Record<string, string>) => {
    setIsInputDisabled(false); // Re-enable input after form submission
    
    // Store form data temporarily for appointment confirmation
    setTempFormData(formData);
    
    // Update appointment form with all the form data
    setAppointmentForm(prev => ({
      ...prev,
      firstName: formData.firstName || '',
      middleInitial: formData.middleInitial || '',
      lastName: formData.lastName || '',
      suffix: formData.suffix || '',
      email: formData.email || '',
      phone: formData.phone || '',
      dateOfBirth: formData.dateOfBirth || '',
      gender: formData.gender || '',
      address: formData.address || '',
      maritalStatus: formData.maritalStatus || ''
    }));

    // Add user message showing the submitted information
    addMessage('user', 'I have submitted my personal information');

    // Continue with the next step
    setTimeout(() => {
     addMessage('bot',  'Thank you for providing your information! Let me summarize your appointment details:');
      
      setTimeout(() => {
        const appointmentDetails = `
📅 Date: ${appointmentForm.date?.toLocaleDateString()}
⏰ Time: ${appointmentForm.time}
👨‍⚕️ Doctor: ${doctors.find(d => d.id.toString() === appointmentForm.doctorId)?.first_name} ${doctors.find(d => d.id.toString() === appointmentForm.doctorId)?.last_name}
📋 Type: ${appointmentForm.type}
👤 Patient: ${constructFullName({ firstName: tempFormData.firstName, middleInitial: tempFormData.middleInitial, lastName: tempFormData.lastName, suffix: tempFormData.suffix } as AppointmentForm)}
📧 Email: ${tempFormData.email}
📞 Phone: ${tempFormData.phone}
🎂 Date of Birth: ${tempFormData.dateOfBirth}
⚧ Gender: ${tempFormData.gender}
        `.trim();

       addBotMessage( appointmentDetails);

        setTimeout(() => {
          addMessage('bot', 'Would you like to confirm this appointment?', [
            { label: '✅ Yes, confirm appointment', value: 'confirm-appointment' },
            { label: '❌ No, make changes', value: 'cancel-appointment' }
          ]);
          setChatStep(20); // Move to confirmation step
          setIsInputDisabled(true); // Disable input when showing confirmation options
        }, 1000);
      }, 500);
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
    handleFileUpload,
    handleFormSubmit,
    startChat,
    isLoadingDoctors,
    isLoadingProfanityWords,
    profanityWordsCount: profanityWords.length,
    isInputDisabled,
    isTyping
  };
};
