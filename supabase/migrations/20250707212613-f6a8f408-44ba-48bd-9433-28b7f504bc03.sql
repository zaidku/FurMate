-- Fix infinite recursion in profiles RLS policies by creating security definer functions

-- Create function to get current user's role (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to get current user's salon_id (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_salon_id()
RETURNS UUID AS $$
  SELECT salon_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their salon" ON public.profiles;
DROP POLICY IF EXISTS "Owners and managers can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;

-- Recreate profiles policies without recursion
CREATE POLICY "Users can view profiles in their salon" ON public.profiles
  FOR SELECT USING (
    salon_id = auth.uid() OR 
    user_id = auth.uid() OR 
    public.get_current_user_role() = ANY(ARRAY['owner'::app_role, 'manager'::app_role])
  );

CREATE POLICY "Owners and managers can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = salon_id OR 
    public.get_current_user_role() = ANY(ARRAY['owner'::app_role, 'manager'::app_role])
  );

-- Recreate subscription policies without recursion
CREATE POLICY "Super admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.get_current_user_role() = 'super_admin'::app_role);

CREATE POLICY "Super admins can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (public.get_current_user_role() = 'super_admin'::app_role);

CREATE POLICY "Super admins can manage subscription plans" ON public.subscription_plans
  FOR ALL USING (public.get_current_user_role() = 'super_admin'::app_role);