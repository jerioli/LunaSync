import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import MedicineSearch from "@/components/MedicineSearch";
import { axiosInstance } from "@/services/api";
import {
    ArrowLeft,
    Mail,
    Plus,
    XCircle
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface MedicineRecord {
  id: number;
  name: string;
  dosage: string;
  category: string;
  description?: string;
}

interface Medication {
  id: number;
  name: string;
  dose: string;
  quantity: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
  nameType: "Generic" | "Brand";
  medicineRecord?: MedicineRecord; // Reference to the medicine record
}

interface LatestPrescription {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescription_content: string;
  doctor_notes: string;
  doctor_name: string;
  created_at: string;
  notes: string;
}

interface PrescriptionRequest {
  id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  patient_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  additional_notes?: string;
  status: string;
  requested_at: string;
  prescription_content?: string;
  doctor_notes?: string;
  rejection_reason?: string;
}

interface PrescriptionApprovalProps {
  request: PrescriptionRequest;
  onClose: () => void;
  onApprove: (requestId: number, action: string, prescriptionData?: any) => void;
}

const PrescriptionApproval: React.FC<PrescriptionApprovalProps> = ({
  request,
  onClose,
  onApprove,
}) => {
  const [latestPrescriptions, setLatestPrescriptions] = useState<any[]>([]);
  const [loadingLatestPrescriptions, setLoadingLatestPrescriptions] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMedication, setCurrentMedication] = useState<Medication>({
    id: 0,
    name: "",
    dose: "",
    quantity: "",
    frequency: "",
    startDate: "",
    endDate: "",
    notes: "",
    nameType: "Generic",
    medicineRecord: undefined,
  });
  const [generalNotes, setGeneralNotes] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLatestPrescriptions();
  }, []);

  const fetchLatestPrescriptions = async () => {
    try {
      setLoadingLatestPrescriptions(true);
      
      // Find the patient by name
      const patientsResponse = await axiosInstance.get('/patients/');
      const patient = patientsResponse.data.find((p: any) => 
        p.name === request.patient_name || 
        p.full_name === request.patient_name ||
        `${p.first_name} ${p.last_name}` === request.patient_name
      );
      
      if (patient) {
        // Use the same approach as documents page - simple and clean
        const prescriptionsResponse = await axiosInstance.get(`/medical-documents/prescriptions/?patient_id=${patient.id}`);
        const prescriptions = prescriptionsResponse.data || [];
        
        console.log("Fetched prescriptions:", prescriptions);
        setLatestPrescriptions(prescriptions);
        
        // Pre-populate form with the most recent prescription if available
        if (prescriptions.length > 0) {
          const latest = prescriptions[0];
          
          // Try to extract first medication
          let medicationName = "";
          let dosage = "";
          let frequency = "";
          
          if (latest.medications) {
            try {
              const medicationsData = typeof latest.medications === 'string' 
                ? JSON.parse(latest.medications) 
                : latest.medications;
              
              if (Array.isArray(medicationsData) && medicationsData.length > 0) {
                const firstMed = medicationsData[0];
                medicationName = firstMed.name || firstMed.medication_name || "";
                dosage = firstMed.dose || firstMed.dosage || "";
                frequency = firstMed.frequency || "";
              }
            } catch (e) {
              console.log("Failed to parse medications:", e);
            }
          }
          
          if (medicationName) {
            const newMedication: Medication = {
              id: Date.now(),
              name: medicationName,
              dose: dosage,
              quantity: "30",
              frequency: frequency,
              startDate: new Date().toISOString().split('T')[0],
              endDate: "",
              notes: "",
              nameType: "Generic",
              medicineRecord: undefined,
            };
            
            setMedications([newMedication]);
          }
          
          setGeneralNotes(latest.general_instructions || "");
        }
      }
    } catch (error) {
      console.error("Error fetching latest prescriptions:", error);
      
      // Pre-populate with request data as fallback
      const newMedication: Medication = {
        id: Date.now(),
        name: request.medication_name || "",
        dose: request.dosage || "",
        quantity: "30",
        frequency: request.frequency || "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        notes: "",
        nameType: "Generic",
        medicineRecord: undefined,
      };
      
      if (newMedication.name) {
        setMedications([newMedication]);
      }
    } finally {
      setLoadingLatestPrescriptions(false);
    }
  };

  const handleMedicationChange = (field: keyof Medication, value: string) => {
    setCurrentMedication((prev) => ({ ...prev, [field]: value }));
  };

  const addMedication = () => {
    if (currentMedication.name && currentMedication.dose) {
      setMedications((prev) => [
        ...prev,
        { ...currentMedication, id: Date.now() },
      ]);
      setCurrentMedication({
        id: 0,
        name: "",
        dose: "",
        quantity: "",
        frequency: "",
        startDate: "",
        endDate: "",
        notes: "",
        nameType: "Generic",
        medicineRecord: undefined,
      });
    }
  };

  const removeMedication = (id: number) => {
    setMedications((prev) => prev.filter((med) => med.id !== id));
  };

  const editMedication = (id: number) => {
    const medication = medications.find((med) => med.id === id);
    if (medication) {
      setCurrentMedication(medication);
      removeMedication(id);
    }
  };

  const handleApproveClick = async (action: string) => {
    setIsSubmitting(true);
    
    try {
      let prescriptionData: any = {};

      if (action === "doctor_approve") {
        // Convert medications array to structured prescription content
        let prescriptionContentText = "";
        if (medications.length > 0) {
          prescriptionContentText = medications.map((med, index) => 
            `${index + 1}. ${med.name}
   Dose: ${med.dose}
   Quantity: ${med.quantity}
   Frequency: ${med.frequency}
   Duration: ${med.startDate}${med.endDate ? ` to ${med.endDate}` : ''}
   ${med.notes ? `Notes: ${med.notes}` : ''}`
          ).join('\n\n');
        }
        
        if (generalNotes) {
          prescriptionContentText += `\n\nGeneral Instructions:\n${generalNotes}`;
        }
        
        prescriptionData = {
          prescription_content: prescriptionContentText,
          doctor_notes: doctorNotes,
          medications: medications, // Send the NEW medications array
        };
      } else if (action === "reject") {
        prescriptionData = {
          rejection_reason: rejectionReason,
        };
      }

      await onApprove(request.id, action, prescriptionData);
      
      // Small delay to show success state
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error("Error submitting prescription:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Prescription</h3>
              <p className="text-sm text-gray-600">Sending email and saving prescription...</p>
            </div>
          </div>
        )}
        
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Prescription Approval - {request.patient_name}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left side - Latest Prescriptions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Name:</strong></div>
                  <div>{request.patient_name}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>DOB:</strong></div>
                  <div>{request.date_of_birth}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Email:</strong></div>
                  <div>{request.email}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Phone:</strong></div>
                  <div>{request.phone}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Requested:</strong></div>
                  <div>{new Date(request.requested_at).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Latest Prescriptions</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLatestPrescriptions ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : latestPrescriptions.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {latestPrescriptions.map((prescription, index) => (
                      <div key={prescription.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h6 className="font-medium">Prescription #{index + 1}</h6>
                            <Badge variant="outline">
                              {new Date(prescription.document?.document_date || prescription.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                          
                          {/* Prescribed Medications Table */}
                          <div className="bg-white rounded border">
                            <div className="px-4 py-2 bg-gray-100 border-b">
                              <h6 className="text-sm font-medium">Prescribed Medications</h6>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b bg-gray-50">
                                    <th className="text-left p-2 font-medium">Medication</th>
                                    <th className="text-left p-2 font-medium">Dose</th>
                                    <th className="text-left p-2 font-medium">Qty</th>
                                    <th className="text-left p-2 font-medium">Frequency</th>
                                    <th className="text-left p-2 font-medium">Duration</th>
                                    <th className="text-left p-2 font-medium">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    // Parse the prescription medications
                                    let medications = [];
                                    
                                    // Try to parse from medications field (for medical documents)
                                    if (prescription.medications) {
                                      try {
                                        const medData = typeof prescription.medications === 'string' 
                                          ? JSON.parse(prescription.medications) 
                                          : prescription.medications;
                                        
                                        if (Array.isArray(medData)) {
                                          medications = medData;
                                        } else if (typeof medData === 'object' && medData.name) {
                                          medications = [medData];
                                        }
                                      } catch (e) {
                                        console.log("Failed to parse medications JSON:", e);
                                      }
                                    }
                                    
                                    // If no structured medications, try parsing prescription_content
                                    if (medications.length === 0 && prescription.prescription_content) {
                                      const lines = prescription.prescription_content.split('\n').filter(line => line.trim());
                                      medications = lines.map((line: string, idx: number) => {
                                        // Remove numbering like "1. " if present
                                        const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
                                        return {
                                          name: cleanLine || `Medication ${idx + 1}`,
                                          dose: '',
                                          quantity: '',
                                          frequency: '',
                                          notes: ''
                                        };
                                      });
                                    }
                                    
                                    // If still no medications, create a fallback entry
                                    if (medications.length === 0) {
                                      medications = [{
                                        name: prescription.medication_name || 'Unknown medication',
                                        dose: prescription.dosage || '',
                                        quantity: prescription.quantity || '',
                                        frequency: prescription.frequency || '',
                                        notes: prescription.notes || ''
                                      }];
                                    }
                                    
                                    return medications.map((med: any, medIndex: number) => (
                                      <tr key={medIndex} className="border-b hover:bg-gray-50">
                                        <td className="p-2">
                                          <div className="font-medium">{med.name || med.medication_name || 'Unknown'}</div>
                                          {(med.generic_name || med.name_type === 'Generic') && (
                                            <div className="text-gray-500 text-xs">(Generic)</div>
                                          )}
                                        </td>
                                        <td className="p-2">{med.dose || med.dosage || '-'}</td>
                                        <td className="p-2">{med.quantity || med.qty || '-'}</td>
                                        <td className="p-2">{med.frequency || '-'}</td>
                                        <td className="p-2">
                                          {(med.startDate || med.start_date) ? (
                                            <div className="text-xs">
                                              {med.startDate || med.start_date}
                                              {(med.endDate || med.end_date) && (
                                                <> to {med.endDate || med.end_date}</>
                                              )}
                                            </div>
                                          ) : (med.duration || '-')}
                                        </td>
                                        <td className="p-2">{med.notes || med.instructions || '-'}</td>
                                      </tr>
                                    ));
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                          {prescription.prescribing_physician && (
                            <div className="text-sm">
                              <strong>Doctor:</strong> {prescription.prescribing_physician.first_name} {prescription.prescribing_physician.last_name}
                            </div>
                          )}
                          {!prescription.prescribing_physician && (prescription.doctor_name || prescription.doctor) && (
                            <div className="text-sm">
                              <strong>Doctor:</strong> {prescription.doctor_name || (prescription.doctor && (prescription.doctor.first_name ? `${prescription.doctor.first_name} ${prescription.doctor.last_name}` : prescription.doctor))}
                            </div>
                          )}
                          {!prescription.prescribing_physician && !prescription.doctor_name && !prescription.doctor && prescription.created_by && (
                            <div className="text-sm">
                              <strong>Doctor:</strong> {prescription.created_by.first_name ? `${prescription.created_by.first_name} ${prescription.created_by.last_name}` : prescription.created_by.username || prescription.created_by}
                            </div>
                          )}
                          {prescription.general_instructions && (
                            <div className="text-sm">
                              <strong>General Instructions:</strong> {prescription.general_instructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No previous prescriptions found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right side - New Prescription Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create E-Prescription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Medication Form */}
                <div className="bg-gray-50 p-4 rounded border">
                  <h6 className="font-medium mb-3">Add Medication</h6>
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="nameType"
                          checked={currentMedication.nameType === "Generic"}
                          onChange={() => handleMedicationChange("nameType", "Generic")}
                        />
                        Generic Name
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="nameType"
                          checked={currentMedication.nameType === "Brand"}
                          onChange={() => handleMedicationChange("nameType", "Brand")}
                        />
                        Brand Name
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Medicine Name</Label>
                        <MedicineSearch
                          value={currentMedication.name}
                          onSelect={(medicine) => {
                            if (medicine) {
                              handleMedicationChange("name", medicine.name);
                              // Auto-fill dose if available from medicine record
                              if (medicine.dosage && !currentMedication.dose) {
                                handleMedicationChange("dose", medicine.dosage);
                              }
                              // Store medicine record reference
                              setCurrentMedication(prev => ({
                                ...prev,
                                medicineRecord: medicine
                              }));
                            } else {
                              handleMedicationChange("name", "");
                              setCurrentMedication(prev => ({
                                ...prev,
                                medicineRecord: undefined
                              }));
                            }
                          }}
                          placeholder="Search medicine..."
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Dosage</Label>
                        <Input
                          placeholder="e.g., 500mg"
                          value={currentMedication.dose}
                          onChange={(e) => handleMedicationChange("dose", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="e.g., Capsule #21"
                        value={currentMedication.quantity}
                        onChange={(e) => handleMedicationChange("quantity", e.target.value)}
                      />
                      <Select
                        value={currentMedication.frequency}
                        onValueChange={(val) => handleMedicationChange("frequency", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="e.g., Once a day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Once daily">Once daily</SelectItem>
                          <SelectItem value="Twice daily">Twice daily</SelectItem>
                          <SelectItem value="Three times daily">Three times daily</SelectItem>
                          <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
                          <SelectItem value="Every 6 hours">Every 6 hours</SelectItem>
                          <SelectItem value="As needed">As needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Start Date</Label>
                        <Input
                          type="date"
                          value={currentMedication.startDate}
                          onChange={(e) => handleMedicationChange("startDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">End Date</Label>
                        <Input
                          type="date"
                          value={currentMedication.endDate}
                          onChange={(e) => handleMedicationChange("endDate", e.target.value)}
                        />
                      </div>
                    </div>

                    <Textarea
                      placeholder="Additional instructions or notes"
                      value={currentMedication.notes}
                      onChange={(e) => handleMedicationChange("notes", e.target.value)}
                      rows={2}
                    />

                    <Button
                      onClick={addMedication}
                      disabled={!currentMedication.name || !currentMedication.dose}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Medication
                    </Button>
                  </div>
                </div>

                {/* Added Medications List */}
                {medications.length > 0 && (
                  <div className="bg-white border rounded">
                    <div className="px-4 py-2 bg-gray-100 border-b">
                      <h6 className="text-sm font-medium">Added Medications</h6>
                    </div>
                    <div className="divide-y">
                      {medications.map((med, index) => (
                        <div key={med.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">{med.name}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="mr-4">Dose: {med.dose}</span>
                                <span className="mr-4">Qty: {med.quantity}</span>
                                <span>Frequency: {med.frequency}</span>
                              </div>
                              {med.notes && (
                                <div className="text-sm text-gray-500 mt-1">Notes: {med.notes}</div>
                              )}
                              <div className="text-sm text-gray-500">
                                {med.startDate}{med.endDate && ` to ${med.endDate}`}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => editMedication(med.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeMedication(med.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Instructions */}
                <div>
                  <Label className="text-sm font-medium">General Instructions</Label>
                  <Textarea
                    placeholder="General instructions for the patient..."
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Doctor Notes */}
                <div>
                  <Label className="text-sm font-medium">Doctor Notes (Internal)</Label>
                  <Textarea
                    placeholder="Internal notes for medical records..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>

              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleApproveClick("doctor_approve")}
                disabled={medications.length === 0 || isSubmitting}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-1" />
                    Send & Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionApproval;