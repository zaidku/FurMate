import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsageLimits {
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
  can_add: {
    clients: boolean;
    pets: boolean;
    appointments: boolean;
  };
  plan_name: string;
}

export const useUsageLimits = () => {
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsageLimits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-usage-limits');
      
      if (error) throw error;
      
      setUsageLimits(data);
    } catch (error) {
      console.error('Error fetching usage limits:', error);
      toast({
        title: "Error",
        description: "Failed to load usage limits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageLimits();
  }, []);

  const checkLimit = (type: 'clients' | 'pets' | 'appointments'): boolean => {
    if (!usageLimits) return true; // Allow if limits not loaded yet
    return usageLimits.can_add[type];
  };

  const showLimitWarning = (type: 'clients' | 'pets' | 'appointments') => {
    if (!usageLimits) return;
    
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    toast({
      title: `${typeName} Limit Reached`,
      description: `You've reached your ${type} limit for this month. Consider upgrading your plan.`,
      variant: "destructive"
    });
  };

  return {
    usageLimits,
    loading,
    fetchUsageLimits,
    checkLimit,
    showLimitWarning
  };
};