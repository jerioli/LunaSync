
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import { Toggle } from '@/components/ui/toggle';
import { v4 as uuidv4 } from 'uuid';
import { Clock } from 'lucide-react';

interface TimeSlot {
  id: string;
  time: string;
  selected: boolean;
}

const Schedule = () => {
  const { toast } = useToast();
  const { currentUser } = useClinic();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => {
    // Generate time slots from 9 AM to 5 PM in 30-minute increments
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      const amPm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      
      // Add :00 slot
      slots.push({
        id: uuidv4(),
        time: `${displayHour}:00 ${amPm}`,
        selected: false
      });
      
      // Add :30 slot (except for 5 PM)
      if (hour < 17) {
        slots.push({
          id: uuidv4(),
          time: `${displayHour}:30 ${amPm}`,
          selected: false
        });
      }
    }
    return slots;
  });

  const toggleTimeSlot = (id: string) => {
    setTimeSlots(prev => 
      prev.map(slot => 
        slot.id === id ? { ...slot, selected: !slot.selected } : slot
      )
    );
  };

  const saveAvailability = () => {
    const selectedSlots = timeSlots.filter(slot => slot.selected).map(slot => slot.time);
    
    if (selectedSlots.length === 0) {
      toast({
        title: "No time slots selected",
        description: "Please select at least one time slot for your availability.",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, we'd save this to the database
    // For now, we'll just show a success toast
    toast({
      title: "Availability saved",
      description: `Your availability for ${selectedDate?.toLocaleDateString()} has been saved.`,
    });
    
    console.log('Saved availability for:', selectedDate?.toLocaleDateString());
    console.log('Available time slots:', selectedSlots);
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {timeSlots.map(slot => (
                <Toggle
                  key={slot.id}
                  pressed={slot.selected}
                  onPressedChange={() => toggleTimeSlot(slot.id)}
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {slot.time}
                </Toggle>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllSlots}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllSlots}>
                Clear All
              </Button>
            </div>
            <Button onClick={saveAvailability}>
              Save Availability
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Schedule;
