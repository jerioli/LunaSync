import React from 'react';
import { Button } from '@/components/ui/button';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MessageSquare, Users, FileText, BotMessageSquare } from 'lucide-react';
import { AppointmentChatbot } from '@/components/chatbot/AppointmentChatbot';
import { useState } from 'react';

const PatientPortal = () => {
  const navigate = useNavigate();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-clinic-blue">MedSync</div>
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
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Staff Login
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
      <section id="home" className="py-20 bg-gradient-to-b from-clinic-gray to-white">
        <div className="container mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-clinic-blue">
              Your Health Is Our Priority
            </h1>
            <p className="text-lg text-gray-600">
              HealthNexus is dedicated to providing exceptional healthcare services with a patient-centered approach. Schedule your appointment today.
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
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue">About Our Clinic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1579684288361-5c1a2b4d1528?q=80&w=1974&auto=format&fit=crop" 
                alt="Clinic building" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-clinic-blue">Our Story</h3>
              <p className="text-gray-600">
                Founded in 2010, HealthNexus has grown to become one of the leading healthcare providers in the region. Our mission is to deliver accessible, high-quality healthcare services in a compassionate environment.
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
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-clinic-blue/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-clinic-blue" />
                </div>
                <CardTitle>General Consultation</CardTitle>
                <CardDescription>Comprehensive health assessments and personalized care plans</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our experienced physicians provide thorough examinations and personalized treatment plans for a wide range of health concerns, from routine check-ups to chronic condition management.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-clinic-blue/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-clinic-blue" />
                </div>
                <CardTitle>Specialized Care</CardTitle>
                <CardDescription>Expert care in various medical specialties</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We offer specialized medical services in cardiology, dermatology, pediatrics, and more, ensuring that all your healthcare needs are met under one roof.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-full bg-clinic-blue/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-clinic-blue" />
                </div>
                <CardTitle>Diagnostic Services</CardTitle>
                <CardDescription>State-of-the-art laboratory and imaging services</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our clinic is equipped with modern diagnostic facilities for blood tests, X-rays, ultrasounds, and other imaging services, providing accurate and timely results.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Reviews Section */}
      <section id="reviews" className="py-20 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue">Patient Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                rating: 5,
                comment: "The doctors at HealthNexus are exceptional. They take the time to listen and provide personalized care. Highly recommend!",
                date: "March 15, 2024"
              },
              {
                name: "Michael Brown",
                rating: 5,
                comment: "I've been a patient for over 3 years, and the quality of care is consistently excellent. The staff is friendly and professional.",
                date: "February 28, 2024"
              },
              {
                name: "Emily Wilson",
                rating: 4,
                comment: "Great experience with the pediatric department. The doctors are patient with children and explain everything thoroughly.",
                date: "April 2, 2024"
              }
            ].map((review, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{review.name.charAt(0)}</AvatarFallback>
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
            ))}
          </div>
        </div>
      </section>
      
      {/* FAQs Section */}
      <section id="faqs" className="py-20 bg-clinic-gray/20">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-clinic-blue">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: "What are your clinic hours?",
                answer: "Our clinic is open Monday to Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM. We are closed on Sundays and public holidays."
              },
              {
                question: "How do I schedule an appointment?",
                answer: "You can schedule an appointment by calling our clinic, using our online appointment request form, or visiting us in person. We strive to accommodate urgent cases on the same day."
              },
              {
                question: "What insurance plans do you accept?",
                answer: "We accept most major insurance plans. Please contact our reception for specific information about your insurance coverage."
              },
              {
                question: "Can I get my prescription refilled without an appointment?",
                answer: "In many cases, yes. For routine medication refills, you can contact our clinic, and a doctor will review your request. However, some medications may require a check-up before renewal."
              },
              {
                question: "How can I access my medical records?",
                answer: "You can request access to your medical records by submitting a written request to our clinic. We process these requests within 48 hours."
              }
            ].map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
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
                <p>123 Health Avenue, Medical District</p>
                <p>Cityville, State 12345</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
                <p>Phone: (123) 456-7890</p>
                <p>Email: info@healthnexus.com</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Hours of Operation</h3>
                <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                <p>Saturday: 9:00 AM - 2:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-clinic-blue">Send Us a Message</h3>
              <form className="space-y-4">
                <div>
                  <Input placeholder="Your Name" className="bg-white" />
                </div>
                <div>
                  <Input placeholder="Your Email" type="email" className="bg-white" />
                </div>
                <div>
                  <Input placeholder="Subject" className="bg-white" />
                </div>
                <div>
                  <textarea placeholder="Your Message" className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-clinic-blue min-h-[120px]"></textarea>
                </div>
                <Button className="w-full bg-clinic-blue hover:bg-clinic-blue/90 text-white">
                  Send Message
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
              <h3 className="text-xl font-bold mb-4 text-clinic-blue">HealthNexus</h3>
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
            <p>&copy; 2024 HealthNexus. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PatientPortal;
