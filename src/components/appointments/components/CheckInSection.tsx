import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoorOpen } from "lucide-react";

interface Kennel {
  id: string;
  kennel_number: string;
  kennel_size: string;
  is_occupied: boolean;
  current_appointment_id?: string;
}

interface CheckInSectionProps {
  availableKennels: Kennel[];
  petSize?: string;
  onCheckIn: (selectedKennel: string, kennelNotes: string) => void;
  initialKennel?: string;
  initialNotes?: string;
}

export const CheckInSection = ({ 
  availableKennels, 
  petSize,
  onCheckIn, 
  initialKennel = "", 
  initialNotes = "" 
}: CheckInSectionProps) => {
  const [selectedKennel, setSelectedKennel] = useState(initialKennel);
  const [kennelNotes, setKennelNotes] = useState(initialNotes);

  // Filter kennels by pet size compatibility
  const compatibleKennels = availableKennels.filter(kennel => {
    if (!petSize) return true; // If no pet size, show all kennels
    
    const petSizeLower = petSize.toLowerCase();
    const kennelSizeLower = kennel.kennel_size.toLowerCase().replace('_', ' ');
    
    console.log(`Filtering: Pet size "${petSizeLower}" vs Kennel size "${kennelSizeLower}"`);
    
    // Size compatibility logic - strict matching
    if (petSizeLower === 'small') {
      return kennelSizeLower === 'small'; // Small pets can only go in small kennels
    } else if (petSizeLower === 'medium') {
      return kennelSizeLower === 'medium' || kennelSizeLower === 'large' || kennelSizeLower === 'extra large'; // Medium pets need medium+ kennels
    } else if (petSizeLower === 'large') {
      return kennelSizeLower === 'large' || kennelSizeLower === 'extra large'; // Large pets need large+ kennels
    }
    return true;
  });

  const handleCheckIn = () => {
    onCheckIn(selectedKennel, kennelNotes);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Check-In Pet</h4>
      
      {/* Kennel Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Assign Kennel (Optional)</Label>
          <Select value={selectedKennel} onValueChange={setSelectedKennel}>
            <SelectTrigger>
              <SelectValue placeholder="Select kennel" />
            </SelectTrigger>
            <SelectContent>
              {compatibleKennels.length > 0 ? (
                compatibleKennels.map((kennel) => (
                  <SelectItem key={kennel.id} value={kennel.kennel_number}>
                    Kennel {kennel.kennel_number} ({kennel.kennel_size})
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-muted-foreground">
                  No compatible kennels available for {petSize} pets
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        
        {selectedKennel && (
          <div>
            <Label>Kennel Notes</Label>
            <Input
              placeholder="Special kennel instructions..."
              value={kennelNotes}
              onChange={(e) => setKennelNotes(e.target.value)}
            />
          </div>
        )}
      </div>
      
      <Button onClick={handleCheckIn} className="w-full">
        <DoorOpen className="h-4 w-4 mr-2" />
        Check In Pet
      </Button>
    </div>
  );
};