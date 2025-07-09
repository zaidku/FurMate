-- Fix pricing: 2 months free = 10-month price (REAL discounts)
UPDATE public.subscription_plans 
SET price_yearly = CASE 
  WHEN name = 'Starter' THEN 150.00  -- $15 * 10 months
  WHEN name = 'Professional' THEN 250.00  -- $25 * 10 months
  WHEN name = 'Enterprise' THEN 350.00  -- $35 * 10 months
  ELSE price_yearly
END,
price_monthly = CASE 
  WHEN name = 'Starter' THEN 15.00
  WHEN name = 'Professional' THEN 25.00
  WHEN name = 'Enterprise' THEN 35.00
  ELSE price_monthly
END;

-- Delete 'Basic Trial' plan
DELETE FROM public.subscription_plans WHERE name = 'Basic Trial';

-- Expire any old basic trial subs
UPDATE public.subscriptions 
SET status = 'trial_expired', 
    trial_end = now() - INTERVAL '1 day'
WHERE trial_type = 'basic' AND status = 'trial';