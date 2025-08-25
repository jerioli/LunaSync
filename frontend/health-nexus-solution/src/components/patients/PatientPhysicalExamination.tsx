import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Patient } from '@/lib/mock-data';
import { Stethoscope } from 'lucide-react';
import React from 'react';

interface PatientPhysicalExaminationProps {
  patient: Patient;
  isEditing: boolean;
  onUpdate: (data: Partial<Patient>) => void;
}

const PatientPhysicalExamination: React.FC<PatientPhysicalExaminationProps> = ({ 
  patient, 
  isEditing,
  onUpdate
}) => {
  const physicalExam = patient.physical_examination || {};

  const handlePhysicalExamUpdate = (field: string, value: string) => {
    onUpdate({
      physical_examination: {
        ...physicalExam,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Physical Examination
        </CardTitle>
        <CardDescription>
          Patient's vital signs and physical assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vital Signs Section - Horizontal Layout */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Vital Signs</h3>
          </div>
          
          {/* Horizontal Vital Signs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height" className="text-xs font-medium text-muted-foreground">Height</Label>
              {isEditing ? (
                <Input 
                  id="height" 
                  placeholder="175 cm"
                  value={physicalExam.height || ''} 
                  onChange={(e) => handlePhysicalExamUpdate('height', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/20 h-8 flex items-center text-sm">
                  {physicalExam.height || 'Not recorded'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight" className="text-xs font-medium text-muted-foreground">Weight</Label>
              {isEditing ? (
                <Input 
                  id="weight" 
                  placeholder="70 kg"
                  value={physicalExam.weight || ''} 
                  onChange={(e) => handlePhysicalExamUpdate('weight', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/20 h-8 flex items-center text-sm">
                  {physicalExam.weight || 'Not recorded'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodPressure" className="text-xs font-medium text-muted-foreground">Blood Pressure</Label>
              {isEditing ? (
                <Input 
                  id="bloodPressure" 
                  placeholder="120/80"
                  value={physicalExam.bloodPressure || ''} 
                  onChange={(e) => handlePhysicalExamUpdate('bloodPressure', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/20 h-8 flex items-center text-sm">
                  {physicalExam.bloodPressure || 'Not recorded'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-xs font-medium text-muted-foreground">Temperature</Label>
              {isEditing ? (
                <Input 
                  id="temperature" 
                  placeholder="98.6°F"
                  value={physicalExam.temperature || ''} 
                  onChange={(e) => handlePhysicalExamUpdate('temperature', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/20 h-8 flex items-center text-sm">
                  {physicalExam.temperature || 'Not recorded'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pulseRate" className="text-xs font-medium text-muted-foreground">Pulse Rate</Label>
              {isEditing ? (
                <Input 
                  id="pulseRate" 
                  placeholder="72 bpm"
                  value={physicalExam.pulseRate || ''} 
                  onChange={(e) => handlePhysicalExamUpdate('pulseRate', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/20 h-8 flex items-center text-sm">
                  {physicalExam.pulseRate || 'Not recorded'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="respiratoryRate" className="text-xs font-medium text-muted-foreground">Respiratory Rate</Label>
              {isEditing ? (
                <Input 
                  id="respiratoryRate" 
                  placeholder="16/min"
                  value={physicalExam.respiratoryRate || ''} 
                  onChange={(e) => handlePhysicalExamUpdate('respiratoryRate', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/20 h-8 flex items-center text-sm">
                  {physicalExam.respiratoryRate || 'Not recorded'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Additional Notes Section */}
        <div className="space-y-4">
          <h3 className="font-semibold">Additional Notes</h3>
          <div className="space-y-2">
            <Label htmlFor="notes">Examination Notes</Label>
            {isEditing ? (
              <Textarea 
                id="notes" 
                rows={8}
                placeholder="Enter additional examination notes, observations, or findings..."
                value={physicalExam.notes || ''} 
                onChange={(e) => handlePhysicalExamUpdate('notes', e.target.value)}
              />
            ) : (
              <div className="p-4 border rounded-lg bg-muted/20 min-h-[200px] whitespace-pre-wrap">
                {physicalExam.notes || 'No additional notes recorded'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientPhysicalExamination;
