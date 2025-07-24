import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import { Toggle } from '@/components/ui/toggle';
import { Clock } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  selected: boolean;
}

const Schedule = () => {
  const { toast } = useToast();
  const { currentUser } = useClinic();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    if (selectedDate && currentUser?.id) {
      loadAvailability();
    }
  }, [selectedDate, currentUser]);

  const loadAvailability = async () => {
    if (!selectedDate || !currentUser) {
      return;
    }

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
        console.log('No existing time slots found, fetching predefined slots');
      }

      // If no existing slots found, get predefined time slots
      const predefinedSlotsResponse = await axios.get(`${API_BASE_URL}/availability/predefined_slots/active_slots/`);
      const slots = predefinedSlotsResponse.data.map((slot: any) => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_booked: false,
        selected: false
      }));
      
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
      const availabilityData = availabilityResponse.data;
      if (!availabilityData || typeof availabilityData.id !== 'number') {
        throw new Error('Availability creation failed: missing id in response');
      }
      const availability: { id: number } = { id: availabilityData.id };
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">
          Set your availability for appointments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to set your availability</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Time Slots</CardTitle>
            <CardDescription>
              {selectedDate 
                ? `Select your available time slots for ${selectedDate.toLocaleDateString()}`
                : 'Please select a date first'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <p>Loading time slots...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlots.map(slot => (
                  <Toggle
                    key={slot.id}
                    pressed={slot.selected}
                    onPressedChange={() => toggleTimeSlot(slot.id)}
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    disabled={isLoading || slot.is_booked}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(slot.start_time)}
                  </Toggle>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllSlots} disabled={isLoading}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllSlots} disabled={isLoading}>
                Clear All
              </Button>
            </div>
            <Button onClick={saveAvailability} disabled={isLoading}>
              Save Availability
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Schedule;
