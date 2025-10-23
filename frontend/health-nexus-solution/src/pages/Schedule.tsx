
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ENV } from '@/config/env';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Clock, Eye, EyeOff, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const API_BASE_URL = ENV.API_URL;



interface ScheduleSlot {
  date: string;
  time: string;
  available: boolean;
  is_booked?: boolean;
}

interface ExistingAvailability {
  id: number;
  date: string;
  doctor_id: number;
  is_available: boolean;
  max_appointments: number;
  time_slots: {
    id: number;
    start_time: string;
    end_time: string;
    is_booked: boolean;
  }[];
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
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
  
  // Schedule generation states
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [recurringDays, setRecurringDays] = useState<string>('Weekdays');

  // Existing availability management with pagination
  const [existingAvailability, setExistingAvailability] = useState<ExistingAvailability[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
    totalItems: 0
  });
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [showExistingAvailability, setShowExistingAvailability] = useState(false);

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
    console.log('=== AUTO-FILL SLOTS DEBUG ===');
    console.log('Function called - handleGenerateSlots');
    console.log('Form values:', { startDate, endDate, startTime, endTime, recurringDays });
    
    if (!startDate || !endDate || !startTime || !endTime) {
      console.log('❌ Missing required fields');
      toast({
        title: 'Missing fields',
        description: 'Please fill in all date and time fields.'
      });
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      console.log('❌ End date is before start date');
      toast({
        title: 'Invalid date range',
        description: 'End date must be after or equal to start date.',
        variant: 'destructive'
      });
      return;
    }

    console.log('✅ All fields present and valid, generating dates...');
    const dates = getDatesInRange(startDate, endDate, recurringDays);
    console.log('Generated dates:', dates);
    
    console.log('Generating time slots for each date...');
    const generatedSlots = dates.flatMap(date => 
      generateScheduleSlots(date, startTime, endTime)
    );
    console.log('Generated slots:', generatedSlots);

    console.log('Setting schedule slots in state...');
    setScheduleSlots(generatedSlots);
    
    console.log('✅ Auto-fill complete, showing toast');
    toast({
      title: 'Schedule Generated',
      description: `Created ${generatedSlots.length} time slots with 20-minute buffers`
    });
    console.log('=== AUTO-FILL SLOTS DEBUG END ===');
  };

  // Load existing availability with pagination
  const loadExistingAvailability = async (page: number = 1) => {
    if (!currentUser) return;

    try {
      setIsLoadingExisting(true);
      
      // Get doctor's ID from database
      const doctorsResponse = await axios.get(`${API_BASE_URL}/doctors/`);
      const doctors: any[] = doctorsResponse.data;
      
      // Try multiple ways to find the doctor - ID first (most reliable), then username, then email
      let doctor = doctors.find(d => d.id === currentUser.id);
      
      if (!doctor && currentUser.username) {
        doctor = doctors.find(d => d.username === currentUser.username);
      }
      
      if (!doctor && currentUser.email) {
        doctor = doctors.find(d => d.email && d.email === currentUser.email);
      }
      
      if (!doctor) {
        console.error('Doctor lookup failed:', {
          currentUser: currentUser,
          doctorsFound: doctors.length,
          searchCriteria: {
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email
          }
        });
        throw new Error('Doctor not found in database');
      }

      // Fetch paginated availability
      const response = await axios.get(`${API_BASE_URL}/availability/`, {
        params: {
          doctor_id: doctor.id,
          page: page,
          page_size: pagination.itemsPerPage,
          ordering: '-date' // Show newest first
        }
      });

      const data = response.data;
      
      // Handle both paginated and non-paginated responses
      if (data.results) {
        // Paginated response
        setExistingAvailability(data.results);
        setPagination(prev => ({
          ...prev,
          currentPage: page,
          totalPages: Math.ceil(data.count / prev.itemsPerPage),
          totalItems: data.count
        }));
      } else {
        // Non-paginated response - implement client-side pagination
        const startIndex = (page - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        const paginatedData = data.slice(startIndex, endIndex);
        
        setExistingAvailability(paginatedData);
        setPagination(prev => ({
          ...prev,
          currentPage: page,
          totalPages: Math.ceil(data.length / prev.itemsPerPage),
          totalItems: data.length
        }));
      }

    } catch (error: any) {
      console.error('Error loading existing availability:', error);
      toast({
        title: "Error",
        description: "Failed to load existing availability",
        variant: "destructive"
      });
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // Check if availability already exists for a specific date
  const checkExistingAvailability = async (date: string, doctorId: number): Promise<boolean> => {
    try {
      console.log(`🔍 Checking availability for date: ${date}, doctor_id: ${doctorId}`);
      
      // Use the same API call as loadExistingAvailability but check for specific date
      const response = await axios.get(`${API_BASE_URL}/availability/`, {
        params: {
          doctor_id: doctorId,
          page_size: 1000 // Get a large number to check all records
        }
      });
      
      console.log(`📡 Full availability API response:`, response.data);
      
      let availabilityRecords = [];
      if (response.data.results) {
        // Paginated response
        availabilityRecords = response.data.results;
      } else {
        // Non-paginated response
        availabilityRecords = response.data;
      }
      
      // Check if any record matches the specific date
      const existsForDate = availabilityRecords.some((record: any) => record.date === date);
      console.log(`📊 Date ${date} exists: ${existsForDate} (found ${availabilityRecords.length} total records)`);
      
      if (existsForDate) {
        const matchingRecord = availabilityRecords.find((record: any) => record.date === date);
        console.log(`📋 Matching record for ${date}:`, matchingRecord);
      }
      
      return existsForDate;
    } catch (error) {
      console.error('❌ Error checking existing availability:', error);
      return false;
    }
  };

  // Delete existing availability
  const deleteAvailability = async (availabilityId: number) => {
    try {
      setIsLoadingExisting(true);
      await axios.delete(`${API_BASE_URL}/availability/${availabilityId}/`);
      
      toast({
        title: "Success",
        description: "Availability deleted successfully"
      });
      
      // Reload the current page
      await loadExistingAvailability(pagination.currentPage);
    } catch (error: any) {
      console.error('Error deleting availability:', error);
      toast({
        title: "Error",
        description: "Failed to delete availability",
        variant: "destructive"
      });
    } finally {
      setIsLoadingExisting(false);
    }
  };





  const savePattern = async () => {
    console.log('=== SAVE PATTERN DEBUG ===');
    console.log('Function called - savePattern');
    console.log('Form values:', { startDate, endDate, startTime, endTime, recurringDays });
    console.log('Current user:', currentUser);
    
    if (!startDate || !endDate || !startTime || !endTime || !currentUser) {
      console.log('❌ Missing required fields or user');
      console.log('Missing:', {
        startDate: !startDate,
        endDate: !endDate, 
        startTime: !startTime,
        endTime: !endTime,
        currentUser: !currentUser
      });
      toast({
        title: "Missing fields",
        description: "Please fill in all date and time fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      console.log('❌ End date is before start date');
      toast({
        title: 'Invalid date range',
        description: 'End date must be after or equal to start date.',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('✅ All fields present and valid, starting save process...');
      setIsLoading(true);

      // Get doctor's ID
      console.log('Fetching doctor information...');
      const doctorsResponse = await axios.get(`${API_BASE_URL}/doctors/`);
      console.log('Doctors API response:', doctorsResponse.data);
      const doctors = doctorsResponse.data;
      
      // Try multiple identification strategies due to encrypted emails
      console.log('Looking for doctor with currentUser:', { 
        id: currentUser.id, 
        username: currentUser.username, 
        email: currentUser.email 
      });
      
      let doctor = doctors.find(d => d.id === currentUser.id);
      if (!doctor) {
        console.log('Doctor not found by ID, trying username...');
        doctor = doctors.find(d => d.username === currentUser.username);
      }
      if (!doctor && currentUser.email) {
        console.log('Doctor not found by username, trying email...');
        doctor = doctors.find(d => d.email && d.email === currentUser.email);
      }
      
      if (!doctor) {
        console.log('❌ Doctor not found using any method');
        console.log('Available doctors:', doctors.map(d => ({ id: d.id, username: d.username, email: d.email })));
        console.log('Searching for:', { id: currentUser.id, username: currentUser.username, email: currentUser.email });
        throw new Error('Doctor not found in database');
      }
      
      console.log('✅ Found doctor:', doctor);

      // Generate dates based on recurring pattern
      console.log('Generating dates with pattern:', recurringDays);
      const dates = getDatesInRange(startDate, endDate, recurringDays);
      console.log('Generated dates:', dates);
      
      if (dates.length === 0) {
        console.log('❌ No dates generated from pattern');
        toast({
          title: "No dates selected",
          description: "The selected date range and recurring pattern resulted in no valid dates.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Checking for existing availability...');
      // Check for existing availability and filter out duplicates
      const existingDates: string[] = [];
      const newDates: string[] = [];
      
      for (const date of dates) {
        console.log(`Checking if availability exists for date: ${date}`);
        const exists = await checkExistingAvailability(date, doctor.id);
        console.log(`Date ${date} exists: ${exists}`);
        if (exists) {
          existingDates.push(date);
        } else {
          newDates.push(date);
        }
      }

      console.log('Existing dates:', existingDates);
      console.log('New dates to create:', newDates);

      if (existingDates.length > 0) {
        console.log('⚠️ Found duplicate dates, will skip them');
        toast({
          title: "Duplicate dates found",
          description: `Skipping ${existingDates.length} dates that already have availability: ${existingDates.slice(0, 3).join(', ')}${existingDates.length > 3 ? '...' : ''}`,
          variant: "default"
        });
      }

      if (newDates.length === 0) {
        console.log('❌ No new dates to save');
        toast({
          title: "No new dates to save",
          description: "All selected dates already have availability set up.",
          variant: "default"
        });
        return;
      }

      console.log(`✅ Creating availability for ${newDates.length} new dates...`);
      // Create availability and time slots for new dates only
      let successCount = 0;
      for (const date of newDates) {
        try {
          console.log(`Creating availability for date: ${date}`);
          // Create availability for this date
          const availabilityData = {
            doctor_id: Number(doctor.id),
            date: date,
            is_available: true,
            max_appointments: 8
          };

          console.log('Posting availability data:', availabilityData);
          const availabilityResponse = await axios.post(`${API_BASE_URL}/availability/`, availabilityData);
          console.log('Availability response:', availabilityResponse.data);
          const createdAvailability = availabilityResponse.data;
          
          if (!createdAvailability || typeof createdAvailability.id !== 'number') {
            console.warn(`❌ Failed to create availability for ${date}`);
            continue;
          }

          console.log(`✅ Created availability ${createdAvailability.id} for ${date}`);
          // Generate time slots for this date
          const daySlots = generateScheduleSlots(date, startTime, endTime);
          console.log(`Generated ${daySlots.length} time slots for ${date}:`, daySlots);
          
          // Create time slots
          for (const slot of daySlots) {
            console.log(`Creating time slot: ${slot.time} for ${date}`);
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

            console.log('Posting time slot data:', timeSlotData);
            const timeSlotResponse = await axios.post(`${API_BASE_URL}/availability/${createdAvailability.id}/create_time_slot/`, timeSlotData);
            console.log('Time slot response:', timeSlotResponse.data);
          }
          
          console.log(`✅ Successfully created all time slots for ${date}`);
          successCount++;
        } catch (dateError) {
          console.error(`❌ Failed to create availability for ${date}:`, dateError);
        }
      }

      console.log(`✅ Completed creation process. Success count: ${successCount}/${newDates.length}`);
      // Refresh the existing availability list
      console.log('Refreshing existing availability list...');
      await loadExistingAvailability(pagination.currentPage);

      console.log('✅ Showing success toast');
      toast({
        title: "Pattern Saved",
        description: `Successfully created availability for ${successCount} out of ${newDates.length} new dates (${recurringDays}, ${startTime}-${endTime})`,
      });
      console.log('=== SAVE PATTERN DEBUG END ===');

    } catch (error: any) {
      console.error('❌ Error saving pattern:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.message || "Failed to save pattern",
        variant: "destructive"
      });
    } finally {
      console.log('Setting loading to false');
      setIsLoading(false);
    }
  };







  // Load existing availability on component mount
  useEffect(() => {
    if (currentUser?.role === 'doctor') {
      loadExistingAvailability(1);
    }
  }, [currentUser]);

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
          </div>
        </CardContent>
      </Card>

      {/* Existing Availability Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Existing Availability
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExistingAvailability(!showExistingAvailability)}
            >
              {showExistingAvailability ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showExistingAvailability ? 'Hide' : 'Show'} ({pagination.totalItems})
            </Button>
          </CardTitle>
          <CardDescription>
            View and manage your existing availability slots
          </CardDescription>
        </CardHeader>
        
        {showExistingAvailability && (
          <CardContent>
            {isLoadingExisting ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : existingAvailability.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No existing availability found
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time Slots</TableHead>
                        <TableHead>Booked/Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {existingAvailability.map((availability) => {
                        const bookedSlots = availability.time_slots.filter(slot => slot.is_booked).length;
                        const totalSlots = availability.time_slots.length;
                        
                        return (
                          <TableRow key={availability.id}>
                            <TableCell className="font-medium">
                              {new Date(availability.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {availability.time_slots.slice(0, 3).map((slot, index) => (
                                  <span
                                    key={index}
                                    className={`px-2 py-1 text-xs rounded ${
                                      slot.is_booked
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}
                                  >
                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                  </span>
                                ))}
                                {availability.time_slots.length > 3 && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        +{availability.time_slots.length - 3} more
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                      <div className="space-y-2">
                                        <h4 className="font-medium text-sm">
                                          All Time Slots ({availability.time_slots.length})
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                          {availability.time_slots.map((slot, index) => (
                                            <span
                                              key={index}
                                              className={`px-2 py-1 text-xs rounded text-center ${
                                                slot.is_booked
                                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                              }`}
                                            >
                                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="text-xs text-muted-foreground pt-2 border-t">
                                          <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1">
                                              <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900"></div>
                                              <span>Available</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900"></div>
                                              <span>Booked</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={bookedSlots > 0 ? 'text-orange-600' : 'text-green-600'}>
                                {bookedSlots}/{totalSlots}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={availability.is_available ? 'text-green-600' : 'text-red-600'}>
                                {availability.is_available ? 'Available' : 'Unavailable'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteAvailability(availability.id)}
                                disabled={bookedSlots > 0}
                                title={bookedSlots > 0 ? "Cannot delete availability with booked slots" : "Delete availability"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                      {pagination.totalItems} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadExistingAvailability(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1 || isLoadingExisting}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadExistingAvailability(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages || isLoadingExisting}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

    </div>
  );
};

export default Schedule;
