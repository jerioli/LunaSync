import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Pill, BotMessageSquare, Info } from 'lucide-react';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

// Dummy data for doctors and available dates/times
const doctors = [
  { id: "1", name: "Dr. Juan Dela Cruz" },
  { id: "2", name: "Dr. Maria Santos" },
];
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const twoMonthsLater = new Date(today);
twoMonthsLater.setMonth(today.getMonth() + 2);
const twoMonthsLaterStr = twoMonthsLater.toISOString().split('T')[0];

const availableDates = [todayStr, twoMonthsLaterStr];
const availableTimes = ["9:00 AM", "10:00 AM", "2:00 PM"];

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

const PatientRequests = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openModal, setOpenModal] = useState<null | "appointment" | "medcert" | "eprescription">(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [buttonText, setButtonText] = useState('Chat Now');
  const [showArrow, setShowArrow] = useState(false);
  const [greetingDisplay, setGreetingDisplay] = useState("Hi! I'm Dr. LUNASync, virtual assistant. What can I help you with?");
  const [typing, setTyping] = useState(false);

  // Appointment scheduling states
  const [appointmentMode, setAppointmentMode] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Consent and patient states
  const [consent, setConsent] = useState(false);
  const [existingPatient, setExistingPatient] = useState(false);

  // ID upload preview
  const [idPreview, setIdPreview] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<string | null>(null);

  // Delivery options
  const [confirmationType, setConfirmationType] = useState<string>("");
  const [documentType, setDocumentType] = useState<string>("");
  const [eprescriptionType, setEPrescriptionType] = useState<string>("");

  // Appointment type
  const [appointmentType, setAppointmentType] = useState<string>("");

  // Handle ID upload
  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Handle notification
  const handleSubmit = (msg: string) => {
    setOpenModal(null);
    setConsent(false);
    setExistingPatient(false);
    setIdPreview(null);
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
    setAppointmentMode("");
    setSelectedDoctor("");
    setSelectedDate("");
    setSelectedTime("");
    setConfirmationType("");
    setDocumentType("");
    setEPrescriptionType("");
    setAppointmentType("");
  };

  React.useEffect(() => {
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
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const clinic = { logo: '', clinic_name: 'LUNASync' };
  const getLogoUrl = (logo: string) => logo;

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "linear-gradient(to bottom, #fff 0%, #79c942 300%)" }}>
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
                  { label: 'Home', href: '/portal' },
                  { label: 'About', href: '/portal' },
                  { label: 'Services', href: '/portal' },
                  { label: 'Reviews', href: '/portal' },
                  { label: 'FAQs', href: '/portal' },
                  { label: 'Contact Us', href: '/portal' },
                ].map((item) => (
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
                        text-black
                        hover:text-[#79c942] hover:bg-transparent hover:underline hover:underline-offset-8
                      `}
                      onClick={e => {
                        e.preventDefault();
                        navigate('/portal');
                      }}
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
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
          <div className="flex-1 flex justify-end items-center gap-2">
            <Button 
              onClick={() => setIsChatbotOpen(true)}
              size="lg"
              className="rounded-full font-bold bg-[#79c942] hover:bg-[#68ab38] text-white transition-colors
              h-9 w-[180px] min-w-[180px] max-w-[180px]
              px-3 py-0
              flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span className="whitespace-nowrap text-[10px] md:text-xs truncate">Chat Now!</span>
              <BotMessageSquare className="h-4 w-4 flex-shrink-0" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col p-6">
          <button className="self-end mb-4" onClick={() => setMobileMenuOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="#79c942" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <nav className="flex flex-col gap-4">
            {[
              { label: 'Home', href: '/portal' },
              { label: 'About', href: '/portal' },
              { label: 'Services', href: '/portal' },
              { label: 'Reviews', href: '/portal' },
              { label: 'FAQs', href: '/portal' },
              { label: 'Contact Us', href: '/portal' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-lg font-medium text-[#79c942] py-2 px-4 rounded hover:bg-[#79c94222]"
                onClick={e => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  navigate(item.href);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Notification popup */}
      {notification && (
        <div className="fixed top-5 right-5 bg-[#79c942] text-white px-4 py-2 rounded shadow-lg z-50">
          {notification}
        </div>
      )}

      {/* Centered Card Layout */}
      <div className="flex-1 flex items-center justify-center px-2 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
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
          className="bg-[#79c942] text-white p-3 rounded-full shadow-lg hover:bg-[#68ab38] transition-colors order-2"
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

      {/* Chatbot Modal */}
      {isChatbotOpen && (
        <div className="fixed bottom-32 right-6 z-50 w-96 max-w-full">
          <AppointmentChatbot onClose={() => setIsChatbotOpen(false)} />
        </div>
      )}

      {/* =================== Appointment Modal =================== */}
      <Dialog open={openModal === "appointment"} onOpenChange={() => setOpenModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-[#79c942] text-center">Schedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Consent */}
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="accent-[#79c942]" />
              <span>
                I agree to the Terms and Conditions and consent to providing my personal information for processing my appointment.
                <span className="inline-flex align-middle ml-1">
                  <ConsentTooltip text={
  `By ticking this box:
1. I confirm that the information I provide is true and correct.
2. I understand that my personal data will be collected, stored, and used only for the purpose of scheduling my appointment or processing my request (medical certificate or e-prescription).
3. I consent to the clinic reviewing my request and communicating with me through my selected contact preference (SMS, email, or phone).
4. I also acknowledge that my request is subject to approval by clinic staff.`
} />
                </span>
              </span>
            </div>
            <div className={consent ? "space-y-6" : "opacity-50 pointer-events-none space-y-6"}>
              <Select value={appointmentMode} onValueChange={setAppointmentMode} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Doctor or Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Select Doctor</SelectItem>
                  <SelectItem value="date">Select Date</SelectItem>
                </SelectContent>
              </Select>
              {appointmentMode === "doctor" && (
                <>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDoctor && (
                    <>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        min={todayStr}
                        max={twoMonthsLaterStr}
                        className="mt-2"
                        required
                      />
                      {selectedDate && (
                        <Select value={selectedTime} onValueChange={setSelectedTime} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Time" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTimes.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}
                </>
              )}
              {appointmentMode === "date" && (
                <>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    min={todayStr}
                    max={twoMonthsLaterStr}
                    required
                  />
                  {selectedDate && (
                    <Select value={selectedTime} onValueChange={setSelectedTime} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimes.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
              <Select value={appointmentType} onValueChange={setAppointmentType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Appointment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkup">Regular Check-up</SelectItem>
                  <SelectItem value="vaccine">Vaccination</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                </SelectContent>
              </Select>
              <PersonalInfoFields disabled={!consent} />
              <Textarea placeholder="Additional notes (optional)" className="mt-2" />
              <Select value={confirmationType} onValueChange={setConfirmationType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Receive confirmation via" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">Text Message</SelectItem>
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
                      "Your appointment request has been submitted and is pending review. Our staff team will review your request and send you a confirmation email once approved. A patient record will be created after the appointment is confirmed."
                    )
                  }
                  disabled={
                    !consent ||
                    !appointmentMode ||
                    (appointmentMode === "doctor" && (!selectedDoctor || !selectedDate || !selectedTime)) ||
                    (appointmentMode === "date" && (!selectedDate || !selectedTime)) ||
                    !appointmentType ||
                    !confirmationType
                  }
                >
                  Confirm Appointment
                </Button>
              </div>
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

      {/* Footer */}
      <footer className="py-2 bg-gray-900 text-white text-xs">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-center text-center mb-2">
            <h3 className="text-base font-bold mb-1 text-[#79c942]">{clinic.clinic_name || 'Clinic'}</h3>
            <p className="text-gray-400 text-[10px] max-w-md">
              Providing quality healthcare services since 2010. Dedicated to improving the health and wellbeing of our community.
            </p>
          </div>
          <div className="border-t border-gray-800 pt-2 text-center text-gray-400 text-[10px]">
            <p>&copy; 2024 {clinic.clinic_name || 'Clinic'}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PatientRequests;
