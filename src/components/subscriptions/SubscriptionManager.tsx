import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_clients: number;
  max_pets: number;
  max_appointments_per_month: number;
  features: any;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  trial_end: string;
  trial_type: string;
  trial_features_enabled: boolean;
  subscription_plans: SubscriptionPlan;
}

const SubscriptionManager = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (plansError) throw plansError;

      // Fetch current subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('salon_id', user.id)
        .maybeSingle();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      setPlans(plansData || []);
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, billingInterval = 'month') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId, billingInterval }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive"
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        // Open Stripe customer portal in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive"
      });
    }
  };

  const refreshSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      // Refresh the page data
      fetchData();
      
      toast({
        title: "Success",
        description: "Subscription status refreshed",
      });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        title: "Error",
        description: "Failed to refresh subscription status",
        variant: "destructive"
      });
    }
  };

  const getSubscriptionStatus = () => {
    if (!currentSubscription) return "No subscription";
    
    const now = new Date();
    const trialEnd = new Date(currentSubscription.trial_end);
    
    if (currentSubscription.status === 'trial' && now < trialEnd) {
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const trialType = currentSubscription.trial_type === 'basic' ? 'Basic Trial' : 'Premium Trial';
      return `${trialType} (${daysLeft} days left)`;
    }
    
    return currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1);
  };

  if (loading) {
    return <div className="p-6">Loading subscription information...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Subscription</h2>
        <p className="text-muted-foreground">Manage your subscription plan</p>
      </div>

      {currentSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Current Plan: {currentSubscription.subscription_plans.name}
            </CardTitle>
            <CardDescription>
              Status: <Badge variant="outline">{getSubscriptionStatus()}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <span className="font-medium">Max Clients:</span>
                <p>{currentSubscription.subscription_plans.max_clients}</p>
              </div>
              <div>
                <span className="font-medium">Max Pets:</span>
                <p>{currentSubscription.subscription_plans.max_pets}</p>
              </div>
              <div>
                <span className="font-medium">Monthly Appointments:</span>
                <p>{currentSubscription.subscription_plans.max_appointments_per_month}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleManageSubscription} variant="outline">
                Manage Subscription
              </Button>
              <Button onClick={refreshSubscription} variant="outline" size="sm">
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          
          return (
            <Card key={plan.id} className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
              {isCurrentPlan && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Current Plan
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="text-3xl font-bold">
                  ${plan.price_monthly}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
                {plan.price_yearly && (
                  <div className="text-sm text-muted-foreground">
                    or ${plan.price_yearly}/year (save ${(plan.price_monthly * 12 - plan.price_yearly).toFixed(2)})
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Max Clients:</span>
                    <span className="font-medium">{plan.max_clients}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Max Pets:</span>
                    <span className="font-medium">{plan.max_pets}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Appointments:</span>
                    <span className="font-medium">{plan.max_appointments_per_month}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Features:</h4>
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan ? "outline" : "default"}
                    onClick={() => handleSubscribe(plan.id, 'month')}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? "Current Plan" : "Choose Monthly"}
                  </Button>
                  
                  {plan.price_yearly && !isCurrentPlan && (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleSubscribe(plan.id, 'year')}
                    >
                      Choose Yearly (Save ${(plan.price_monthly * 12 - plan.price_yearly).toFixed(2)})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionManager;