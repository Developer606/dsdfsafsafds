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

interface PayPalConfigResponse {
  clientId: string;
  mode: 'sandbox' | 'production';
  usingFallback: boolean;
}

// Get PayPal client ID from configuration
const fetchPayPalConfig = async (): Promise<PayPalConfigResponse | null> => {
  try {
    const response = await fetch('/api/paypal-config');
    if (!response.ok) {
      throw new Error(`Failed to fetch PayPal config: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching PayPal config:", error);
    return null;
  }
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
  const [retryCount, setRetryCount] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);

  const [paypalMode, setPaypalMode] = useState<string>('sandbox');
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  useEffect(() => {
    const fetchClientId = async () => {
      const config = await fetchPayPalConfig();
      if (config) {
        setClientId(config.clientId);
        setPaypalMode(config.mode);
        setUsingFallback(config.usingFallback);
        
        if (config.usingFallback) {
          console.warn("Using fallback PayPal configuration due to invalid credentials");
        }
      }
    };
    fetchClientId();
  }, []);

  useEffect(() => {
    if(clientId === null){
      setError("Failed to load PayPal configuration. Please try again later.")
      return;
    }
    const timer = setTimeout(() => {
      const paypalButtons = document.querySelector('[data-funding-source]');
      if (!paypalButtons) {
        console.warn('PayPal buttons not detected after timeout');
        setError('PayPal payment system could not be loaded. Please try again later.');
      } else {
        setPaypalLoaded(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [retryCount, clientId]);

  const getPriceValue = (priceString: string) => {
    return parseFloat(priceString.replace(/[^0-9.]/g, ''));
  };

  const handlePaymentSuccess = async (data: any) => {
    try {
      setIsProcessing(true);
      setError(null);

      const verification = await apiRequest("POST", "/api/verify-payment", {
        orderID: data.orderID,
        planId: plan.id
      });

      const verificationData = await verification.json();

      if (verificationData.success) {
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
        
        {/* Show current PayPal environment mode */}
        <div className="mt-2 flex items-center">
          <span className={`text-xs px-2 py-1 rounded-full ${
            paypalMode === 'production' && !usingFallback 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {paypalMode === 'production' && !usingFallback ? 'Production' : 'Sandbox'} Mode
          </span>
        </div>
        
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
        
        {usingFallback && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-800">
              The system is currently using sandbox mode for payments due to configuration issues. 
              Your payment will be processed as a test transaction.
            </AlertDescription>
          </Alert>
        )}

        {clientId ? (
          <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
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
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>PayPal configuration error. Please try again later.</AlertDescription>
          </Alert>
        )}

        {!paypalLoaded && error && (
          <div className="mt-4 border-t pt-4">
            <p className="text-center text-sm mb-4">
              Unable to load PayPal payment options. You can try the following:
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setRetryCount(prev => prev + 1);
                  setError(null);
                }}
              >
                Retry Loading PayPal
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