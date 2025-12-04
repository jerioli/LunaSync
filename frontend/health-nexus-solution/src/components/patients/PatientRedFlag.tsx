import React, { useState } from "react";
import { AlertTriangle, Flag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { axiosInstance } from "@/services/api";
import { parseApiError } from "@/utils/errorHandler";

interface PatientRedFlagProps {
  patientId: number;
  isRedFlagged: boolean;
  redFlagReason?: string;
  redFlaggedBy?: string;
  redFlaggedDate?: string;
  onUpdate: () => void;
  isDoctor: boolean;
}

const PatientRedFlag: React.FC<PatientRedFlagProps> = ({
  patientId,
  isRedFlagged,
  redFlagReason,
  redFlaggedBy,
  redFlaggedDate,
  onUpdate,
  isDoctor,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [isChecked, setIsChecked] = useState(isRedFlagged);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckboxChange = (checked: boolean) => {
    if (!isDoctor) {
      toast({
        title: "Access Denied",
        description: "Only doctors can flag patients",
        variant: "destructive",
      });
      return;
    }

    if (checked) {
      // User wants to flag the patient - show reason dialog
      setReason("");
      setShowDialog(true);
    } else {
      // User wants to remove flag - confirm and remove
      handleRemoveFlag();
    }
  };

  const handleSetFlag = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for flagging this patient",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post(`patients/${patientId}/red-flag/`, {
        reason: reason.trim(),
      });

      toast({
        title: "Patient Flagged",
        description: "Patient has been successfully flagged",
        variant: "default",
      });

      setIsChecked(true);
      setShowDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Error flagging patient:", error);
      const parsedError = parseApiError(error);
      toast({
        title: "Error",
        description: parsedError.message || "Failed to flag patient",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFlag = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.delete(`patients/${patientId}/red-flag/`);

      toast({
        title: "Flag Removed",
        description: "Patient flag has been successfully removed",
        variant: "default",
      });

      setIsChecked(false);
      onUpdate();
    } catch (error) {
      console.error("Error removing patient flag:", error);
      const parsedError = parseApiError(error);
      toast({
        title: "Error",
        description: parsedError.message || "Failed to remove flag",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`red-flag-${patientId}`}
          checked={isChecked}
          onCheckedChange={handleCheckboxChange}
          disabled={!isDoctor}
        />
        <Label
          htmlFor={`red-flag-${patientId}`}
          className="text-sm font-medium cursor-pointer"
        >
          Red Flag
        </Label>

        {isRedFlagged && (
          <Badge
            variant="destructive"
            className="ml-2 cursor-pointer"
            onClick={() => setShowReasonDialog(true)}
          >
            <Flag className="h-3 w-3 mr-1" />
            FLAGGED
          </Badge>
        )}
      </div>

      {/* Set Flag Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Flag Patient
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="flag-reason">Reason for flagging *</Label>
              <Textarea
                id="flag-reason"
                placeholder="Please provide a detailed reason for flagging this patient..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleSetFlag}
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? "Flagging..." : "Flag Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-500" />
              Red Flag Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Reason:
              </Label>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-1">
                <p className="text-sm">{redFlagReason}</p>
              </div>
            </div>
            {redFlaggedBy && (
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Flagged by:
                </Label>
                <p className="text-sm mt-1">{redFlaggedBy}</p>
              </div>
            )}
            {redFlaggedDate && (
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Date flagged:
                </Label>
                <p className="text-sm mt-1">
                  {new Date(redFlaggedDate).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReasonDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatientRedFlag;
