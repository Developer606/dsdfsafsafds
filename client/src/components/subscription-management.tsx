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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Subscription Management
            </DialogTitle>
          </DialogHeader>

          <div className="py-3">
            <div className="text-sm mb-4 p-3 bg-accent/50 rounded-lg">
              <p>
                Current Plan: {user.subscriptionTier ? subscriptionPlans[user.subscriptionTier as SubscriptionTier].name : "Free"}
              </p>
              {user.subscriptionExpiresAt && (
                <p className="text-muted-foreground mt-1">
                  Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {Object.entries(subscriptionPlans).map(([tier, plan]) => (
                <div
                  key={tier}
                  className={`
                    p-3 rounded-lg border transition-all duration-200
                    ${user.subscriptionTier === tier ? 
                      'border-primary bg-primary/5' : 
                      'border-border hover:border-primary/50'}
                  `}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{plan.name}</h4>
                    <p className="font-bold">{plan.price}<span className="text-xs text-muted-foreground">/mo</span></p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2"
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

            <p className="text-xs text-muted-foreground text-center mt-4">
              You can cancel or change your subscription at any time.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}