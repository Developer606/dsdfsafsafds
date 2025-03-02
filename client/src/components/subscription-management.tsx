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
import { type User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Check } from "lucide-react";

interface SubscriptionManagementProps {
  user: User;
}

const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    price: "$4.99",
    features: [
      "Create up to 5 characters",
      "Basic character customization",
      "Standard support"
    ]
  },
  {
    id: "premium",
    name: "Premium Plan",
    price: "$9.99",
    features: [
      "Unlimited character creation",
      "Advanced character customization",
      "Priority support",
      "Early access to new features"
    ]
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: "$19.99",
    features: [
      "Everything in Premium",
      "Custom character API access",
      "Dedicated support",
      "White-label option"
    ]
  }
];

export function SubscriptionManagement({ user }: SubscriptionManagementProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/plans"],
  });

  const upgradePlan = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("POST", "/api/subscribe", { planId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Your subscription has been updated!"
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update subscription"
      });
    }
  });

  // Get current plan details
  const currentPlan = plans?.find(plan => plan.id === user.subscriptionTier) ?? { name: "Free" };

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
        {user.isPremium ? "Manage Subscription" : "Upgrade Plan"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-[800px] p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold text-center">
              Subscription Management
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 md:mt-6">
            {/* Current Plan Status */}
            <div className="text-center mb-6 md:mb-8 p-4 md:p-6 bg-accent/50 rounded-lg">
              <h3 className="text-lg md:text-xl font-semibold mb-2">
                Current Plan: {currentPlan.name}
              </h3>
              {user.subscriptionExpiresAt && (
                <p className="text-sm md:text-base text-muted-foreground">
                  Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div key={plan.id} className="flex flex-col p-4 md:p-6 rounded-xl border-2 border-border hover:border-primary/50 transition-all duration-200">
                  <div className="text-center mb-3 md:mb-4">
                    <h4 className="text-lg md:text-xl font-bold">{plan.name}</h4>
                    <p className="text-2xl md:text-3xl font-bold mt-2">
                      {plan.price}<span className="text-sm">/month</span>
                    </p>
                  </div>

                  <ul className="space-y-2 md:space-y-3 flex-grow">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs md:text-sm">
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full mt-4"
                    onClick={() => upgradePlan.mutate(plan.id)}
                    disabled={upgradePlan.isPending || plan.id === user.subscriptionTier}
                  >
                    {upgradePlan.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : plan.id === user.subscriptionTier ? 
                      "Current Plan" : 
                      "Select Plan"
                    }
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs md:text-sm text-muted-foreground text-center mt-4 md:mt-6">
              You can cancel or change your subscription at any time.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}