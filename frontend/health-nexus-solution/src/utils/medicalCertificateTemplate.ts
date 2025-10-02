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
            size: A4;
            margin: 0.5in;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .certificate-container { 
              box-shadow: none !important; 
              border: none !important;
              margin: 0;
              padding: 0;
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
            min-height: 100vh;
            padding-top: 20px;
          }
          .certificate-container {
            width: 21cm;
            min-height: 29.7cm;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border: 1px solid #ddd;
            padding: 40px;
            box-sizing: border-box;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-section {
            text-align: center;
            margin-bottom: 30px;
          }
          .clinic-logo {
            max-width: 200px;
            max-height: 80px;
            margin: 0 auto 15px auto;
            display: block;
            text-align: center;
          }
          .clinic-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          }
          .clinic-subtitle {
            font-size: 12px;
            color: #666;
            margin-bottom: 15px;
          }
          .clinic-address {
            font-size: 11px;
            color: #333;
            margin-bottom: 5px;
          }
          .clinic-contact {
            font-size: 11px;
            color: #333;
            margin-bottom: 20px;
          }
          .certificate-title {
            font-size: 16px;
            font-weight: bold;
            text-decoration: underline;
            margin: 20px 0;
            text-align: center;
          }
          .date-time-row {
            margin-bottom: 25px;
            font-size: 11px;
          }
          .date-time-left {
            text-align: left;
            line-height: 1.4;
          }
          .main-content {
            margin-bottom: 20px;
            font-size: 11px;
            line-height: 1.5;
            text-align: justify;
          }
          .underline {
            text-decoration: underline;
            font-weight: bold;
          }
          .section-title {
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .section-content {
            min-height: 40px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .certificate-purpose {
            margin-top: 30px;
            margin-bottom: 40px;
            font-size: 11px;
            text-align: justify;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 60px;
          }
          .left-note {
            font-size: 10px;
            color: #666;
            align-self: flex-end;
          }
          .doctor-signature {
            text-align: center;
            min-width: 250px;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            height: 40px;
            margin-bottom: 8px;
          }
          .doctor-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .doctor-credentials {
            font-size: 10px;
            line-height: 1.3;
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <!-- Header Section -->
          <div class="header-section">
            <!-- Clinic Logo (centered) -->
            ${data.hospitalLogo ? `<img src="${data.hospitalLogo}" alt="Clinic Logo" class="clinic-logo">` : `
              <!-- Fallback to clinic name if no logo -->
              <div class="clinic-name">${data.hospitalName || 'Medical Center'}</div>
              <div class="clinic-subtitle">MEDICAL AND DIAGNOSTICS CLINIC</div>
            `}
            
            <div class="clinic-address">${data.hospitalAddress || '123 Health Avenue, Medical District, Cityville, California 12345'}</div>
            <div class="clinic-contact">${data.hospitalContact || 'Phone: (123) 456-7890 | Email: medinfomatics@healthnexus.com'}</div>
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
            This is to certify that <span class="underline">${data.patientName}</span>, age <span class="underline">${data.patientAge}</span>, gender <span class="underline">${data.patientSex || 'Not specified'}</span>, of <span class="underline">${data.patientAddress || 'Not specified'}</span> examined/confined on <span class="underline">${currentDate}</span> was <span class="underline">FIT FOR WORK</span> with chief complaint of <span class="underline">${data.chiefComplaint || ''}</span> with the diagnosis of <span class="underline">${data.diagnosis || ''}</span>.
          </div>

          <!-- Medical/Surgical Intervention -->
          <div class="section-title">Medical/Surgical Intervention:</div>
          <div class="section-content">
            ${data.medicalRecommendations || ''}
          </div>

          <!-- Duration of Treatment -->
          <div class="section-title">Duration of Treatment:</div>
          <div class="section-content">
            ${data.restFromDate && data.restToDate ? 
              `${format(new Date(data.restFromDate), 'MMM dd, yyyy')} to ${format(new Date(data.restToDate), 'MMM dd, yyyy')}` : 
              `${currentDate} to ${format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMM dd, yyyy')}`
            }
          </div>

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
            This certificate is issued upon the request of <span class="underline">${data.patientName}</span> for whatever legal purpose it may serve.
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="left-note">Not for Legal Purposes</div>
            <div class="doctor-signature">
              <div class="signature-line"></div>
              <div class="doctor-title">${data.doctorName || 'Doctor Name'}, M.D.</div>
              <div class="doctor-credentials">
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
