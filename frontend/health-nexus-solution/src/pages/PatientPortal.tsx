import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// UI Components
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';

// Icons
import { BotMessageSquare, Monitor, Moon, Sun } from 'lucide-react';

// App Components
import PatientAppointmentModal from '@/components/appointments/PatientAppointmentModal';
import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading clinic info...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-clinic-blue">{clinic.clinic_name || 'Clinic'}</div>
          </div>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink href="#home" className={navigationMenuTriggerStyle()}>
                  {t('navigation.home')}
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#about" className={navigationMenuTriggerStyle()}>
                  {t('navigation.about')}
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#services" className={navigationMenuTriggerStyle()}>
                  {t('navigation.services')}
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#reviews" className={navigationMenuTriggerStyle()}>
                  {t('navigation.reviews')}
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#faqs" className={navigationMenuTriggerStyle()}>
                  {t('navigation.faqs')}
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          
          <div className="flex items-center gap-4">
            <LanguageSelector variant="button" size="sm" showIcon={true} />
            <Button variant="outline" size="sm" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}>
              {getThemeIcon()}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsChatbotOpen(true)}>
              <BotMessageSquare className="mr-2 h-4 w-4" />
              {t('portal.chatAssistant')}
            </Button>
            <Button size="sm" onClick={() => setShowAppointmentModal(true)} className="bg-clinic-blue hover:bg-clinic-blue/90">
              {t('portal.scheduleAppointment')}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Chatbot Trigger */}
      <button 
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-6 right-6 z-50 bg-clinic-blue text-white p-3 rounded-full shadow-lg hover:bg-clinic-blue/90 transition-colors"
      >
        <BotMessageSquare className="h-6 w-6" />
      </button>

      {/* Chatbot Modal */}
      {isChatbotOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96">
          <AppointmentChatbot onClose={() => setIsChatbotOpen(false)} />
        </div>
      )}
      
      {/* Hero Section */}
      <section id="home" className="py-20 bg-gradient-to-b from-clinic-gray to-background dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            {clinic.logo && (
              <img src={getLogoUrl(clinic.logo)} alt="Clinic Logo" className="h-16 mb-4" />
            )}
            {clinic.healthcare_professionals_image && (
              <img src={getLogoUrl(clinic.healthcare_professionals_image)} alt="Healthcare Professionals" className="w-full h-auto rounded-lg shadow-lg mb-4" />
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-clinic-blue dark:text-clinic-blue">
              {clinic.hero_title || t('portal.heroTitle')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {clinic.hero_subtitle || `${clinic.clinic_name || t('portal.welcome')} ${t('portal.heroSubtitle')}`}
            </p>
            <div className="flex gap-4">
              <Button size="lg" className="rounded-full" onClick={() => setShowAppointmentModal(true)}>
                {t('portal.scheduleAppointment')}
              </Button>
              <Button size="lg" variant="outline" className="rounded-full" onClick={() => setIsChatbotOpen(true)}>
                {t('portal.chatAssistant')}
              </Button>
            </div>
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
      <section id="about" className="py-20 bg-background dark:bg-gray-800">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue dark:text-clinic-blue">{clinic.about_title || `About ${clinic.clinic_name || 'Our Clinic'}`}</h2>
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
              <h3 className="text-2xl font-semibold text-clinic-blue dark:text-clinic-blue">{t('portal.ourStory')}</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {clinic.about_text || 'Founded in 2010, HealthNexus has grown to become one of the leading healthcare providers in the region. Our mission is to deliver accessible, high-quality healthcare services in a compassionate environment.'}
              </p>
              <h3 className="text-2xl font-semibold text-clinic-blue dark:text-clinic-blue">{t('portal.ourValues')}</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>{t('portal.patientCenteredCare')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>{t('portal.excellenceInPractice')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>{t('portal.integrityTransparency')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>{t('portal.continuousImprovement')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section id="services" className="py-20 bg-clinic-gray/20 dark:bg-gray-900/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue dark:text-clinic-blue">{t('portal.ourServices')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {clinic.services && clinic.services.length > 0 ? clinic.services.map((service, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{service.details}</p>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t('portal.generalConsultation')}</CardTitle>
                  <CardDescription>{t('portal.generalConsultationDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{t('portal.generalConsultationDetails')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
      
      {/* Reviews Section */}
      <section id="reviews" className="py-20 bg-background dark:bg-gray-800">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue dark:text-clinic-blue">{t('portal.patientReviews')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {clinic.reviews && clinic.reviews.length > 0 ? clinic.reviews.slice(0, 3).map((review, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{review.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{review.name}</CardTitle>
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
                  <p className="text-gray-600 dark:text-gray-300">{review.comment}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">{review.date}</p>
                </CardContent>
              </Card>
            )) : null}
          </div>
        </div>
      </section>
      
      {/* FAQs Section */}
      <section id="faqs" className="py-20 bg-clinic-gray/20 dark:bg-gray-900/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue dark:text-clinic-blue">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {clinic.faqs && clinic.faqs.length > 0 ? clinic.faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
                </CardContent>
              </Card>
            )) : null}
          </div>
        </div>
      </section>
      
      {/* Contact Section */}
      <section className="py-20 bg-clinic-blue text-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Our Location</h3>
                <p>{clinic.address}</p>
                <p>{clinic.city}{clinic.state ? `, ${clinic.state}` : ''} {clinic.zip}</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
                <p>Phone: {clinic.phone}</p>
                <p>Email: {clinic.email}</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Hours of Operation</h3>
                <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                <p>Saturday: 9:00 AM - 2:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-black dark:text-white">Leave a Review</h3>
              <form className="space-y-4 text-black dark:text-white" onSubmit={handleReviewSubmit}>
                <div>
                  <Input
                    placeholder="Your Name"
                    className="bg-white dark:bg-gray-700 text-black dark:text-white"
                    value={reviewForm.name}
                    onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="Your Email"
                    type="email"
                    className="bg-white dark:bg-gray-700 text-black dark:text-white"
                    value={reviewForm.email}
                    onChange={e => setReviewForm({ ...reviewForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-black dark:text-white">Rating</label>
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
                    className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-clinic-blue min-h-[120px] text-black dark:text-white"
                    value={reviewForm.comment}
                    onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    required
                  />
                </div>
                <Button className="w-full bg-clinic-blue hover:bg-clinic-blue/90 text-white" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-10 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-clinic-blue">{clinic.clinic_name || 'Clinic'}</h3>
              <p className="text-gray-400">
                Providing quality healthcare services since 2010. Dedicated to improving the health and wellbeing of our community.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
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
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">General Consultation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Specialized Care</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Diagnostic Services</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Preventive Care</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect With Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-gray-400">
            <p>&copy; 2024 {clinic.clinic_name || 'Clinic'}. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Patient Appointment Modal */}
      <PatientAppointmentModal 
        open={showAppointmentModal} 
        onOpenChange={setShowAppointmentModal} 
      />
    </div>
  );
};

export default PatientPortal;
