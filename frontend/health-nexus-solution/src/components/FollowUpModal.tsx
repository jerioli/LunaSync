import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, AlertCircle } from "lucide-react";
import { axiosInstance } from "@/services/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (date: string, time: string) => void;
  patientName: string;
  doctorId: number;
}

export const FollowUpModal = ({
  open,
  onOpenChange,
  onSubmit,
  patientName,
  doctorId,
}: FollowUpModalProps) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [noSlotsMessage, setNoSlotsMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      console.log("Modal opened, resetting form");
      setDate("");
      setTime("");
      setAvailableSlots([]);
      setNoSlotsMessage("");
      setIsSubmitting(false);
    }
  }, [open]);

  // Fetch available time slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!date || !doctorId) {
        setAvailableSlots([]);
        setNoSlotsMessage("");
        return;
      }

      setLoadingSlots(true);
      setNoSlotsMessage("");
      setTime(""); // Reset time selection

      try {
        const response = await axiosInstance.get(
          `appointments/available-slots/?doctor_id=${doctorId}&date=${date}`
        );

        if (
          response.data.available_slots &&
          response.data.available_slots.length > 0
        ) {
          setAvailableSlots(response.data.available_slots);
        } else {
          setAvailableSlots([]);
          setNoSlotsMessage(
            response.data.message || "No available time slots for this date"
          );
        }
      } catch (error) {
        console.error("Error fetching available slots:", error);
        setAvailableSlots([]);
        setNoSlotsMessage("Error loading available time slots");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [date, doctorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted:", { date, time, doctorId, patientName });

    if (!date || !time) {
      console.error("Missing date or time:", { date, time });
      toast.error("Please select both date and time");
      return;
    }

    setIsSubmitting(true);
    console.log("Calling onSubmit with:", date, time);

    try {
      await onSubmit(date, time);
      // Only reset and close if submission was successful
      setDate("");
      setTime("");
      setAvailableSlots([]);
      setNoSlotsMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDate("");
    setTime("");
    setAvailableSlots([]);
    setNoSlotsMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // Only allow closing if not submitting
          handleCancel();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Follow-up Appointment
          </DialogTitle>
          <DialogDescription>
            Schedule a follow-up appointment for {patientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="followup-date">Date</Label>
            <Input
              id="followup-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followup-time">Time</Label>
            {loadingSlots ? (
              <div className="text-sm text-muted-foreground">
                Loading available slots...
              </div>
            ) : noSlotsMessage ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{noSlotsMessage}</AlertDescription>
              </Alert>
            ) : availableSlots.length > 0 ? (
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a date to see available time slots
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!date || !time || loadingSlots || isSubmitting}
            >
              {isSubmitting ? "Scheduling..." : "Schedule Follow-up"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
