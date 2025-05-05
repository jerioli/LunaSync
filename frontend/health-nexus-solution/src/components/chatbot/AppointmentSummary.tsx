
import React from 'react';
import { AppointmentForm } from './types';

interface AppointmentSummaryProps {
  appointmentForm: AppointmentForm;
}

export const AppointmentSummary = ({ appointmentForm }: AppointmentSummaryProps) => {
  return (
    <div className="whitespace-pre-line">
      Date: {appointmentForm.date?.toLocaleDateString() || 'Not selected'}
      Time: {appointmentForm.time}
      Type: {appointmentForm.type}
      Name: {appointmentForm.name}
      Email: {appointmentForm.email}
      Phone: {appointmentForm.phone}
      Notes: {appointmentForm.notes || 'None'}
    </div>
  );
};
