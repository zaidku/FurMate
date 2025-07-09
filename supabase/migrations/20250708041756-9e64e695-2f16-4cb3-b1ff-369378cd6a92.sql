-- Update subscriptions table to handle different trial types
ALTER TABLE public.subscriptions 
ADD COLUMN trial_type TEXT DEFAULT 'basic',
ADD COLUMN trial_features_enabled BOOLEAN DEFAULT false;

-- Update subscription plans to include yearly savings
UPDATE public.subscription_plans 
SET price_yearly = CASE 
  WHEN name = 'Starter' THEN 269.99  -- 2 months free (29.99 * 10)
  WHEN name = 'Professional' THEN 719.99  -- 2 months free (79.99 * 9) 
  WHEN name = 'Enterprise' THEN 1799.99  -- 2 months free (199.99 * 9)
  ELSE price_yearly
END
WHERE price_yearly IS NOT NULL;

-- Create a basic trial plan for new users
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_clients, max_pets, max_appointments_per_month, features, is_active) 
VALUES ('Basic Trial', 'Free trial with limited features', 0, 0, 5, 10, 10, '["Basic appointment scheduling", "Limited client management"]'::jsonb, true)
ON CONFLICT DO NOTHING;