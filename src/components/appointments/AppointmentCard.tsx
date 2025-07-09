import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Appointment } from "./types";
import AppointmentStatusActions from "./AppointmentStatusActions";

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onUpdate: () => void;
}

const AppointmentCard = ({ appointment, onEdit, onUpdate }: AppointmentCardProps) => {
  const { toast } = useToast();

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'on_hold': return 'outline';
      default: return 'outline';
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      // Delete appointment services first
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', appointmentId);

      if (servicesError) throw servicesError;

      // Delete appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      toast({
        title: "Success",
        description: "Appointment deleted successfully"
      });

      onUpdate();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive"
      });
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    // Transform appointment data to match the edit dialog's expected format
    const transformedAppointment = {
      ...appointment,
      client_id: appointment.client_id || '',
      pet_id: appointment.pet_id || '',
      appointment_services: appointment.appointment_services.map(as => ({
        id: as.id,
        service_id: as.service?.id || '',
        service: as.service,
        price: as.price || as.service?.price || 0
      }))
    };
    onEdit(transformedAppointment);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDateTime(appointment.scheduled_at)}</span>
            <Badge variant={getStatusColor(appointment.status)}>
              {appointment.status}
            </Badge>
          </div>
          
          <div>
            <p className="font-medium">{appointment.client.name} - {appointment.pet.name}</p>
            <div className="text-sm text-muted-foreground">
              Services: {appointment.appointment_services.map(as => as.service.name).join(', ')}
            </div>
            {appointment.notes && (
              <p className="text-sm text-muted-foreground mt-1">{appointment.notes}</p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleEditAppointment(appointment)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this appointment? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteAppointment(appointment.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <AppointmentStatusActions appointment={appointment} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;