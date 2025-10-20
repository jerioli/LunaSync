import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function ReceptionistDashboard() {
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  return (
    <div>
      <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
        <DialogContent>
          <DialogTitle>Add New Patient</DialogTitle>
          {/* ... rest of dialog content */}
        </DialogContent>
      </Dialog>
    </div>
  );
} 