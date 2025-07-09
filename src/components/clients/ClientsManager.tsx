import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Users, Phone, Mail, PawPrint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

const ClientsManager = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    petName: "",
    petBreed: "",
    petSize: "Medium",
    petAge: "",
    petWeight: "",
    petNotes: "",
    petSpecialInstructions: ""
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('salon_id', user.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const clientData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        notes: formData.notes || null,
        salon_id: user.id
      };

      let clientId: string;

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);
        
        if (error) throw error;
        clientId = editingClient.id;
      } else {
        const { data: clientResult, error } = await supabase
          .from('clients')
          .insert([clientData])
          .select()
          .single();
        
        if (error) throw error;
        clientId = clientResult.id;

        // Add pet if pet information is provided
        if (formData.petName.trim()) {
          const petData = {
            client_id: clientId,
            name: formData.petName,
            pet_type: "Dog", // Default for new pets created via client form
            breed: formData.petBreed || null,
            size: formData.petSize,
            age: formData.petAge ? parseInt(formData.petAge) : null,
            weight: formData.petWeight ? parseFloat(formData.petWeight) : null,
            notes: formData.petNotes || null,
            special_instructions: formData.petSpecialInstructions || null
          };

          const { error: petError } = await supabase
            .from('pets')
            .insert(petData);

          if (petError) throw petError;
        }
      }

      toast({
        title: "Success",
        description: editingClient ? "Client updated successfully" : "Client and pet added successfully"
      });

      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "Failed to save client",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Client deleted successfully"
      });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive"
      });
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      petName: "",
      petBreed: "",
      petSize: "Medium",
      petAge: "",
      petWeight: "",
      petNotes: "",
      petSpecialInstructions: ""
    });
    setEditingClient(null);
    setIsAddDialogOpen(false);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
      petName: "",
      petBreed: "",
      petSize: "Medium",
      petAge: "",
      petWeight: "",
      petNotes: "",
      petSpecialInstructions: ""
    });
    setIsAddDialogOpen(true);
  };

  if (loading) {
    return <div className="p-6">Loading clients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Clients</h2>
          <p className="text-muted-foreground">Manage your client database and their pets</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingClient(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add New Client & Pet"}</DialogTitle>
              <DialogDescription>
                {editingClient ? "Update client information" : "Add a new client and their pet to your database"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Client Information</h3>
                
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Client's full name"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Client Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about the client..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Pet Information - Only show for new clients */}
              {!editingClient && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <PawPrint className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Pet Information (Optional)</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="petName">Pet Name</Label>
                        <Input
                          id="petName"
                          value={formData.petName}
                          onChange={(e) => setFormData({ ...formData, petName: e.target.value })}
                          placeholder="Pet's name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="petBreed">Breed</Label>
                        <Input
                          id="petBreed"
                          value={formData.petBreed}
                          onChange={(e) => setFormData({ ...formData, petBreed: e.target.value })}
                          placeholder="Dog/Cat breed"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="petSize">Size</Label>
                        <Select value={formData.petSize} onValueChange={(value) => setFormData({ ...formData, petSize: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Small">Small</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="petAge">Age (years)</Label>
                        <Input
                          id="petAge"
                          type="number"
                          value={formData.petAge}
                          onChange={(e) => setFormData({ ...formData, petAge: e.target.value })}
                          placeholder="Age"
                        />
                      </div>
                      <div>
                        <Label htmlFor="petWeight">Weight (lbs)</Label>
                        <Input
                          id="petWeight"
                          type="number"
                          step="0.1"
                          value={formData.petWeight}
                          onChange={(e) => setFormData({ ...formData, petWeight: e.target.value })}
                          placeholder="Weight"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="petNotes">Pet Notes</Label>
                      <Textarea
                        id="petNotes"
                        value={formData.petNotes}
                        onChange={(e) => setFormData({ ...formData, petNotes: e.target.value })}
                        placeholder="Behavior, temperament, etc."
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="petSpecialInstructions">Special Instructions</Label>
                      <Textarea
                        id="petSpecialInstructions"
                        value={formData.petSpecialInstructions}
                        onChange={(e) => setFormData({ ...formData, petSpecialInstructions: e.target.value })}
                        placeholder="Allergies, medical conditions, special handling..."
                        rows={2}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingClient ? "Update Client" : "Add Client & Pet"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
          <CardDescription>
            {filteredClients.length} of {clients.length} clients in your database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {clients.length === 0 ? 'No clients added yet' : 'No clients match your search'}
              </p>
              <p className="text-sm text-muted-foreground">
                {clients.length === 0 ? 'Add your first client to get started' : 'Try adjusting your search terms'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {client.address || "No address"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
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

export default ClientsManager;