import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Receipt, Printer, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Appointment } from "../appointments/types";

interface SalonSettings {
  salon_name?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface PaymentReceiptProps {
  appointment: Appointment;
  paymentAmount: number;
  paymentMethod: string;
  transactionId?: string;
  onClose: () => void;
}

export const PaymentReceipt = ({ 
  appointment, 
  paymentAmount, 
  paymentMethod, 
  transactionId,
  onClose 
}: PaymentReceiptProps) => {
  const [salonSettings, setSalonSettings] = useState<SalonSettings>({});

  useEffect(() => {
    fetchSalonSettings();
  }, []);

  const fetchSalonSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('salon_settings')
        .select('salon_name, logo_url, phone, email, address')
        .eq('salon_id', user.id)
        .single();

      if (data) {
        setSalonSettings(data);
      }
    } catch (error) {
      console.error('Error fetching salon settings:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const receiptDate = new Date().toLocaleDateString();
  const receiptTime = new Date().toLocaleTimeString();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        {/* Salon Logo and Name */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={salonSettings.logo_url || ""} alt="Salon Logo" />
            <AvatarFallback>
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-lg">{salonSettings.salon_name || "Pet Grooming Salon"}</h3>
            {salonSettings.address && (
              <p className="text-xs text-muted-foreground">{salonSettings.address}</p>
            )}
            <div className="flex gap-2 text-xs text-muted-foreground justify-center">
              {salonSettings.phone && <span>{salonSettings.phone}</span>}
              {salonSettings.email && <span>{salonSettings.email}</span>}
            </div>
          </div>
        </div>
        
        <Separator />
        
        <CardTitle className="flex items-center justify-center gap-2 mt-4">
          <Receipt className="h-5 w-5" />
          Payment Receipt
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {receiptDate} at {receiptTime}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Customer & Pet Info */}
        <div>
          <h4 className="font-medium mb-2">Service Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{appointment.client?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Pet:</span>
              <span>{appointment.pet?.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Appointment:</span>
              <span>{new Date(appointment.scheduled_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Services */}
        <div>
          <h4 className="font-medium mb-2">Services Provided</h4>
          <div className="space-y-2">
            {appointment.appointment_services?.map((service, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{service.service.name}</span>
                <span>${service.price.toFixed(2)}</span>
              </div>
            ))}
            {(!appointment.appointment_services || appointment.appointment_services.length === 0) && (
              <div className="text-sm text-muted-foreground">
                Standard grooming service
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Payment Info */}
        <div>
          <h4 className="font-medium mb-2">Payment Information</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-bold">${paymentAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="capitalize">{paymentMethod}</span>
            </div>
            {transactionId && (
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="text-xs">{transactionId}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};