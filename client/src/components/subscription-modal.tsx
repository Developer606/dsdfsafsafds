import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type Plan = {
  name: string;
  price: string;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0/month",
    features: [
      "Chat with pre-made characters",
      "Create up to 2 custom characters",
      "Basic character responses",
    ],
  },
  {
    name: "Premium",
    price: "$9.99/month",
    features: [
      "All Free features",
      "Unlimited custom characters",
      "Priority character response time",
      "Advanced character customization",
      "Early access to new features",
    ],
  },
];

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  onSubscribe: (plan: string) => void;
}

export function SubscriptionModal({
  open,
  onClose,
  onSubscribe,
}: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const { toast } = useToast();

  const handleSubscribe = async () => {
    try {
      // You'll implement the actual subscription logic here
      onSubscribe(selectedPlan);
      toast({
        title: "Success!",
        description: `You are now subscribed to the ${selectedPlan} plan.`,
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process subscription. Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Unlock the full potential of your anime character chats
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          {plans.map((plan) => (
            <div
              key={plan.name.toLowerCase()}
              className={`rounded-lg border p-6 cursor-pointer transition-all ${
                selectedPlan === plan.name.toLowerCase()
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedPlan(plan.name.toLowerCase())}
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-2xl font-bold mt-2">{plan.price}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubscribe}>
            Subscribe to {selectedPlan === "free" ? "Free" : "Premium"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
