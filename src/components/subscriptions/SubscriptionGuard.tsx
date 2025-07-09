import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, CheckCircle } from "lucide-react";
import SubscriptionManager from "./SubscriptionManager";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // Allow access if subscription is active or still in valid trial
  const hasAccess = subscription?.subscribed || 
    (subscription?.status === 'trial' && subscription?.trial_end && new Date(subscription.trial_end) > new Date());

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show subscription selection if no access
  if (showPlans) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <Button 
              variant="outline" 
              onClick={() => setShowPlans(false)}
              className="mb-4"
            >
              ← Back
            </Button>
            <h1 className="text-3xl font-bold">Choose Your Plan</h1>
            <p className="text-muted-foreground">Select a subscription to continue using FurMate</p>
          </div>
          <SubscriptionManager />
        </div>
      </div>
    );
  }

  // Show trial expired / no access screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Subscription Required</CardTitle>
          <CardDescription>
            {subscription?.status === 'trial_expired' 
              ? "Your free trial has ended. Choose a plan to continue."
              : "Choose a plan to access FurMate's full features."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.status === 'trial_expired' && (
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <Badge variant="destructive" className="mb-2">Trial Expired</Badge>
              <p className="text-sm text-muted-foreground">
                Your trial ended on {new Date(subscription.trial_end).toLocaleDateString()}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>14-day trial with full features</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Professional grooming tools</span>
            </div>
          </div>

          <Button 
            onClick={() => setShowPlans(true)} 
            className="w-full"
            size="lg"
          >
            <Crown className="h-4 w-4 mr-2" />
            View Plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionGuard;