import { Button } from "@/components/ui/button";
import { PawPrint, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SubscriptionGuard from "@/components/subscriptions/SubscriptionGuard";
import Dashboard from "./Dashboard";

const Index = () => {
  const { user } = useAuth();

  // If user is logged in, show dashboard with subscription guard
  if (user) {
    return (
      <SubscriptionGuard>
        <Dashboard />
      </SubscriptionGuard>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <PawPrint className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">Welcome to FurMate</h1>
        <p className="text-xl text-muted-foreground mb-8">Professional Pet Grooming Management System</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
