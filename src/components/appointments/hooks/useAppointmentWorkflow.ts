import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Appointment } from "../types";

interface Kennel {
  id: string;
  kennel_number: string;
  kennel_size: string;
  is_occupied: boolean;
  current_appointment_id?: string;
}

export const useAppointmentWorkflow = (appointment: Appointment, onUpdate: () => void) => {
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [userFullName, setUserFullName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchKennels();
    fetchUserProfile();
  }, []);

  const fetchKennels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('kennels')
        .select('*')
        .eq('salon_id', user.id)
        .order('kennel_number');

      if (error) throw error;
      setKennels(data || []);
    } catch (error) {
      console.error('Error fetching kennels:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserFullName(data.full_name);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleCheckIn = async (selectedKennel: string, kennelNotes: string) => {
    // Prevent changes to completed appointments
    if (appointment.status === 'completed') {
      toast({
        title: "Cannot modify completed appointment",
        description: "This appointment has already been completed",
        variant: "destructive"
      });
      return;
    }

    try {
      const checkInTime = new Date().toISOString();
      const updates: any = {
        status: 'checked_in',
        check_in_time: checkInTime,
        checked_in_by: userFullName,
        updated_at: checkInTime
      };

      if (selectedKennel) {
        updates.kennel_number = selectedKennel;
        updates.kennel_notes = kennelNotes;

        // Update kennel status
        await supabase
          .from('kennels')
          .update({ 
            is_occupied: true, 
            current_appointment_id: appointment.id 
          })
          .eq('kennel_number', selectedKennel);
      }

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Pet Checked In",
        description: `${appointment.pet?.name} has been checked in by ${userFullName}${selectedKennel ? ` to kennel ${selectedKennel}` : ''}`
      });

      onUpdate();
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Error",
        description: "Failed to check in pet",
        variant: "destructive"
      });
    }
  };

  const handleStartService = async () => {
    // Prevent changes to completed appointments
    if (appointment.status === 'completed') {
      toast({
        title: "Cannot modify completed appointment",
        description: "This appointment has already been completed",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Service Started",
        description: "Grooming service has started"
      });

      onUpdate();
    } catch (error) {
      console.error('Error starting service:', error);
      toast({
        title: "Error",
        description: "Failed to start service",
        variant: "destructive"
      });
    }
  };

  const handleReadyForPickup = async () => {
    // Prevent changes to completed appointments
    if (appointment.status === 'completed') {
      toast({
        title: "Cannot modify completed appointment",
        description: "This appointment has already been completed",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'ready_for_pickup',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Ready for Pickup",
        description: `${appointment.pet?.name} is ready for pickup`
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      const checkOutTime = new Date().toISOString();
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          check_out_time: checkOutTime,
          checked_out_by: userFullName,
          updated_at: checkOutTime
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Free up kennel if assigned - FIX: Use salon_id for proper kennel lookup
      if ((appointment as any).kennel_number) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('kennels')
            .update({ 
              is_occupied: false, 
              current_appointment_id: null 
            })
            .eq('kennel_number', (appointment as any).kennel_number)
            .eq('salon_id', user.id);
        }
      }

      toast({
        title: "Pet Checked Out",
        description: `${appointment.pet?.name} has been picked up by ${userFullName}`
      });

      onUpdate();
    } catch (error) {
      console.error('Error checking out:', error);
      toast({
        title: "Error",
        description: "Failed to check out pet",
        variant: "destructive"
      });
    }
  };

  const availableKennels = kennels.filter(k => !k.is_occupied || k.current_appointment_id === appointment.id);

  return {
    kennels,
    availableKennels,
    userFullName,
    handleCheckIn,
    handleStartService,
    handleReadyForPickup,
    handleCheckOut
  };
};