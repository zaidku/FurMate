import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, PawPrint, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface Pet {
  id: string;
  name: string;
  pet_type?: string;
  breed: string | null;
  size: string | null;
  age: number | null;
  weight: number | null;
  notes: string | null;
  special_instructions: string | null;
  is_vaccinated?: boolean;
  vaccination_date?: string;
  vaccination_notes?: string;
  is_microchipped?: boolean;
  microchip_number?: string;
  medical_conditions?: string;
  grooming_notes?: string;
  client_id: string;
  clients: {
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

const PetsManager = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    pet_type: "Dog",
    breed: "",
    size: "",
    age: "",
    weight: "",
    notes: "",
    special_instructions: "",
    is_vaccinated: false,
    vaccination_date: "",
    vaccination_notes: "",
    is_microchipped: false,
    microchip_number: "",
    medical_conditions: "",
    grooming_notes: "",
    client_id: ""
  });

  const fetchPets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pets')
        .select(`
          *,
          clients!inner(name, salon_id)
        `)
        .eq('clients.salon_id', user.id)
        .order('name');

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error fetching pets:', error);
      toast({
        title: "Error",
        description: "Failed to load pets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('salon_id', user.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Set up real-time sync for pets
  useRealtimeSync(fetchPets, 'pets');

  useEffect(() => {
    fetchPets();
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const petData = {
        client_id: formData.client_id,
        name: formData.name,
        pet_type: formData.pet_type,
        breed: formData.breed || null,
        size: formData.size || null,
        age: formData.age ? parseInt(formData.age) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        notes: formData.notes || null,
        special_instructions: formData.special_instructions || null,
        is_vaccinated: formData.is_vaccinated,
        vaccination_date: formData.vaccination_date || null,
        vaccination_notes: formData.vaccination_notes || null,
        is_microchipped: formData.is_microchipped,
        microchip_number: formData.microchip_number || null,
        medical_conditions: formData.medical_conditions || null,
        grooming_notes: formData.grooming_notes || null
      };

      if (editingPet) {
        const { error } = await supabase
          .from('pets')
          .update(petData)
          .eq('id', editingPet.id);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Pet updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('pets')
          .insert(petData);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Pet added successfully"
        });
      }

      handleCloseDialog();
      fetchPets();
    } catch (error) {
      console.error('Error saving pet:', error);
      toast({
        title: "Error",
        description: "Failed to save pet",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Pet deleted successfully"
      });
      fetchPets();
    } catch (error) {
      console.error('Error deleting pet:', error);
      toast({
        title: "Error",
        description: "Failed to delete pet",
        variant: "destructive"
      });
    }
  };

  const handleCloseDialog = () => {
    setFormData({
      name: "",
      pet_type: "Dog",
      breed: "",
      size: "",
      age: "",
      weight: "",
      notes: "",
      special_instructions: "",
      is_vaccinated: false,
      vaccination_date: "",
      vaccination_notes: "",
      is_microchipped: false,
      microchip_number: "",
      medical_conditions: "",
      grooming_notes: "",
      client_id: ""
    });
    setEditingPet(null);
    setIsAddDialogOpen(false);
  };

  const openEditDialog = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      pet_type: pet.pet_type || "Dog",
      breed: pet.breed || "",
      size: pet.size || "",
      age: pet.age?.toString() || "",
      weight: pet.weight?.toString() || "",
      notes: pet.notes || "",
      special_instructions: pet.special_instructions || "",
      is_vaccinated: pet.is_vaccinated || false,
      vaccination_date: pet.vaccination_date || "",
      vaccination_notes: pet.vaccination_notes || "",
      is_microchipped: pet.is_microchipped || false,
      microchip_number: pet.microchip_number || "",
      medical_conditions: pet.medical_conditions || "",
      grooming_notes: pet.grooming_notes || "",
      client_id: pet.client_id
    });
    setIsAddDialogOpen(true);
  };

  // Filter pets based on search term
  const filteredPets = pets.filter(pet =>
    pet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pet.pet_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading pets...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Pet Profiles</h2>
          <p className="text-muted-foreground">Manage detailed pet information, health records, and grooming notes</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPet(null)} disabled={clients.length === 0} className="bg-gradient-primary shadow-medium">
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPet ? "Edit Pet" : "Add New Pet"}</DialogTitle>
              <DialogDescription>
                Enter comprehensive pet information and health records
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-base">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Pet Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter pet name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="client_id">Owner</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
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
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="pet_type">Pet Type</Label>
                    <Select value={formData.pet_type} onValueChange={(value) => setFormData({ ...formData, pet_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                        <SelectItem value="Bird">Bird</SelectItem>
                        <SelectItem value="Rabbit">Rabbit</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="breed">Breed</Label>
                    <Input
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="e.g., Golden Retriever, Persian"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Select value={formData.size} onValueChange={(value) => setFormData({ ...formData, size: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Small">Small</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age (years)</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="Age in years"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="weight">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="Weight in pounds"
                    />
                  </div>
                </div>
              </div>

              {/* Health Records */}
              <div className="space-y-4">
                <h4 className="font-medium text-base">Health & Vaccination Records</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_vaccinated"
                    checked={formData.is_vaccinated}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_vaccinated: !!checked })}
                  />
                  <Label htmlFor="is_vaccinated">Pet is up-to-date on vaccinations</Label>
                </div>

                {formData.is_vaccinated && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vaccination_date">Last Vaccination Date</Label>
                      <Input
                        id="vaccination_date"
                        type="date"
                        value={formData.vaccination_date}
                        onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="vaccination_notes">Vaccination Notes</Label>
                      <Input
                        id="vaccination_notes"
                        value={formData.vaccination_notes}
                        onChange={(e) => setFormData({ ...formData, vaccination_notes: e.target.value })}
                        placeholder="Vaccine types, vet clinic, etc."
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_microchipped"
                    checked={formData.is_microchipped}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_microchipped: !!checked })}
                  />
                  <Label htmlFor="is_microchipped">Pet has microchip</Label>
                </div>

                {formData.is_microchipped && (
                  <div>
                    <Label htmlFor="microchip_number">Microchip Number</Label>
                    <Input
                      id="microchip_number"
                      value={formData.microchip_number}
                      onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
                      placeholder="15-digit microchip number"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="medical_conditions">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                    placeholder="Allergies, medications, health issues..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Grooming Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-base">Grooming Information</h4>
                
                <div>
                  <Label htmlFor="grooming_notes">Grooming Notes</Label>
                  <Textarea
                    id="grooming_notes"
                    value={formData.grooming_notes}
                    onChange={(e) => setFormData({ ...formData, grooming_notes: e.target.value })}
                    placeholder="Preferred cuts, behavioral notes, special handling..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Textarea
                    id="special_instructions"
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                    placeholder="Any special care requirements..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">General Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional information..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.name || !formData.client_id}>
                  {editingPet ? "Update Pet" : "Add Pet"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pets by name, breed, owner..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {clients.length === 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">You need to add clients first before adding pets.</p>
              <p className="text-sm text-muted-foreground">Go to the Clients tab to add your first client.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Pet Profiles</CardTitle>
          <CardDescription>
            {filteredPets.length} of {pets.length} pets in your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPets.length === 0 ? (
            <div className="text-center py-8">
              <PawPrint className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {pets.length === 0 ? 'No pets added yet' : 'No pets match your search'}
              </p>
              <p className="text-sm text-muted-foreground">
                {pets.length === 0 ? 'Add your first pet profile to get started' : 'Try adjusting your search terms'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type & Breed</TableHead>
                  <TableHead>Size & Health</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPets.map((pet) => (
                  <TableRow key={pet.id} className="animate-slide-up">
                    <TableCell className="font-medium">{pet.name}</TableCell>
                    <TableCell>{pet.clients.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-medium">
                            {pet.pet_type || 'Unknown'}
                          </Badge>
                          {pet.breed && <span className="text-sm">{pet.breed}</span>}
                        </div>
                        {pet.size && <Badge variant="secondary" className="text-xs">{pet.size}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {pet.age && <div>{pet.age} years</div>}
                        {pet.weight && <div>{pet.weight} lbs</div>}
                        <div className="flex gap-1">
                          {pet.is_vaccinated && (
                            <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                              ✓ Vaccinated
                            </Badge>
                          )}
                          {pet.is_microchipped && (
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                              🔗 Chipped
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(pet)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(pet.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PetsManager;