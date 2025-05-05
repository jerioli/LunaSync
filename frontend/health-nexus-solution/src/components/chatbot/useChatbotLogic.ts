
import { useState, useEffect } from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { MessageType, AppointmentForm, MedicalRecordRequestForm } from './types';
import { generateTimeSlots, appointmentTypes } from './utils';

export const useChatbotLogic = () => {
  const { users, appointments, addAppointment } = useClinic();
  const { toast } = useToast();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatStep, setChatStep] = useState(0);
  
  // Form state for appointments
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    date: undefined,
    time: '',
    type: '',
    name: '',
    email: '',
    phone: '',
    notes: ''
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

  // For tracking whether we're in appointment or medical record flow
  const [chatMode, setChatMode] = useState<'appointment' | 'medicalRecord' | null>(null);

  useEffect(() => {
    if (showChat) {
      setTimeout(() => {
        addMessage('bot', "Hello! I'm MedySync, your healthcare assistant. How can I help you today?");
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

  const handleSendMessage = () => {
    if (!input.trim() && chatStep === 0) return;
    
    if (chatStep === 0) {
      addMessage('user', input);
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'How can I assist you with your healthcare needs?', [
          { label: 'Schedule Appointment', value: 'appointment' },
          { label: 'Request Medical Records', value: 'medicalRecord' }
        ]);
        setChatStep(1);
      }, 500);
      return;
    }
    
    // Appointment flow handling (existing code)
    if (chatMode === 'appointment') {
      handleAppointmentFlow();
    }
    // Medical record request flow
    else if (chatMode === 'medicalRecord') {
      handleMedicalRecordFlow();
    }
  };

  const handleAppointmentFlow = () => {
    if (chatStep === 6) {
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, name: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your email:');
        setChatStep(7);
      }, 500);
    } else if (chatStep === 7) {
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your phone number:');
        setChatStep(8);
      }, 500);
    } else if (chatStep === 8) {
      addMessage('user', input);
      setAppointmentForm(prev => ({ ...prev, phone: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Any additional notes for your appointment? (Optional)');
        setChatStep(9);
      }, 500);
    } else if (chatStep === 9) {
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
            Notes: ${appointmentForm.notes || 'None'}
          `;
          
          addMessage('bot', summary, [
            { label: 'Confirm Appointment', value: 'confirm' },
            { label: 'Cancel', value: 'cancel' }
          ]);
          setChatStep(10);
        }, 500);
      }, 500);
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
      addMessage('user', input);
      setMedicalRecordForm(prev => ({ ...prev, email: input }));
      setInput('');
      
      setTimeout(() => {
        addMessage('bot', 'Please enter your phone number:');
        setChatStep(6);
      }, 500);
    } else if (chatStep === 6) {
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

  const handleOptionSelect = (value: string) => {
    if (chatStep === 1) {
      if (value === 'appointment') {
        addMessage('user', 'I want to schedule an appointment');
        setChatMode('appointment');
        
        setTimeout(() => {
          const availableDates = getDoctorAvailability();
          
          if (availableDates.length === 0) {
            addMessage('bot', 'I apologize, but there are no available appointment dates in the next few weeks. Please call our office for assistance.');
            return;
          }
          
          addMessage('bot', 'Here are available appointment dates based on doctor availability:', 
            availableDates.map(date => ({ 
              label: date.label, 
              value: date.date.toISOString()
            }))
          );
          setChatStep(2);
        }, 500);
      } else if (value === 'medicalRecord') {
        addMessage('user', 'I want to request medical records');
        setChatMode('medicalRecord');
        
        setTimeout(() => {
          addMessage('bot', 'What type of medical records are you requesting? (e.g. Complete medical history, Lab results, Imaging reports, etc.)');
          setChatStep(2);
        }, 500);
      }
    } else if (chatMode === 'appointment') {
      handleAppointmentOptionSelect(value);
    } else if (chatMode === 'medicalRecord') {
      handleMedicalRecordOptionSelect(value);
    }
  };

  const handleAppointmentOptionSelect = (value: string) => {
    if (chatStep === 2) {
      const selectedDate = new Date(value);
      addMessage('user', `I'll take the appointment on ${selectedDate.toLocaleDateString()}`);
      setAppointmentForm(prev => ({ ...prev, date: selectedDate }));
      
      setTimeout(() => {
        const times = generateTimeSlots();
        addMessage('bot', 'What time works best for you?', undefined, undefined, true, times);
        setChatStep(3);
      }, 500);
    } else if (chatStep === 3) {
      addMessage('user', `I'll take the ${value} time slot`);
      setAppointmentForm(prev => ({ ...prev, time: value }));
      
      setTimeout(() => {
        addMessage('bot', 'What type of appointment do you need?', appointmentTypes);
        setChatStep(4);
      }, 500);
    } else if (chatStep === 4) {
      addMessage('user', `I need a ${value}`);
      setAppointmentForm(prev => ({ ...prev, type: value }));
      
      setTimeout(() => {
        addMessage('bot', 'Great! Now I need some information about you.');
        
        setTimeout(() => {
          addMessage('bot', 'Please enter your full name:');
          setChatStep(6);
        }, 500);
      }, 500);
    } else if (chatStep === 10) {
      if (value === 'confirm') {
        addMessage('user', 'Confirm appointment');
        
        const doctors = users.filter(user => user.role === 'doctor');
        const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
        
        if (appointmentForm.date && randomDoctor) {
          const newAppointment = {
            id: uuidv4(),
            patientId: '5',
            doctorId: randomDoctor.id,
            date: appointmentForm.date.toISOString().split('T')[0],
            time: appointmentForm.time,
            status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | 'no-show',
            type: appointmentForm.type,
            notes: appointmentForm.notes
          };
          
          addAppointment(newAppointment);
          
          setTimeout(() => {
            addMessage('bot', 'Your appointment request has been submitted! A staff member will review and confirm your appointment shortly. You will receive a confirmation email once it\'s approved.');
            
            toast({
              title: "Appointment Requested",
              description: `Your appointment request for ${appointmentForm.date.toLocaleDateString()} at ${appointmentForm.time} has been submitted for review`,
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
        }
      } else {
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
      name: '',
      email: '',
      phone: '',
      notes: ''
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
    startChat
  };
};
