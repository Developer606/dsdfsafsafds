import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionPlans, type SubscriptionTier, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionManagementProps {
  user: User;
}

export function SubscriptionManagement({ user }: SubscriptionManagementProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const planDetails = user.subscriptionTier ? subscriptionPlans[user.subscriptionTier as SubscriptionTier] : null;
  const tiers = Object.entries(subscriptionPlans);

  return (
    <>
      <Button 
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-sm"
      >
        {user.isPremium ? "Manage Subscription" : "Upgrade to Premium"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-[800px] p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold text-center">
              Subscription Management
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 md:mt-6">
            <div className="text-center mb-6 md:mb-8 p-4 md:p-6 bg-accent/50 rounded-lg">
              <h3 className="text-lg md:text-xl font-semibold mb-2">
                Current Plan: {user.isPremium ? planDetails?.name || "Premium" : "Free"}
              </h3>
              {user.subscriptionExpiresAt && (
                <p className="text-sm md:text-base text-muted-foreground">
                  Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {tiers.map(([tier, plan]) => (
                <div
                  key={tier}
                  className={`
                    relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200
                    ${user.subscriptionTier === tier ? 
                      'border-primary bg-primary/5' : 
                      'border-border hover:border-primary/50'}
                  `}
                >
                  <div className="text-center mb-3 md:mb-4">
                    <h4 className="text-lg md:text-xl font-bold">{plan.name}</h4>
                    <p className="text-2xl md:text-3xl font-bold mt-2">{plan.price}</p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">/month</p>
                  </div>

                  <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs md:text-sm">
                        <svg
                          className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full text-sm md:text-base"
                    variant={user.subscriptionTier === tier ? "secondary" : "default"}
                    disabled={upgradePlan.isPending || (user.subscriptionTier === tier && user.isPremium)}
                    onClick={() => upgradePlan.mutate(plan.id)}
                  >
                    {user.subscriptionTier === tier && user.isPremium
                      ? "Current Plan"
                      : "Select Plan"}
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