import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type User, type SubscriptionPlan } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { PayPalPayment } from "@/components/payment/paypal-payment";

interface SubscriptionManagementProps {
  user: User;
}

export function SubscriptionManagement({ user }: SubscriptionManagementProps) {
  const [open, setOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"select" | "payment">("select");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();

  // Fetch plans from the public API endpoint
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/plans"],
  });

  // Handle dialog closing
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setPaymentStep("select");
      setSelectedPlan(null);
    }
  };

  // Handle plan selection
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setPaymentStep("payment");
  };

  // Handle back to plan selection
  const handleBackToPlanSelection = () => {
    setPaymentStep("select");
    setSelectedPlan(null);
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "You've cancelled the payment process. You can try again when you're ready."
    });
  };

  // Complete subscription after payment verification
  const completeSubscription = async (planId: string) => {
    try {
      await apiRequest("POST", "/api/subscribe", { 
        planId,
        paymentVerified: true
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Success",
        description: "Your subscription has been updated!"
      });
      
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update subscription"
      });
    }
  };

  // Get current plan details
  const currentPlan = plans?.find(plan => plan.id === user.subscriptionTier);

  if (plansLoading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <Button 
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-sm"
      >
        {user.isPremium ? "Manage Subscription" : "Upgrade to Premium"}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[95vw] max-w-[800px] p-4 md:p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold text-center">
              {paymentStep === "select" ? "Subscription Management" : "Complete Your Subscription"}
            </DialogTitle>
          </DialogHeader>

          {paymentStep === "select" ? (
            <div className="mt-4 md:mt-6">
              <div className="text-center mb-6 md:mb-8 p-4 md:p-6 bg-accent/50 rounded-lg">
                <h3 className="text-lg md:text-xl font-semibold mb-2">
                  Current Plan: {currentPlan?.name || "Free"}
                </h3>
                {user.subscriptionExpiresAt && (
                  <p className="text-sm md:text-base text-muted-foreground">
                    Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {plans?.map((plan) => (
                  <div key={plan.id} className="flex flex-col p-4 md:p-6 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-200">
                    <div className="text-center mb-3 md:mb-4">
                      <h4 className="text-lg md:text-xl font-bold">{plan.name}</h4>
                      <p className="text-2xl md:text-3xl font-bold mt-2">{plan.price}<span className="text-sm">/month</span></p>
                    </div>
                    <ul className="space-y-2 md:space-y-3 flex-grow">
                      {JSON.parse(plan.features).map((feature: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-xs md:text-sm">
                          <svg className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full text-sm md:text-base mt-4"
                      onClick={() => handleSelectPlan(plan)}
                      disabled={user.subscriptionTier === plan.id && user.isPremium}
                    >
                      {user.subscriptionTier === plan.id && user.isPremium ? "Current Plan" : "Select Plan"}
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-xs md:text-sm text-muted-foreground text-center mt-4 md:mt-6">
                You can cancel or change your subscription at any time.
              </p>
            </div>
          ) : (
            selectedPlan && (
              <PayPalPayment
                plan={selectedPlan}
                onSuccess={completeSubscription}
                onCancel={handlePaymentCancel}
                onBackToPlanSelection={handleBackToPlanSelection}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}