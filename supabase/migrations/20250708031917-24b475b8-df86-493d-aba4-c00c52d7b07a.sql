-- Update pets table structure for better grooming salon workflow
-- Add pet type (Dog, Cat, etc.) and separate breed field
-- Add important health and identification records

-- Add new columns to pets table
ALTER TABLE public.pets 
ADD COLUMN pet_type TEXT CHECK (pet_type IN ('Dog', 'Cat', 'Bird', 'Rabbit', 'Other')),
ADD COLUMN is_vaccinated BOOLEAN DEFAULT false,
ADD COLUMN vaccination_date DATE,
ADD COLUMN vaccination_notes TEXT,
ADD COLUMN is_microchipped BOOLEAN DEFAULT false,
ADD COLUMN microchip_number TEXT,
ADD COLUMN medical_conditions TEXT,
ADD COLUMN grooming_notes TEXT;

-- Update existing data to extract pet type from breed field if it contains "Dog/" or "Cat/"
UPDATE public.pets 
SET pet_type = CASE 
  WHEN breed ILIKE 'dog/%' THEN 'Dog'
  WHEN breed ILIKE 'cat/%' THEN 'Cat'
  WHEN breed ILIKE '%dog%' THEN 'Dog'
  WHEN breed ILIKE '%cat%' THEN 'Cat'
  ELSE 'Dog' -- Default to Dog for existing records
END;

-- Clean up breed field to remove "Dog/" or "Cat/" prefixes
UPDATE public.pets 
SET breed = CASE
  WHEN breed ILIKE 'dog/%' THEN SUBSTRING(breed FROM 5)
  WHEN breed ILIKE 'cat/%' THEN SUBSTRING(breed FROM 5)
  WHEN breed ILIKE 'cat/%siamese' THEN 'Siamese'
  ELSE breed
END;

-- Make pet_type required
ALTER TABLE public.pets 
ALTER COLUMN pet_type SET NOT NULL;