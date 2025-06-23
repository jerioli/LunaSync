import React from 'react';
import { Patient } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Stethoscope } from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Vital Signs</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                {isEditing ? (
                  <Input 
                    id="height" 
                    placeholder="e.g., 175 cm"
                    value={physicalExam.height || ''} 
                    onChange={(e) => handlePhysicalExamUpdate('height', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted/20">
                    {physicalExam.height || 'Not recorded'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                {isEditing ? (
                  <Input 
                    id="weight" 
                    placeholder="e.g., 70 kg"
                    value={physicalExam.weight || ''} 
                    onChange={(e) => handlePhysicalExamUpdate('weight', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted/20">
                    {physicalExam.weight || 'Not recorded'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodPressure">Blood Pressure</Label>
                {isEditing ? (
                  <Input 
                    id="bloodPressure" 
                    placeholder="e.g., 120/80 mmHg"
                    value={physicalExam.bloodPressure || ''} 
                    onChange={(e) => handlePhysicalExamUpdate('bloodPressure', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted/20">
                    {physicalExam.bloodPressure || 'Not recorded'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                {isEditing ? (
                  <Input 
                    id="temperature" 
                    placeholder="e.g., 98.6°F or 37°C"
                    value={physicalExam.temperature || ''} 
                    onChange={(e) => handlePhysicalExamUpdate('temperature', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted/20">
                    {physicalExam.temperature || 'Not recorded'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pulseRate">Pulse Rate</Label>
                {isEditing ? (
                  <Input 
                    id="pulseRate" 
                    placeholder="e.g., 72 bpm"
                    value={physicalExam.pulseRate || ''} 
                    onChange={(e) => handlePhysicalExamUpdate('pulseRate', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted/20">
                    {physicalExam.pulseRate || 'Not recorded'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                {isEditing ? (
                  <Input 
                    id="respiratoryRate" 
                    placeholder="e.g., 16/min"
                    value={physicalExam.respiratoryRate || ''} 
                    onChange={(e) => handlePhysicalExamUpdate('respiratoryRate', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted/20">
                    {physicalExam.respiratoryRate || 'Not recorded'}
                  </div>
                )}
              </div>
            </div>
          </div>
          
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientPhysicalExamination;
