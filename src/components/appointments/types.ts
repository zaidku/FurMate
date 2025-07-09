export interface Client {
  id: string;
  name: string;
}

export interface Pet {
  id: string;
  name: string;
  client_id: string;
  pet_type?: string;
  breed?: string;
  size?: string;
  age?: number;
  weight?: number;
  notes?: string;
  special_instructions?: string;
  is_vaccinated?: boolean;
  vaccination_date?: string;
  vaccination_notes?: string;
  is_microchipped?: boolean;
  microchip_number?: string;
  medical_conditions?: string;
  grooming_notes?: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface Appointment {
  id: string;
  salon_id: string;
  client_id: string;
  pet_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  total_price?: number;
  check_in_time?: string;
  check_out_time?: string;
  kennel_number?: string;
  kennel_notes?: string;
  created_at: string;
  updated_at: string;
  client: { 
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  pet: { 
    id: string;
    name: string;
    pet_type?: string;
    breed?: string;
    size?: string;
  };
  appointment_services: Array<{
    id: string;
    service_id: string;
    service: { 
      id: string; 
      name: string; 
      price: number;
    };
    price: number;
  }>;
}