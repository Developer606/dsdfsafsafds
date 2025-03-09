import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type SubscriptionPlan } from "@shared/schema";
import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
}

const paypalOptions = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID as string,
  currency: "USD",
  intent: "capture"
};

export function SubscriptionDialog({ open, onClose }: SubscriptionDialogProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<"select" | "payment" | "processing">("select");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Fetch plans from the API endpoint
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    // Only fetch when dialog is open
    enabled: open,
  });

  // Reset dialog state when it closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedPlan(null);
      setPaymentStep("select");
      setPaymentError(null);
      onClose();
    }
  };

  const handleSubscribe = async (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setPaymentStep("payment");
    }
  };

  // Complete subscription after successful PayPal payment
  const completeSubscription = async (paymentVerified: boolean) => {
    if (!selectedPlan) return;
    
    try {
      setPaymentStep("processing");
      
      await apiRequest("POST", "/api/subscribe", { 
        planId: selectedPlan.id,
        paymentVerified
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Success",
        description: "Subscription activated successfully!"
      });
      
      handleOpenChange(false);
    } catch (error: any) {
      setPaymentError(error.message || "Failed to process subscription. Please try again.");
      setPaymentStep("payment");
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process subscription. Please try again."
      });
    }
  };

  // Handle successful PayPal transaction
  const handlePaymentSuccess = async (data: any) => {
    try {
      // Verify the payment with our backend
      const verification = await apiRequest("POST", "/api/verify-payment", {
        orderID: data.orderID,
        planId: selectedPlan?.id
      });
      
      if (verification.success) {
        // Complete the subscription process
        await completeSubscription(true);
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (error: any) {
      setPaymentError(error.message || "Payment verification failed. Please try again.");
      setPaymentStep("payment");
    }
  };

  // Format price for PayPal (remove currency symbol and convert to number)
  const getPriceValue = (priceString: string) => {
    return parseFloat(priceString.replace(/[^0-9.]/g, ''));
  };

  // Handle back button click in payment step
  const handleBackToPlans = () => {
    setPaymentStep("select");
    setSelectedPlan(null);
    setPaymentError(null);
  };

  // Render plan selection UI
  const renderPlanSelection = () => (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      {plans && plans.map((plan: SubscriptionPlan) => (
        <div
          key={plan.id}
          className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary transition-colors"
        >
          <h3 className="text-xl font-semibold">{plan.name}</h3>
          <p className="text-3xl font-bold mt-2">{plan.price}</p>
          <ul className="mt-4 space-y-2">
            {JSON.parse(plan.features).map((feature: string, index: number) => (
              <li key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Button 
            className="w-full mt-6"
            onClick={() => handleSubscribe(plan.id)}
          >
            Select Plan
          </Button>
        </div>
      ))}
    </div>
  );

  // Render payment UI
  const renderPaymentUI = () => {
    if (!selectedPlan) return null;
    
    const priceValue = getPriceValue(selectedPlan.price);
    
    return (
      <div className="py-4">
        <Button variant="outline" className="mb-4" onClick={handleBackToPlans}>
          ← Back to Plans
        </Button>
        
        <div className="p-6 rounded-lg border bg-card text-card-foreground mb-6">
          <h3 className="text-xl font-semibold">Selected Plan: {selectedPlan.name}</h3>
          <p className="text-3xl font-bold mt-2">{selectedPlan.price}</p>
          <div className="mt-4 border-t pt-4">
            <p className="font-medium">Plan Features:</p>
            <ul className="mt-2 space-y-2">
              {JSON.parse(selectedPlan.features).map((feature: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {paymentError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4">
          <p className="text-center text-sm mb-2">Complete payment to activate your subscription</p>
          
          <PayPalScriptProvider options={paypalOptions}>
            <PayPalButtons
              style={{ layout: "vertical" }}
              createOrder={(data, actions) => {
                return actions.order.create({
                  purchase_units: [
                    {
                      amount: {
                        value: priceValue.toString(),
                        currency_code: "USD"
                      },
                      description: `${selectedPlan.name} Subscription`
                    }
                  ]
                });
              }}
              onApprove={async (data, actions) => {
                // Capture the funds from the transaction
                if (actions.order) {
                  const details = await actions.order.capture();
                  await handlePaymentSuccess(data);
                }
              }}
              onError={(err) => {
                setPaymentError("Payment failed. Please try again or use a different payment method.");
                console.error("PayPal error:", err);
              }}
              onCancel={() => {
                toast({
                  title: "Payment Cancelled",
                  description: "You've cancelled the payment process. You can try again when you're ready."
                });
              }}
            />
          </PayPalScriptProvider>
        </div>
      </div>
    );
  };

  // Render processing UI
  const renderProcessingUI = () => (
    <div className="py-8 flex flex-col justify-center items-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p>Processing your subscription...</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {paymentStep === "select" ? "Choose Your Subscription Plan" : "Complete Your Subscription"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {paymentStep === "select" 
              ? "Create and customize your own anime characters with our flexible subscription plans"
              : "Securely process your payment to activate your subscription"}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {paymentStep === "select" && renderPlanSelection()}
            {paymentStep === "payment" && renderPaymentUI()}
            {paymentStep === "processing" && renderProcessingUI()}
          </>
        )}
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Free trial includes up to 3 character creations.</p>
          <p>You can upgrade or cancel your subscription at any time.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}