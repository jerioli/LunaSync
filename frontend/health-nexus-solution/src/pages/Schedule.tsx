

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  selected: boolean;
}

interface ScheduleSlot {
  date: string;
  time: string;
  available: boolean;
  is_booked?: boolean;
}

// Function to get dates in range based on recurring pattern
const getDatesInRange = (start: string, end: string, days: string): string[] => {
  const result: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (
      (days === 'Weekdays' && day >= 1 && day <= 5) ||
      (days === 'Weekends' && (day === 0 || day === 6)) ||
      (days === 'Monday' && day === 1) ||
      (days === 'Tuesday' && day === 2) ||
      (days === 'Wednesday' && day === 3) ||
      (days === 'Thursday' && day === 4) ||
      (days === 'Friday' && day === 5) ||
      (days === 'Saturday' && day === 6) ||
      (days === 'Sunday' && day === 0)
    ) {
      result.push(d.toISOString().slice(0, 10));
    }
  }
  return result;
};

const Schedule: React.FC = () => {
  const { toast } = useToast();
  const { currentUser } = useClinic();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Schedule generation states
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [recurringDays, setRecurringDays] = useState<string>('Weekdays');

  const generateScheduleSlots = (date: string, start: string, end: string): ScheduleSlot[] => {
    const slots: ScheduleSlot[] = [];
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
      // Skip lunch break (12:00 PM to 1:00 PM)
      if (currentHour === 12) {
        currentHour = 13;
        currentMinute = 0;
        continue;
      }
      
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const formattedTime = formatTime(timeStr);
      
      slots.push({
        date,
        time: formattedTime,
        available: true
      });
      
      // Add 20 minutes for next slot
      currentMinute += 20;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = currentMinute - 60;
      }
    }
    
    return slots;
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes.padStart(2, '0')} ${ampm}`;
  };

  const convertDisplayTimeTo24Hour = (displayTime: string): string => {
    const [time, ampm] = displayTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    
    if (ampm === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (ampm === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleGenerateSlots = () => {
    if (!startDate || !endDate || !startTime || !endTime) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all date and time fields.'
      });
      return;
    }

    const dates = getDatesInRange(startDate, endDate, recurringDays);
    const generatedSlots = dates.flatMap(date => 
      generateScheduleSlots(date, startTime, endTime)
    );

    setScheduleSlots(generatedSlots);
    
    toast({
      title: 'Schedule Generated',
      description: `Created ${generatedSlots.length} time slots with 20-minute buffers`
    });
  };

  const loadAvailability = async () => {
    if (!selectedDate || !currentUser) return;

    try {
      setIsLoading(true);
      
      // Get doctor's ID from database
      const doctorsResponse = await axios.get(`${API_BASE_URL}/doctors/`);
      const doctors: any[] = doctorsResponse.data;
      const doctor = doctors.find(d => d.email === currentUser.email);
      
      if (!doctor) {
        console.log('Available doctors:', doctors);
        console.log('Current user email:', currentUser.email);
        throw new Error('Doctor not found in database');
      }

      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // First try to get existing time slots
      try {
        const timeSlotsResponse = await axios.get(`${API_BASE_URL}/time-slots/`, {
          params: {
            doctor_id: doctor.id,
            date: dateString
          }
        });
        console.log('Fetched existing time slots:', timeSlotsResponse.data);
        
        if (timeSlotsResponse.data && timeSlotsResponse.data.length > 0) {
          const slots = timeSlotsResponse.data.map((slot: any) => ({
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_booked: slot.is_booked,
            selected: false
          }));
          setTimeSlots(slots);
          return;
        }
      } catch (error) {
        console.log('No existing time slots found, generating dynamic slots from clinic hours');
      }

      // Generate time slots dynamically (fallback)
      const generatedTimeSlots = generateDefaultTimeSlots();
      
      if (generatedTimeSlots.length === 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[selectedDate.getDay()];
        
        toast({
          title: "Clinic Closed",
          description: `The clinic is closed on ${dayName}s. Please select a different date.`,
          variant: "destructive"
        });
        setTimeSlots([]);
        return;
      }
      
      // Convert generated time slots to the format expected by the component
      const slots = generatedTimeSlots.map((timeSlot, index) => {
        // Convert display time back to 24-hour format for start_time
        const startTime24 = convertDisplayTimeTo24Hour(timeSlot);
        
        // Calculate end time (20 minutes later)
        const [hours, minutes] = startTime24.split(':').map(Number);
        const endTimeMinutes = hours * 60 + minutes + 20;
        const endHours = Math.floor(endTimeMinutes / 60);
        const endMins = endTimeMinutes % 60;
        const endTime24 = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        
        return {
          id: index + 1000, // Use a high number to avoid conflicts with existing IDs
          start_time: startTime24,
          end_time: endTime24,
          is_booked: false,
          selected: false
        };
      });
      
      setTimeSlots(slots);
    } catch (error: any) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.message || "Failed to load availability",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaultTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 9; hour < 17; hour++) {
      if (hour === 12) continue; // Skip lunch hour
      for (let minute = 0; minute < 60; minute += 20) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(formatTime(timeStr));
      }
    }
    return slots;
  };

  const toggleTimeSlot = async (id: number) => {
    if (!selectedDate || !currentUser) return;

    try {
      setTimeSlots(prev => prev.map(slot => 
        slot.id === id ? { ...slot, selected: !slot.selected } : slot
      ));
    } catch (error: any) {
      console.error('Error updating time slot:', error);
      toast({
        title: "Error",
        description: "Failed to update time slot",
        variant: "destructive"
      });
    }
  };

  const savePattern = async () => {
    if (!startDate || !endDate || !startTime || !endTime || !currentUser) {
      toast({
        title: "Missing fields",
        description: "Please fill in all date and time fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get doctor's ID
      const doctorsResponse = await axios.get(`${API_BASE_URL}/doctors/`);
      const doctors = doctorsResponse.data;
      const doctor = doctors.find(d => d.email === currentUser.email);
      
      if (!doctor) {
        throw new Error('Doctor not found in database');
      }

      // Generate dates based on recurring pattern
      const dates = getDatesInRange(startDate, endDate, recurringDays);
      
      if (dates.length === 0) {
        toast({
          title: "No dates selected",
          description: "The selected date range and recurring pattern resulted in no valid dates.",
          variant: "destructive"
        });
        return;
      }

      // Create availability and time slots for each date
      let successCount = 0;
      for (const date of dates) {
        try {
          // Create availability for this date
          const availabilityData = {
            doctor_id: Number(doctor.id),
            date: date,
            is_available: true,
            max_appointments: 8
          };

          const availabilityResponse = await axios.post(`${API_BASE_URL}/availability/`, availabilityData);
          const createdAvailability = availabilityResponse.data;
          
          if (!createdAvailability || typeof createdAvailability.id !== 'number') {
            console.warn(`Failed to create availability for ${date}`);
            continue;
          }

          // Generate time slots for this date
          const daySlots = generateScheduleSlots(date, startTime, endTime);
          
          // Create time slots
          for (const slot of daySlots) {
            const startTime24 = convertDisplayTimeTo24Hour(slot.time);
            
            // Calculate end time (20 minutes later)
            const [hours, minutes] = startTime24.split(':').map(Number);
            const endTimeMinutes = hours * 60 + minutes + 20;
            const endHours = Math.floor(endTimeMinutes / 60);
            const endMins = endTimeMinutes % 60;
            const endTime24 = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

            const timeSlotData = {
              start_time: startTime24,
              end_time: endTime24,
              is_booked: false
            };

            await axios.post(`${API_BASE_URL}/availability/${createdAvailability.id}/create_time_slot/`, timeSlotData);
          }
          
          successCount++;
        } catch (dateError) {
          console.warn(`Failed to create availability for ${date}:`, dateError);
        }
      }

      // Refresh the current day's availability
      await loadAvailability();

      toast({
        title: "Pattern Saved",
        description: `Successfully created availability for ${successCount} out of ${dates.length} dates (${recurringDays}, ${startTime}-${endTime})`,
      });

    } catch (error: any) {
      console.error('Error saving pattern:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.message || "Failed to save pattern",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAvailability = async () => {
    if (!selectedDate || !currentUser) return;

    const selectedSlots = timeSlots.filter(slot => slot.selected);
    
    if (selectedSlots.length === 0) {
      toast({
        title: "No time slots selected",
        description: "Please select at least one time slot for your availability",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);

      // Get doctor's ID
      const doctorsResponse = await axios.get(`${API_BASE_URL}/doctors/`);
      const doctors = doctorsResponse.data;
      const doctor = doctors.find(d => d.email === currentUser.email);
      
      if (!doctor) {
        throw new Error('Doctor not found in database');
      }

      // Format date correctly without timezone conversion
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      console.log('Date handling:', {
        original: selectedDate,
        formatted: formattedDate,
        year,
        month,
        day
      });

      // Create availability
      const availabilityData = {
        doctor_id: Number(doctor.id),
        date: formattedDate,
        is_available: true,
        max_appointments: 8
      };

      console.log('Creating availability with data:', availabilityData);
      const availabilityResponse = await axios.post(`${API_BASE_URL}/availability/`, availabilityData);
      const createdAvailability = availabilityResponse.data;
      if (!createdAvailability || typeof createdAvailability.id !== 'number') {
        throw new Error('Availability creation failed: missing id in response');
      }
      const availability: { id: number } = { id: createdAvailability.id };
      console.log('Created availability:', availability);

      // Create time slots
      for (const slot of selectedSlots) {
        // Format time strings to HH:MM:SS format
        const startTime = slot.start_time.includes(':') ? slot.start_time : `${slot.start_time}:00`;
        const endTime = slot.end_time.includes(':') ? slot.end_time : `${slot.end_time}:00`;

        const timeSlotData = {
          start_time: startTime,
          end_time: endTime,
          is_booked: false
        };
        console.log('Creating time slot with data:', timeSlotData);
        const timeSlotResponse = await axios.post(`${API_BASE_URL}/availability/${availability.id}/create_time_slot/`, timeSlotData);
        console.log('Created time slot:', timeSlotResponse.data);
      }

      // Refresh the time slots
      await loadAvailability();

      toast({
        title: "Success",
        description: `Your availability for ${selectedDate.toLocaleDateString()} has been saved`,
      });
    } catch (error: any) {
      console.error('Error saving availability:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.message || "Failed to save availability",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectAllSlots = () => {
    setTimeSlots(prev => prev.map(slot => ({ ...slot, selected: true })));
  };

  const clearAllSlots = () => {
    setTimeSlots(prev => prev.map(slot => ({ ...slot, selected: false })));
  };

  // Load availability when selected date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailability();
    }
  }, [selectedDate]);

  if (currentUser?.role !== 'doctor') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only doctors can access the schedule management page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">My Schedule</h1>
        <p className="text-muted-foreground mb-6">
          Set your availability, recurring patterns, and manage slots. Desktop shows calendar grid, mobile shows list view.
        </p>
      </div>

      {/* Schedule Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Schedule</CardTitle>
          <CardDescription>Create recurring availability patterns</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col gap-4">
            <div className="flex gap-6 items-center">
              <Label className="w-24">Date Range:</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="mx-2">to</span>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>

            <div className="flex gap-4 items-center">
              <Label className="w-24">Recurring Days:</Label>
              <Select value={recurringDays} onValueChange={setRecurringDays}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekdays">Weekdays</SelectItem>
                  <SelectItem value="Weekends">Weekends</SelectItem>
                  <SelectItem value="Monday">Monday</SelectItem>
                  <SelectItem value="Tuesday">Tuesday</SelectItem>
                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                  <SelectItem value="Thursday">Thursday</SelectItem>
                  <SelectItem value="Friday">Friday</SelectItem>
                  <SelectItem value="Saturday">Saturday</SelectItem>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 items-center">
              <Label className="w-24">Start Time:</Label>
              <Input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-auto"
              />
              
              <Label className="ml-4">End Time:</Label>
              <Input 
                type="time"
                value={endTime}
                min={startTime}
                onChange={e => {
                  if (startTime && e.target.value < startTime) {
                    toast({
                      title: 'Invalid time range',
                      description: 'End time must be after start time.'
                    });
                    return;
                  }
                  setEndTime(e.target.value);
                }}
                className="w-auto"
              />
              
              <Button 
                onClick={handleGenerateSlots}
                className="ml-4"
              >
                Auto-fill Slots
              </Button>
              
              <Button 
                variant="secondary"
                onClick={savePattern}
                disabled={isLoading}
              >
                Save Pattern
              </Button>
            </div>

            {scheduleSlots.length > 0 && (
              <div className="mt-6">
                <h2 className="font-semibold mb-4">Generated Schedule</h2>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduleSlots.map((slot, index) => (
                        <TableRow 
                          key={`${slot.date}-${slot.time}`}
                          className={slot.available ? 'bg-green-50' : 'bg-gray-100'}
                        >
                          <TableCell>{slot.date}</TableCell>
                          <TableCell>{slot.time}</TableCell>
                          <TableCell>
                            <span className={slot.available ? 'text-green-600 font-medium' : 'text-gray-500'}>
                              {slot.available ? 'Available' : 'Unavailable'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newSlots = [...scheduleSlots];
                                newSlots[index].available = !newSlots[index].available;
                                setScheduleSlots(newSlots);
                              }}
                            >
                              Toggle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default Schedule;
