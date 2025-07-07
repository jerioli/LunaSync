import { useState, useEffect } from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { MessageType, AppointmentForm, MedicalRecordRequestForm, PrescriptionRequestForm } from './types';
import { generateTimeSlots, appointmentTypes } from './utils';
import { api, Doctor } from '@/services/api';
import { Appointment } from '@/lib/mock-data';
import axios from 'axios';

export const useChatbotLogic = () => {
  const { users, appointments, addAppointment, currentUser, clinicCustomization } = useClinic();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatStep, setChatStep] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  
  const API_BASE_URL = 'http://localhost:8000/api';

  // Form state for appointments
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
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

  // Form state for medical record requests
  const [medicalRecordForm, setMedicalRecordForm] = useState<MedicalRecordRequestForm>({
    requestType: '',
    patientName: '',
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
    patientName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    prescriptionImage: null,
    additionalNotes: ''
  });

  // Add FAQ chat mode
  const [chatMode, setChatMode] = useState<'appointment' | 'medicalRecord' | 'prescription' | 'faq' | null>(null);

  const faqs = clinicCustomization.faqs || [];

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
        addMessage('bot', "Hello! I'm Dr.MedySync, your healthcare assistant. Say hi to start conversation?");
      }, 500);
    }
  }, [showChat]);

  const addMessage = (sender: 'user' | 'bot', text: string, options?: { label: string; value: string }[], dateSelector?: boolean, timeSelector?: boolean, times?: string[], fileUpload?: boolean, fileUploadLabel?: string, fileUploadAccept?: string) => {
    setMessages(prev => [...prev, {
      id: uuidv4(),
      sender,
      text,
      options,
      dateSelector,
      timeSelector,
      times,
      fileUpload,
      fileUploadLabel,
      fileUploadAccept
    }]);
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

  const handleSendMessage = () => {
    if (!input.trim() && chatStep === 0) return;
    
    if (chatStep === 0) {
      addMessage('user', input);
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'How can I assist you today?', [
          { label: 'Schedule an Appointment', value: 'appointment' },
          { label: 'Request a Medical Certificate', value: 'medicalRecord' },
          { label: 'Request E-Prescription', value: 'prescription' },
        ]);
        setChatStep(1);
      }, 500);
      return;
    }
    
    // FAQ chat mode
    if (chatMode === 'faq') {
      addMessage('user', input);
      const match = findBestFaq(input);
      setInput('');
      setTimeout(() => {
        if (match) {
          addMessage('bot', match.answer);
        } else {
          addMessage('bot', "Sorry, I couldn't find an answer to that question. Please try rephrasing or select from the list below.");
        }
        // Show FAQ options again or allow return
        setTimeout(() => {
          addMessage('bot', 'Would you like to ask another question or return to the main menu?', [
            ...faqs.map((faq, i) => ({ label: faq.question, value: `faq_${i}` })),
            { label: 'Back to Main Menu', value: 'main' },
          ]);
          setChatStep(2);
        }, 500);
      }, 500);
      return;
    }
    
    // Handle different chat modes
    if (chatMode === 'appointment') {
      if (chatStep === 7) {
        // Ask for name
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, name: input }));
        setInput('');
        
        setTimeout(() => {
          addMessage('bot', 'Please enter your email address:');
          setChatStep(8);
        }, 500);
      } else if (chatStep === 8) {
        // Validate email
        if (!validateEmail(input)) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addMessage('bot', 'Please enter a valid email address (e.g., john.doe@example.com):');
          }, 500);
          return;
        }
        
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, email: input }));
        setInput('');
        
        setTimeout(() => {
          addMessage('bot', 'Please enter your phone number:');
          setChatStep(9);
        }, 500);
      } else if (chatStep === 9) {
        // Validate phone
        if (!validatePhone(input)) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addMessage('bot', 'Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
          }, 500);
          return;
        }
        
        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, phone: input }));
        setInput('');
        
        setTimeout(() => {
          addMessage('bot', 'Please enter your date of birth (MM/DD/YYYY):');
          setChatStep(10);
        }, 500);
      } else if (chatStep === 10) {
        // Validate date of birth
        const dob = new Date(input);
        if (isNaN(dob.getTime())) {
          addMessage('user', input);
          setInput('');
          setTimeout(() => {
            addMessage('bot', 'Please enter a valid date in MM/DD/YYYY format:');
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
            addMessage('bot', 'Please enter a valid date of birth (between 1 and 100 years ago):');
          }, 500);
          return;
        }

        addMessage('user', input);
        setAppointmentForm(prev => ({ ...prev, dateOfBirth: input }));
        setInput('');
        
        setTimeout(() => {
          addMessage('bot', 'Please select your gender:', [
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
          addMessage('bot', 'Please select your marital status:', [
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
          addMessage('bot', 'Thank you! Here is a summary of your appointment:');
          
          setTimeout(() => {
            // Split name into first and last name
            const [firstName, ...lastNameParts] = (appointmentForm.name || '').trim().split(' ');
            const lastName = lastNameParts.join(' ');

            const summary = `
              Date: ${appointmentForm.date?.toLocaleDateString() || 'Not selected'}
              Time: ${appointmentForm.time}
              Type: ${appointmentForm.type}
              Name: ${appointmentForm.name}
              Email: ${appointmentForm.email}
              Phone: ${appointmentForm.phone}
              Date of Birth: ${appointmentForm.dateOfBirth}
              Gender: ${appointmentForm.gender}
              Address: ${appointmentForm.address}
              Marital Status: ${appointmentForm.maritalStatus}
              Notes: ${appointmentForm.notes || 'None'}
            `;
            
            addMessage('bot', summary, [
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
    if (chatStep === 2) {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, requestType: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your full name as it appears on your medical records:');
        setChatStep(3);
      }, 500);
    } else if (chatStep === 3) {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, patientName: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(4);
      }, 500);
    } else if (chatStep === 4) {
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your email address:');
        setChatStep(5);
      }, 500);
    } else if (chatStep === 5) {
      // Validate email
      if (!validateEmail(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addMessage('bot', 'Please enter a valid email address (e.g., john.doe@example.com):');
        }, 500);
        return;
      }

      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your phone number:');
        setChatStep(6);
      }, 500);
    } else if (chatStep === 6) {
      // Validate phone
      if (!validatePhone(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addMessage('bot', 'Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
        }, 500);
        return;
      }

      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'For identity verification, please upload a photo of your government-issued ID:', undefined, undefined, undefined, undefined, true, "Upload ID", "image/*");
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
            Patient Name: ${medicalRecordForm.patientName}
            Date of Birth: ${medicalRecordForm.dateOfBirth}
            Email: ${medicalRecordForm.email}
            Phone: ${medicalRecordForm.phone}
            ID Verification: ${medicalRecordForm.idVerification ? 'Uploaded' : 'Not uploaded'}
            Additional Info: ${medicalRecordForm.additionalInfo || 'None'}
          `;
          
          addMessage('bot', summary, [
            { label: 'Submit Request', value: 'submit-record-request' },
            { label: 'Cancel', value: 'cancel-record-request' }
          ]);
          setChatStep(9);
        }, 500);
      }, 500);
    }
  };

  const handlePrescriptionFlow = () => {
    if (chatStep === 2) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, medicationName: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter the dosage (e.g., 500mg):');
        setChatStep(3);
      }, 500);
    } else if (chatStep === 3) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, dosage: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'How often should the medication be taken? (e.g., twice daily):');
        setChatStep(4);
      }, 500);
    } else if (chatStep === 4) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, frequency: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'How long should the medication be taken? (e.g., 7 days):');
        setChatStep(5);
      }, 500);
    } else if (chatStep === 5) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, duration: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your full name:');
        setChatStep(6);
      }, 500);
    } else if (chatStep === 6) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, patientName: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(7);
      }, 500);
    } else if (chatStep === 7) {
      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your email address:');
        setChatStep(8);
      }, 500);
    } else if (chatStep === 8) {
      // Validate email
      if (!validateEmail(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addMessage('bot', 'Please enter a valid email address (e.g., john.doe@example.com):');
        }, 500);
        return;
      }

      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your phone number:');
        setChatStep(9);
      }, 500);
    } else if (chatStep === 9) {
      // Validate phone
      if (!validatePhone(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addMessage('bot', 'Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
        }, 500);
        return;
      }

      addMessage('user', input);
      setPrescriptionForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please upload your current prescription or doctor\'s note:', undefined, undefined, undefined, undefined, true, "Upload Prescription", "image/*");
        setChatStep(10);
      }, 500);
    } else if (chatStep === 11) {
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
            Patient Name: ${prescriptionForm.patientName}
            Date of Birth: ${prescriptionForm.dateOfBirth}
            Email: ${prescriptionForm.email}
            Phone: ${prescriptionForm.phone}
            Prescription Image: ${prescriptionForm.prescriptionImage ? 'Uploaded' : 'Not uploaded'}
            Additional Notes: ${prescriptionForm.additionalNotes || 'None'}
          `;
          
          addMessage('bot', summary, [
            { label: 'Submit Request', value: 'submit-prescription' },
            { label: 'Cancel', value: 'cancel-prescription' }
          ]);
          setChatStep(12);
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
        addMessage('bot', 'Is there any additional information you would like to provide for your medical records request? (Optional)');
        setChatStep(8);
      }, 500);
    }
  };

  const handleOptionSelect = async (value: string) => {
    if (value === 'faq') {
      setChatMode('faq');
      addMessage('user', 'FAQs');
      setTimeout(() => {
        addMessage('bot', 'Here are some frequently asked questions. Please select one or type your own:',
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
          addMessage('bot', 'How can I assist you today?', [
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
            addMessage('bot', faq.answer);
            setTimeout(() => {
              addMessage('bot', 'Would you like to ask another question or return to the main menu?', [
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
        addMessage('bot', 'How would you like to schedule your appointment?', [
          { label: 'Select Doctor First', value: 'doctor-first' },
          { label: 'Select Date First', value: 'date-first' }
        ]);
        setChatStep(2);
      }, 500);
    } else if (value === 'medicalRecord') {
      setChatMode('medicalRecord');
      addMessage('user', 'Request Medical Records');
      setTimeout(() => {
        addMessage('bot', 'What type of medical records do you need?', [
          { label: 'Lab Results', value: 'lab' },
          { label: 'Imaging Reports', value: 'imaging' },
          { label: 'Visit History', value: 'history' },
          { label: 'All Records', value: 'all' }
        ]);
        setChatStep(2);
      }, 500);
    } else if (value === 'prescription') {
      setChatMode('prescription');
      addMessage('user', 'Request Prescription');
      setTimeout(() => {
        addMessage('bot', 'Please enter the name of the medication you need:');
        setChatStep(2);
      }, 500);
    } else if (chatMode === 'appointment') {
      if (chatStep === 11) {
        // Handle gender selection
        addMessage('user', `I am ${value}`);
        setAppointmentForm(prev => ({ ...prev, gender: value }));
        
        setTimeout(() => {
          addMessage('bot', 'Please enter your address:');
          setChatStep(12);
        }, 500);
      } else if (chatStep === 13) {
        // Handle marital status selection
        addMessage('user', `I am ${value}`);
        setAppointmentForm(prev => ({ ...prev, maritalStatus: value }));
        
        setTimeout(() => {
          addMessage('bot', 'Any additional notes for your appointment? (Optional)');
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

          // Split name into first and last name
          const [firstName, ...lastNameParts] = (appointmentForm.name || '').trim().split(' ');
          const lastName = lastNameParts.join(' ');

          // Create appointment data with proper structure for pending appointments
          const appointmentData = {
            // Patient details in separate fields (new structure)
            patient_name: appointmentForm.name,
            patient_email: appointmentForm.email,
            patient_phone: appointmentForm.phone,
            date_of_birth: appointmentForm.dateOfBirth ? new Date(appointmentForm.dateOfBirth).toISOString().split('T')[0] : null,
            gender: appointmentForm.gender ? appointmentForm.gender.toLowerCase() : null,
            address: appointmentForm.address || null,
            marital_status: appointmentForm.maritalStatus ? appointmentForm.maritalStatus.toLowerCase() : null,
            
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
                patientId: appointmentForm.name, // Use patient name as temporary identifier until receptionist confirms
                doctorId: response?.doctor_id?.toString() || '',
                date: response?.date || '',
                time: response?.time || '',
                status: 'pending', // Always set to pending for chatbot appointments
                type: response?.appointment_type || '',
                notes: appointmentForm.notes || ''  // Only use the user's note, not the patient details
              };
              
              console.log('New appointment object:', newAppointment);
              
              addAppointment(newAppointment);
              
              setTimeout(() => {
                addMessage('bot', 'Your appointment request has been submitted and is pending review. Our reception team will review your request and send you a confirmation email once approved. A patient record will be created after the appointment is confirmed.');
                
                toast({
                  title: "Appointment Request Submitted",
                  description: "Your appointment request is pending review. You will receive a confirmation email once approved.",
                });
                
                setTimeout(() => {
                  addMessage('bot', 'Is there anything else I can help you with?', [
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
              
              toast({
                title: "Error",
                description: "Failed to submit appointment. Please try again.",
                variant: "destructive"
              });
            });
        } else if (value === 'cancel') {
          addMessage('user', 'Cancel');
          
          setTimeout(() => {
            addMessage('bot', 'Appointment booking cancelled. Is there anything else I can help you with?', [
              { label: 'Schedule Appointment', value: 'appointment' },
              { label: 'Request Medical Records', value: 'medicalRecord' },
              { label: 'No, Thank You', value: 'end' }
            ]);
            setChatStep(1);
            resetForms();
          }, 500);
        }
      } else {
        handleAppointmentOptionSelect(value);
      }
    }
  };

  const handleAppointmentOptionSelect = (value: string) => {
    if (chatStep === 2) {
      if (value === 'doctor-first') {
        addMessage('user', 'I want to select a doctor first');
        fetchDoctors().then((response) => {
          const doctorOptions = response.map(doctor => ({
            label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
            value: doctor.id.toString()
          }));
          
          setTimeout(() => {
            addMessage('bot', 'Please select a doctor:', doctorOptions);
            setChatStep(3);
          }, 500);
        });
      } else if (value === 'date-first') {
        addMessage('user', 'I want to select a date first');
        
        // Show loading message
        addMessage('bot', 'Let me check all dates with available appointment slots for you...');
        
        getAvailableDates().then(availableDates => {
          setTimeout(() => {
            if (!availableDates || availableDates.length === 0) {
              addMessage('bot', 'I apologize, but there are no available appointment slots at the moment. Please try the "Select Doctor First" option or try again later.');
              
              setTimeout(() => {
                addMessage('bot', 'How would you like to proceed?', [
                  { label: 'Select Doctor First', value: 'doctor-first' },
                  { label: 'Try Again Later', value: 'main' }
                ]);
                setChatStep(2);
              }, 500);
              return;
            }
            
            addMessage('bot', `Great! I found ${availableDates.length} date${availableDates.length > 1 ? 's' : ''} with available appointment slots. Please select a date:`, availableDates.map(date => ({
              label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
              value: date.toISOString()
            })));
            setChatStep(4);
          }, 500);
        }).catch(error => {
          console.error('Error getting available dates:', error);
          setTimeout(() => {
            addMessage('bot', 'I apologize, but I encountered an error while checking available appointment slots. Please try again or select "Select Doctor First" option.');
            setTimeout(() => {
              addMessage('bot', 'How would you like to proceed?', [
                { label: 'Select Doctor First', value: 'doctor-first' },
                { label: 'Try Again', value: 'date-first' }
              ]);
              setChatStep(2);
            }, 500);
          }, 500);
          
          toast({
            title: "Error",
            description: "Failed to fetch available dates. Please try again.",
            variant: "destructive"
          });
        });
      }
    } else if (chatStep === 3) {
      // Doctor first flow - doctor selected
      const selectedDoctor = doctors.find(doctor => doctor.id.toString() === value);
      if (selectedDoctor) {
        addMessage('user', `I want to see Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`);
        setAppointmentForm(prev => ({ ...prev, doctorId: value }));
        
        getAvailableDatesForDoctor(value).then(availableDates => {
          setTimeout(() => {
            addMessage('bot', `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name} is available on the following dates:`, 
              availableDates.map(date => ({
                label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                value: date.toISOString()
              }))
            );
            setChatStep(4);
          }, 500);
        });
      }
    } else if (chatStep === 4) {
      // Date selected (both flows)
      const selectedDate = new Date(value);
      console.log('Selected date:', selectedDate);
      addMessage('user', `I want an appointment on ${selectedDate.toLocaleDateString()}`);
      setAppointmentForm(prev => ({ ...prev, date: selectedDate }));
      
      if (appointmentForm.doctorId) {
        // Doctor first flow - show time slots for selected doctor
        getAvailableTimeSlotsForDoctor(appointmentForm.doctorId, selectedDate).then((times) => {
          setTimeout(() => {
            addMessage('bot', 'Please select a time slot:', undefined, undefined, true, times);
            setChatStep(5);
          }, 500);
        });
      } else {
        // Date first flow - show available doctors
        console.log('Starting to fetch available doctors for date:', selectedDate);
        
        // Show loading message
        addMessage('bot', 'Let me check which doctors are available on this date...');
        
        getAvailableDoctorsForDate(selectedDate).then(availableDoctors => {
          console.log('Received available doctors:', availableDoctors);
          
          if (!availableDoctors || availableDoctors.length === 0) {
            console.log('No doctors available, showing error message');
            setTimeout(() => {
              addMessage('bot', 'I apologize, but there are no doctors available on this date. Please select a different date.');
              // Show available dates again
              addMessage('bot', 'Fetching other available dates...');
              
              getAvailableDates().then(availableDates => {
                addMessage('bot', 'Please select a different date:', 
                  availableDates.map(date => ({
                    label: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                    value: date.toISOString()
                  }))
                );
                setChatStep(4);
              }).catch(error => {
                console.error('Error getting fallback dates:', error);
                // If we can't get dates, just go back to main menu
                addMessage('bot', 'I apologize, but I cannot fetch available dates at the moment. Please try again later.');
                setChatStep(1);
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
            
            addMessage('bot', `Perfect! ${availableDoctors.length} doctor${availableDoctors.length > 1 ? 's are' : ' is'} available on this date:`, doctorOptions);
            setChatStep(5);
          }, 500);
        }).catch(error => {
          console.error('Error getting available doctors:', error);
          setTimeout(() => {
            addMessage('bot', 'I encountered an error while checking doctor availability. Please try selecting a different date or try again.');
            
            setTimeout(() => {
              addMessage('bot', 'Would you like to try again?', [
                { label: 'Select Different Date', value: 'date-first' },
                { label: 'Select Doctor First', value: 'doctor-first' }
              ]);
              setChatStep(2);
            }, 500);
          }, 500);
          
          toast({
            title: "Error",
            description: "Failed to fetch available doctors. Please try again.",
            variant: "destructive"
          });
        });
      }
    } else if (chatStep === 5) {
      if (!appointmentForm.doctorId) {
        // Date first flow - doctor selected, now show time slots
        const selectedDoctor = doctors.find(doctor => doctor.id.toString() === value);
        if (selectedDoctor) {
          addMessage('user', `I want to see Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`);
          setAppointmentForm(prev => ({ ...prev, doctorId: value }));
          
          // Show loading message
          addMessage('bot', `Checking available time slots for Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}...`);
          
          getAvailableTimeSlotsForDoctor(value, appointmentForm.date!).then((times) => {
            setTimeout(() => {
              if (!times || times.length === 0) {
                addMessage('bot', 'I apologize, but there are no available time slots for this doctor on the selected date. Please try selecting a different doctor.');
                
                // Go back to doctor selection
                setTimeout(() => {
                  addMessage('bot', 'Let me check which doctors are available on this date...');
                  
                  getAvailableDoctorsForDate(appointmentForm.date!).then(availableDoctors => {
                    const doctorOptions = availableDoctors.map(doctor => ({
                      label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                      value: doctor.id.toString()
                    }));
                    
                    addMessage('bot', 'Please select a different doctor:', doctorOptions);
                    setChatStep(5);
                  });
                }, 500);
                return;
              }
              
              addMessage('bot', `Great! Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name} has ${times.length} available time slot${times.length > 1 ? 's' : ''}. Please select a time:`, undefined, undefined, true, times);
              setChatStep(6); // Move to step 6 for time slot selection
            }, 500);
          }).catch(error => {
            console.error('Error getting time slots:', error);
            setTimeout(() => {
              addMessage('bot', 'I encountered an error while fetching time slots. Please try selecting a different doctor.');
              
              setTimeout(() => {
                // Go back to doctor selection
                getAvailableDoctorsForDate(appointmentForm.date!).then(availableDoctors => {
                  const doctorOptions = availableDoctors.map(doctor => ({
                    label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
                    value: doctor.id.toString()
                  }));
                  
                  addMessage('bot', 'Please select a doctor:', doctorOptions);
                  setChatStep(5);
                });
              }, 500);
            }, 500);
            
            toast({
              title: "Error",
              description: "Failed to fetch available time slots. Please try again.",
              variant: "destructive"
            });
          });
        }
      } else {
        // Doctor first flow - time slot selected
        addMessage('user', `I'll take the ${value} time slot`);
        setAppointmentForm(prev => ({ ...prev, time: value }));
        
        setTimeout(() => {
          addMessage('bot', 'What type of appointment do you need?', appointmentTypes);
          setChatStep(7); // Move to step 7 for appointment type
        }, 500);
      }
    } else if (chatStep === 6) {
      if (!appointmentForm.time) {
        // Date first flow - time slot selected
        addMessage('user', `I'll take the ${value} time slot`);
        setAppointmentForm(prev => ({ ...prev, time: value }));
        
        setTimeout(() => {
          addMessage('bot', 'What type of appointment do you need?', appointmentTypes);
          setChatStep(7); // Move to step 7 for appointment type
        }, 500);
      } else {
        // This shouldn't happen normally, but handle appointment type selection just in case
        addMessage('user', `I need a ${value}`);
        setAppointmentForm(prev => ({ ...prev, type: value }));
        
        setTimeout(() => {
          addMessage('bot', 'Great! Now I need some information about you.');
          
          setTimeout(() => {
            addMessage('bot', 'Please enter your full name:');
            setChatStep(7); // Move to step 7 for personal info (name)
          }, 500);
        }, 500);
      }
    } else if (chatStep === 7) {
      // Appointment type selected (both flows converge here)
      addMessage('user', `I need a ${value}`);
      setAppointmentForm(prev => ({ ...prev, type: value }));
      
      setTimeout(() => {
        addMessage('bot', 'Great! Now I need some information about you.');
        
        setTimeout(() => {
          addMessage('bot', 'Please enter your full name:');
          setChatStep(7); // Move to step 7 for personal info (name)
        }, 500);
      }, 500);
    } else if (chatStep === 7) {
      // Ask for name
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, name: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your email address:');
        setChatStep(8);
      }, 500);
    } else if (chatStep === 8) {
      // Validate email
      if (!validateEmail(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addMessage('bot', 'Please enter a valid email address (e.g., john.doe@example.com):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your phone number:');
        setChatStep(9);
      }, 500);
    } else if (chatStep === 9) {
      // Validate phone
      if (!validatePhone(input)) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addMessage('bot', 'Please enter a valid phone number with exactly 11 digits (e.g., 09123456789):');
        }, 500);
        return;
      }
      
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your date of birth (MM/DD/YYYY):');
        setChatStep(10);
      }, 500);
    } else if (chatStep === 10) {
      // Validate date of birth
      const dob = new Date(input);
      if (isNaN(dob.getTime())) {
        addMessage('user', input);
        setInput('');
        setTimeout(() => {
          addMessage('bot', 'Please enter a valid date in MM/DD/YYYY format:');
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
          addMessage('bot', 'Please enter a valid date of birth (between 1 and 100 years ago):');
        }, 500);
        return;
      }

      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, dateOfBirth: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please select your gender:', [
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
        addMessage('bot', 'Please select your marital status:', [
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
        addMessage('bot', 'Thank you! Here is a summary of your appointment:');
        
        setTimeout(() => {
          const summary = `
            Date: ${appointmentForm.date?.toLocaleDateString() || 'Not selected'}
            Time: ${appointmentForm.time}
            Type: ${appointmentForm.type}
            Name: ${appointmentForm.name}
            Email: ${appointmentForm.email}
            Phone: ${appointmentForm.phone}
            Date of Birth: ${appointmentForm.dateOfBirth}
            Gender: ${appointmentForm.gender}
            Address: ${appointmentForm.address}
            Marital Status: ${appointmentForm.maritalStatus}
            Notes: ${appointmentForm.notes || 'None'}
          `;
          
          addMessage('bot', summary, [
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

  const handleMedicalRecordOptionSelect = (value: string) => {
    if (chatStep === 9) {
      if (value === 'submit-record-request') {
        addMessage('user', 'Submit medical record request');
        
        setTimeout(() => {
          addMessage('bot', 'Your medical records request has been submitted! Our team will review your request and contact you within 2-3 business days.');
          
          toast({
            title: "Medical Records Request Submitted",
            description: "Your request has been received and will be processed within 2-3 business days.",
          });
          
          setTimeout(() => {
            addMessage('bot', 'Is there anything else I can help you with?', [
              { label: 'Schedule Appointment', value: 'appointment' },
              { label: 'Request More Records', value: 'medicalRecord' },
              { label: 'No, Thank You', value: 'end' }
            ]);
            setChatStep(1);
            resetForms();
          }, 1000);
        }, 500);
      } else if (value === 'cancel-record-request') {
        addMessage('user', 'Cancel medical record request');
        
        setTimeout(() => {
          addMessage('bot', 'Medical records request cancelled. Is there anything else I can help you with?', [
            { label: 'Schedule Appointment', value: 'appointment' },
            { label: 'Request Medical Records', value: 'medicalRecord' },
            { label: 'No, Thank You', value: 'end' }
          ]);
          setChatStep(1);
          resetForms();
        }, 500);
      }
    } else if (value === 'end') {
      addMessage('user', 'No, thank you');
      
      setTimeout(() => {
        addMessage('bot', 'Thank you for chatting with MedySync! If you need assistance in the future, just say hi to start a new conversation.');
      }, 500);
    }
  };

  const resetForms = () => {
    setChatMode(null);
    setAppointmentForm({
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
    setMedicalRecordForm({
      requestType: '',
      patientName: '',
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
      patientName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      prescriptionImage: null,
      additionalNotes: ''
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setAppointmentForm(prev => ({ ...prev, date }));
      addMessage('user', `I'd like an appointment on ${date.toLocaleDateString()}`);
      
      setTimeout(() => {
        const times = generateTimeSlots();
        addMessage('bot', 'What time works best for you?', undefined, undefined, true, times);
        setChatStep(3);
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
      console.log('=== STARTING getAvailableDates ===');
      console.log('Fetching dates with available time slots from all doctors...');
      
      // Get all doctors first
      const allDoctors = await fetchDoctors();
      console.log('Fetched doctors:', allDoctors);
      if (!allDoctors || allDoctors.length === 0) {
        console.error('No doctors available');
        return [];
      }
      
      const validDates = new Set<string>(); // Use Set to avoid duplicates
      console.log(`Checking availability for ${allDoctors.length} doctors...`);
      
      // For each doctor, get their available dates and check if they have available time slots
      for (const doctor of allDoctors) {
        try {
          console.log(`--- Checking doctor ${doctor.id} (${doctor.first_name} ${doctor.last_name}) ---`);
          const doctorDates = await api.availability.getAvailableDates(doctor.id.toString());
          console.log(`Doctor ${doctor.id} available dates from API:`, doctorDates);
          
          if (doctorDates && Array.isArray(doctorDates) && doctorDates.length > 0) {
            console.log(`Doctor ${doctor.id} has ${doctorDates.length} available dates`);
            
            // For each date, check if the doctor has actual available time slots
            for (const dateStr of doctorDates) {
              try {
                console.log(`  Checking time slots for doctor ${doctor.id} on ${dateStr}...`);
                const response = await api.availability.getTimeSlots(doctor.id.toString(), dateStr);
                console.log(`  Time slots response for doctor ${doctor.id} on ${dateStr}:`, response);
                
                if (response && Array.isArray(response) && response.length > 0) {
                  const availability = response[0];
                  console.log(`  Availability object:`, availability);
                  
                  if (availability && availability.time_slots && Array.isArray(availability.time_slots)) {
                    const availableSlots = availability.time_slots.filter(slot => !slot.is_booked);
                    console.log(`  All time slots for doctor ${doctor.id} on ${dateStr}:`, availability.time_slots);
                    console.log(`  Available (non-booked) slots:`, availableSlots);
                    
                    if (availableSlots.length > 0) {
                      console.log(`  ✓ Doctor ${doctor.id} has ${availableSlots.length} available slots on ${dateStr}`);
                      validDates.add(dateStr);
                    } else {
                      console.log(`  ✗ Doctor ${doctor.id} has no available slots on ${dateStr} (all ${availability.time_slots.length} slots are booked)`);
                    }
                  } else {
                    console.log(`  ✗ Doctor ${doctor.id} has no time_slots array on ${dateStr}`);
                  }
                } else {
                  console.log(`  ✗ Doctor ${doctor.id} has no availability response on ${dateStr}:`, response);
                }
              } catch (error) {
                console.error(`  Error checking time slots for doctor ${doctor.id} on ${dateStr}:`, error);
                // Continue with next date
              }
            }
          } else {
            console.log(`Doctor ${doctor.id} has no available dates:`, doctorDates);
          }
        } catch (error) {
          console.error(`Error fetching dates for doctor ${doctor.id}:`, error);
          // Continue with other doctors
        }
      }
      
      console.log('=== All valid dates found ===', Array.from(validDates));
      
      // Convert Set to sorted array of Date objects
      const sortedDateStrings = Array.from(validDates).sort();
      console.log('Sorted date strings:', sortedDateStrings);
      
      const availableDates = sortedDateStrings
        .map(dateStr => {
          // Create date in local timezone
          const date = new Date(dateStr + 'T00:00:00');
          return date;
        })
        .filter(date => {
          // Filter out past dates and weekends
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isPastDate = date < today;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          console.log(`Filtering date ${date.toDateString()}: isPast=${isPastDate}, isWeekend=${isWeekend}`);
          
          return !isPastDate && !isWeekend;
        })
        .slice(0, 14); // Limit to next 14 available dates
      
      console.log('=== FINAL RESULT ===');
      console.log('Filtered dates with actual available time slots:', availableDates);
      console.log('=== END getAvailableDates ===');
      return availableDates;
    } catch (error) {
      console.error('Error getting available dates:', error);
      // Fallback to simple date generation
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

      console.log('Processed available dates:', availableDates);
      
      return availableDates;
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
      const dateString = date.toISOString().split('T')[0];
      console.log('Checking availability for date:', dateString);
      
      // First, get all doctors
      const allDoctors = await fetchDoctors();
      console.log('All doctors fetched:', allDoctors);
      
      if (!allDoctors || allDoctors.length === 0) {
        console.error('No doctors found in the response');
        return [];
      }

      // Check availability for each doctor
      const availableDoctors = await Promise.all(
        allDoctors.map(async (doctor) => {
          try {
            console.log(`Checking availability for doctor ${doctor.id} on ${dateString}`);
            const response = await api.availability.getTimeSlots(doctor.id.toString(), dateString);
            console.log(`Availability response for doctor ${doctor.id}:`, response);

            if (response && Array.isArray(response) && response.length > 0) {
              const availability = response[0];
              if (availability && availability.time_slots && Array.isArray(availability.time_slots)) {
                const availableSlots = availability.time_slots.filter(slot => !slot.is_booked);
                if (availableSlots.length > 0) {
                  console.log(`Doctor ${doctor.id} has ${availableSlots.length} available slots`);
                  return doctor;
                }
              }
            }
            console.log(`Doctor ${doctor.id} has no available slots on ${dateString}`);
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
      
      // Fetch time slots from the API
      const response = await api.availability.getTimeSlots(doctorId, dateString);
      
      console.log('Received time slots response:', response);
      
      // Check if response is an array and has at least one item
      if (!Array.isArray(response) || response.length === 0) {
        console.error('Invalid time slots response format:', response);
        return [];
      }

      // Get the first availability object
      const availability = response[0];
      
      // Check if availability has time_slots array
      if (!availability || !availability.time_slots || !Array.isArray(availability.time_slots)) {
        console.error('Invalid time slots format in availability:', availability);
        return [];
      }
      
      // Filter out booked slots and format for display
      const availableSlots = availability.time_slots
        .filter(slot => !slot.is_booked)
        .map(slot => {
          const [hours, minutes] = slot.start_time.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minutes} ${ampm}`;
        });

      console.log('Formatted available slots:', availableSlots);
      return availableSlots;
    } catch (error) {
      console.error('Error fetching time slots:', error);
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
    startChat,
    isLoadingDoctors
  };
};
