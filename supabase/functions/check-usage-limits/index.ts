import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-USAGE-LIMITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check usage limits using the database function
    const { data: usageData, error: usageError } = await supabaseClient
      .rpc('check_usage_limits', { user_salon_id: user.id });

    if (usageError) {
      logStep("Error checking usage limits", { error: usageError });
      throw usageError;
    }

    logStep("Usage limits checked", usageData);

    // Check if user is approaching limits and create notifications
    const usage = usageData.usage;
    const limits = usageData.limits;
    const warnings = [];

    // Check for 80% usage warnings
    if (usage.clients >= limits.clients * 0.8) {
      warnings.push({
        type: 'usage_warning',
        resource: 'clients',
        percentage: Math.round((usage.clients / limits.clients) * 100)
      });
    }
    if (usage.pets >= limits.pets * 0.8) {
      warnings.push({
        type: 'usage_warning',
        resource: 'pets',
        percentage: Math.round((usage.pets / limits.pets) * 100)
      });
    }
    if (usage.appointments >= limits.appointments * 0.8) {
      warnings.push({
        type: 'usage_warning',
        resource: 'appointments',
        percentage: Math.round((usage.appointments / limits.appointments) * 100)
      });
    }

    // Check for limit reached
    const limitsReached = [];
    if (usage.clients >= limits.clients) limitsReached.push('clients');
    if (usage.pets >= limits.pets) limitsReached.push('pets');
    if (usage.appointments >= limits.appointments) limitsReached.push('appointments');

    // Create notifications for warnings and limit reached
    if (warnings.length > 0 || limitsReached.length > 0) {
      for (const warning of warnings) {
        await supabaseClient.from('notifications').insert({
          salon_id: user.id,
          type: 'usage_warning',
          title: `${warning.resource.charAt(0).toUpperCase() + warning.resource.slice(1)} Usage Warning`,
          message: `You've used ${warning.percentage}% of your ${warning.resource} limit this month.`
        });
      }

      for (const resource of limitsReached) {
        await supabaseClient.from('notifications').insert({
          salon_id: user.id,
          type: 'limit_reached',
          title: `${resource.charAt(0).toUpperCase() + resource.slice(1)} Limit Reached`,
          message: `You've reached your ${resource} limit for this month. Consider upgrading your plan.`
        });
      }
    }

    return new Response(JSON.stringify({
      usage: usageData.usage,
      limits: usageData.limits,
      plan_name: usageData.plan_name,
      warnings,
      limits_reached: limitsReached,
      can_add: {
        clients: usage.clients < limits.clients,
        pets: usage.pets < limits.pets,
        appointments: usage.appointments < limits.appointments
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-usage-limits", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});