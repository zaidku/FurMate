import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Appointment } from "./types";
import { useAppointmentWorkflow } from "./hooks/useAppointmentWorkflow";
import { CheckInSection } from "./components/CheckInSection";
import { ServiceWorkflow } from "./components/ServiceWorkflow";
import { CheckOutSection } from "./components/CheckOutSection";
import { AppointmentStatus } from "./components/AppointmentStatus";
import { StatusBadge } from "./components/StatusBadge";

interface AppointmentWorkflowProps {
  appointment: Appointment;
  onUpdate: () => void;
}

const AppointmentWorkflow = ({ appointment, onUpdate }: AppointmentWorkflowProps) => {
  const {
    availableKennels,
    handleCheckIn,
    handleStartService,
    handleReadyForPickup,
    handleCheckOut
  } = useAppointmentWorkflow(appointment, onUpdate);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Appointment Workflow</span>
          <StatusBadge status={appointment.status} />
        </CardTitle>
        <CardDescription>
          {appointment.pet?.name} - {appointment.client?.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Check-in Section - FIX: Don't show for completed appointments */}
        {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
          <CheckInSection 
            availableKennels={availableKennels}
            petSize={appointment.pet?.size}
            onCheckIn={handleCheckIn}
            initialKennel={(appointment as any).kennel_number || ""}
            initialNotes={(appointment as any).kennel_notes || ""}
          />
        )}

        {/* Service Progress */}
        <ServiceWorkflow 
          appointmentStatus={appointment.status}
          onStartService={handleStartService}
          onReadyForPickup={handleReadyForPickup}
        />

        {/* Check-out and Payment - FIX: Don't show for completed appointments */}
        {appointment.status === 'ready_for_pickup' && (
          <CheckOutSection 
            appointment={appointment}
            onCheckOut={handleCheckOut}
            onUpdate={onUpdate}
          />
        )}

        {/* Status Information */}
        <AppointmentStatus appointment={appointment} />
      </CardContent>
    </Card>
  );
};

export default AppointmentWorkflow;