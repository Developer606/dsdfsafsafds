import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

interface SubscriptionPlansProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
}

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "$5/month",
    features: [
      "Create up to 5 characters",
      "Basic character customization",
      "24/7 chat access",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$10/month",
    features: [
      "Unlimited characters",
      "Advanced character customization",
      "Priority support",
      "Exclusive character templates",
    ],
  },
];

export function SubscriptionPlans({ isOpen, onClose, onSelectPlan }: SubscriptionPlansProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-lg mb-6">
            Unlock more characters and features
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 p-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="border rounded-lg p-6 hover:border-primary transition-colors"
            >
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold text-primary mb-4">{plan.price}</p>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => onSelectPlan(plan.id)}
              >
                Subscribe Now
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
