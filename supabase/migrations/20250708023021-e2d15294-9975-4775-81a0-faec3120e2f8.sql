-- Add new columns to appointments table for check-in/out and kennel management
ALTER TABLE public.appointments 
ADD COLUMN check_in_time TIMESTAMPTZ,
ADD COLUMN check_out_time TIMESTAMPTZ,
ADD COLUMN kennel_number TEXT,
ADD COLUMN kennel_notes TEXT;

-- Create kennels table to manage kennel availability
CREATE TABLE public.kennels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL,
  kennel_number TEXT NOT NULL,
  kennel_size TEXT CHECK (kennel_size IN ('small', 'medium', 'large', 'extra_large')),
  is_occupied BOOLEAN DEFAULT FALSE,
  current_appointment_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salon_id, kennel_number)
);

-- Enable RLS on kennels table
ALTER TABLE public.kennels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for kennels
CREATE POLICY "Users can view their own kennels" 
ON public.kennels 
FOR SELECT 
USING (salon_id = auth.uid());

CREATE POLICY "Users can create their own kennels" 
ON public.kennels 
FOR INSERT 
WITH CHECK (salon_id = auth.uid());

CREATE POLICY "Users can update their own kennels" 
ON public.kennels 
FOR UPDATE 
USING (salon_id = auth.uid());

CREATE POLICY "Users can delete their own kennels" 
ON public.kennels 
FOR DELETE 
USING (salon_id = auth.uid());

-- Create trigger for kennels updated_at
CREATE TRIGGER update_kennels_updated_at
BEFORE UPDATE ON public.kennels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update appointment statuses to be more granular
ALTER TABLE public.appointments 
ALTER COLUMN status SET DEFAULT 'scheduled';

-- Add check constraint for appointment status
ALTER TABLE public.appointments 
ADD CONSTRAINT appointment_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled', 'no_show'));