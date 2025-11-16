import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ENV } from "@/config/env";

interface Medication {
  name: string;
  dose: string;
  quantity: string;
  frequency: string;
  duration?: string;
  notes?: string;
}

interface PrescriptionData {
  id: string;
  prescription_number: string;
  patient_name: string;
  doctor_name: string;
  date: string;
  medications: Medication[];
}

const PublicPrescription = () => {
  const { prescriptionId } = useParams<{ prescriptionId: string }>();
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrescription = async () => {
      try {
        console.log('Fetching prescription:', prescriptionId);
        console.log('API URL:', `${ENV.API_URL}/medical-documents/${prescriptionId}/`);
        
        // Fetch prescription data from backend - this is a public endpoint
        const response = await axios.get(
          `${ENV.API_URL}/medical-documents/${prescriptionId}/`,
          { withCredentials: false } // No auth required for public view
        );
        
        console.log('Response:', response.data);
        
        const doc = response.data;
        
        // Check if it's a prescription
        if (doc.document_type !== 'prescription') {
          throw new Error('Not a prescription document');
        }
        
        const prescriptionDetail = doc.prescription_detail;
        
        // Parse medications
        let meds: Medication[] = [];
        if (prescriptionDetail && prescriptionDetail.medications) {
          if (typeof prescriptionDetail.medications === 'string') {
            try {
              meds = JSON.parse(prescriptionDetail.medications);
            } catch (e) {
              console.error('Failed to parse medications:', e);
            }
          } else if (Array.isArray(prescriptionDetail.medications)) {
            meds = prescriptionDetail.medications;
          }
        }

        setPrescription({
          id: doc.id,
          prescription_number: prescriptionDetail?.prescription_number || `RX-${doc.id}`,
          patient_name: doc.patient?.name || 'N/A',
          doctor_name: prescriptionDetail?.prescribing_physician
            ? `${prescriptionDetail.prescribing_physician.first_name} ${prescriptionDetail.prescribing_physician.last_name}`
            : 'N/A',
          date: doc.document_date,
          medications: meds,
        });
      } catch (err: any) {
        console.error('Error fetching prescription:', err);
        console.error('Error response:', err.response);
        const errorMsg = err.response?.status === 404 
          ? 'Prescription not found. Please check the QR code and try again.'
          : err.response?.status === 403
          ? 'Access denied to this prescription.'
          : 'Failed to load prescription. Please check the QR code and try again.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    if (prescriptionId) {
      fetchPrescription();
    }
  }, [prescriptionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-white text-xl">Loading prescription...</div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Prescription not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
        {/* Header */}
        <div className="border-b-4 border-indigo-500 pb-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">📋</span>
            <h1 className="text-3xl font-bold text-gray-800">
              Prescription
            </h1>
          </div>
          <p className="text-indigo-600 font-semibold text-lg">
            #{prescription.prescription_number}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Prescribed on: {new Date(prescription.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Patient & Doctor Info */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-indigo-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Patient</p>
              <p className="text-lg font-bold text-gray-800">{prescription.patient_name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Prescribing Doctor</p>
              <p className="text-lg font-bold text-gray-800">{prescription.doctor_name}</p>
            </div>
          </div>
        </div>

        {/* Rx Symbol */}
        <div className="text-center mb-6">
          <div className="text-6xl font-serif font-bold text-indigo-600">Rx</div>
        </div>

        {/* Medications */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>💊</span>
            Medications
          </h2>
          
          {prescription.medications && prescription.medications.length > 0 ? (
            <div className="space-y-4">
              {prescription.medications.map((med, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {index + 1}. {med.name}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {med.dose && (
                          <div>
                            <span className="font-semibold text-gray-700">Dosage:</span>
                            <span className="text-gray-600 ml-2">{med.dose}</span>
                          </div>
                        )}
                        {med.quantity && (
                          <div>
                            <span className="font-semibold text-gray-700">Quantity:</span>
                            <span className="text-gray-600 ml-2">{med.quantity}</span>
                          </div>
                        )}
                        {med.frequency && (
                          <div>
                            <span className="font-semibold text-gray-700">Frequency:</span>
                            <span className="text-gray-600 ml-2">{med.frequency}</span>
                          </div>
                        )}
                        {med.duration && (
                          <div>
                            <span className="font-semibold text-gray-700">Duration:</span>
                            <span className="text-gray-600 ml-2">{med.duration}</span>
                          </div>
                        )}
                      </div>
                      {med.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-semibold text-gray-700">Notes:</span>
                          <span className="text-gray-600 ml-2">{med.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-5 text-red-700">
              <p className="font-semibold">No medications listed</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>This is an electronic prescription. For verification, please contact the prescribing clinic.</p>
          <p className="mt-2 font-semibold">LunaSync Health Management System</p>
        </div>
      </div>
    </div>
  );
};

export default PublicPrescription;
