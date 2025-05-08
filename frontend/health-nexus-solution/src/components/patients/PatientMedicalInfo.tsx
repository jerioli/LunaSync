import React, { useState } from 'react';
import { Patient } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, X } from 'lucide-react';

interface PatientMedicalInfoProps {
  patient: Patient;
  isEditing: boolean;
  onUpdate: (data: Partial<Patient>) => void;
}

// Common allergies for the checklist
const commonAllergies = [
  "Penicillin",
  "Sulfa drugs",
  "Aspirin",
  "NSAIDs",
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Eggs",
  "Milk",
  "Soy",
  "Wheat",
  "Latex",
  "Insect stings",
];

const PatientMedicalInfo: React.FC<PatientMedicalInfoProps> = ({ 
  patient, 
  isEditing,
  onUpdate 
}) => {
  const [newAllergy, setNewAllergy] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const allergies = patient.medicalInfo?.allergies || [];

  const addAllergy = () => {
    if (!newAllergy.trim()) return;

    const updatedAllergies = [...allergies, newAllergy.trim()];
    onUpdate({ medicalInfo: { ...patient.medicalInfo, allergies: updatedAllergies } });
    setNewAllergy("");
  };

  const removeAllergy = (allergy: string) => {
    const updatedAllergies = allergies.filter((a) => a !== allergy);
    onUpdate({ medicalInfo: { ...patient.medicalInfo, allergies: updatedAllergies } });
  };

  const toggleAllergy = (allergy: string, checked: boolean) => {
    let updatedAllergies = [...allergies];

    if (checked) {
      if (!updatedAllergies.includes(allergy)) {
        updatedAllergies.push(allergy);
      }
    } else {
      updatedAllergies = updatedAllergies.filter((a) => a !== allergy);
    }

    onUpdate({ medicalInfo: { ...patient.medicalInfo, allergies: updatedAllergies } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical Information</CardTitle>
        <CardDescription>
          Patient's medical history, allergies, and other health information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bloodType">Blood Type</Label>
          {isEditing ? (
            <select 
              id="bloodType" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              value={patient.medicalInfo?.bloodType || ""}
              onChange={(e) => onUpdate({ medicalInfo: { ...patient.medicalInfo, bloodType: e.target.value } })}
            >
              <option value="">Unknown</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          ) : (
            <div className="p-2 border rounded-md bg-muted/20">
              {patient.medicalInfo?.bloodType || "Not specified"}
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Allergies</Label>
            {allergies.length > 0 && !isEditing && (
              <div className="text-sm text-muted-foreground">
                {allergies.length} {allergies.length === 1 ? 'allergy' : 'allergies'} recorded
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {commonAllergies.map((allergy) => (
                  <div key={allergy} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergy-${allergy}`}
                      checked={allergies.includes(allergy)}
                      onCheckedChange={(checked) => 
                        toggleAllergy(allergy, checked as boolean)
                      }
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
              
              <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="space-y-2"
              >
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
                  
                  {allergies
                    .filter((allergy) => !commonAllergies.includes(allergy))
                    .map((allergy) => (
                      <div key={allergy} className="flex items-center justify-between p-2 border rounded-md">
                        <span>{allergy}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAllergy(allergy)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : (
            <div className="space-y-2">
              {allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <div key={allergy} className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                      {allergy}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">
                  No known allergies
                </div>
              )}
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label htmlFor="medicalHistory">Medical History</Label>
          {isEditing ? (
            <Textarea 
              id="medicalHistory" 
              rows={6}
              value={patient.medicalInfo?.medicalHistory || ""}
              onChange={(e) => onUpdate({ medicalInfo: { ...patient.medicalInfo, medicalHistory: e.target.value } })}
              placeholder="Enter patient medical history, past surgeries, chronic conditions, etc."
            />
          ) : (
            <div className="p-2 border rounded-md bg-muted/20 min-h-[100px] whitespace-pre-wrap">
              {patient.medicalInfo?.medicalHistory || "No medical history recorded"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientMedicalInfo;