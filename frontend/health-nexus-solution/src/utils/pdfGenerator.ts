import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface DocumentHeaderInfo {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail?: string;
  clinicLogo?: string;
  doctorName: string;
  doctorLicense?: string;
  doctorPRC?: string;
  doctorPTR?: string;
}

export interface PatientInfo {
  name: string;
  age: string;
  address: string;
  gender: string;
  dateOfBirth?: string;
  contactNumber?: string;
}

export interface MedicalCertificateData {
  headerInfo: DocumentHeaderInfo;
  patientInfo: PatientInfo;
  certificateType: 'fitness' | 'sports_clearance' | 'sick_leave' | 'general';
  chiefComplaint: string;
  diagnosis: string;
  medicalRecommendations: string;
  fitForWork: 'fit' | 'unfit' | 'limited' | 'fit_physical_activities';
  limitations?: string;
  restFromDate?: string;
  restToDate?: string;
  followUpDate?: string;
  dateIssued: string;
}

export interface LabResultData {
  headerInfo: DocumentHeaderInfo;
  patientInfo: PatientInfo;
  testName: string;
  testDate: string;
  results: Array<{
    parameter: string;
    result: string;
    normalRange: string;
    unit: string;
    status: 'Normal' | 'High' | 'Low' | 'Critical';
  }>;
  interpretation: string;
  recommendations: string;
}

export interface PrescriptionData {
  headerInfo: DocumentHeaderInfo;
  patientInfo: PatientInfo;
  prescriptionNumber: string;
  medications: Array<{
    name: string;
    dose: string;
    quantity: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  generalInstructions: string;
  validUntil: string;
  dateIssued: string;
}

export interface SOAPNoteData {
  headerInfo: DocumentHeaderInfo;
  patientInfo: PatientInfo;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  dateCreated: string;
}

class PDFGenerator {
  private addHeader(doc: jsPDF, headerInfo: DocumentHeaderInfo, yPos = 20): number {
    const pageWidth = doc.internal.pageSize.width;
    
    // Add clinic logo if available
    let currentY = yPos;
    
    // Clinic name (centered, large font)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(headerInfo.clinicName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    // Clinic address (centered)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(headerInfo.clinicAddress, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    
    // Contact info (centered)
    const contactLine = `Phone: ${headerInfo.clinicPhone}${headerInfo.clinicEmail ? ` | Email: ${headerInfo.clinicEmail}` : ''}`;
    doc.text(contactLine, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // Horizontal line
    doc.setLineWidth(0.5);
    doc.line(20, currentY, pageWidth - 20, currentY);
    currentY += 10;
    
    return currentY;
  }

  private addPatientInfo(doc: jsPDF, patientInfo: PatientInfo, yPos: number): number {
    let currentY = yPos;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information:', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const patientDetails = [
      `Name: ${patientInfo.name}`,
      `Age: ${patientInfo.age} years`,
      `Gender: ${patientInfo.gender}`,
      `Address: ${patientInfo.address}`,
    ];
    
    if (patientInfo.contactNumber) {
      patientDetails.push(`Contact: ${patientInfo.contactNumber}`);
    }
    
    patientDetails.forEach(detail => {
      doc.text(detail, 25, currentY);
      currentY += 5;
    });
    
    currentY += 5;
    return currentY;
  }

  private addFooter(doc: jsPDF, headerInfo: DocumentHeaderInfo): void {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    let footerY = pageHeight - 30;
    
    // Doctor signature section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Signature line
    doc.line(pageWidth - 150, footerY, pageWidth - 50, footerY);
    footerY += 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text(headerInfo.doctorName, pageWidth - 100, footerY, { align: 'center' });
    footerY += 4;
    
    doc.setFont('helvetica', 'normal');
    if (headerInfo.doctorLicense) {
      doc.text(`License No: ${headerInfo.doctorLicense}`, pageWidth - 100, footerY, { align: 'center' });
      footerY += 4;
    }
    if (headerInfo.doctorPRC) {
      doc.text(`PRC No: ${headerInfo.doctorPRC}`, pageWidth - 100, footerY, { align: 'center' });
      footerY += 4;
    }
    if (headerInfo.doctorPTR) {
      doc.text(`PTR No: ${headerInfo.doctorPTR}`, pageWidth - 100, footerY, { align: 'center' });
    }
  }

  generateMedicalCertificate(data: MedicalCertificateData): jsPDF {
    const doc = new jsPDF();
    let currentY = this.addHeader(doc, data.headerInfo);
    
    // Certificate title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const certificateTitle = this.getCertificateTitle(data.certificateType);
    doc.text(certificateTitle, doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // Patient info
    currentY = this.addPatientInfo(doc, data.patientInfo, currentY);
    
    // Certificate content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Medical Examination:', 20, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (data.chiefComplaint) {
      doc.text('Chief Complaint:', 25, currentY);
      currentY += 5;
      const complaintLines = doc.splitTextToSize(data.chiefComplaint, 160);
      doc.text(complaintLines, 25, currentY);
      currentY += complaintLines.length * 5 + 5;
    }
    
    if (data.diagnosis) {
      doc.text('Diagnosis:', 25, currentY);
      currentY += 5;
      const diagnosisLines = doc.splitTextToSize(data.diagnosis, 160);
      doc.text(diagnosisLines, 25, currentY);
      currentY += diagnosisLines.length * 5 + 5;
    }
    
    if (data.medicalRecommendations) {
      doc.text('Medical Recommendations:', 25, currentY);
      currentY += 5;
      const recommendationLines = doc.splitTextToSize(data.medicalRecommendations, 160);
      doc.text(recommendationLines, 25, currentY);
      currentY += recommendationLines.length * 5 + 10;
    }
    
    // Fitness assessment
    doc.setFont('helvetica', 'bold');
    doc.text('Medical Opinion:', 20, currentY);
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    const fitnessText = this.getFitnessText(data.fitForWork);
    doc.text(fitnessText, 25, currentY);
    currentY += 5;
    
    if (data.limitations) {
      doc.text(`Limitations/Restrictions: ${data.limitations}`, 25, currentY);
      currentY += 5;
    }
    
    if (data.restFromDate && data.restToDate) {
      doc.text(`Rest Period: ${data.restFromDate} to ${data.restToDate}`, 25, currentY);
      currentY += 5;
    }
    
    // Date issued
    currentY += 10;
    doc.text(`Date Issued: ${new Date(data.dateIssued).toLocaleDateString()}`, 20, currentY);
    
    this.addFooter(doc, data.headerInfo);
    
    return doc;
  }

  generateLabResult(data: LabResultData): jsPDF {
    const doc = new jsPDF();
    let currentY = this.addHeader(doc, data.headerInfo);
    
    // Lab result title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LABORATORY RESULT', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // Patient info
    currentY = this.addPatientInfo(doc, data.patientInfo, currentY);
    
    // Test information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Test: ${data.testName}`, 20, currentY);
    currentY += 6;
    doc.text(`Test Date: ${new Date(data.testDate).toLocaleDateString()}`, 20, currentY);
    currentY += 12;
    
    // Results table
    doc.setFont('helvetica', 'bold');
    doc.text('Results:', 20, currentY);
    currentY += 8;
    
    // Table headers
    const tableHeaders = ['Parameter', 'Result', 'Normal Range', 'Unit', 'Status'];
    const colWidths = [50, 30, 40, 25, 25];
    let xPos = 20;
    
    doc.setFontSize(9);
    tableHeaders.forEach((header, index) => {
      doc.text(header, xPos, currentY);
      xPos += colWidths[index];
    });
    currentY += 5;
    
    // Table line
    doc.line(20, currentY, 190, currentY);
    currentY += 5;
    
    // Table data
    doc.setFont('helvetica', 'normal');
    data.results.forEach(result => {
      xPos = 20;
      const rowData = [result.parameter, result.result, result.normalRange, result.unit, result.status];
      rowData.forEach((cell, index) => {
        if (index === 4) { // Status column
          doc.setFont('helvetica', 'bold');
          if (result.status === 'High' || result.status === 'Critical') {
            doc.setTextColor(255, 0, 0); // Red
          } else if (result.status === 'Low') {
            doc.setTextColor(255, 165, 0); // Orange
          } else {
            doc.setTextColor(0, 128, 0); // Green
          }
        }
        doc.text(cell, xPos, currentY);
        if (index === 4) {
          doc.setTextColor(0, 0, 0); // Reset to black
          doc.setFont('helvetica', 'normal');
        }
        xPos += colWidths[index];
      });
      currentY += 5;
    });
    
    currentY += 10;
    
    // Interpretation
    if (data.interpretation) {
      doc.setFont('helvetica', 'bold');
      doc.text('Interpretation:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const interpretationLines = doc.splitTextToSize(data.interpretation, 160);
      doc.text(interpretationLines, 20, currentY);
      currentY += interpretationLines.length * 5 + 5;
    }
    
    // Recommendations
    if (data.recommendations) {
      doc.setFont('helvetica', 'bold');
      doc.text('Recommendations:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const recommendationLines = doc.splitTextToSize(data.recommendations, 160);
      doc.text(recommendationLines, 20, currentY);
    }
    
    this.addFooter(doc, data.headerInfo);
    
    return doc;
  }

  generatePrescription(data: PrescriptionData): jsPDF {
    const doc = new jsPDF();
    let currentY = this.addHeader(doc, data.headerInfo);
    
    // Prescription title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESCRIPTION', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // Prescription number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prescription No: ${data.prescriptionNumber}`, 20, currentY);
    doc.text(`Date: ${new Date(data.dateIssued).toLocaleDateString()}`, 150, currentY);
    currentY += 10;
    
    // Patient info
    currentY = this.addPatientInfo(doc, data.patientInfo, currentY);
    
    // Medications
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Medications:', 20, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    data.medications.forEach((medication, index) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${medication.name}`, 25, currentY);
      currentY += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.text(`    Dose: ${medication.dose}`, 25, currentY);
      currentY += 4;
      doc.text(`    Quantity: ${medication.quantity}`, 25, currentY);
      currentY += 4;
      doc.text(`    Frequency: ${medication.frequency}`, 25, currentY);
      currentY += 4;
      if (medication.duration) {
        doc.text(`    Duration: ${medication.duration}`, 25, currentY);
        currentY += 4;
      }
      if (medication.instructions) {
        doc.text(`    Instructions: ${medication.instructions}`, 25, currentY);
        currentY += 4;
      }
      currentY += 5;
    });
    
    // General instructions
    if (data.generalInstructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('General Instructions:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const instructionLines = doc.splitTextToSize(data.generalInstructions, 160);
      doc.text(instructionLines, 20, currentY);
      currentY += instructionLines.length * 5 + 5;
    }
    
    // Valid until
    doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, 20, currentY);
    
    this.addFooter(doc, data.headerInfo);
    
    return doc;
  }

  generateSOAPNote(data: SOAPNoteData): jsPDF {
    const doc = new jsPDF();
    let currentY = this.addHeader(doc, data.headerInfo);
    
    // SOAP Note title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SOAP NOTE', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(data.dateCreated).toLocaleDateString()}`, 20, currentY);
    currentY += 10;
    
    // Patient info
    currentY = this.addPatientInfo(doc, data.patientInfo, currentY);
    
    // SOAP sections
    const soapSections = [
      { title: 'SUBJECTIVE', content: data.subjective },
      { title: 'OBJECTIVE', content: data.objective },
      { title: 'ASSESSMENT', content: data.assessment },
      { title: 'PLAN', content: data.plan },
    ];
    
    soapSections.forEach(section => {
      if (section.content) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${section.title}:`, 20, currentY);
        currentY += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(section.content, 160);
        doc.text(contentLines, 25, currentY);
        currentY += contentLines.length * 5 + 10;
      }
    });
    
    this.addFooter(doc, data.headerInfo);
    
    return doc;
  }

  private getCertificateTitle(type: string): string {
    switch (type) {
      case 'fitness':
        return 'FITNESS FOR WORK CERTIFICATE';
      case 'sports_clearance':
        return 'SPORTS CLEARANCE CERTIFICATE';
      case 'sick_leave':
        return 'SICK LEAVE CERTIFICATE';
      default:
        return 'MEDICAL CERTIFICATE';
    }
  }

  private getFitnessText(fitForWork: string): string {
    switch (fitForWork) {
      case 'fit':
        return 'The above-named patient is FIT FOR WORK without restrictions.';
      case 'unfit':
        return 'The above-named patient is UNFIT FOR WORK.';
      case 'limited':
        return 'The above-named patient is FIT FOR WORK with limitations.';
      case 'fit_physical_activities':
        return 'The above-named patient is FIT FOR PHYSICAL ACTIVITIES.';
      default:
        return 'The above-named patient is FIT FOR WORK.';
    }
  }

  // Utility methods for downloading and viewing PDFs
  downloadPDF(doc: jsPDF, filename: string): void {
    doc.save(filename);
  }

  viewPDF(doc: jsPDF): void {
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
  }

  getPDFBlob(doc: jsPDF): Blob {
    return doc.output('blob');
  }
}

export const pdfGenerator = new PDFGenerator();