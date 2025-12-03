import { format } from 'date-fns';

export interface MedicalCertificateTemplateData {
  hospitalName: string;
  hospitalAddress: string;
  hospitalContact: string;
  hospitalLicense?: string;
  hospitalLogo?: string;
  doctorName: string;
  doctorLicense?: string;
  doctorPRC?: string;
  doctorPTR?: string;
  patientName: string;
  patientAge: string;
  patientAddress?: string;
  patientSex?: string;
  chiefComplaint: string;
  diagnosis: string;
  medicalRecommendations: string;
  restFromDate?: string;
  restToDate?: string;
  fitForWork: 'fit' | 'unfit' | 'limited' | 'fit_physical_activities';
  limitations?: string;
  physicalActivitiesType?: string; // e.g., "sports", "physical education", "athletics"
  followUpDate?: string;
  dateIssued: string;
  certificateType?: string;
}

export const generateMedicalCertificateHTML = (data: MedicalCertificateTemplateData): string => {
  const currentDate = format(new Date(), 'MMM dd, yyyy');
  const currentTime = format(new Date(), 'h:mm a');
  
  return `
    <html>
      <head>
        <style>
          @page {
            size: A4 landscape;
            margin: 0.25in;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .certificate-container { 
              box-shadow: none !important; 
              border: none !important;
              margin: 0;
              padding: 0;
              height: 50vh;
              max-height: 14.8cm;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 50vh;
            padding-top: 10px;
          }
          .certificate-container {
            width: 29.7cm;
            height: 14.8cm;
            max-height: 14.8cm;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border: 1px solid #ddd;
            padding: 15px;
            box-sizing: border-box;
            font-size: 9px;
            line-height: 1.2;
            overflow: hidden;
          }
          .header-section {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1.5px solid #333;
          }
          .clinic-logo {
            max-width: 120px;
            max-height: 50px;
            margin: 0 auto 8px auto;
            display: block;
            text-align: center;
          }
          .clinic-name {
            font-size: 14px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          .clinic-subtitle {
            font-size: 10px;
            color: #666;
            margin-bottom: 8px;
          }
          .clinic-address {
            font-size: 9px;
            color: #555;
            margin-bottom: 2px;
          }
          .clinic-contact {
            font-size: 9px;
            color: #555;
          }
            color: #333;
            margin-bottom: 10px;
          }
          .certificate-title {
            font-size: 14px;
            font-weight: bold;
            text-decoration: underline;
            margin: 10px 0;
            text-align: center;
          }
          .date-time-row {
            margin-bottom: 15px;
            font-size: 9px;
          }
          .date-time-left {
            text-align: left;
            line-height: 1.2;
          }
          .main-content {
            margin-bottom: 15px;
            font-size: 9px;
            line-height: 1.3;
            text-align: justify;
          }
          .underline {
            text-decoration: underline;
            font-weight: bold;
          }
          .section-title {
            font-weight: bold;
            margin-top: 10px;
            margin-bottom: 5px;
            font-size: 9px;
          }
          .section-content {
            min-height: 20px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
            margin-bottom: 8px;
            font-size: 8px;
          }
          .certificate-purpose {
            margin-top: 15px;
            margin-bottom: 20px;
            font-size: 9px;
            text-align: justify;
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <!-- Header Section -->
          <div class="header-section">
            <!-- Clinic Logo (centered) -->
            ${data.hospitalLogo ? `<img src="${data.hospitalLogo}" alt="Clinic Logo" class="clinic-logo">` : `
              <div style="width: 80px; height: 80px; background: #f0f0f0; margin: 0 auto 15px;"></div>
            `}
            
            <div class="clinic-name">${data.hospitalName || 'Medical Center'}</div>
            <div class="clinic-address">${data.hospitalAddress || 'Clinic Address'}</div>
            <div class="clinic-contact">${data.hospitalContact || 'Tel: (000) 000-0000 | Email: info@clinic.com'}</div>
          </div>

          <!-- Certificate Title -->
          <div class="certificate-title">MEDICAL CERTIFICATE</div>

          <!-- Date and Time -->
          <div class="date-time-row">
            <div class="date-time-left">
              <div><strong>Date:</strong> ${currentDate}</div>
              <div><strong>Time:</strong> ${currentTime}</div>
            </div>
          </div>

          <!-- Main Certificate Content -->
          <div class="main-content">
            This is to certify that <span class="underline">${data.patientName}</span>, age <span class="underline">${data.patientAge}</span>, gender <span class="underline">${data.patientSex || 'Not specified'}</span>, of <span class="underline">${data.patientAddress || 'Not specified'}</span> examined on <span class="underline">${currentDate}</span> and the result revealed that he/she is <span class="underline">${(() => {
              if (data.fitForWork === 'fit') return 'FIT FOR WORK';
              if (data.fitForWork === 'unfit') return 'UNFIT FOR WORK';
              if (data.fitForWork === 'limited') return 'FIT FOR WORK WITH LIMITATIONS';
              if (data.fitForWork === 'fit_physical_activities') return 'FIT FOR PHYSICAL ACTIVITIES';
              return 'FIT FOR WORK';
            })()}</span>${(() => {
              // Only show chief complaint and diagnosis if not fully fit for work
              if (data.fitForWork === 'fit' || data.fitForWork === 'fit_physical_activities') {
                return '.';
              } else {
                return ` with chief complaint of <span class="underline">${data.chiefComplaint || ''}</span> with the diagnosis of <span class="underline">${data.diagnosis || ''}</span>.`;
              }
            })()}
          </div>

          <!-- Medical/Surgical Intervention - Only show if not fully fit for work -->
          ${data.fitForWork === 'fit' || data.fitForWork === 'fit_physical_activities' ? '' : `
          <div class="section-title">Medical/Surgical Intervention:</div>
          <div class="section-content">
            ${data.medicalRecommendations || ''}
          </div>
          `}

          <!-- Duration of Treatment - Only show if not fully fit for work -->
          ${data.fitForWork === 'fit' || data.fitForWork === 'fit_physical_activities' ? '' : `
          <div class="section-title">Duration of Treatment:</div>
          <div class="section-content">
            ${data.restFromDate && data.restToDate ? 
              `${format(new Date(data.restFromDate), 'MMM dd, yyyy')} to ${format(new Date(data.restToDate), 'MMM dd, yyyy')}` : 
              `${currentDate} to ${format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}`
            }
          </div>
          `}

          <!-- Remarks -->
          <div class="section-title">Remarks:</div>
          <div class="section-content">
            ${(() => {
              let remarks = '';
              
              if (data.fitForWork === 'fit') {
                remarks = 'Patient is cleared for full work activities with no restrictions.';
              } else if (data.fitForWork === 'unfit') {
                remarks = 'Patient is advised to rest from work and refrain from any work-related activities during the specified treatment period.';
              } else if (data.fitForWork === 'limited') {
                remarks = 'Patient is fit for work with the following limitations: ' + (data.limitations || 'Light duties only, no heavy lifting or strenuous activities.');
              } else if (data.fitForWork === 'fit_physical_activities') {
                remarks = 'Patient is cleared for physical activities including sports and athletic participation.';
              } else {
                remarks = 'Please follow medical recommendations as prescribed.';
              }
              
              // Add any additional user-provided limitations/remarks
              if (data.limitations && data.fitForWork !== 'limited') {
                remarks += ' ' + data.limitations;
              }
              
              return remarks;
            })()}
          </div>

          <!-- Certificate Purpose -->
          <div class="certificate-purpose">
            This certificate is issued upon the request of <span class="underline">${data.patientName}</span> for whatever purpose it may serve.
          </div>

          <!-- Signature Section -->
          <div style="margin-top: 40px; padding: 20px 0; display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
            <div style="font-size: 8px; color: #666; align-self: flex-end;">Not for Legal Purposes</div>
            <div style="text-align: right; width: 250px; margin-left: auto;">
              <div style="border-bottom: 1px solid #000; height: 25px; margin-bottom: 5px; width: 100%;"></div>
              <div style="font-weight: bold; margin-bottom: 3px; font-size: 8px; text-align: right;">${data.doctorName || 'Doctor Name'}, M.D.</div>
              <div style="font-size: 8px; line-height: 1.3; text-align: right;">
                <div><strong>License No:</strong> ${data.doctorLicense || '___________________'}</div>
                <div><strong>PTR No:</strong> ${data.doctorPTR || '___________________'}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const getCertificateTypeLabel = (type: string): string => {
  const types: Record<string, string> = {
    sick_leave: 'Sick Leave Certificate',
    fitness: 'Medical Fitness Certificate',
    physical_activities: 'Physical Activities Fitness Certificate',
    vaccination: 'Vaccination Certificate',
    general: 'General Medical Certificate'
  };
  return types[type] || 'Medical Certificate';
};

export const calculateAge = (dateOfBirth: string): string => {
  if (!dateOfBirth) return '';
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age.toString();
};
