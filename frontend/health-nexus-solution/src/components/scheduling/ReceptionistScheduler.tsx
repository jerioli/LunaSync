import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { axiosInstance } from '@/services/api';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization?: string;
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  appointment_id?: number;
  patient_name?: string;
  patient_gender?: string;
}

interface DoctorAvailability {
  doctor_id: number;
  doctor_name: string;
  doctor_specialization?: string;
  date: string;
  is_available: boolean;
  time_slots: TimeSlot[];
}

interface DayData {
  date: Date;
  dateStr: string;
  availability: Record<number, DoctorAvailability>; // key: doctor_id
}

const ReceptionistScheduler: React.FC = () => {
  const { toast } = useToast();
  const { currentUser } = useClinic();
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [allTimeSlots, setAllTimeSlots] = useState<string[]>([]);

  // Format time to 12-hour format
  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  // Get hour from time string (e.g., "08:00:00" -> "08:00 AM")
  const getHourLabel = (time: string): string => {
    try {
      const [hours] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:00 ${ampm}`;
    } catch {
      return time;
    }
  };

  // Group time slots by hour
  const groupSlotsByHour = (): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};
    
    allTimeSlots.forEach(slot => {
      const hourLabel = getHourLabel(slot);
      if (!grouped[hourLabel]) {
        grouped[hourLabel] = [];
      }
      grouped[hourLabel].push(slot);
    });
    
    return grouped;
  };

  // Get gender-based color
  const getGenderColor = (gender?: string): string => {
    if (!gender) return 'bg-gray-100 text-gray-800';
    const lowerGender = gender.toLowerCase();
    if (lowerGender === 'male' || lowerGender === 'm') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (lowerGender === 'female' || lowerGender === 'f') {
      return 'bg-pink-100 text-pink-800 border-pink-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Fetch doctors list
  const fetchDoctors = async () => {
    try {
      console.log('Fetching doctors list...');
      const response = await axiosInstance.get('/doctors/');
      console.log('Doctors response:', response.data);
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch doctors list",
        variant: "destructive"
      });
    }
  };

  // Fetch day availability data
  const fetchDayAvailability = async (date: Date) => {
    setIsLoading(true);
    try {
      const dateStr = date.toISOString().slice(0, 10);
      const availability: Record<number, DoctorAvailability> = {};
      const timeSlotSet = new Set<string>();

      console.log(`Fetching availability for ${dateStr}`);

      // Fetch availability for each doctor on this date
      for (const doctor of doctors) {
        try {
          console.log(`Fetching availability for doctor ${doctor.id} (${doctor.first_name} ${doctor.last_name})`);
          
          const response = await axiosInstance.get(`/availability/`, {
            params: {
              doctor_id: doctor.id.toString(),
              date: dateStr
            }
          });
          
          console.log(`Availability response for doctor ${doctor.id}:`, response.data);

          if (Array.isArray(response.data) && response.data.length > 0) {
            const availabilityData = response.data[0];
            
            availability[doctor.id] = {
              doctor_id: doctor.id,
              doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
              doctor_specialization: doctor.specialization,
              date: dateStr,
              is_available: availabilityData.is_available || false,
              time_slots: availabilityData.time_slots || []
            };
            
            // Collect all unique time slots
            if (availabilityData.time_slots) {
              availabilityData.time_slots.forEach((slot: TimeSlot) => {
                timeSlotSet.add(slot.start_time);
              });
            }
          } else {
            availability[doctor.id] = {
              doctor_id: doctor.id,
              doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
              doctor_specialization: doctor.specialization,
              date: dateStr,
              is_available: false,
              time_slots: []
            };
          }
        } catch (error: any) {
          console.error(`Error fetching availability for doctor ${doctor.id}:`, error);
          availability[doctor.id] = {
            doctor_id: doctor.id,
            doctor_name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
            doctor_specialization: doctor.specialization,
            date: dateStr,
            is_available: false,
            time_slots: []
          };
        }
      }

      // Sort time slots chronologically
      const sortedTimeSlots = Array.from(timeSlotSet).sort();
      setAllTimeSlots(sortedTimeSlots);

      setDayData({
        date,
        dateStr,
        availability
      });

    } catch (error) {
      console.error('Error fetching day availability:', error);
      toast({
        title: "Error",
        description: "Failed to fetch availability data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Initialize component
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Fetch data when date or doctors change
  useEffect(() => {
    if (doctors.length > 0) {
      fetchDayAvailability(selectedDate);
    }
  }, [selectedDate, doctors]);

  if (currentUser?.role !== 'receptionist' && currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only receptionists and admins can access the scheduling view.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto mt-8 space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Doctor Scheduling</h1>
          <p className="text-muted-foreground">View available dates and times for all doctors</p>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
                Previous Day
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={goToNextDay}>
                Next Day
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
              Today
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading schedule...</p>
              </div>
            </div>
          ) : dayData && doctors.length > 0 ? (
            <div className="overflow-x-auto">
              {/* Schedule Grid */}
              <div className="min-w-max">
                {/* Header Row - Doctors */}
                <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `100px repeat(${doctors.length}, minmax(180px, 1fr))` }}>
                  {/* Time column header */}
                  <div className="bg-gray-100 border border-gray-300 p-2 font-semibold text-center text-sm">
                    Time
                  </div>
                  
                  {/* Doctor columns */}
                  {doctors.map((doctor) => (
                    <div key={doctor.id} className="bg-blue-50 border border-blue-200 p-2">
                      <div className="font-semibold text-center text-sm">Dr. {doctor.first_name} {doctor.last_name}</div>
                      {doctor.specialization && (
                        <div className="text-xs text-center text-muted-foreground truncate">{doctor.specialization}</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Time Slots Rows - Grouped by Hour */}
                {allTimeSlots.length > 0 ? (
                  (() => {
                    const groupedSlots = groupSlotsByHour();
                    const hourLabels = Object.keys(groupedSlots);
                    
                    return hourLabels.map((hourLabel) => {
                      const slotsInHour = groupedSlots[hourLabel];
                      
                      return (
                        <div key={hourLabel} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `100px repeat(${doctors.length}, minmax(180px, 1fr))` }}>
                          {/* Hour label - spans the height of all slots in this hour */}
                          <div className="bg-gray-50 border border-gray-300 p-2 font-medium text-center flex items-center justify-center text-sm">
                            {hourLabel}
                          </div>
                          
                          {/* Doctor columns with sub-slots */}
                          {doctors.map((doctor) => {
                            const doctorAvailability = dayData.availability[doctor.id];
                            
                            return (
                              <div key={`${doctor.id}-${hourLabel}`} className="border border-gray-300 p-1 min-h-[80px]">
                                <div className="flex flex-col gap-1">
                                  {slotsInHour.map((timeSlot) => {
                                    const slot = doctorAvailability?.time_slots?.find(s => s.start_time === timeSlot);
                                    
                                    return (
                                      <div key={`${doctor.id}-${timeSlot}`} className="min-h-[35px] flex items-center justify-center">
                                        {slot ? (
                                          slot.is_booked ? (
                                            // Booked - show patient name with gender color
                                            <div className={cn(
                                              "w-full h-full flex items-center justify-center rounded px-1 py-1 border text-xs",
                                              getGenderColor(slot.patient_gender)
                                            )}>
                                              <div className="text-center truncate">
                                                <div className="font-medium">
                                                  {slot.patient_name || 'Patient'}
                                                </div>
                                                <div className="text-[10px] opacity-75">
                                                  {formatTime(slot.start_time)}
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            // Available - show time
                                            <div className="text-center text-xs text-muted-foreground">
                                              <div className="text-[11px]">{formatTime(slot.start_time)}</div>
                                            </div>
                                          )
                                        ) : (
                                          // No slot / Not available
                                          <div className="text-center text-xs text-gray-300">
                                            -
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No time slots available for this date</p>
                    <p className="text-sm mt-2">Doctors need to set up their schedules</p>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-2">Legend</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                    <span>Male Patient</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pink-100 border border-pink-200 rounded"></div>
                    <span>Female Patient</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                    <span>Not Available</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No doctors available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceptionistScheduler;