import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MessageSquare, Users, FileText, BotMessageSquare } from 'lucide-react';
import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';
import axios from 'axios';

const PatientPortal = () => {
  const navigate = useNavigate();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
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

  // Move fetchClinic outside useEffect
  const fetchClinic = async () => {
    try {
      const res = await axios.get('/api/clinic/');
      setClinic(res.data || {});
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
      await axios.post('/api/clinic/reviews/', reviewData);
      setReviewForm({ name: '', email: '', rating: 5, comment: '' });
      await fetchClinic(); // Refresh reviews
      alert('Thank you for your review!');
    } catch (err) {
      alert('Failed to submit review.');
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
                  Home
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#about" className={navigationMenuTriggerStyle()}>
                  About
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#services" className={navigationMenuTriggerStyle()}>
                  Services
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#reviews" className={navigationMenuTriggerStyle()}>
                  Reviews
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#faqs" className={navigationMenuTriggerStyle()}>
                  FAQs
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          
          <div className="flex items-center gap-4">
       
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
      <section id="home" className="py-20 bg-gradient-to-b from-clinic-gray to-white">
        <div className="container mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            {clinic.logo && (
              <img src={getLogoUrl(clinic.logo)} alt="Clinic Logo" className="h-16 mb-4" />
            )}
            {clinic.healthcare_professionals_image && (
              <img src={getLogoUrl(clinic.healthcare_professionals_image)} alt="Healthcare Professionals" className="w-full h-auto rounded-lg shadow-lg mb-4" />
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-clinic-blue">
              {clinic.hero_title || 'Your Health Is Our Priority'}
            </h1>
            <p className="text-lg text-gray-600">
              {clinic.hero_subtitle || `${clinic.clinic_name || 'Our clinic'} is dedicated to providing exceptional healthcare services with a patient-centered approach. Schedule your appointment today.`}
            </p>
            <div className="flex gap-4">
              <Button size="lg" className="rounded-full">
                Request Appointment
              </Button>
              <Button size="lg" variant="outline" className="rounded-full">
                Contact Us
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
      <section id="about" className="py-20 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue">{clinic.about_title || `About ${clinic.clinic_name || 'Our Clinic'}`}</h2>
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
              <h3 className="text-2xl font-semibold text-clinic-blue">Our Story</h3>
              <p className="text-gray-600">
                {clinic.about_text || 'Founded in 2010, HealthNexus has grown to become one of the leading healthcare providers in the region. Our mission is to deliver accessible, high-quality healthcare services in a compassionate environment.'}
              </p>
              <h3 className="text-2xl font-semibold text-clinic-blue">Our Values</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>Patient-centered care</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>Excellence in medical practice</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>Integrity and transparency</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-clinic-blue"></div>
                  <span>Continuous improvement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section id="services" className="py-20 bg-clinic-gray/20">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {clinic.services && clinic.services.length > 0 ? clinic.services.map((service, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{service.details}</p>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardHeader>
                  <CardTitle>General Consultation</CardTitle>
                  <CardDescription>Comprehensive health assessments and personalized care plans</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Our experienced physicians provide thorough examinations and personalized treatment plans for a wide range of health concerns, from routine check-ups to chronic condition management.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
      
      {/* Reviews Section */}
      <section id="reviews" className="py-20 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue">Patient Reviews</h2>
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
                  <p className="text-gray-600">{review.comment}</p>
                  <p className="text-sm text-gray-400 mt-4">{review.date}</p>
                </CardContent>
              </Card>
            )) : null}
          </div>
        </div>
      </section>
      
      {/* FAQs Section */}
      <section id="faqs" className="py-20 bg-clinic-gray/20">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {clinic.faqs && clinic.faqs.length > 0 ? clinic.faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
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
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-black">Leave a Review</h3>
              <form className="space-y-4 text-black" onSubmit={handleReviewSubmit}>
                <div>
                  <Input
                    placeholder="Your Name"
                    className="bg-white text-black"
                    value={reviewForm.name}
                    onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Your Email"
                    type="email"
                    className="bg-white text-black"
                    value={reviewForm.email}
                    onChange={e => setReviewForm({ ...reviewForm, email: e.target.value })}
                  />
                </div>
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
    </div>
  );
};

export default PatientPortal;
