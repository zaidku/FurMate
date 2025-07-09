-- Fix the status constraint issue by dropping any conflicting constraints and recreating the correct one
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointment_status_check;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Recreate the correct status constraint
ALTER TABLE public.appointments 
ADD CONSTRAINT appointment_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled', 'no_show'));

-- Add columns to track who performed check-in and check-out operations
ALTER TABLE public.appointments 
ADD COLUMN checked_in_by TEXT,
ADD COLUMN checked_out_by TEXT;