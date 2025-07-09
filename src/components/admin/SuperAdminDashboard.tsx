import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, CreditCard, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SalonData {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  subscription?: {
    status: string;
    plan_name: string;
    trial_end: string;
  };
  stats: {
    clients: number;
    pets: number;
    appointments: number;
  };
}

const SuperAdminDashboard = () => {
  const [salons, setSalons] = useState<SalonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSalons: 0,
    activeSubs: 0,
    trialUsers: 0,
    totalRevenue: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const fetchSuperAdminData = async () => {
    try {
      // Check if user is super admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'super_admin') {
        toast({
          title: "Access Denied",
          description: "You don't have super admin privileges",
          variant: "destructive"
        });
        return;
      }

      // Fetch all salon owners (users with salon_id = user_id in profiles)
      const { data: salonOwners, error: ownersError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          created_at
        `)
        .eq('role', 'owner');

      if (ownersError) throw ownersError;

      // For each salon owner, get their subscription and stats
      const salonData: SalonData[] = [];
      
      for (const owner of salonOwners || []) {
        // Get subscription info
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select(`
            status,
            trial_end,
            subscription_plans(name)
          `)
          .eq('salon_id', owner.user_id)
          .single();

        // Get stats
        const [clientsResult, petsResult, appointmentsResult] = await Promise.all([
          supabase.from('clients').select('id').eq('salon_id', owner.user_id),
          supabase.from('pets').select('id').eq('client_id', owner.user_id),
          supabase.from('appointments').select('id').eq('salon_id', owner.user_id)
        ]);

        salonData.push({
          id: owner.user_id,
          full_name: owner.full_name,
          email: owner.email || '',
          created_at: owner.created_at,
          subscription: subscription ? {
            status: subscription.status,
            plan_name: subscription.subscription_plans?.name || 'Unknown',
            trial_end: subscription.trial_end
          } : undefined,
          stats: {
            clients: clientsResult.data?.length || 0,
            pets: petsResult.data?.length || 0,
            appointments: appointmentsResult.data?.length || 0
          }
        });
      }

      setSalons(salonData);

      // Calculate overall stats
      const totalSalons = salonData.length;
      const activeSubs = salonData.filter(s => s.subscription?.status === 'active').length;
      const trialUsers = salonData.filter(s => s.subscription?.status === 'trial').length;

      setStats({
        totalSalons,
        activeSubs,
        trialUsers,
        totalRevenue: 0 // Would calculate from actual payments
      });

    } catch (error) {
      console.error('Error fetching super admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSalonStatus = async (salonId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('salon_id', salonId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Salon subscription status updated to ${newStatus}`
      });

      fetchSuperAdminData(); // Refresh data
    } catch (error) {
      console.error('Error updating salon status:', error);
      toast({
        title: "Error",
        description: "Failed to update salon status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading super admin dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all pet grooming salons</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salons</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSalons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="salons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="salons">All Salons</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="salons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salon Management</CardTitle>
              <CardDescription>Manage all registered pet grooming salons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salons.map((salon) => (
                  <div key={salon.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-medium">{salon.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{salon.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined: {new Date(salon.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex gap-4 text-sm">
                          <span>{salon.stats.clients} Clients</span>
                          <span>{salon.stats.pets} Pets</span>
                          <span>{salon.stats.appointments} Appointments</span>
                        </div>

                        {salon.subscription && (
                          <div className="flex items-center gap-2">
                            <Badge variant={salon.subscription.status === 'active' ? 'default' : 'outline'}>
                              {salon.subscription.status}
                            </Badge>
                            <span className="text-sm">{salon.subscription.plan_name}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Select
                          value={salon.subscription?.status || 'trial'}
                          onValueChange={(value) => updateSalonStatus(salon.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="canceled">Canceled</SelectItem>
                            <SelectItem value="past_due">Past Due</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Overview</CardTitle>
              <CardDescription>Monitor subscription statuses and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salons.filter(s => s.subscription).map((salon) => (
                  <div key={salon.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div>
                      <h3 className="font-medium">{salon.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{salon.subscription?.plan_name}</p>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant={salon.subscription?.status === 'active' ? 'default' : 'outline'}>
                        {salon.subscription?.status}
                      </Badge>
                      {salon.subscription?.status === 'trial' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Trial ends: {new Date(salon.subscription.trial_end).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;