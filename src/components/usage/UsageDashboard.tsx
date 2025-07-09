import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, Heart, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsageData {
  usage: {
    clients: number;
    pets: number;
    appointments: number;
  };
  limits: {
    clients: number;
    pets: number;
    appointments: number;
  };
  plan_name: string;
  warnings: Array<{
    type: string;
    resource: string;
    percentage: number;
  }>;
  limits_reached: string[];
  can_add: {
    clients: boolean;
    pets: boolean;
    appointments: boolean;
  };
}

const UsageDashboard = () => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-usage-limits');
      
      if (error) throw error;
      
      setUsageData(data);
    } catch (error) {
      console.error('Error fetching usage data:', error);
      toast({
        title: "Error",
        description: "Failed to load usage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgressVariant = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 100) return "destructive";
    if (percentage >= 80) return "warning";
    return "default";
  };

  const getStatusBadge = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100;
    if (percentage >= 100) return <Badge variant="destructive">Limit Reached</Badge>;
    if (percentage >= 80) return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
    return <Badge variant="outline" className="border-success text-success">Good</Badge>;
  };

  if (loading) {
    return <div className="p-6">Loading usage information...</div>;
  }

  if (!usageData) {
    return <div className="p-6">No usage data available</div>;
  }

  const usageItems = [
    {
      icon: Users,
      label: "Clients",
      usage: usageData.usage.clients,
      limit: usageData.limits.clients,
      key: "clients"
    },
    {
      icon: Heart,
      label: "Pets",
      usage: usageData.usage.pets,
      limit: usageData.limits.pets,
      key: "pets"
    },
    {
      icon: Calendar,
      label: "Appointments (This Month)",
      usage: usageData.usage.appointments,
      limit: usageData.limits.appointments,
      key: "appointments"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Usage Dashboard</h2>
        <p className="text-muted-foreground">Track your current usage against plan limits</p>
      </div>

      {/* Warnings Alert */}
      {(usageData.warnings.length > 0 || usageData.limits_reached.length > 0) && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Usage Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {usageData.warnings.map((warning, index) => (
              <p key={index} className="text-sm">
                <strong>{warning.resource.charAt(0).toUpperCase() + warning.resource.slice(1)}:</strong> {warning.percentage}% of limit used
              </p>
            ))}
            {usageData.limits_reached.map((resource, index) => (
              <p key={index} className="text-sm text-destructive">
                <strong>{resource.charAt(0).toUpperCase() + resource.slice(1)}:</strong> Limit reached! Consider upgrading your plan.
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Usage Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {usageItems.map((item) => {
          const Icon = item.icon;
          const percentage = (item.usage / item.limit) * 100;
          
          return (
            <Card key={item.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {item.label}
                  </div>
                  {getStatusBadge(item.usage, item.limit)}
                </CardTitle>
                <CardDescription>
                  {item.usage} of {item.limit} used
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{item.usage}</span>
                  <span>{Math.round(percentage)}%</span>
                  <span>{item.limit}</span>
                </div>
                {!usageData.can_add[item.key as keyof typeof usageData.can_add] && (
                  <p className="text-sm text-destructive">
                    Cannot add more {item.key} - limit reached
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan: {usageData.plan_name}</CardTitle>
          <CardDescription>
            Your monthly usage limits and current consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <span>Need higher limits?</span>
            <Button onClick={fetchUsageData} variant="outline" size="sm">
              Refresh Usage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageDashboard;