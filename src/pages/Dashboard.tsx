import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TrialBanner from "@/components/subscriptions/TrialBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  PawPrint, 
  Users, 
  Scissors, 
  DollarSign, 
  Clock,
  Plus,
  Bell,
  Search,
  LogOut,
  CreditCard,
  Shield,
  MapPin,
  Building2
} from "lucide-react";
import ServicesManager from "@/components/services/ServicesManager";
import ClientsManager from "@/components/clients/ClientsManager";
import PetsManager from "@/components/pets/PetsManager";
import AppointmentManager from "@/components/appointments/AppointmentManager";
import ProfilesManager from "@/components/profiles/ProfilesManager";
import SubscriptionManager from "@/components/subscriptions/SubscriptionManager";
import SuperAdminDashboard from "@/components/admin/SuperAdminDashboard";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import PaymentHistory from "@/components/payments/PaymentHistory";
import KennelManager from "@/components/kennels/KennelManager";
import SalonSettingsManager from "@/components/salon/SalonSettingsManager";
import ReportsManager from "@/components/reports/ReportsManager";

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [userRole, setUserRole] = useState<string>('');
  const [subscription, setSubscription] = useState<any>(null);
  const { signOut, user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        setUserRole(data?.role || '');
      }
    };
    
    const checkSubscription = async () => {
      if (user) {
        try {
          const { data } = await supabase.functions.invoke('check-subscription');
          setSubscription(data);
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    };
    
    fetchUserRole();
    checkSubscription();
  }, [user]);

  // Real data state
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentPets, setRecentPets] = useState([]);
  const [stats, setStats] = useState([
    { title: "Today's Appointments", value: "0", icon: Calendar, color: "text-blue-600" },
    { title: "Total Pets", value: "0", icon: PawPrint, color: "text-green-600" },
    { title: "Active Clients", value: "0", icon: Users, color: "text-purple-600" },
    { title: "Revenue (Month)", value: "$0", icon: DollarSign, color: "text-yellow-600" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch today's appointments - fix timezone and date comparison
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            *,
            clients(name),
            pets(name),
            services(name)
          `)
          .eq('salon_id', user.id)
          .gte('scheduled_at', todayStart)
          .lt('scheduled_at', todayEnd)
          .order('scheduled_at');

        // Fetch recent pets
        const { data: pets } = await supabase
          .from('pets')
          .select(`
            *,
            clients(name, salon_id)
          `)
          .eq('clients.salon_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch stats
        const { count: appointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('salon_id', user.id)
          .gte('scheduled_at', todayStart)
          .lt('scheduled_at', todayEnd);

        const { count: petsCount } = await supabase
          .from('pets')
          .select('clients!inner(salon_id)', { count: 'exact', head: true })
          .eq('clients.salon_id', user.id);

        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('salon_id', user.id);

        // Calculate revenue for current month
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const { data: revenueData } = await supabase
          .from('appointments')
          .select('total_price')
          .eq('salon_id', user.id)
          .eq('status', 'completed')
          .gte('scheduled_at', firstDayOfMonth);

        const monthlyRevenue = revenueData?.reduce((sum, appointment) => sum + (appointment.total_price || 0), 0) || 0;

        // Update state
        setTodayAppointments(appointments || []);
        setRecentPets(pets || []);
        setStats([
          { title: "Today's Appointments", value: appointmentsCount?.toString() || "0", icon: Calendar, color: "text-blue-600" },
          { title: "Total Pets", value: petsCount?.toString() || "0", icon: PawPrint, color: "text-green-600" },
          { title: "Active Clients", value: clientsCount?.toString() || "0", icon: Users, color: "text-purple-600" },
          { title: "Revenue (Month)", value: `$${monthlyRevenue.toFixed(2)}`, icon: DollarSign, color: "text-yellow-600" },
        ]);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-6 justify-between">
          <div className="flex items-center space-x-4">
            <PawPrint className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">FurMate</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {subscription && (
              <Badge 
                variant={subscription.subscribed ? "default" : subscription.status === 'trial' ? "outline" : "destructive"}
                className="hidden md:flex"
              >
                {subscription.subscribed ? "Pro" : subscription.status === 'trial' ? "Trial" : "Expired"}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => {
              // Global search functionality - you can expand this
              const searchTerm = prompt("Search for appointments, pets, or clients:");
              if (searchTerm) {
                console.log("Global search for:", searchTerm);
              }
            }}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarFallback>
                  {user?.email?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden md:block">
                {user?.email}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card min-h-screen">
          <nav className="p-4 space-y-2">
            <Button
              variant={selectedTab === "overview" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("overview")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={selectedTab === "appointments" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("appointments")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Appointments
            </Button>
            <Button
              variant={selectedTab === "pets" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("pets")}
            >
              <PawPrint className="h-4 w-4 mr-2" />
              Pets
            </Button>
            <Button
              variant={selectedTab === "clients" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("clients")}
            >
              <Users className="h-4 w-4 mr-2" />
              Clients
            </Button>
            <Button
              variant={selectedTab === "services" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("services")}
            >
              <Scissors className="h-4 w-4 mr-2" />
              Services
            </Button>
            <Button
              variant={selectedTab === "profiles" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("profiles")}
            >
              <Users className="h-4 w-4 mr-2" />
              Team
            </Button>
            <Button
              variant={selectedTab === "subscription" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("subscription")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
            </Button>
            <Button
              variant={selectedTab === "payments" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("payments")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Payment History
            </Button>
            <Button
              variant={selectedTab === "kennels" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("kennels")}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Kennels
            </Button>
            <Button
              variant={selectedTab === "settings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("settings")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant={selectedTab === "reports" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("reports")}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Reports
            </Button>
            {userRole === 'super_admin' && (
              <Button
                variant={selectedTab === "admin" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedTab("admin")}
              >
                <Shield className="h-4 w-4 mr-2" />
                Super Admin
              </Button>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {selectedTab === "overview" && (
            <div className="space-y-6">
              {subscription && (
                <TrialBanner 
                  subscription={subscription} 
                  onUpgrade={() => setSelectedTab("subscription")} 
                />
              )}
              
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-foreground">Dashboard Overview</h2>
                <Button onClick={() => setSelectedTab("appointments")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Appointments */}
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Appointments</CardTitle>
                    <CardDescription>Upcoming appointments for today</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {loading ? (
                         <div className="text-center text-muted-foreground">Loading appointments...</div>
                       ) : todayAppointments.length === 0 ? (
                         <div className="text-center text-muted-foreground">No appointments today</div>
                       ) : (
                         todayAppointments.map((appointment) => (
                           <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                             <div className="flex items-center space-x-3">
                               <div className="text-sm font-medium">
                                 {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </div>
                               <div>
                                 <div className="font-medium">{appointment.pets?.name}</div>
                                 <div className="text-sm text-muted-foreground">{appointment.clients?.name}</div>
                               </div>
                             </div>
                             <div className="text-right">
                               <div className="text-sm">{appointment.services?.name || 'Service TBD'}</div>
                               <Badge variant={appointment.status === "confirmed" ? "default" : "secondary"}>
                                 {appointment.status}
                               </Badge>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                  </CardContent>
                </Card>

                {/* Recent Pets */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Pets</CardTitle>
                    <CardDescription>Recently groomed pets</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {loading ? (
                         <div className="text-center text-muted-foreground">Loading pets...</div>
                       ) : recentPets.length === 0 ? (
                         <div className="text-center text-muted-foreground">No pets yet</div>
                       ) : (
                         recentPets.map((pet) => (
                           <div key={pet.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                             <Avatar>
                               <AvatarFallback>{pet.name?.[0]}</AvatarFallback>
                             </Avatar>
                             <div className="flex-1">
                               <div className="font-medium">{pet.name}</div>
                               <div className="text-sm text-muted-foreground">{pet.breed}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-sm">{pet.clients?.name}</div>
                               <div className="text-xs text-muted-foreground">
                                 Added: {new Date(pet.created_at).toLocaleDateString()}
                               </div>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <div className="lg:col-span-1">
                  <NotificationCenter />
                </div>
              </div>
            </div>
          )}

          {selectedTab === "appointments" && <AppointmentManager />}

          {selectedTab === "pets" && <PetsManager />}

          {selectedTab === "clients" && <ClientsManager />}

          {selectedTab === "services" && <ServicesManager />}

          {selectedTab === "profiles" && <ProfilesManager />}

          {selectedTab === "subscription" && <SubscriptionManager />}

          {selectedTab === "payments" && <PaymentHistory />}

          {selectedTab === "kennels" && <KennelManager />}

          {selectedTab === "settings" && <SalonSettingsManager />}

          {selectedTab === "admin" && <SuperAdminDashboard />}

          {selectedTab === "reports" && <ReportsManager />}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;