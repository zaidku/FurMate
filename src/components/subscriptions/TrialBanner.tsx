import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CreditCard, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface TrialBannerProps {
  subscription: any;
  onUpgrade: () => void;
}

const TrialBanner = ({ subscription, onUpgrade }: TrialBannerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!subscription?.trial_end) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const trialEnd = new Date(subscription.trial_end);
      const diff = trialEnd.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Trial Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days} day${days > 1 ? 's' : ''} left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours > 1 ? 's' : ''} left`);
      } else {
        setTimeLeft(`${minutes} minute${minutes > 1 ? 's' : ''} left`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscription?.trial_end]);

  if (!subscription || subscription.status === 'active') return null;

  const isTrialExpired = subscription.status === 'trial_expired' || isExpired;

  return (
    <Card className={`border-2 ${isTrialExpired ? 'border-destructive bg-destructive/5' : 'border-warning bg-warning/5'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isTrialExpired ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Clock className="h-5 w-5 text-warning" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={isTrialExpired ? "destructive" : "outline"}>
                  {isTrialExpired ? "Trial Expired" : "Free Trial"}
                </Badge>
                {!isTrialExpired && (
                  <span className="text-sm font-medium text-warning">
                    {timeLeft}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isTrialExpired 
                  ? "Your trial has ended. Choose a plan to continue using FurMate."
                  : "Choose a plan to unlock all features and continue after trial."
                }
              </p>
            </div>
          </div>
          <Button onClick={onUpgrade} className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {isTrialExpired ? "Choose Plan" : "Upgrade Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialBanner;