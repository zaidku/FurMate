-- Update trial period to 1 week instead of 2 weeks
ALTER TABLE public.subscriptions 
ALTER COLUMN trial_end SET DEFAULT (now() + INTERVAL '7 days');

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  clients_count INTEGER DEFAULT 0,
  pets_count INTEGER DEFAULT 0,
  appointments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salon_id, month_year)
);

-- Enable RLS on usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for usage_tracking
CREATE POLICY "Users can view their own usage" ON public.usage_tracking
  FOR SELECT USING (salon_id = auth.uid());

CREATE POLICY "Users can update their own usage" ON public.usage_tracking
  FOR ALL USING (salon_id = auth.uid());

-- Create notifications table for reminders
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'usage_warning', 'limit_reached', 'trial_ending'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (salon_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (salon_id = auth.uid());

-- Create function to update usage tracking
CREATE OR REPLACE FUNCTION public.update_usage_tracking()
RETURNS TRIGGER AS $$
DECLARE
  current_month TEXT;
  salon_user_id UUID;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get salon_id based on the table
  IF TG_TABLE_NAME = 'clients' THEN
    salon_user_id := COALESCE(NEW.salon_id, OLD.salon_id);
  ELSIF TG_TABLE_NAME = 'pets' THEN
    -- Get salon_id from client
    SELECT c.salon_id INTO salon_user_id 
    FROM clients c 
    WHERE c.id = COALESCE(NEW.client_id, OLD.client_id);
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    salon_user_id := COALESCE(NEW.salon_id, OLD.salon_id);
  END IF;
  
  -- Insert or update usage tracking
  INSERT INTO public.usage_tracking (salon_id, month_year, clients_count, pets_count, appointments_count)
  VALUES (salon_user_id, current_month, 0, 0, 0)
  ON CONFLICT (salon_id, month_year) DO NOTHING;
  
  -- Update counts based on operation and table
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'clients' THEN
      UPDATE public.usage_tracking 
      SET clients_count = clients_count + 1, updated_at = now()
      WHERE salon_id = salon_user_id AND month_year = current_month;
    ELSIF TG_TABLE_NAME = 'pets' THEN
      UPDATE public.usage_tracking 
      SET pets_count = pets_count + 1, updated_at = now()
      WHERE salon_id = salon_user_id AND month_year = current_month;
    ELSIF TG_TABLE_NAME = 'appointments' THEN
      UPDATE public.usage_tracking 
      SET appointments_count = appointments_count + 1, updated_at = now()
      WHERE salon_id = salon_user_id AND month_year = current_month;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'clients' THEN
      UPDATE public.usage_tracking 
      SET clients_count = GREATEST(clients_count - 1, 0), updated_at = now()
      WHERE salon_id = salon_user_id AND month_year = current_month;
    ELSIF TG_TABLE_NAME = 'pets' THEN
      UPDATE public.usage_tracking 
      SET pets_count = GREATEST(pets_count - 1, 0), updated_at = now()
      WHERE salon_id = salon_user_id AND month_year = current_month;
    ELSIF TG_TABLE_NAME = 'appointments' THEN
      UPDATE public.usage_tracking 
      SET appointments_count = GREATEST(appointments_count - 1, 0), updated_at = now()
      WHERE salon_id = salon_user_id AND month_year = current_month;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for usage tracking
CREATE TRIGGER update_clients_usage
  AFTER INSERT OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_usage_tracking();

CREATE TRIGGER update_pets_usage
  AFTER INSERT OR DELETE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.update_usage_tracking();

CREATE TRIGGER update_appointments_usage
  AFTER INSERT OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_usage_tracking();

-- Create function to check usage limits and send notifications
CREATE OR REPLACE FUNCTION public.check_usage_limits(user_salon_id UUID)
RETURNS JSON AS $$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  subscription_record RECORD;
  plan_record RECORD;
  warning_threshold DECIMAL := 0.8; -- 80% threshold for warnings
  result JSON;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get current usage
  SELECT * INTO usage_record 
  FROM public.usage_tracking 
  WHERE salon_id = user_salon_id AND month_year = current_month;
  
  -- Get subscription and plan info
  SELECT s.*, sp.max_clients, sp.max_pets, sp.max_appointments_per_month, sp.name as plan_name
  INTO subscription_record
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.salon_id = user_salon_id;
  
  -- If no usage record, create it
  IF usage_record IS NULL THEN
    INSERT INTO public.usage_tracking (salon_id, month_year, clients_count, pets_count, appointments_count)
    VALUES (user_salon_id, current_month, 0, 0, 0)
    RETURNING * INTO usage_record;
  END IF;
  
  -- Build result
  result := json_build_object(
    'usage', json_build_object(
      'clients', COALESCE(usage_record.clients_count, 0),
      'pets', COALESCE(usage_record.pets_count, 0),
      'appointments', COALESCE(usage_record.appointments_count, 0)
    ),
    'limits', json_build_object(
      'clients', COALESCE(subscription_record.max_clients, 999999),
      'pets', COALESCE(subscription_record.max_pets, 999999),
      'appointments', COALESCE(subscription_record.max_appointments_per_month, 999999)
    ),
    'plan_name', COALESCE(subscription_record.plan_name, 'Trial'),
    'warnings', json_build_array()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;