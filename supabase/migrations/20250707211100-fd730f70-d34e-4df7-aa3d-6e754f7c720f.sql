-- Add subscription tables and super admin role
-- First, add super_admin to the app_role enum
ALTER TYPE app_role ADD VALUE 'super_admin';

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  max_clients INTEGER,
  max_pets INTEGER,
  max_appointments_per_month INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, canceled, past_due
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans (readable by all authenticated users)
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage subscription plans" ON public.subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (salon_id = auth.uid());

CREATE POLICY "Super admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_clients, max_pets, max_appointments_per_month, features) VALUES
('Starter', 'Perfect for small pet grooming businesses', 29.99, 299.99, 50, 100, 200, '["Basic appointment scheduling", "Client management", "Basic reporting"]'::jsonb),
('Professional', 'For growing pet grooming businesses', 79.99, 799.99, 200, 500, 1000, '["Advanced appointment scheduling", "Client management", "Pet profiles", "Advanced reporting", "Email notifications"]'::jsonb),
('Enterprise', 'For large pet grooming operations', 199.99, 1999.99, 1000, 2500, 5000, '["Unlimited appointments", "Multi-location support", "Advanced analytics", "API access", "Priority support"]'::jsonb);

-- Add super admin profile for the system owner
-- Note: You'll need to manually set a user as super_admin after they sign up
-- UPDATE profiles SET role = 'super_admin' WHERE user_id = 'your-user-id';