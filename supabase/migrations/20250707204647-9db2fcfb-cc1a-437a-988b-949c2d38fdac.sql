-- Create invitations table for team member invites
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL,
  email TEXT NOT NULL,
  role app_role DEFAULT 'staff',
  invited_by UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations
CREATE POLICY "Users can view invitations for their salon" 
ON public.invitations FOR SELECT 
USING (
  salon_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'manager')
    AND salon_id = invitations.salon_id
  )
);

CREATE POLICY "Owners and managers can create invitations" 
ON public.invitations FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'manager')
    AND salon_id = invitations.salon_id
  )
);

CREATE POLICY "Owners and managers can update invitations" 
ON public.invitations FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'manager')
    AND salon_id = invitations.salon_id
  )
);

-- Add trigger for invitations timestamp updates
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user function to check for invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE email = NEW.email 
    AND status = 'pending' 
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF invitation_record IS NOT NULL THEN
    -- User was invited, add them to the salon with the invited role
    INSERT INTO public.profiles (user_id, full_name, email, salon_id, role)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
      NEW.email,
      invitation_record.salon_id,
      invitation_record.role
    );
    
    -- Mark invitation as accepted
    UPDATE public.invitations 
    SET status = 'accepted', updated_at = now()
    WHERE id = invitation_record.id;
  ELSE
    -- No invitation, create as salon owner (first user)
    INSERT INTO public.profiles (user_id, full_name, email, salon_id, role)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
      NEW.email,
      NEW.id, -- Set salon_id to user_id for the first user (owner)
      'owner'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;