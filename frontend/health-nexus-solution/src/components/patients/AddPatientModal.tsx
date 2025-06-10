import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, X } from 'lucide-react';

// Common allergies for the checklist
const commonAllergies = [
  'Penicillin',
  'Sulfa drugs',
  'Aspirin',
  'NSAIDs',
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Eggs',
  'Milk',
  'Soy',
  'Wheat',
  'Latex',
  'Insect stings',
];

const AddPatientModal = ({ open, onOpenChange, onAddPatient }) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'medical'>('personal');
  const [patientData, setPatientData] = useState({
    name: '',
    gender: '',
    date_of_birth: '',
    email: '',
    phone: '',
    address: '',
    marital_status: '',
    medical_info: {
      allergies: [],
      medicalHistory: '',
      bloodType: '',
    }
    
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (field, value) => {
    setPatientData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMedicalInfoChange = (field, value) => {
    setPatientData((prev) => ({
      ...prev,
      medical_info: { ...prev.medical_info, [field]: value },
    }));
  };

  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    const updatedAllergies = [...(patientData.medical_info.allergies || []), newAllergy.trim()];
    handleMedicalInfoChange('allergies', updatedAllergies);
    setNewAllergy('');
  };

  const removeAllergy = (allergy) => {
    const updatedAllergies = (patientData.medical_info.allergies || []).filter((a) => a !== allergy);
    handleMedicalInfoChange('allergies', updatedAllergies);
  };

  const toggleAllergy = (allergy, checked) => {
    let updatedAllergies = [...(patientData.medical_info.allergies || [])];
    if (checked) {
      if (!updatedAllergies.includes(allergy)) {
        updatedAllergies.push(allergy);
      }
    } else {
      updatedAllergies = updatedAllergies.filter((a) => a !== allergy);
    }
    handleMedicalInfoChange('allergies', updatedAllergies);
  };

  const handleSave = () => {
    // Remove id and registration_date from payload, ensure correct field names
    const newPatient = {
      name: patientData.name,
      gender: patientData.gender,
      date_of_birth: patientData.date_of_birth,
      email: patientData.email,
      phone: patientData.phone,
      address: patientData.address,
      marital_status: patientData.marital_status,
      medical_info: patientData.medical_info,
    };
    onAddPatient(newPatient);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'personal' | 'medical')}>
          <TabsList className="mb-4">
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="medical">Medical Information</TabsTrigger>
          </TabsList>
          <TabsContent value="personal">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={patientData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  onValueChange={(value) => handleInputChange('gender', value)}
                  value={patientData.gender}
                >
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
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={patientData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={patientData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={patientData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter address"
                  value={patientData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select
                  onValueChange={(value) => handleInputChange('marital_status', value)}
                  value={patientData.marital_status}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setActiveTab('medical')}>Next</Button>
            </div>
          </TabsContent>
          <TabsContent value="medical">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="bloodType">Blood Type</Label>
                <Select
                  onValueChange={(value) => handleMedicalInfoChange('bloodType', value)}
                  value={patientData.medical_info.bloodType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="medicalHistory">Medical History</Label>
                <textarea
                  id="medicalHistory"
                  rows={4}
                  value={patientData.medical_info.medicalHistory}
                  onChange={(e) => handleMedicalInfoChange('medicalHistory', e.target.value)}
                  placeholder="Enter patient medical history, past surgeries, chronic conditions, etc."
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="col-span-2">
                <Label>Allergies</Label>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {commonAllergies.map((allergy) => (
                    <div key={allergy} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allergy-${allergy}`}
                        checked={(patientData.medical_info.allergies || []).includes(allergy)}
                        onCheckedChange={(checked) => toggleAllergy(allergy, checked as boolean)}
                      />
                      <label
                        htmlFor={`allergy-${allergy}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {allergy}
                      </label>
                    </div>
                  ))}
                </div>
                <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 flex items-center">
                        <ChevronDown className="h-4 w-4 mr-1" />
                        <span>Custom Allergies</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter custom allergy"
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                      />
                      <Button onClick={addAllergy}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {(patientData.medical_info.allergies || [])
                      .filter((allergy) => !commonAllergies.includes(allergy))
                      .map((allergy) => (
                        <div key={allergy} className="flex items-center justify-between p-2 border rounded-md">
                          <span>{allergy}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeAllergy(allergy)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setActiveTab('personal')}>
                Back
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddPatientModal;