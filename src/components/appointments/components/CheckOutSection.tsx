import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, DoorClosed } from "lucide-react";
import PaymentProcessing from "@/components/payments/PaymentProcessing";
import { Appointment } from "../types";

interface CheckOutSectionProps {
  appointment: Appointment;
  onCheckOut: () => void;
  onUpdate: () => void;
}

export const CheckOutSection = ({ appointment, onCheckOut, onUpdate }: CheckOutSectionProps) => {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <CreditCard className="h-4 w-4 mr-2" />
              Charge Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                Charge for {appointment.pet?.name}'s grooming service
              </DialogDescription>
            </DialogHeader>
            <PaymentProcessing
              appointmentId={appointment.id}
              clientId={appointment.client_id}
              amount={(appointment as any).total_price || 0}
              appointment={appointment}
              onPaymentComplete={() => {
                setShowPayment(false);
                onUpdate();
              }}
            />
          </DialogContent>
        </Dialog>
        
        <Button onClick={onCheckOut} className="flex-1">
          <DoorClosed className="h-4 w-4 mr-2" />
          Check Out Pet
        </Button>
      </div>
    </div>
  );
};