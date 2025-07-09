import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OverdueAppointment {
  id: string;
  pet: { name: string };
  client: { name: string; phone?: string };
  check_in_time: string;
  kennel_number?: string;
  status: string;
}

const OverdueChecker = () => {
  const [overdueAppointments, setOverdueAppointments] = useState<OverdueAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkOverdueAppointments();
    // Check every 30 minutes for overdue pets
    const interval = setInterval(checkOverdueAppointments, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkOverdueAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find appointments checked in more than 8 hours ago but not completed
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 8);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          check_in_time,
          kennel_number,
          status,
          pet:pets(name),
          client:clients(name, phone)
        `)
        .eq('salon_id', user.id)
        .in('status', ['checked_in', 'in_progress', 'ready_for_pickup'])
        .not('check_in_time', 'is', null)
        .lt('check_in_time', cutoffTime.toISOString());

      if (error) throw error;

      setOverdueAppointments(data || []);
      
      // Show toast notification if there are overdue pets
      if (data && data.length > 0) {
        toast({
          title: "⚠️ Overdue Pets Alert",
          description: `${data.length} pet(s) have been checked in for over 8 hours`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking overdue appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHoursOverdue = (checkInTime: string) => {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    return Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
  };

  if (loading) return null;

  if (overdueAppointments.length === 0) return null;

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Overdue Pet Alert
        </CardTitle>
        <CardDescription>
          The following pets have been checked in for over 8 hours and need immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdueAppointments.map((appointment) => (
          <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-destructive" />
              <div>
                <div className="font-medium">{appointment.pet.name}</div>
                <div className="text-sm text-muted-foreground">
                  Owner: {appointment.client.name}
                  {appointment.kennel_number && ` • Kennel: ${appointment.kennel_number}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                {getHoursOverdue(appointment.check_in_time)}h overdue
              </Badge>
              {appointment.client.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`tel:${appointment.client.phone}`)}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button 
          onClick={checkOverdueAppointments} 
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          Refresh Check
        </Button>
      </CardContent>
    </Card>
  );
};

export default OverdueChecker;