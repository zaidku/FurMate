import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
}

interface Pet {
  id: string;
  name: string;
  client_id: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Appointment {
  id: string;
  client_id: string;
  pet_id: string;
  scheduled_at: string;
  notes: string | null;
  appointment_services: Array<{
    service_id: string;
    service: { id: string; name: string; price: number };
  }>;
}

interface EditAppointmentDialogProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  clients: Client[];
  pets: Pet[];
  services: Service[];
}

const EditAppointmentDialog = ({
  appointment,
  isOpen,
  onClose,
  onUpdate,
  clients,
  pets,
  services
}: EditAppointmentDialogProps) => {
  const [formData, setFormData] = useState({
    clientId: "",
    petId: "",
    serviceIds: [] as string[],
    scheduledAt: "",
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (appointment) {
      const serviceIds = appointment.appointment_services.map(as => as.service_id);
      setFormData({
        clientId: appointment.client_id,
        petId: appointment.pet_id,
        serviceIds,
        scheduledAt: appointment.scheduled_at.replace('Z', '').slice(0, 16),
        notes: appointment.notes || ""
      });
    }
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

    try {
      const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
      const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0);

      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          client_id: formData.clientId,
          pet_id: formData.petId,
          scheduled_at: formData.scheduledAt,
          duration_minutes: totalDuration,
          total_price: totalPrice,
          notes: formData.notes || null,
        })
        .eq('id', appointment.id);

      if (appointmentError) throw appointmentError;

      // Delete existing services
      const { error: deleteError } = await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', appointment.id);

      if (deleteError) throw deleteError;

      // Add new services
      if (formData.serviceIds.length > 0) {
        const appointmentServices = formData.serviceIds.map(serviceId => {
          const service = services.find(s => s.id === serviceId);
          return {
            appointment_id: appointment.id,
            service_id: serviceId,
            price: service?.price || 0
          };
        });

        const { error: servicesError } = await supabase
          .from('appointment_services')
          .insert(appointmentServices);

        if (servicesError) throw servicesError;
      }

      toast({
        title: "Success",
        description: "Appointment updated successfully"
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive"
      });
    }
  };

  const getClientPets = (clientId: string) => {
    return pets.filter(pet => pet.client_id === clientId);
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Make changes to the appointment details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client">Client</Label>
            <Select value={formData.clientId} onValueChange={(value) => {
              setFormData({ ...formData, clientId: value, petId: "" });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pet">Pet</Label>
            <Select 
              value={formData.petId} 
              onValueChange={(value) => setFormData({ ...formData, petId: value })}
              disabled={!formData.clientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a pet" />
              </SelectTrigger>
              <SelectContent>
                {getClientPets(formData.clientId).map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="services">Services</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {services.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`service-${service.id}`}
                    checked={formData.serviceIds.includes(service.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          serviceIds: [...formData.serviceIds, service.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          serviceIds: formData.serviceIds.filter(id => id !== service.id)
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`service-${service.id}`} className="text-sm flex-1">
                    {service.name} - ${service.price} ({service.duration_minutes}min)
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="scheduledAt">Date & Time</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes for the appointment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentDialog;