-- Update subscription_plans with Stripe price IDs for integration
-- Note: Users will need to update these with actual Stripe price IDs from their dashboard

-- Update existing plans with placeholder Stripe price IDs
UPDATE public.subscription_plans 
SET 
  stripe_price_id_monthly = CASE 
    WHEN name = 'Starter' THEN 'price_starter_monthly_placeholder'
    WHEN name = 'Professional' THEN 'price_professional_monthly_placeholder'
    WHEN name = 'Enterprise' THEN 'price_enterprise_monthly_placeholder'
  END,
  stripe_price_id_yearly = CASE 
    WHEN name = 'Starter' THEN 'price_starter_yearly_placeholder'
    WHEN name = 'Professional' THEN 'price_professional_yearly_placeholder'
    WHEN name = 'Enterprise' THEN 'price_enterprise_yearly_placeholder'
  END
WHERE name IN ('Starter', 'Professional', 'Enterprise');