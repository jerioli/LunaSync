import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import axios from 'axios';
import { ArrowUp, BotMessageSquare, Calendar, FileText, Monitor, Moon, Pill, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [reviewForm, setReviewForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [stayAnonymous, setStayAnonymous] = useState(false);
  const [showGreetingCursor, setShowGreetingCursor] = useState(true);
  const [showArrow, setShowArrow] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        ...reviewForm,
        date: new Date().toISOString().slice(0, 10),
        anonymous: stayAnonymous,
      };
      
      const response = await axios.post('clinic/reviews/', reviewData);
      
      setReviewForm({ name: '', email: '', rating: 5, comment: '' });
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
    if (section) section.scrollIntoView({ behavior: 'smooth' });
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
                        onClick={() => {
                          const section = document.querySelector(item.href);
                          if (section) {
                            section.scrollIntoView({ behavior: 'smooth' });
                            window.location.hash = item.href;
                          }
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
              onClick={() => setIsChatbotOpen(!isChatbotOpen)}
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
              onClick={() => setIsChatbotOpen(!isChatbotOpen)}
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
      <section id="home" className="py-20">
        <div className="container mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            {clinic.logo && (
              <img src={getLogoUrl(clinic.logo)} alt="Clinic Logo" className="h-16 mb-4" />
            )}
            {clinic.healthcare_professionals_image && (
              <img src={getLogoUrl(clinic.healthcare_professionals_image)} alt="Healthcare Professionals" className="w-full h-auto rounded-lg shadow-lg mb-4" />
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-[#79c942]">
              {clinic.hero_title || 'Your Health Is Our Priority'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {clinic.hero_subtitle || `${clinic.clinic_name || t('portal.welcome')} ${t('portal.heroSubtitle')}`}
            </p>
            {/* Remove the flex container with two buttons and only leave the content div empty */}
          </div>
          <div className="flex-1">
            <img 
              src="https://images.unsplash.com/photo-1631815588090-602d3d4d020c?q=80&w=1887&auto=format&fit=crop" 
              alt="Healthcare professionals" 
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#79c942]">{clinic.about_title || `About ${clinic.clinic_name || 'Our Clinic'}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
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
      <section id="services" className="py-20 relative">
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
          `}
        </style>
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#79c942]">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* General Consultation */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle>General Consultation</CardTitle>
                <CardDescription>Comprehensive health assessments and personalized care plans</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Our experienced physicians provide thorough examinations and personalized treatment plans for a wide range of health concerns, from routine check-ups to chronic condition management.</p>
              </CardContent>
            </Card>
            {/* Specialized Care */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle>Specialized Care</CardTitle>
                <CardDescription>Expert care for specific medical needs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Access to specialists in cardiology, dermatology, pediatrics, and more, ensuring you receive the best care for your unique health requirements.</p>
              </CardContent>
            </Card>
            {/* Diagnostic Services */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle>Diagnostic Services</CardTitle>
                <CardDescription>Accurate and timely diagnostics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">State-of-the-art laboratory and imaging services to support early detection and effective treatment of health conditions.</p>
              </CardContent>
            </Card>
            {/* Preventive Care */}
            <Card className="service-card">
              <CardHeader>
                <CardTitle>Preventive Care</CardTitle>
                <CardDescription>Proactive health management</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Vaccinations, screenings, and wellness programs designed to keep you and your family healthy and prevent illness before it starts.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20 relative">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#79c942]">Patient Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Leave a Review */}
            <div className="md:col-span-1">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xl mx-auto">
                <div className="flex items-center mb-2 gap-2">
                  <Checkbox
                    id="stay-anonymous"
                    checked={stayAnonymous}
                    onCheckedChange={checked => setStayAnonymous(checked === true)}
                    className="data-[state=checked]:bg-[#79c942] border-[#79c942] focus:ring-[#79c942]"
                  />
                  <label htmlFor="stay-anonymous" className="font-medium text-black select-none cursor-pointer">
                    Stay anonymous
                  </label>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-black">Leave a Review</h3>
                <form className="space-y-4 text-black" onSubmit={handleReviewSubmit}>
                  {!stayAnonymous && (
                    <>
                      <div>
                        <Input
                          placeholder="Your Name"
                          className="bg-white text-black"
                          value={reviewForm.name}
                          onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                          required={!stayAnonymous}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Your Email"
                          type="email"
                          className="bg-white text-black"
                          value={reviewForm.email}
                          onChange={e => setReviewForm({ ...reviewForm, email: e.target.value })}
                          required={!stayAnonymous}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block mb-1 font-medium text-black">Rating</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <span
                          key={star}
                          style={{ cursor: 'pointer', color: reviewForm.rating >= star ? '#FFD700' : '#E5E7EB', fontSize: 28 }}
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
                      className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-clinic-blue min-h-[120px] text-black"
                      value={reviewForm.comment}
                      onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      required
                    />
                  </div>
                  <Button className="w-full bg-[#79c942] hover:bg-[#6bb33a] text-white" type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </form>
              </div>
            </div>
            {/* Right: Submitted Reviews */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
              {clinic.reviews && clinic.reviews.length > 0 ? clinic.reviews.slice(0, 3).map((review, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {review.anonymous ? "A" : review.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {review.anonymous ? "From Anonymous" : review.name}
                        </CardTitle>
                        <div className="flex text-yellow-400">
                          {Array(review.rating).fill(0).map((_, i) => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{review.comment}</p>
                    <p className="text-sm text-gray-400 mt-4">{review.date}</p>
                  </CardContent>
                </Card>
              )) : null}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="py-20 relative">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#79c942]">Frequently Asked Questions</h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
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
      <section id="contact" className="py-20 relative bg-white/70">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#79c942]">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            {/* Our Location */}
            <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4 text-[#79c942] flex items-center gap-2">
                <svg className="inline-block text-[#79c942]" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Our Location
              </h3>
              {clinic.clinic_building_image && (
                <img
                  src={getLogoUrl(clinic.clinic_building_image)}
                  alt="Clinic Location"
                  className="w-full h-40 object-cover rounded mb-4"
                />
              )}
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
                  onClick={() => {
                    const section = document.querySelector(item.href);
                    if (section) {
                      section.scrollIntoView({ behavior: 'smooth' });
                      window.location.hash = item.href;
                      setMobileMenuOpen(false);
                    }
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
};

export default PatientPortal;
