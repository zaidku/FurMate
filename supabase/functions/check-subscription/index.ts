import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, checking for existing trial");
      
      // Check if user already has a subscription record
      const { data: existingSub } = await supabaseClient
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('salon_id', user.id)
        .single();
      
      if (existingSub) {
        logStep("Existing subscription found", { status: existingSub.status, trialType: existingSub.trial_type });
        return new Response(JSON.stringify({ 
          subscribed: false, 
          status: existingSub.status,
          trial_end: existingSub.trial_end,
          trial_type: existingSub.trial_type,
          plan_id: existingSub.plan_id
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Get basic trial plan
      const { data: basicPlan } = await supabaseClient
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Basic Trial')
        .single();
      
      logStep("Creating new basic trial for new user");
      await supabaseClient.from("subscriptions").upsert({
        salon_id: user.id,
        plan_id: basicPlan?.id || null,
        stripe_subscription_id: null,
        status: 'trial',
        trial_type: 'basic',
        trial_features_enabled: false,
        trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'salon_id' });
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        status: 'trial',
        trial_type: 'basic',
        trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        plan_id: basicPlan?.id || null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let currentPeriodEnd = null;
    let planId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: currentPeriodEnd 
      });

      // Get plan from Stripe price
      const stripePrice = subscription.items.data[0].price;
      const { data: plans } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .or(`stripe_price_id_monthly.eq.${stripePrice.id},stripe_price_id_yearly.eq.${stripePrice.id}`);
      
      if (plans && plans.length > 0) {
        planId = plans[0].id;
        logStep("Found matching plan", { planId, planName: plans[0].name });
      }

      // Update subscription in database
      await supabaseClient.from("subscriptions").upsert({
        salon_id: user.id,
        plan_id: planId,
        stripe_subscription_id: subscription.id,
        status: 'active',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: currentPeriodEnd,
        trial_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'salon_id' });
    } else {
      logStep("No active subscription found, checking trial status");
      
      // Check existing subscription record
      const { data: existingSub } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('salon_id', user.id)
        .single();
      
      if (!existingSub) {
        // Get basic trial plan for new users
        const { data: basicPlan } = await supabaseClient
          .from('subscription_plans')
          .select('id')
          .eq('name', 'Basic Trial')
          .single();
          
        logStep("Creating basic trial for customer without active subscription");
        await supabaseClient.from("subscriptions").upsert({
          salon_id: user.id,
          plan_id: basicPlan?.id || null,
          stripe_subscription_id: null,
          status: 'trial',
          trial_type: 'basic',
          trial_features_enabled: false,
          trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'salon_id' });
      }
    }

    logStep("Updated database with subscription info", { subscribed: hasActiveSub });
    
    // Get final subscription state
    const { data: finalSub } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('salon_id', user.id)
      .single();
    
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      status: hasActiveSub ? 'active' : (finalSub?.status || 'trial'),
      current_period_end: currentPeriodEnd,
      trial_end: finalSub?.trial_end,
      trial_type: finalSub?.trial_type,
      plan_id: planId || finalSub?.plan_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});