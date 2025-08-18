import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { useState } from 'react';

interface Appointment {
  id: string;
  patient: string;
  date: string;
  time: string;
  status: string;
  appointment_type?: string;
  patient_name?: string;
  display_patient_name?: string;
  doctorName?: string;
  display_doctor_name?: string;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onDateClick?: (date: Date) => void;
  patientDetails?: Record<string, any>;
  patients?: any[];
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  onAppointmentClick,
  onDateClick,
  patientDetails = {},
  patients = []
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get the first day of the current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get the first day of the week for the calendar grid
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // Get the last day of the week for the calendar grid
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  // Generate all days to display
  const days = [];
  const currentDay = new Date(startDate);
  while (currentDay <= endDate) {
    days.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateStr);
  };

  // Get status color based on appointment status
  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-blue-500 hover:bg-blue-600',
      'pending': 'bg-yellow-500 hover:bg-yellow-600',
      'ongoing': 'bg-orange-500 hover:bg-orange-600',
      'completed': 'bg-green-500 hover:bg-green-600',
      'cancelled': 'bg-red-500 hover:bg-red-600',
      'no-show': 'bg-gray-500 hover:bg-gray-600',
      'upcoming': 'bg-blue-500 hover:bg-blue-600',
      'follow-up': 'bg-purple-500 hover:bg-purple-600'
    };
    return colors[status] || 'bg-gray-400 hover:bg-gray-500';
  };

  // Get patient name
  const getPatientName = (appointment: Appointment) => {
    const patientId = appointment.patient;
    
    // Check for direct patient name in appointment
    if (appointment.patient_name) return appointment.patient_name;
    if (appointment.display_patient_name) return appointment.display_patient_name;
    
    // Check in patients array
    const patient = patients.find(p => String(p.id) === String(patientId));
    if (patient?.name) return patient.name;
    
    // Check in patientDetails
    if (patientDetails[patientId]?.name) return patientDetails[patientId].name;
    
    return 'Unknown Patient';
  };

  // Format time to 12-hour format
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-2xl font-bold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === today.toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[140px] p-2 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => onDateClick?.(day)}
              >
                <div className={`text-sm font-semibold mb-2 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isToday ? 'text-blue-600 text-base' : ''}`}>
                  {day.getDate()}
                </div>
                
                {/* Appointments for this day */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <div
                      key={appointment.id}
                      className={`text-xs p-2 rounded-md text-white cursor-pointer transition-all duration-200 transform hover:scale-105 ${getStatusColor(appointment.status)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick?.(appointment);
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">{formatTime(appointment.time)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">{getPatientName(appointment)}</span>
                      </div>
                      <div className="text-[10px] opacity-90 mt-1">
                        {appointment.appointment_type || 'Consultation'}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show "more" indicator if there are additional appointments */}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1 bg-gray-100 rounded-md">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-xs text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-xs text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-xs text-gray-600">Ongoing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-xs text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-xs text-gray-600">Follow-up</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentCalendar;
