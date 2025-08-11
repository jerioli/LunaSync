import { format } from 'date-fns';

export interface MedicalCertificateTemplateData {
  hospitalName: string;
  hospitalAddress: string;
  hospitalContact: string;
  hospitalLicense?: string;
  doctorName: string;
  doctorLicense?: string;
  doctorPRC?: string;
  doctorPTR?: string;
  patientName: string;
  patientAge: string;
  patientAddress?: string;
  patientSex?: string;
  diagnosis: string;
  recommendations: string;
  restFromDate?: string;
  restToDate?: string;
  fitForWork: 'fit' | 'unfit' | 'limited';
  limitations?: string;
  followUpDate?: string;
  dateIssued: string;
  certificateType?: string;
}

export const generateMedicalCertificateHTML = (data: MedicalCertificateTemplateData): string => {
  return `
    <html>
      <head>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
            padding: 0;
          }
          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              font-size: 12pt;
            }
            .certificate-container {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: flex-start;
              justify-content: center;
              padding: 20px;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .certificate-content {
              width: 100%;
              max-width: none;
              background: white !important;
              box-shadow: none !important;
            }
          }
          html, body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background: white;
            font-size: 14px;
          }
          .certificate-container {
            width: 100%;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 40px 20px;
            box-sizing: border-box;
          }
          .certificate-content {
            width: 100%;
            max-width: 800px;
            background: white;
            font-family: 'Arial', sans-serif;
            color: #000;
            line-height: 1.8;
            padding: 60px 50px;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="certificate-content">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">
                ${data.hospitalName || 'Medical Center'}
              </h1>
              <p style="margin: 5px 0; font-size: 14px;">${data.hospitalAddress || ''}</p>
              <p style="margin: 5px 0; font-size: 14px;">${data.hospitalContact || ''}</p>
              <h2 style="margin: 30px 0 0 0; font-size: 18px; font-weight: bold;">
                MEDICAL CERTIFICATE
              </h2>
            </div>

            <!-- Patient Information -->
            <div style="margin-bottom: 30px;">
              <p style="margin: 8px 0; font-size: 14px;"><strong>Name:</strong> ${data.patientName}</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Address:</strong> ${data.patientAddress || 'Not specified'}</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Age:</strong> ${data.patientAge} years old</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Sex:</strong> ${data.patientSex || 'Not specified'}</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Date:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>

            <!-- Certificate Number -->
            <div style="margin-bottom: 30px;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>Certificate No:</strong> MC-${Date.now()}</p>
            </div>

            <!-- To Whom It May Concern -->
            <div style="margin-bottom: 30px;">
              <p style="margin: 0; font-size: 14px; font-weight: bold;">TO WHOM IT MAY CONCERN:</p>
            </div>

            <!-- Main Content -->
            <div style="margin-bottom: 40px; font-size: 14px; line-height: 1.8;">
              ${data.fitForWork === 'fit' ? `
                <p style="margin-bottom: 20px;">
                  This is to certify that <strong>${data.patientName}</strong>, 
                  ${data.patientAge} years old, consulted on ${format(new Date(), 'MMMM dd, yyyy')} is <strong>Fit to Work</strong>.
                </p>
              ` : `
                <p style="margin-bottom: 20px;">
                  This is to certify that <strong>${data.patientName}</strong>, 
                  ${data.patientAge} years old, consulted on ${format(new Date(), 'MMMM dd, yyyy')} with the following clinical impression:
                </p>

                ${data.diagnosis ? `
                  <p style="margin-bottom: 20px; margin-left: 20px;">
                    <strong>${data.diagnosis}</strong>
                  </p>
                ` : ''}

                ${data.recommendations ? `
                  <p style="margin-bottom: 20px;">
                    <strong>Further Recommendation:</strong> ${data.recommendations}
                  </p>
                ` : ''}

                ${data.fitForWork === 'unfit' ? `
                  <p style="margin-bottom: 15px;">
                    The patient is advised to rest from work from 
                    <strong>${data.restFromDate ? format(new Date(data.restFromDate), 'MMMM dd, yyyy') : format(new Date(), 'MMMM dd, yyyy')}</strong> 
                    to <strong>${data.restToDate ? format(new Date(data.restToDate), 'MMMM dd, yyyy') : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy')}</strong>.
                  </p>
                ` : data.fitForWork === 'limited' ? `
                  <p style="margin-bottom: 15px;">
                    The patient is fit for work with limitations: ${data.limitations || 'As prescribed by attending physician'}
                  </p>
                ` : ''}

                ${data.followUpDate ? `
                  <p style="margin-bottom: 15px;">
                    <strong>Follow-up Date:</strong> ${format(new Date(data.followUpDate), 'MMMM dd, yyyy')}
                  </p>
                ` : ''}
              `}

              <p style="margin-top: 30px; margin-bottom: 15px;">
                You may reach the undersigned through:
              </p>
              <p style="margin-bottom: 15px; margin-left: 20px;">
                ${data.hospitalContact || 'Contact information not available'}
              </p>
            </div>

            <!-- Doctor Signature -->
            <div style="margin-top: 60px; text-align: right;">
              <div style="display: inline-block; text-align: center; min-width: 200px;">
                <div style="border-bottom: 1px solid #000; margin-bottom: 10px; height: 50px;"></div>
                <p style="margin: 0; font-size: 14px; font-weight: bold;">${data.doctorName}</p>
                <p style="margin: 5px 0; font-size: 12px;">Attending Physician</p>
                ${data.doctorLicense ? `<p style="margin: 2px 0; font-size: 12px;">License No: ${data.doctorLicense}</p>` : ''}
                ${data.doctorPRC ? `<p style="margin: 2px 0; font-size: 12px;">PRC No: ${data.doctorPRC}</p>` : ''}
                ${data.doctorPTR ? `<p style="margin: 2px 0; font-size: 12px;">PTR No: ${data.doctorPTR}</p>` : ''}
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
