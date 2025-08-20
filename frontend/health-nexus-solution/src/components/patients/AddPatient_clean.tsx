import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '@/utils/errorHandler';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AddPatient = () => {
  const navigate = useNavigate();
  const { addPatient, currentUser } = useClinic();
  const { toast } = useToast();
  
  // Check user role for access control
  const isDoctor = currentUser?.role === 'doctor';
  const isReceptionist = currentUser?.role === 'receptionist';
  const isAdmin = currentUser?.role === 'admin';
  
  // Redirect if user doesn't have permission to add patients
  React.useEffect(() => {
    if (currentUser && !isDoctor && !isReceptionist && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to add patients.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [currentUser, isDoctor, isReceptionist, isAdmin, navigate, toast]);
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    middle_initial: '',
    suffix: '',
    gender: '',
    age: '',
    address: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    religion: '',
  });
  
  const [loading, setLoading] = useState(false);
  
  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  
  const [medicalHistory, setMedicalHistory] = useState({
    chiefComplaint: ''
  });
  
  // Physical examination state
  const [physicalExamination, setPhysicalExamination] = useState({
    height: '',
    weight: '',
    bloodPressure: '',
    temperature: '',
    pulseRate: '',
    respiratoryRate: '',
    notes: ''
  });
  
  const handleHistoryChange = (field: string, value: string | undefined) => {
    setMedicalHistory(prev => {
      if (value === undefined) {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      }
      return { ...prev, [field]: value };
    });
  };
  
  const handlePhysicalExamChange = (field: string, value: string) => {
    setPhysicalExamination(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const personalRef = useRef(null);
  const examRef = useRef(null);
  const historyRef = useRef(null);

  const scrollTo = (ref: any) => ref.current?.scrollIntoView({ behavior: 'smooth' });
  const [activeTab, setActiveTab] = useState<'personal' | 'exam' | 'history'>('personal');

  const [showCancelModal, setShowCancelModal] = useState(false);

  const placeholders: Record<string, string> = {
    chiefComplaint: 'Write here the complaint', 
    illnesses: 'List any illnesses', 
    surgeries: 'List any surgeries', 
    allergies: 'List any allergies', 
    medications: 'List any medications', 
    familyHistory: 'Describe family medical history', 
    socialHistory: 'Describe social history',
  };

  const handleSaveAll = async () => {
    // Basic validation
    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.dateOfBirth || !form.gender) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (First Name, Last Name, Email, Phone, Date of Birth, Gender).',
        variant: 'destructive',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user has permission to add patients
    if (!isDoctor && !isReceptionist && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to add patients.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Construct full name for backward compatibility
      const nameParts = [];
      if (form.first_name) nameParts.push(form.first_name);
      if (form.middle_initial) {
        const initial = form.middle_initial.endsWith('.') ? form.middle_initial : form.middle_initial + '.';
        nameParts.push(initial);
      }
      if (form.last_name) nameParts.push(form.last_name);
      if (form.suffix) nameParts.push(form.suffix);
      const fullName = nameParts.join(' ');

      // Send both new fields and legacy name field to the backend
      const patientData = {
        name: fullName, // For backward compatibility
        first_name: form.first_name,
        last_name: form.last_name,
        middle_initial: form.middle_initial || undefined,
        suffix: form.suffix || undefined,
        email: form.email,
        phone: form.phone,
        date_of_birth: form.dateOfBirth, // Convert from frontend field name
        gender: form.gender.toLowerCase() as 'male' | 'female' | 'other',
        address: form.address,
        marital_status: 'single' as const, // default value
        medical_info: (isDoctor || isAdmin) ? {
          medicalHistory: medicalHistory.chiefComplaint || '',
          allergies: [],
          bloodType: ''
        } : undefined,
        physical_examination: (isDoctor || isAdmin) ? physicalExamination : undefined
      };

      await addPatient(patientData);
      toast({
        title: 'Success',
        description: (isDoctor || isAdmin)
          ? `${fullName} has been successfully added as a patient with medical information.`
          : `${fullName} has been successfully added as a patient. Medical information can be added later by a doctor.`,
      });
      
      navigate('/patients');
    } catch (error: any) {
      console.error('Error saving patient:', error);
      
      // Use the error handler utility to get a better error message
      const parsedError = parseApiError(error, 'Failed to save patient. Please try again.');
      
      toast({
        title: parsedError.title,
        description: parsedError.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center pb-4 px-8 border-b h-20">
        <h1 className="text-3xl font-bold">Add New Patient</h1>
        <button onClick={() => navigate('/patients')} className="text-[#1EAEDB] hover:underline">◄ Back to Patients List</button>
      </div>

      <Card className="h-[82vh] flex flex-col">
        <CardHeader className="border-b">
          <nav className="flex justify-around items-center">
            <ul className="flex gap-10 text-base">
              <li>
                <button onClick={() => {setActiveTab('personal'); scrollTo(personalRef);}}
                    className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                    activeTab === 'personal' ? 'text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]' : ''
                  }`}>Personal Information
                </button>
              </li>
              {(isDoctor || isAdmin) && (
                <>
                  <li>
                    <button onClick={() => {setActiveTab('exam'); scrollTo(examRef);}}
                        className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                        activeTab === 'exam' ? 'text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]' : ''
                      }`}>Physical Examination
                    </button>
                  </li>
                  <li>
                    <button onClick={() => {setActiveTab('history'); scrollTo(historyRef);}}
                        className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                        activeTab === 'history' ? 'text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]' : ''
                      }`}>Medical History
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto space-y-10 py-6">
          {isReceptionist && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> As a receptionist, you can only add personal information. Physical examination and medical history can only be added by doctors or admins.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={personalRef} className="border p-4 rounded">
            <h2 className="text-xl font-bold mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input 
                  required 
                  placeholder="Enter first name" 
                  value={form.first_name} 
                  onChange={(e) => handleChange('first_name', e.target.value)} 
                />
              </div>
              <div>
                <Label>Last Name <span className="text-red-500">*</span></Label>
                <Input 
                  required 
                  placeholder="Enter last name" 
                  value={form.last_name} 
                  onChange={(e) => handleChange('last_name', e.target.value)} 
                />
              </div>
              <div>
                <Label>Middle Initial</Label>
                <Input 
                  placeholder="M." 
                  value={form.middle_initial} 
                  onChange={(e) => handleChange('middle_initial', e.target.value)}
                  maxLength={5}
                />
              </div>
              <div>
                <Label>Suffix</Label>
                <Select value={form.suffix || 'none'} onValueChange={(value) => handleChange('suffix', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select suffix (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Jr.">Jr.</SelectItem>
                    <SelectItem value="Sr.">Sr.</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gender <span className="text-red-500">*</span></Label>
                <Select value={form.gender} onValueChange={(value) => handleChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Age</Label>
                <Input placeholder="Input your age" value={form.age} onChange={(e) => handleChange('age', e.target.value)} />
              </div>
              <div>
                <Label>Address</Label>
                <Input placeholder="Input your address" value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
                <Input
                  id="dateOfBirth"
                  required
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => handleChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <Label>Email Address <span className="text-red-500">*</span></Label>
                <Input
                  required
                  type="email"
                  placeholder="Input your email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label>Phone Number <span className="text-red-500">*</span></Label>
                <Input
                  required
                  placeholder="Input your phone number"
                  value={form.phone}
                  onChange={(e) => { if (/^\d*$/.test(e.target.value)) handleChange('phone', e.target.value); }}
                />
              </div>
              <div>
                <Label>Religion</Label>
                <Input placeholder="Input your religion" value={form.religion} onChange={(e) => handleChange('religion', e.target.value)} />
              </div>
            </div>
          </div>

          {(isDoctor || isAdmin) && (
            <>
              <div ref={examRef} className="border p-4 rounded">
                <h2 className="text-xl font-bold mb-4">Physical Examination</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Vital Signs</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input 
                          id="height" 
                          placeholder="e.g., 175 cm"
                          value={physicalExamination.height} 
                          onChange={(e) => handlePhysicalExamChange('height', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight</Label>
                        <Input 
                          id="weight" 
                          placeholder="e.g., 70 kg"
                          value={physicalExamination.weight} 
                          onChange={(e) => handlePhysicalExamChange('weight', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bloodPressure">Blood Pressure</Label>
                        <Input 
                          id="bloodPressure" 
                          placeholder="e.g., 120/80 mmHg"
                          value={physicalExamination.bloodPressure} 
                          onChange={(e) => handlePhysicalExamChange('bloodPressure', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Additional Vitals</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input 
                          id="temperature" 
                          placeholder="e.g., 98.6°F or 37°C"
                          value={physicalExamination.temperature} 
                          onChange={(e) => handlePhysicalExamChange('temperature', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pulseRate">Pulse Rate</Label>
                        <Input 
                          id="pulseRate" 
                          placeholder="e.g., 72 bpm"
                          value={physicalExamination.pulseRate} 
                          onChange={(e) => handlePhysicalExamChange('pulseRate', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                        <Input 
                          id="respiratoryRate" 
                          placeholder="e.g., 16/min"
                          value={physicalExamination.respiratoryRate} 
                          onChange={(e) => handlePhysicalExamChange('respiratoryRate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Additional Notes</h3>
                  <Label htmlFor="examNotes">Examination Notes</Label>
                  <Textarea 
                    id="examNotes" 
                    rows={4}
                    placeholder="Enter additional examination notes, observations, or findings..."
                    value={physicalExamination.notes} 
                    onChange={(e) => handlePhysicalExamChange('notes', e.target.value)}
                  />
                </div>
              </div>

              <div ref={historyRef} className="border p-4 rounded">
                <h2 className="text-xl font-bold mb-4">Medical History</h2>
                {/* Chief Complaint always visible */}
                <div className="mb-4">
                  <Label>Chief Complaint</Label>
                  <Textarea
                    value={medicalHistory.chiefComplaint}
                    onChange={(e) => handleHistoryChange('chiefComplaint', e.target.value)}
                    placeholder={placeholders.chiefComplaint || 'Enter details here...'}
                  />
                </div>
                <div className="flex gap-6 mb-4">
                  {['illnesses', 'surgeries', 'allergies', 'medications', 'familyHistory', 'socialHistory'].map((field) => (
                    <label key={field} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={medicalHistory[field] !== undefined}
                        onChange={e => {
                          if (e.target.checked) {
                            handleHistoryChange(field, '');
                          } else {
                            handleHistoryChange(field, undefined);
                          }
                        }}
                      />
                      <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['illnesses', 'surgeries', 'allergies', 'medications', 'familyHistory', 'socialHistory'].map(
                    (field) =>
                      medicalHistory[field] !== undefined && (
                        <div key={field}>
                          <Label>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}</Label>
                          <Textarea
                            value={medicalHistory[field]}
                            onChange={e => handleHistoryChange(field, e.target.value)}
                            placeholder={placeholders[field] || 'Enter details here...'}
                          />
                        </div>
                      )
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button 
              onClick={handleSaveAll} 
              className="hover:bg-[#1EAEDB]"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isDoctor || isAdmin) ? 'Save Patient Record' : 'Save Patient (Personal Info Only)'}
            </Button>
            <Button variant="outline" className="hover:bg-[#1EAEDB] hover:text-white" onClick={() => setShowCancelModal(true)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Modal */}
      {showCancelModal && (
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent>
            <div className="flex justify-between items-center">
              <DialogHeader>Confirm Cancellation</DialogHeader>
              <button onClick={() => setShowCancelModal(false)}></button>
            </div>
            <p>Are you sure you want to cancel? All the information will be discarded.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => navigate('/patients')} className="hover:bg-[#1EAEDB] hover:text-white">Yes</Button>
              <Button variant="outline" className="hover:bg-[#1EAEDB] hover:text-white" onClick={() => setShowCancelModal(false)}>No</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default AddPatient;
