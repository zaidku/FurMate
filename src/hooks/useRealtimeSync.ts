import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useRealtimeSync = (onUpdate: () => void, tableName: string) => {
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Create a channel for real-time updates
        channelRef.current = supabase
          .channel(`${tableName}-changes`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: tableName,
              filter: `salon_id=eq.${user.id}` // Only listen to changes for current salon
            },
            (payload) => {
              console.log(`Real-time update for ${tableName}:`, payload);
              
              // Provide user feedback for certain events
              if (payload.eventType === 'UPDATE' && tableName === 'appointments') {
                const newStatus = payload.new?.status;
                const oldStatus = payload.old?.status;
                
                if (newStatus !== oldStatus && newStatus) {
                  toast({
                    title: "Appointment Updated",
                    description: `Status changed to ${newStatus.replace('_', ' ').toUpperCase()}`,
                    duration: 3000
                  });
                }
              }
              
              // Trigger the update callback
              onUpdate();
            }
          )
          .subscribe((status) => {
            console.log(`Realtime subscription status for ${tableName}:`, status);
          });

      } catch (error) {
        console.error(`Error setting up realtime for ${tableName}:`, error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tableName, onUpdate, toast]);

  return channelRef.current;
};