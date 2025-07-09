import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";

interface ServiceWorkflowProps {
  appointmentStatus: string;
  onStartService: () => void;
  onReadyForPickup: () => void;
}

export const ServiceWorkflow = ({ 
  appointmentStatus, 
  onStartService, 
  onReadyForPickup 
}: ServiceWorkflowProps) => {
  if (appointmentStatus === 'checked_in') {
    return (
      <Button onClick={onStartService} className="w-full">
        <Clock className="h-4 w-4 mr-2" />
        Start Grooming Service
      </Button>
    );
  }

  if (appointmentStatus === 'in_progress') {
    return (
      <Button onClick={onReadyForPickup} className="w-full">
        <Check className="h-4 w-4 mr-2" />
        Mark Ready for Pickup
      </Button>
    );
  }

  return null;
};