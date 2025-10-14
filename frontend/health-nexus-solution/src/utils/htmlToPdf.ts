import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Template generators for different document types
export const generatePrescriptionHTML = (prescription: any, patientData: any, clinicSettings: any, currentUser: any) => {
  // Helper function to get proper logo URL
  const getFullLogoUrl = (logo: string) => {
    if (!logo) return null;
    // If it's already a full URL, return as-is
    if (logo.startsWith("http")) return logo;
    // If it starts with /media/, add the base URL
    if (logo.startsWith("/media/"))
      return `http://127.0.0.1:8000${logo}`;
    // If it starts with branding/, add the full path
    if (logo.startsWith("branding/"))
      return `http://127.0.0.1:8000/media/${logo}`;
    // If it's just a filename, assume it's in branding folder
    if (!logo.includes("/"))
      return `http://127.0.0.1:8000/media/branding/${logo}`;
    // Otherwise, add base URL
    return `http://127.0.0.1:8000${
      logo.startsWith("/") ? logo : "/" + logo
    }`;
  };

  const logoUrl = getFullLogoUrl(clinicSettings?.logo);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>E-Prescription</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0;
          padding: 20px;
          background: white;
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif;">
        <!-- Header with Logo and QR -->
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
          <div>
            ${
              clinicSettings?.logo
                ? `<img src="${getFullLogoUrl(
                    clinicSettings.logo
                  )}" alt="Clinic Logo" style="height: 50px; width: auto; margin-bottom: 10px;">`
                : `<div style="width: 50px; height: 50px; background: #f0f0f0; margin-bottom: 10px;"></div>`
            }
            <div style="font-size: 14px; color: #333;">${
              clinicSettings?.clinic_name ||
              "Medical Center"
            }</div>
          </div>
          <div style="text-align: center;">
            ${(() => {
              // UUID v4 regex
              const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              let id = prescription.document_uuid;
              let debugInfo = "";
              if (
                (!id || !uuidRegex.test(id)) &&
                prescription.prescription_number &&
                uuidRegex.test(
                  prescription.prescription_number
                )
              ) {
                id = prescription.prescription_number;
                debugInfo += `<div style=\"font-size:10px;color:#888;\">Falling back to prescription_number: ${id}</div>`;
              }
              if (
                (!id || !uuidRegex.test(id)) &&
                prescription.backendId &&
                uuidRegex.test(prescription.backendId)
              ) {
                id = prescription.backendId;
                debugInfo += `<div style=\"font-size:10px;color:#888;\">Falling back to backendId: ${id}</div>`;
              }
              if (
                (!id || !uuidRegex.test(id)) &&
                prescription.id &&
                uuidRegex.test(prescription.id)
              ) {
                id = prescription.id;
                debugInfo += `<div style=\"font-size:10px;color:#888;\">Falling back to id: ${id}</div>`;
              }
              if (id && uuidRegex.test(id)) {
                const qrId =
                  prescription.document_uuid ||
                  (prescription.document &&
                    prescription.document.id) ||
                  id;
                return (
                  debugInfo +
                  `<img src=\"http://127.0.0.1:8000/api/prescriptions/${qrId}/qr/\" alt=\"QR Code\" style=\"width: 80px; height: 80px; border: 1px solid #ccc; background: #fff; display: block; margin: 0 auto;\" />`
                );
              } else {
                debugInfo += `<div style=\"font-size:10px;color:#c00;\">prescription: ${JSON.stringify(
                  prescription
                ).slice(0, 300)}...</div>`;
                return (
                  debugInfo +
                  `<div style=\"width: 80px; height: 80px; border: 1px solid #ccc; background: #f8d7da; color: #721c24; display: flex; align-items: center; justify-content: center; font-size: 12px;\">QR code unavailable</div>`
                );
              }
            })()}
          </div>
        </div>

        <!-- Prescription ID -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-weight: bold; font-size: 14px;">PRESCRIPTION ID: ${Date.now()
            .toString()
            .slice(-8)
            .toUpperCase()}</div>
        </div>

        <!-- Location and Date -->
        <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
          <div>${
            clinicSettings?.address ||
            "Clinic Address"
          }</div>
          <div style="margin-top: 10px;">
            Prescribed on: ${new Date(prescription.dateCreated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div>${new Date(prescription.dateCreated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} PHT</div>
        </div>

        <!-- Patient Info -->
        <div style="margin-bottom: 20px; font-size: 12px;">
          <div><strong>Patient:</strong> ${
            patientData?.name
          }</div>
          <div><strong>Age:</strong> ${
            patientData?.date_of_birth
              ? Math.floor(
                  (new Date().getTime() -
                    new Date(
                      patientData.date_of_birth
                    ).getTime()) /
                    (365.25 * 24 * 60 * 60 * 1000)
                )
              : "N/A"
          } years old</div>
          <div><strong>Gender:</strong> ${
            patientData?.gender || "Not specified"
          }</div>
        </div>

        <!-- Rx Symbol -->
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">Rx</div>

        <!-- Prescription Details as Table -->
        <div style="margin-bottom: 40px;">
          ${(() => {
            // Always use prescription.data.medications if available, else fallback
            let meds =
              Array.isArray(
                prescription.data?.medications
              ) &&
              prescription.data.medications.length > 0
                ? prescription.data.medications
                : Array.isArray(
                    prescription.medications
                  )
                ? prescription.medications
                : [];
            if (!meds || meds.length === 0) {
              return "<div>No medications listed.</div>";
            }
            
            return `
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
                <thead>
                  <tr style="border-bottom: 2px solid #000;">
                    <th style="text-align: left; padding: 8px 4px; font-weight: bold; border-bottom: 1px solid #000;">Medicine Name</th>
                    <th style="text-align: left; padding: 8px 4px; font-weight: bold; border-bottom: 1px solid #000;">Dosage</th>
                    <th style="text-align: left; padding: 8px 4px; font-weight: bold; border-bottom: 1px solid #000;">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${meds
                    .map(
                      (med, idx) => {
                        // Calculate duration text
                        let durationText = "";
                        if (med.startDate && med.endDate) {
                          durationText = `${med.startDate} to ${med.endDate}`;
                        } else if (med.duration) {
                          durationText = med.duration;
                        } else if (med.startDate) {
                          durationText = `Start: ${med.startDate}`;
                        } else {
                          durationText = "As prescribed";
                        }
                        
                        // Format frequency and quantity
                        let dosageInfo = med.dose || med.dosage || "";
                        if (med.frequency) {
                          dosageInfo += dosageInfo ? `, ${med.frequency}` : med.frequency;
                        }
                        if (med.quantity) {
                          dosageInfo += dosageInfo ? ` (Qty: ${med.quantity})` : `Qty: ${med.quantity}`;
                        }
                        
                        return `
                          <tr style="border-bottom: 1px solid #ccc;">
                            <td style="padding: 8px 4px; vertical-align: top;">
                              <div style="font-weight: bold;">${idx + 1}) ${med.name || "Not specified"}</div>
                              ${med.notes ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">(${med.notes})</div>` : ""}
                            </td>
                            <td style="padding: 8px 4px; vertical-align: top;">
                              ${dosageInfo || "As prescribed"}
                            </td>
                            <td style="padding: 8px 4px; vertical-align: top;">
                              ${durationText}
                            </td>
                          </tr>
                        `;
                      }
                    )
                    .join("")}
                </tbody>
              </table>
              
              <!-- Advice Given Section -->
              ${prescription.generalInstructions || prescription.doctorNotes || prescription.data?.generalInstructions ? `
                <div style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9;">
                  <div style="font-weight: bold; margin-bottom: 8px;">Advice Given:</div>
                  <div style="font-size: 12px; line-height: 1.4;">
                    ${prescription.generalInstructions || prescription.doctorNotes || prescription.data?.generalInstructions || "Follow medication instructions as prescribed."}
                  </div>
                </div>
              ` : ""}
            `;
          })()}
        </div>

        <!-- Doctor Signature Area -->
        <div style="text-align: right; margin-top: 60px;">
          <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
          <div style="font-size: 12px;">Dr. ${
            currentUser?.first_name ||
            currentUser?.name
          } ${currentUser?.last_name || ""}</div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateSOAPNoteHTML = (soapNote: any, patientData: any, clinicSettings: any, currentUser: any) => {
  const noteId = `SOAP${Date.now().toString().slice(-8).toUpperCase()}`;
  
  const getLogoUrl = (logoPath: string) => {
    if (!logoPath) return '';
    return logoPath.startsWith('http') ? logoPath : `http://localhost:8000${logoPath}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SOAP Note - ${patientData?.name}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif;">
        <!-- Header with Logo and QR -->
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
          <div>
            ${clinicSettings?.logo 
              ? `<img src="${getLogoUrl(clinicSettings.logo)}" alt="Clinic Logo" style="height: 50px; width: auto; margin-bottom: 10px;">` 
              : `<div style="width: 50px; height: 50px; background: #f0f0f0; margin-bottom: 10px;"></div>`
            }
            <div style="font-size: 14px; color: #333;">${clinicSettings?.clinic_name || "Medical Center"}</div>
          </div>
          <div style="text-align: center;">
            <div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
              QR CODE
            </div>
          </div>
        </div>

        <!-- Note ID -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-weight: bold; font-size: 14px;">SOAP NOTE ID: ${noteId}</div>
        </div>

        <!-- Location and Date -->
        <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
          <div>${clinicSettings?.address || "Clinic Address"}</div>
          <div style="margin-top: 10px;">
            Created on: ${new Date(soapNote.dateCreated).toLocaleDateString()}
          </div>
          <div>${new Date(soapNote.dateCreated).toLocaleTimeString()} PHT</div>
        </div>

        <!-- Patient Info -->
        <div style="margin-bottom: 20px; font-size: 12px;">
          <div><strong>Patient:</strong> ${patientData?.name}</div>
          <div><strong>Age:</strong> ${patientData?.date_of_birth ? Math.floor((new Date().getTime() - new Date(patientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "N/A"} years old</div>
          <div><strong>Gender:</strong> ${patientData?.gender || "Not specified"}</div>
        </div>

        <!-- SOAP Symbol -->
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #059669;">SOAP</div>

        <!-- SOAP Details -->
        <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.6;">
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 5px;">Subjective:</div>
            <div style="margin-left: 20px; color: #333; padding: 10px; background: #f0fdf4; border-left: 4px solid #059669;">${soapNote.data?.subjective || "Not recorded"}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 5px;">Objective:</div>
            <div style="margin-left: 20px; color: #333; padding: 10px; background: #f0fdf4; border-left: 4px solid #059669;">${soapNote.data?.objective || "Not recorded"}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 5px;">Assessment:</div>
            <div style="margin-left: 20px; color: #333; padding: 10px; background: #f0fdf4; border-left: 4px solid #059669;">${soapNote.data?.assessment || "Not recorded"}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="font-weight: bold; color: #059669; margin-bottom: 5px;">Plan:</div>
            <div style="margin-left: 20px; color: #333; padding: 10px; background: #f0fdf4; border-left: 4px solid #059669;">${soapNote.data?.plan || "Not recorded"}</div>
          </div>
        </div>

        <!-- Doctor Signature Area -->
        <div style="text-align: right; margin-top: 60px;">
          <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
          <div style="font-size: 12px;">Dr. ${currentUser?.first_name || currentUser?.name} ${currentUser?.last_name || ""}</div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateLabResultHTML = (labResult: any, patientData: any, clinicSettings: any, currentUser: any) => {
  const resultId = `LAB${Date.now().toString().slice(-8).toUpperCase()}`;
  
  const getLogoUrl = (logoPath: string) => {
    if (!logoPath) return '';
    return logoPath.startsWith('http') ? logoPath : `http://localhost:8000${logoPath}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lab Result - ${patientData?.name}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        @media print { body { margin: 0; } }
        .result-normal { color: #16a34a; }
        .result-abnormal { color: #ea580c; }
        .result-critical { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif;">
        <!-- Header with Logo and QR -->
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
          <div>
            ${clinicSettings?.logo 
              ? `<img src="${getLogoUrl(clinicSettings.logo)}" alt="Clinic Logo" style="height: 50px; width: auto; margin-bottom: 10px;">` 
              : `<div style="width: 50px; height: 50px; background: #f0f0f0; margin-bottom: 10px;"></div>`
            }
            <div style="font-size: 14px; color: #333;">${clinicSettings?.clinic_name || "Medical Center"}</div>
          </div>
          <div style="text-align: center;">
            <div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
              QR CODE
            </div>
          </div>
        </div>

        <!-- Result ID -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-weight: bold; font-size: 14px;">LAB RESULT ID: ${resultId}</div>
        </div>

        <!-- Location and Date -->
        <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
          <div>${clinicSettings?.address || "Clinic Address"}</div>
          <div style="margin-top: 10px;">
            Test Date: ${labResult.document?.document_date ? new Date(labResult.document.document_date).toLocaleDateString() : "Date not available"}
          </div>
          <div>Laboratory: ${labResult.laboratory_name || "Unknown Lab"}</div>
        </div>

        <!-- Patient Info -->
        <div style="margin-bottom: 20px; font-size: 12px;">
          <div><strong>Patient:</strong> ${patientData?.name}</div>
          <div><strong>Age:</strong> ${patientData?.date_of_birth ? Math.floor((new Date().getTime() - new Date(patientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "N/A"} years old</div>
          <div><strong>Gender:</strong> ${patientData?.gender || "Not specified"}</div>
        </div>

        <!-- Test Info -->
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af;">
          ${labResult.test_name || "Lab Test"}
        </div>
        <div style="font-size: 14px; color: #666; margin-bottom: 20px;">
          Category: ${labResult.test_category || "General"} | Specimen: ${labResult.specimen_type || "Unknown"}
        </div>

        <!-- Test Results -->
        <div style="margin-bottom: 30px;">
          <div style="font-weight: bold; margin-bottom: 15px; color: #1e40af; font-size: 16px;">Test Results:</div>
          ${labResult.test_results && labResult.test_results.length > 0 ? 
            labResult.test_results.map((test: any, index: number) => `
              <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb;">
                <div style="font-weight: bold; margin-bottom: 5px;">${test.test_name || `Test ${index + 1}`}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                  <span>Result: <strong class="result-${test.status?.toLowerCase() || 'normal'}">${test.result_value || 'N/A'} ${test.unit || ''}</strong></span>
                  <span style="font-size: 12px; color: #666;">Reference: ${test.reference_range || 'N/A'}</span>
                </div>
                ${test.status && test.status !== 'normal' ? `<div style="font-size: 12px; color: ${test.status === 'critical' ? '#dc2626' : '#ea580c'};">Status: ${test.status.toUpperCase()}</div>` : ''}
              </div>
            `).join('') 
            : '<div style="color: #666;">No detailed test results available</div>'
          }
        </div>

        <!-- Critical/Abnormal Values Summary -->
        ${labResult.critical_values && labResult.critical_values.length > 0 ? `
          <div style="margin-bottom: 20px; padding: 15px; border: 2px solid #dc2626; border-radius: 8px; background: #fef2f2;">
            <div style="font-weight: bold; color: #dc2626; margin-bottom: 10px;">🚨 Critical Values (${labResult.critical_values.length}):</div>
            ${labResult.critical_values.map((cv: any) => `<div style="color: #dc2626;">• ${cv.test_name}: ${cv.result_value} ${cv.unit} (Ref: ${cv.reference_range})</div>`).join('')}
          </div>
        ` : ''}

        ${labResult.abnormal_values && labResult.abnormal_values.length > 0 ? `
          <div style="margin-bottom: 20px; padding: 15px; border: 2px solid #ea580c; border-radius: 8px; background: #fff7ed;">
            <div style="font-weight: bold; color: #ea580c; margin-bottom: 10px;">⚠️ Abnormal Values (${labResult.abnormal_values.length}):</div>
            ${labResult.abnormal_values.map((av: any) => `<div style="color: #ea580c;">• ${av.test_name}: ${av.result_value} ${av.unit} (Ref: ${av.reference_range})</div>`).join('')}
          </div>
        ` : ''}

        <!-- Interpretation -->
        ${labResult.interpretation ? `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb;">
            <div style="font-weight: bold; margin-bottom: 8px;">Interpretation:</div>
            <div style="font-size: 13px; line-height: 1.5;">${labResult.interpretation}</div>
          </div>
        ` : ''}

        <!-- Recommendations -->
        ${labResult.recommendations ? `
          <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #d1d5db; border-radius: 8px; background: #f0f9ff;">
            <div style="font-weight: bold; margin-bottom: 8px;">Recommendations:</div>
            <div style="font-size: 13px; line-height: 1.5;">${labResult.recommendations}</div>
          </div>
        ` : ''}

        <!-- Doctor Signature Area -->
        <div style="text-align: right; margin-top: 60px;">
          <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
          <div style="font-size: 12px;">Dr. ${currentUser?.first_name || currentUser?.name} ${currentUser?.last_name || ""}</div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateClinicalNoteHTML = (clinicalNote: any, patientData: any, clinicSettings: any, currentUser: any) => {
  const noteId = `CN${Date.now().toString().slice(-8).toUpperCase()}`;
  
  const getLogoUrl = (logoPath: string) => {
    if (!logoPath) return '';
    return logoPath.startsWith('http') ? logoPath : `http://localhost:8000${logoPath}`;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clinical Note - ${patientData?.name}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif;">
        <!-- Header with Logo and QR -->
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
          <div>
            ${clinicSettings?.logo 
              ? `<img src="${getLogoUrl(clinicSettings.logo)}" alt="Clinic Logo" style="height: 50px; width: auto; margin-bottom: 10px;">` 
              : `<div style="width: 50px; height: 50px; background: #f0f0f0; margin-bottom: 10px;"></div>`
            }
            <div style="font-size: 14px; color: #333;">${clinicSettings?.clinic_name || "Medical Center"}</div>
          </div>
          <div style="text-align: center;">
            <div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
              QR CODE
            </div>
          </div>
        </div>

        <!-- Note ID -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-weight: bold; font-size: 14px;">CLINICAL NOTE ID: ${noteId}</div>
        </div>

        <!-- Location and Date -->
        <div style="text-align: center; margin-bottom: 30px; font-size: 12px; color: #666;">
          <div>${clinicSettings?.address || "Clinic Address"}</div>
          <div style="margin-top: 10px;">
            Created on: ${new Date(clinicalNote.dateCreated).toLocaleDateString()}
          </div>
          <div>${new Date(clinicalNote.dateCreated).toLocaleTimeString()} PHT</div>
        </div>

        <!-- Patient Info -->
        <div style="margin-bottom: 20px; font-size: 12px;">
          <div><strong>Patient:</strong> ${patientData?.name}</div>
          <div><strong>Age:</strong> ${patientData?.date_of_birth ? Math.floor((new Date().getTime() - new Date(patientData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "N/A"} years old</div>
          <div><strong>Gender:</strong> ${patientData?.gender || "Not specified"}</div>
        </div>

        <!-- Note Symbol -->
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #2563eb;">Clinical Note</div>

        <!-- Note Details -->
        <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.6;">
          <div style="font-weight: bold; margin-bottom: 10px; color: #2563eb; font-size: 16px;">${clinicalNote.data?.title || "Clinical Note"}</div>
          <div style="margin-left: 20px; color: #333; white-space: pre-wrap; padding: 15px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 6px 6px 0;">${clinicalNote.data?.content || "No content recorded"}</div>
        </div>

        <!-- Doctor Signature Area -->
        <div style="text-align: right; margin-top: 60px;">
          <div style="border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-bottom: 5px;"></div>
          <div style="font-size: 12px;">Dr. ${currentUser?.first_name || currentUser?.name} ${currentUser?.last_name || ""}</div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #999;">
          <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f0f0; margin: 0 auto;"></div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export class HTMLToPDFConverter {
  /**
   * Convert HTML content to PDF
   * @param htmlContent - The HTML string to convert
   * @param filename - The filename for the PDF
   * @param options - Additional options for PDF generation
   */
  static async convertHTMLToPDF(
    htmlContent: string, 
    filename: string = 'document.pdf',
    options: {
      format?: 'a4' | 'letter';
      orientation?: 'portrait' | 'landscape';
      margin?: number;
      scale?: number;
    } = {}
  ): Promise<jsPDF> {
    const {
      format = 'a4',
      orientation = 'portrait',
      margin = 10,
      scale = 2
    } = options;

    // Create a temporary container for the HTML content
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20px';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.4';
    
    document.body.appendChild(container);

    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
      });

      const imgWidth = format === 'a4' ? 190 : 200; // A4: 210mm - 20mm margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

      return pdf;
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  /**
   * Generate and download PDF from HTML content
   */
  static async downloadPDFFromHTML(
    htmlContent: string, 
    filename: string = 'document.pdf',
    options?: Parameters<typeof HTMLToPDFConverter.convertHTMLToPDF>[2]
  ): Promise<void> {
    const pdf = await this.convertHTMLToPDF(htmlContent, filename, options);
    pdf.save(filename);
  }

  /**
   * Generate and view PDF from HTML content in new window
   */
  static async viewPDFFromHTML(
    htmlContent: string,
    options?: Parameters<typeof HTMLToPDFConverter.convertHTMLToPDF>[2]
  ): Promise<void> {
    const pdf = await this.convertHTMLToPDF(htmlContent, 'document.pdf', options);
    const pdfUrl = pdf.output('bloburl');
    window.open(pdfUrl, '_blank');
  }

  /**
   * Get PDF blob from HTML content
   */
  static async getPDFBlobFromHTML(
    htmlContent: string,
    options?: Parameters<typeof HTMLToPDFConverter.convertHTMLToPDF>[2]
  ): Promise<Blob> {
    const pdf = await this.convertHTMLToPDF(htmlContent, 'document.pdf', options);
    return pdf.output('blob');
  }
}