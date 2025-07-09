import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Pause, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Appointment } from "./types";

interface AppointmentStatusActionsProps {
  appointment: Appointment;
  onUpdate: () => void;
}

const AppointmentStatusActions = ({ appointment, onUpdate }: AppointmentStatusActionsProps) => {
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const { toast } = useToast();

  const handleStatusUpdate = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Appointment ${status} successfully`
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive"
      });
    }
  };

  const handleAddNote = async (appointmentId: string, newNote: string) => {
    try {
      const existingNotes = appointment.notes || '';
      const timestamp = new Date().toLocaleString();
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n\n[${timestamp}] ${newNote}`
        : `[${timestamp}] ${newNote}`;

      const { error } = await supabase
        .from('appointments')
        .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note added successfully"
      });

      onUpdate();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive"
      });
    }
  };

  const handleNoteSubmit = () => {
    if (noteText.trim()) {
      handleAddNote(appointment.id, noteText.trim());
      setNoteText('');
      setShowNoteInput(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex space-x-1">
        {appointment.status !== 'confirmed' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
            className="text-green-600 hover:text-green-700"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        {appointment.status !== 'on_hold' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleStatusUpdate(appointment.id, 'on_hold')}
            className="text-yellow-600 hover:text-yellow-700"
          >
            <Pause className="h-3 w-3" />
          </Button>
        )}
        {appointment.status !== 'cancelled' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowNoteInput(!showNoteInput)}
          className="text-blue-600 hover:text-blue-700"
        >
          <Phone className="h-3 w-3" />
        </Button>
      </div>
      
      {showNoteInput && (
        <div className="flex space-x-2 mt-2">
          <Input
            placeholder="Add a call note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="text-xs"
            onKeyPress={(e) => e.key === 'Enter' && handleNoteSubmit()}
          />
          <Button size="sm" onClick={handleNoteSubmit} disabled={!noteText.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
};

export default AppointmentStatusActions;