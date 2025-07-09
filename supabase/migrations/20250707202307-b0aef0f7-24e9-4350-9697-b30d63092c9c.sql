-- Create tables for pet grooming SaaS

-- Services table for each salon
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clients table for each salon
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pets table linked to clients
CREATE TABLE public.pets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  size TEXT CHECK (size IN ('Small', 'Medium', 'Large')),
  age INTEGER,
  weight DECIMAL(5,2),
  notes TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  total_price DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table for appointment services (many-to-many)
CREATE TABLE public.appointment_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL, -- Price at time of booking
  UNIQUE(appointment_id, service_id)
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenant isolation

-- Services policies
CREATE POLICY "Users can view their own services" 
ON public.services FOR SELECT 
USING (auth.uid() = salon_id);

CREATE POLICY "Users can create their own services" 
ON public.services FOR INSERT 
WITH CHECK (auth.uid() = salon_id);

CREATE POLICY "Users can update their own services" 
ON public.services FOR UPDATE 
USING (auth.uid() = salon_id);

CREATE POLICY "Users can delete their own services" 
ON public.services FOR DELETE 
USING (auth.uid() = salon_id);

-- Clients policies
CREATE POLICY "Users can view their own clients" 
ON public.clients FOR SELECT 
USING (auth.uid() = salon_id);

CREATE POLICY "Users can create their own clients" 
ON public.clients FOR INSERT 
WITH CHECK (auth.uid() = salon_id);

CREATE POLICY "Users can update their own clients" 
ON public.clients FOR UPDATE 
USING (auth.uid() = salon_id);

CREATE POLICY "Users can delete their own clients" 
ON public.clients FOR DELETE 
USING (auth.uid() = salon_id);

-- Pets policies (through client ownership)
CREATE POLICY "Users can view pets of their clients" 
ON public.pets FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = pets.client_id 
  AND clients.salon_id = auth.uid()
));

CREATE POLICY "Users can create pets for their clients" 
ON public.pets FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = pets.client_id 
  AND clients.salon_id = auth.uid()
));

CREATE POLICY "Users can update pets of their clients" 
ON public.pets FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = pets.client_id 
  AND clients.salon_id = auth.uid()
));

CREATE POLICY "Users can delete pets of their clients" 
ON public.pets FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = pets.client_id 
  AND clients.salon_id = auth.uid()
));

-- Appointments policies
CREATE POLICY "Users can view their own appointments" 
ON public.appointments FOR SELECT 
USING (auth.uid() = salon_id);

CREATE POLICY "Users can create their own appointments" 
ON public.appointments FOR INSERT 
WITH CHECK (auth.uid() = salon_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments FOR UPDATE 
USING (auth.uid() = salon_id);

CREATE POLICY "Users can delete their own appointments" 
ON public.appointments FOR DELETE 
USING (auth.uid() = salon_id);

-- Appointment services policies
CREATE POLICY "Users can view appointment services for their appointments" 
ON public.appointment_services FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.appointments 
  WHERE appointments.id = appointment_services.appointment_id 
  AND appointments.salon_id = auth.uid()
));

CREATE POLICY "Users can create appointment services for their appointments" 
ON public.appointment_services FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.appointments 
  WHERE appointments.id = appointment_services.appointment_id 
  AND appointments.salon_id = auth.uid()
));

CREATE POLICY "Users can update appointment services for their appointments" 
ON public.appointment_services FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.appointments 
  WHERE appointments.id = appointment_services.appointment_id 
  AND appointments.salon_id = auth.uid()
));

CREATE POLICY "Users can delete appointment services for their appointments" 
ON public.appointment_services FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.appointments 
  WHERE appointments.id = appointment_services.appointment_id 
  AND appointments.salon_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();