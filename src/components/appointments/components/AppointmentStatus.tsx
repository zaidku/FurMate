import { MapPin, User } from "lucide-react";
import { Appointment } from "../types";

interface AppointmentStatusProps {
  appointment: Appointment;
}

export const AppointmentStatus = ({ appointment }: AppointmentStatusProps) => {
  return (
    <div className="pt-3 border-t space-y-2 text-sm text-muted-foreground">
      {(appointment as any).check_in_time && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Checked in:</span>
            <span>{new Date((appointment as any).check_in_time).toLocaleString()}</span>
          </div>
          {(appointment as any).checked_in_by && (
            <div className="flex justify-between">
              <span>Checked in by:</span>
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {(appointment as any).checked_in_by}
              </span>
            </div>
          )}
        </div>
      )}
      {(appointment as any).kennel_number && (
        <div className="flex justify-between">
          <span>Kennel:</span>
          <span className="flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {(appointment as any).kennel_number}
          </span>
        </div>
      )}
      {(appointment as any).check_out_time && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Checked out:</span>
            <span>{new Date((appointment as any).check_out_time).toLocaleString()}</span>
          </div>
          {(appointment as any).checked_out_by && (
            <div className="flex justify-between">
              <span>Checked out by:</span>
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {(appointment as any).checked_out_by}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};