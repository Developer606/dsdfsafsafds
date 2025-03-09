import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { type SubscriptionPlan } from "@shared/schema";

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionDialog({ open, onClose }: SubscriptionDialogProps) {
  const { toast } = useToast();
  
  // Fetch plans from the API endpoint
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    // Only fetch when dialog is open
    enabled: open,
  });

  const handleSubscribe = async (planId: string) => {
    try {
      await apiRequest("POST", "/api/subscribe", { planId });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Subscription activated successfully!"
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process subscription. Please try again."
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Choose Your Subscription Plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Create and customize your own anime characters with our flexible subscription plans
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
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
                  Subscribe Now
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Free trial includes up to 3 character creations.</p>
          <p>You can upgrade or cancel your subscription at any time.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}