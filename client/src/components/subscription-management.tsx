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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Management</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Current Plan: {user.isPremium ? planDetails?.name || "Premium" : "Free"}
              </h3>
              {user.subscriptionExpiresAt && (
                <p className="text-sm text-gray-500">
                  Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {Object.entries(subscriptionPlans).map(([tier, plan]) => (
                <div
                  key={tier}
                  className="p-4 border rounded-lg relative hover:border-primary transition-colors"
                >
                  <h4 className="text-lg font-semibold">{plan.name}</h4>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  <p className="text-2xl font-bold">${plan.price}/month</p>
                  
                  <Button
                    className="mt-4 w-full"
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
