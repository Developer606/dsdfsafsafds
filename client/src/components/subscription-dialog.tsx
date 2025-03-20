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
import { PayPalPayment } from "@/components/payment/paypal-payment";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export function SubscriptionDialog({ open, onClose, isMobile = false }: SubscriptionDialogProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<"select" | "payment" | "processing">("select");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch plans from the API endpoint
  const { data: plans, isLoading, error: plansError } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    enabled: open,
    retry: 3,
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load subscription plans. Please try again."
      });
    }
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

  // Handle plan selection
  const handleSubscribe = async (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setPaymentStep("payment");
      setPaymentError(null);
    }
  };

  // Handle back to plan selection
  const handleBackToPlanSelection = () => {
    setPaymentStep("select");
    setSelectedPlan(null);
    setPaymentError(null);
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    setPaymentError(null);
    toast({
      title: "Payment Cancelled",
      description: "You've cancelled the payment process. You can try again when you're ready."
    });
  };

  // Complete subscription after payment verification
  const completeSubscription = async (planId: string) => {
    try {
      setPaymentStep("processing");
      setPaymentError(null);

      await apiRequest("POST", "/api/subscribe", { 
        planId,
        paymentVerified: true
      });

      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });

      toast({
        title: "Success",
        description: "Subscription activated successfully!"
      });

      handleOpenChange(false);
    } catch (error: any) {
      setPaymentError(error.message || "Failed to process subscription");
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process subscription. Please try again."
      });
      setPaymentStep("payment");
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={isMobile 
          ? "max-w-[95%] rounded-xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto" 
          : "sm:max-w-[800px]"
        }>
          <div className="py-8 flex justify-center items-center">
            <Loader2 className={isMobile ? "h-8 w-8 animate-spin text-red-400" : "h-8 w-8 animate-spin text-primary"} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render error state
  if (plansError) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={isMobile 
          ? "max-w-[95%] rounded-xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto" 
          : "sm:max-w-[800px]"
        }>
          <div className="py-8">
            <Alert variant={isMobile ? "default" : "destructive"} className={isMobile ? "bg-gray-800 border-gray-700 text-red-400" : ""}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load subscription plans. Please try again later.</AlertDescription>
            </Alert>
            <Button onClick={() => handleOpenChange(false)} className={`mt-4 w-full ${isMobile ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={isMobile 
        ? "max-w-[95%] rounded-xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto" 
        : "sm:max-w-[800px]"
      }>
        <DialogHeader>
          <DialogTitle className={isMobile 
            ? "text-xl font-bold text-center text-red-400" 
            : "text-2xl font-bold text-center"
          }>
            {paymentStep === "select" ? "Choose Your Subscription Plan" : "Complete Your Subscription"}
          </DialogTitle>
          <DialogDescription className={isMobile 
            ? "text-center text-gray-400" 
            : "text-center"
          }>
            {paymentStep === "select" 
              ? "Create and customize your own anime characters with our flexible subscription plans"
              : "Securely process your payment to activate your subscription"}
          </DialogDescription>
        </DialogHeader>

        {paymentStep === "select" && (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {plans?.map((plan) => (
              <div
                key={plan.id}
                className={isMobile
                  ? plan.id === 'pro' 
                    ? "p-6 rounded-lg border border-red-500 bg-[#121824] text-white shadow-md" 
                    : "p-6 rounded-lg border border-gray-700 bg-[#121824] text-white shadow-sm"
                  : "p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary transition-colors"
                }
              >
                <h3 className={isMobile ? "text-xl font-semibold text-red-400" : "text-xl font-semibold"}>
                  {plan.name}
                </h3>
                <p className={isMobile ? "text-4xl font-bold mt-2 text-white" : "text-3xl font-bold mt-2"}>
                  {plan.price}
                </p>
                <ul className="mt-4 space-y-2">
                  {JSON.parse(plan.features).map((feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className={isMobile ? "h-4 w-4 text-red-400 flex-shrink-0" : "h-4 w-4 text-green-500 flex-shrink-0"} />
                      <span className={isMobile ? "text-sm text-gray-300" : "text-sm"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={isMobile 
                    ? "w-full mt-6 bg-red-500 hover:bg-red-600 text-white rounded-md"
                    : "w-full mt-6"
                  }
                  onClick={() => handleSubscribe(plan.id)}
                >
                  Select Plan
                </Button>
              </div>
            ))}
          </div>
        )}

        {paymentStep === "payment" && selectedPlan && (
          <PayPalPayment
            plan={selectedPlan}
            onSuccess={completeSubscription}
            onCancel={handlePaymentCancel}
            onBackToPlanSelection={handleBackToPlanSelection}
          />
        )}

        {paymentStep === "processing" && (
          <div className="py-8 flex flex-col justify-center items-center">
            <Loader2 className={isMobile 
              ? "h-8 w-8 animate-spin text-red-400 mb-4"
              : "h-8 w-8 animate-spin text-primary mb-4"
            } />
            <p>Processing your subscription...</p>
          </div>
        )}

        {paymentError && (
          <Alert 
            variant={isMobile ? "default" : "destructive"} 
            className={isMobile 
              ? "mt-4 bg-gray-800 border-gray-700 text-red-400"
              : "mt-4"
            }
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{paymentError}</AlertDescription>
          </Alert>
        )}

        <div className={isMobile 
          ? "mt-4 text-center text-sm text-gray-400"
          : "mt-4 text-center text-sm text-muted-foreground"
        }>
          <p>Free trial includes up to 3 character creations.</p>
          <p>You can upgrade or cancel your subscription at any time.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}