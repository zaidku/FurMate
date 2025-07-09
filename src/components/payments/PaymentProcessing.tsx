import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PaymentReceipt } from "./PaymentReceipt";
import { Appointment } from "../appointments/types";

interface PaymentProcessingProps {
  appointmentId?: string;
  clientId?: string;
  amount?: number;
  appointment?: Appointment;
  onPaymentComplete?: () => void;
}

const PaymentProcessing = ({ appointmentId, clientId, amount = 0, appointment, onPaymentComplete }: PaymentProcessingProps) => {
  const [paymentData, setPaymentData] = useState({
    amount: amount,
    payment_method: "",
    notes: "",
    transaction_id: ""
  });
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const { toast } = useToast();

  const handleProcessPayment = async () => {
    if (!paymentData.amount || !paymentData.payment_method) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from('payments').insert({
        salon_id: user.id,
        appointment_id: appointmentId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_status: 'completed',
        payment_date: new Date().toISOString(),
        transaction_id: paymentData.transaction_id,
        notes: paymentData.notes
      });

      if (error) throw error;

      // Update appointment status if payment is for an appointment
      if (appointmentId) {
        await supabase
          .from('appointments')
          .update({ 
            status: 'completed',
            total_price: paymentData.amount 
          })
          .eq('id', appointmentId);
      }

      toast({
        title: "Success",
        description: "Payment processed successfully",
      });

      // Show receipt instead of immediately closing
      setShowReceipt(true);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setPaymentData({
      amount: 0,
      payment_method: "",
      notes: "",
      transaction_id: ""
    });
    onPaymentComplete?.();
  };

  return (
    <>
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          {appointment && (
            <PaymentReceipt
              appointment={appointment}
              paymentAmount={paymentData.amount}
              paymentMethod={paymentData.payment_method}
              transactionId={paymentData.transaction_id}
              onClose={handleReceiptClose}
            />
          )}
        </DialogContent>
      </Dialog>

      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Process Payment
        </CardTitle>
        <CardDescription>
          Accept payments for services rendered
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-9"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={paymentData.payment_method}
              onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(paymentData.payment_method === 'stripe' || paymentData.payment_method === 'square' || paymentData.payment_method === 'paypal') && (
          <div>
            <Label htmlFor="transaction_id">Transaction ID</Label>
            <Input
              id="transaction_id"
              placeholder="Enter transaction ID from payment processor"
              value={paymentData.transaction_id}
              onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
            />
          </div>
        )}

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Input
            id="notes"
            placeholder="Payment notes..."
            value={paymentData.notes}
            onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleProcessPayment} disabled={loading} className="flex-1">
            <Receipt className="h-4 w-4 mr-2" />
            {loading ? "Processing..." : "Process Payment"}
          </Button>
        </div>

        {paymentData.payment_method && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Summary</span>
              <Badge>{paymentData.payment_method}</Badge>
            </div>
            <div className="text-2xl font-bold mt-2">
              ${paymentData.amount.toFixed(2)}
            </div>
          </div>
        )}

        {/* Service Details */}
        {appointment && appointment.appointment_services && appointment.appointment_services.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Services</h4>
            <div className="space-y-1">
              {appointment.appointment_services.map((service, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{service.service.name}</span>
                  <span>${service.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};

export default PaymentProcessing;