import { useState, useEffect } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { type SubscriptionPlan } from "@shared/schema";

interface PayPalPaymentProps {
  plan: SubscriptionPlan;
  onSuccess: (planId: string) => Promise<void>;
  onCancel: () => void;
  onBackToPlanSelection: () => void;
}

// Get the PayPal Client ID from environment variables
const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string;

// Log client ID to verify it's being loaded (without revealing full value)
console.log("PayPal Client ID available:", !!clientId, 
            clientId ? `${clientId.substring(0, 3)}...${clientId.substring(clientId.length - 3)}` : 'missing');

// PayPal SDK options - using recommended pattern for PayPalScriptProvider
const paypalOptions = {
  clientId: clientId,
  currency: "USD",
  intent: "capture",
};

export function PayPalPayment({ 
  plan, 
  onSuccess, 
  onCancel,
  onBackToPlanSelection 
}: PayPalPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState<boolean>(false);
  
  // Use useEffect to detect if PayPal script is loaded after a reasonable time
  useEffect(() => {
    const timer = setTimeout(() => {
      // If no PayPal buttons are displayed after 3 seconds, assume script failed to load
      const paypalButtons = document.querySelector('[data-funding-source]');
      if (!paypalButtons) {
        console.warn('PayPal buttons not detected after timeout');
        setError('PayPal payment system could not be loaded. Please try again later.');
      } else {
        setPaypalLoaded(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Format price for PayPal (remove currency symbol and convert to number)
  const getPriceValue = (priceString: string) => {
    return parseFloat(priceString.replace(/[^0-9.]/g, ''));
  };
  
  // Handle successful PayPal transaction
  const handlePaymentSuccess = async (data: any) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Verify the payment with our backend
      const verification = await apiRequest("POST", "/api/verify-payment", {
        orderID: data.orderID,
        planId: plan.id
      });
      
      // Parse the response JSON
      const verificationData = await verification.json();
      
      if (verificationData.success) {
        // Complete the subscription process through the parent component
        await onSuccess(plan.id);
      } else {
        throw new Error(verificationData.error || "Payment verification failed");
      }
    } catch (error: any) {
      setError(error.message || "Payment verification failed. Please try again.");
      setIsProcessing(false);
    }
  };
  
  if (isProcessing) {
    return (
      <div className="py-8 flex flex-col justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Processing your payment...</p>
      </div>
    );
  }
  
  const priceValue = getPriceValue(plan.price);
  
  return (
    <div className="py-4">
      <Button variant="outline" className="mb-4" onClick={onBackToPlanSelection}>
        ← Back to Plans
      </Button>
      
      <div className="p-6 rounded-lg border bg-card text-card-foreground mb-6">
        <h3 className="text-xl font-semibold">Selected Plan: {plan.name}</h3>
        <p className="text-3xl font-bold mt-2">{plan.price}</p>
        <div className="mt-4 border-t pt-4">
          <p className="font-medium">Plan Features:</p>
          <ul className="mt-2 space-y-2">
            {JSON.parse(plan.features).map((feature: string, index: number) => (
              <li key={index} className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mb-4">
        <p className="text-center text-sm mb-2">Complete payment to activate your subscription</p>
        
        <PayPalScriptProvider options={paypalOptions}>
          <PayPalButtons
            style={{ layout: "vertical" }}
            createOrder={(data, actions) => {
              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: {
                      value: priceValue.toString(),
                      currency_code: "USD"
                    },
                    description: `${plan.name} Subscription`
                  }
                ]
              });
            }}
            onApprove={async (data, actions) => {
              // Capture the funds from the transaction
              if (actions.order) {
                const details = await actions.order.capture();
                await handlePaymentSuccess(data);
              }
            }}
            onError={(err) => {
              setError("Payment failed. Please try again or use a different payment method.");
              console.error("PayPal error:", err);
            }}
            onCancel={() => {
              onCancel();
            }}
          />
        </PayPalScriptProvider>
        
        {/* Fallback for when PayPal doesn't load */}
        {!paypalLoaded && error && (
          <div className="mt-4 border-t pt-4">
            <p className="text-center text-sm mb-4">
              Unable to load PayPal payment options. You can try the following:
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onBackToPlanSelection}
              >
                Choose Different Plan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}