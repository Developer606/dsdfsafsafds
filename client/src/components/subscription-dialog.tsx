import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionDialog({ open, onClose }: SubscriptionDialogProps) {
  const plans = [
    {
      name: "Premium Plan",
      price: "$9.99/month",
      features: [
        "Unlimited character creation",
        "Priority support",
        "Early access to new features",
        "Advanced character customization"
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription className="text-center">
            Create unlimited custom anime characters and unlock premium features
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-3xl font-bold mt-2">{plan.price}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-6">Subscribe Now</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
