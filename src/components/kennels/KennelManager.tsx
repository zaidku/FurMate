import { useState, useEffect } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Kennel {
  id: string;
  kennel_number: string;
  kennel_size: string;
  is_occupied: boolean;
  current_appointment_id?: string;
  notes?: string;
}

const KennelManager = () => {
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [newKennel, setNewKennel] = useState({
    kennel_number: "",
    kennel_size: "medium",
    notes: ""
  });
  const [editingKennel, setEditingKennel] = useState<string | null>(null);
  const { toast } = useToast();

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
      toast({
        title: "Error",
        description: "Failed to load kennels",
        variant: "destructive"
      });
    }
  };

  // Set up real-time sync for kennels
  useRealtimeSync(fetchKennels, 'kennels');

  useEffect(() => {
    fetchKennels();
  }, []);

  const handleAddKennel = async () => {
    if (!newKennel.kennel_number.trim()) {
      toast({
        title: "Error",
        description: "Please enter a kennel number",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('kennels')
        .insert({
          salon_id: user.id,
          kennel_number: newKennel.kennel_number,
          kennel_size: newKennel.kennel_size,
          notes: newKennel.notes,
          is_occupied: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Kennel added successfully"
      });

      setNewKennel({ kennel_number: "", kennel_size: "medium", notes: "" });
      fetchKennels();
    } catch (error) {
      console.error('Error adding kennel:', error);
      toast({
        title: "Error",
        description: "Failed to add kennel",
        variant: "destructive"
      });
    }
  };

  const handleDeleteKennel = async (kennelId: string) => {
    try {
      const { error } = await supabase
        .from('kennels')
        .delete()
        .eq('id', kennelId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Kennel deleted successfully"
      });

      fetchKennels();
    } catch (error) {
      console.error('Error deleting kennel:', error);
      toast({
        title: "Error",
        description: "Failed to delete kennel",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Kennel Management</h2>
        <p className="text-muted-foreground">Manage your kennels and track occupancy</p>
      </div>

      {/* Add New Kennel */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Kennel</CardTitle>
          <CardDescription>Set up a new kennel for pet boarding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="kennel_number">Kennel Number</Label>
              <Input
                id="kennel_number"
                placeholder="e.g., K-01"
                value={newKennel.kennel_number}
                onChange={(e) => setNewKennel(prev => ({ ...prev, kennel_number: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="kennel_size">Size</Label>
              <Select
                value={newKennel.kennel_size}
                onValueChange={(value) => setNewKennel(prev => ({ ...prev, kennel_size: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="extra_large">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes..."
                value={newKennel.notes}
                onChange={(e) => setNewKennel(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          
          <Button onClick={handleAddKennel}>
            <Plus className="h-4 w-4 mr-2" />
            Add Kennel
          </Button>
        </CardContent>
      </Card>

      {/* Kennel List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kennels.map((kennel) => (
          <Card key={kennel.id} className={`animate-fade-in shadow-soft hover:shadow-medium transition-all duration-300 ${kennel.is_occupied ? 'kennel-occupied' : 'kennel-available'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Kennel {kennel.kennel_number}
                </CardTitle>
                <Badge variant={kennel.is_occupied ? "destructive" : "default"} className="animate-pulse-soft">
                  {kennel.is_occupied ? "Occupied" : "Available"}
                </Badge>
              </div>
              <CardDescription>
                Size: {kennel.kennel_size.replace('_', ' ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {kennel.notes && (
                <p className="text-sm text-muted-foreground mb-3">{kennel.notes}</p>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingKennel(kennel.id)}
                  disabled={kennel.is_occupied}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteKennel(kennel.id)}
                  disabled={kennel.is_occupied}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {kennels.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No kennels set up yet. Add your first kennel above.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KennelManager;