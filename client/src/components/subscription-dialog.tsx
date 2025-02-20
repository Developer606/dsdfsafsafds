import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Plan {
  id: string;
  name: string;
  price: number;
  characterLimit: number;
  features: string[];
}

const subscriptionPlans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 0,
    characterLimit: 2,
    features: [
      "Create up to 2 custom characters",
      "Access to default characters",
      "Basic chat features"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    price: 9.99,
    characterLimit: 10,
    features: [
      "Create up to 10 custom characters",
      "Priority chat response",
      "Advanced customization options",
      "Access to premium character templates"
    ]
  },
  {
    id: "ultimate",
    name: "Ultimate",
    price: 19.99,
    characterLimit: -1,
    features: [
      "Unlimited custom characters",
      "Exclusive character backgrounds",
      "Priority support",
      "Early access to new features",
      "Custom character sharing"
    ]
  }
];

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionDialog({ open, onClose }: SubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    
    try {
      await apiRequest("POST", "/api/subscribe", { planId: selectedPlan });
      toast({
        title: "Subscription successful!",
        description: "Your account has been upgraded.",
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Subscription failed",
        description: "Please try again later.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Unlock more characters and features with our premium plans
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {subscriptionPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? "border-primary ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <CardHeader>
                <h3 className="text-xl font-bold text-center">{plan.name}</h3>
                <p className="text-2xl font-bold text-center text-primary">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={selectedPlan === plan.id ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.price === 0 ? "Current Plan" : "Select Plan"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <Button
            size="lg"
            disabled={!selectedPlan || selectedPlan === "basic"}
            onClick={handleSubscribe}
          >
            {selectedPlan === "basic"
              ? "Current Plan"
              : selectedPlan
              ? "Subscribe Now"
              : "Select a Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
