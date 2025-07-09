import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Client, Pet, Service } from "./types";

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  pets: Pet[];
  services: Service[];
}

const AppointmentForm = ({ isOpen, onClose, onSuccess, clients, pets, services }: AppointmentFormProps) => {
  const [formData, setFormData] = useState({
    clientId: "",
    petId: "",
    serviceIds: [] as string[],
    scheduledAt: "",
    notes: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedServices = services.filter(s => formData.serviceIds.includes(s.id));
      const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0);

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([{
          salon_id: user.id,
          client_id: formData.clientId,
          pet_id: formData.petId,
          scheduled_at: formData.scheduledAt,
          duration_minutes: totalDuration,
          total_price: totalPrice,
          notes: formData.notes || null,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Add services to appointment
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
        description: "Appointment created successfully"
      });

      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: "",
      petId: "",
      serviceIds: [],
      scheduledAt: "",
      notes: ""
    });
    onClose();
  };

  const getClientPets = (clientId: string) => {
    return pets.filter(pet => pet.client_id === clientId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for a client and their pet
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
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">
              Schedule Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentForm;