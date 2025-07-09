-- Update subscription plan pricing to 15, 25, 35
UPDATE public.subscription_plans 
SET 
  price_monthly = 15.00,
  price_yearly = 150.00
WHERE name = 'Starter';

UPDATE public.subscription_plans 
SET 
  price_monthly = 25.00,
  price_yearly = 250.00
WHERE name = 'Professional';

UPDATE public.subscription_plans 
SET 
  price_monthly = 35.00,
  price_yearly = 350.00
WHERE name = 'Enterprise';