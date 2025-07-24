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
    <div style="font-family: 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 0; background: white; border: 3px solid #1e40af; position: relative;">
      <!-- Medical Symbol Header -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center; position: relative;">
        <div style="position: absolute; left: 30px; top: 50%; transform: translateY(-50%); font-size: 40px;">⚕️</div>
        <div style="position: absolute; right: 30px; top: 50%; transform: translateY(-50%); font-size: 40px;">⚕️</div>
        <h1 style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">${data.hospitalName}</h1>
        <div style="width: 100px; height: 2px; background: white; margin: 10px auto;"></div>
        <p style="margin: 8px 0; font-size: 14px; opacity: 0.9;">${data.hospitalAddress}</p>
        <p style="margin: 5px 0; font-size: 13px; opacity: 0.9;">${data.hospitalContact}</p>
        ${data.hospitalLicense ? `<p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">License No: ${data.hospitalLicense}</p>` : ''}
      </div>

      <!-- Certificate Title -->
      <div style="text-align: center; padding: 30px 0 20px 0; background: #f8fafc;">
        <h2 style="margin: 0; color: #1e40af; font-size: 36px; font-weight: bold; letter-spacing: 3px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">MEDICAL CERTIFICATE</h2>
        <div style="width: 200px; height: 3px; background: linear-gradient(to right, #1e40af, #3b82f6, #1e40af); margin: 15px auto;"></div>
        <p style="margin: 10px 0; font-size: 14px; color: #64748b; font-style: italic;">
          ${data.certificateType ? getCertificateTypeLabel(data.certificateType) : 'Official Medical Document'}
        </p>
      </div>

      <!-- Certificate Content -->
      <div style="padding: 40px; background: white;">
        <!-- Date and Reference -->
        <div style="margin-bottom: 30px; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
          <div>
            <p style="margin: 0; font-size: 16px; color: #374151;"><strong>Certificate No:</strong> MC-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
          </div>
          <div>
            <p style="margin: 0; font-size: 16px; color: #374151;"><strong>Date Issued:</strong> ${format(new Date(data.dateIssued), 'MMMM dd, yyyy')}</p>
          </div>
        </div>

        <!-- Formal Address -->
        <div style="margin-bottom: 30px;">
          <p style="margin-bottom: 20px; font-size: 18px; font-weight: 600; color: #1f2937;">To Whom It May Concern:</p>
        </div>

        <!-- Patient Information Card -->
        <div style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-left: 5px solid #1e40af; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 20px; font-weight: bold;">PATIENT INFORMATION</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="margin: 8px 0; font-size: 16px; color: #374151;"><strong>Name:</strong> ${data.patientName}</p>
              <p style="margin: 8px 0; font-size: 16px; color: #374151;"><strong>Age:</strong> ${data.patientAge} years</p>
            </div>
            <div>
              <p style="margin: 8px 0; font-size: 16px; color: #374151;"><strong>Date of Examination:</strong> ${format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
          </div>
        </div>

        <!-- Medical Findings -->
        <div style="margin-bottom: 30px;">
          <p style="margin-bottom: 20px; font-size: 18px; line-height: 1.6; color: #374151; text-align: justify;">
            This is to certify that the above-named patient has been under my professional medical care and examination.
          </p>
          
          <div style="margin: 25px 0; padding: 25px; background: #fefefe; border: 2px solid #e2e8f0; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="margin-bottom: 20px; padding: 15px; background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 5px;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #dc2626;">DIAGNOSIS:</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #374151;">${data.diagnosis}</p>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background: #dbeafe; border-left: 4px solid #2563eb; border-radius: 5px;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #2563eb;">MEDICAL RECOMMENDATIONS:</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #374151;">${data.recommendations}</p>
            </div>
          </div>
        </div>

        <!-- Work Status Section -->
        <div style="margin-bottom: 30px; padding: 25px; background: ${
          data.fitForWork === 'unfit' ? '#fef2f2' : 
          data.fitForWork === 'limited' ? '#fffbeb' : '#f0fdf4'
        }; border: 2px solid ${
          data.fitForWork === 'unfit' ? '#fecaca' : 
          data.fitForWork === 'limited' ? '#fed7aa' : '#bbf7d0'
        }; border-radius: 10px;">
          <h3 style="margin: 0 0 15px 0; color: ${
            data.fitForWork === 'unfit' ? '#dc2626' : 
            data.fitForWork === 'limited' ? '#d97706' : '#059669'
          }; font-size: 20px; font-weight: bold;">WORK FITNESS ASSESSMENT</h3>
          
          ${data.fitForWork === 'unfit' ? `
            <div style="padding: 15px; background: #fee2e2; border-radius: 8px; border-left: 4px solid #dc2626;">
              <p style="margin: 0; font-size: 18px; color: #dc2626; font-weight: bold;">⚠️ UNFIT FOR WORK</p>
              <p style="margin: 10px 0; font-size: 16px; color: #374151;">
                The patient is medically advised to rest from work from 
                <strong style="color: #dc2626;">${data.restFromDate ? format(new Date(data.restFromDate), 'MMMM dd, yyyy') : format(new Date(), 'MMMM dd, yyyy')}</strong> 
                to <strong style="color: #dc2626;">${data.restToDate ? format(new Date(data.restToDate), 'MMMM dd, yyyy') : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy')}</strong>.
              </p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280; font-style: italic;">
                Total rest period: ${Math.ceil((new Date(data.restToDate || Date.now() + 7 * 24 * 60 * 60 * 1000).getTime() - new Date(data.restFromDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          ` : data.fitForWork === 'limited' ? `
            <div style="padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #d97706;">
              <p style="margin: 0; font-size: 18px; color: #d97706; font-weight: bold;">⚡ FIT FOR WORK WITH LIMITATIONS</p>
              <p style="margin: 10px 0; font-size: 16px; color: #374151;">
                <strong>Limitations:</strong> ${data.limitations || 'As prescribed by attending physician'}
              </p>
            </div>
          ` : `
            <div style="padding: 15px; background: #dcfce7; border-radius: 8px; border-left: 4px solid #059669;">
              <p style="margin: 0; font-size: 18px; color: #059669; font-weight: bold;">✅ FIT FOR WORK</p>
              <p style="margin: 10px 0; font-size: 16px; color: #374151;">
                The patient is medically cleared to return to work without restrictions.
              </p>
            </div>
          `}
        </div>

        ${data.followUpDate ? `
          <div style="margin-bottom: 30px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="margin: 0; font-size: 16px; color: #374151;">
              <strong style="color: #1e40af;">📅 Follow-up Appointment:</strong> ${format(new Date(data.followUpDate), 'MMMM dd, yyyy')}
            </p>
          </div>
        ` : ''}

        <!-- Legal Notice -->
        <div style="margin-bottom: 40px; padding: 15px; background: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">
            This medical certificate is issued based on my professional medical examination and is valid for the purposes stated above. 
            Any alteration or misuse of this document is strictly prohibited and may constitute a criminal offense.
          </p>
        </div>

        <!-- Doctor Signature Section -->
        <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              This certificate was generated electronically and is valid without physical signature as per digital medical records policy.
            </p>
          </div>
          <div style="text-align: center; width: 350px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 10px; background: #fafafa;">
            <div style="border-bottom: 3px solid #1e40af; margin-bottom: 15px; height: 60px; position: relative;">
              <div style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); background: #1e40af; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                DIGITAL SIGNATURE
              </div>
            </div>
            <p style="margin: 20px 0 8px 0; font-weight: bold; font-size: 18px; color: #1e40af;">${data.doctorName}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Attending Physician</p>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              ${data.doctorLicense ? `<p style="margin: 3px 0; font-size: 12px; color: #6b7280;">License No: ${data.doctorLicense}</p>` : ''}
              ${data.doctorPRC ? `<p style="margin: 3px 0; font-size: 12px; color: #6b7280;">PRC No: ${data.doctorPRC}</p>` : ''}
              ${data.doctorPTR ? `<p style="margin: 3px 0; font-size: 12px; color: #6b7280;">PTR No: ${data.doctorPTR}</p>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #1e40af; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p style="margin: 0; opacity: 0.8;">
          This is an official medical document issued by ${data.hospitalName} • Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}
        </p>
      </div>
    </div>
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
