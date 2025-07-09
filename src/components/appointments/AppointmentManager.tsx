import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import EditAppointmentDialog from "./EditAppointmentDialog";
import AppointmentForm from "./AppointmentForm";
import AppointmentCard from "./AppointmentCard";
import AppointmentWorkflow from "./AppointmentWorkflow";
import OverdueChecker from "./OverdueChecker";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Client, Pet, Service, Appointment } from "./types";

const AppointmentManager = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all required data
      const [appointmentsResult, clientsResult, petsResult, servicesResult] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            client:clients(id, name, email, phone),
            pet:pets(id, name, breed, size),
            appointment_services(
              id,
              service_id,
              price,
              service:services(id, name, price)
            )
          `)
          .eq('salon_id', user.id)
          .order('scheduled_at', { ascending: true }),
        
        supabase
          .from('clients')
          .select('id, name')
          .eq('salon_id', user.id)
          .order('name'),
        
        supabase
          .from('pets')
          .select('id, name, client_id')
          .order('name'),
        
        supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .eq('salon_id', user.id)
          .eq('is_active', true)
          .order('name')
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (petsResult.error) throw petsResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setAppointments(appointmentsResult.data || []);
      setClients(clientsResult.data || []);
      setPets(petsResult.data || []);
      setServices(servicesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load appointment data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time sync for appointments
  useRealtimeSync(fetchData, 'appointments');

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
  };

  // Filter appointments based on search term
  const filteredAppointments = appointments.filter(appointment =>
    appointment.pet?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (appointment as any).kennel_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overdue Pet Alert */}
      <OverdueChecker />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Appointments</h2>
          <p className="text-muted-foreground">Manage your appointment schedule with real-time updates</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-medium hover:shadow-glow transition-all">
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
        </Dialog>
        
        <AppointmentForm
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSuccess={fetchData}
          clients={clients}
          pets={pets}
          services={services}
        />
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments, pets, clients..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Live Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { status: 'scheduled', label: 'Scheduled', count: filteredAppointments.filter(a => a.status === 'scheduled').length },
          { status: 'checked_in', label: 'Checked In', count: filteredAppointments.filter(a => a.status === 'checked_in').length },
          { status: 'in_progress', label: 'In Progress', count: filteredAppointments.filter(a => a.status === 'in_progress').length },
          { status: 'ready_for_pickup', label: 'Ready', count: filteredAppointments.filter(a => a.status === 'ready_for_pickup').length }
        ].map((item) => (
          <Card key={item.status} className={`shadow-soft hover:shadow-medium transition-all status-${item.status}`}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{item.count}</div>
              <div className="text-sm">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAppointments.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {appointments.length === 0 ? 'No appointments scheduled' : 'No appointments match your search'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {appointments.length === 0 ? 'Create your first appointment to get started' : 'Try adjusting your search terms'}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up">
              <AppointmentCard
                appointment={appointment}
                onEdit={handleEditAppointment}
                onUpdate={fetchData}
              />
              <AppointmentWorkflow
                appointment={appointment}
                onUpdate={fetchData}
              />
            </div>
          ))}
        </div>
      )}

      {editingAppointment && (
        <EditAppointmentDialog
          appointment={editingAppointment}
          isOpen={!!editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onUpdate={fetchData}
          clients={clients}
          pets={pets}
          services={services}
        />
      )}
    </div>
  );
};

export default AppointmentManager;